import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  subDays, 
  eachDayOfInterval, 
  format, 
  getDay, 
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import api from '../utils/api';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface ContributionGraphProps {
  username: string;
}

const ContributionGraph: React.FC<ContributionGraphProps> = ({ username }) => {
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!username) return;
      setLoading(true);
      try {
        const res = await api.get(`/api/profile/${username}/contributions`);
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch contribution data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username]);

  // Calculate date range (last 365 days)
  const today = new Date();
  const startDate = subDays(today, 364); // 365 days including today

  // Generate all days
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startDate,
      end: today
    });
  }, [startDate, today]);

  // Calculate total minutes for the summary
  const totalPlaytimeMinutes = useMemo(() => {
    return Object.values(data).reduce((acc, curr) => acc + curr, 0);
  }, [data]);

  // Helper to get color intensity
  const getColor = (minutes: number) => {
    if (minutes === 0) return "bg-slate-100 dark:bg-slate-800/50 border border-transparent hover:border-slate-300 dark:hover:border-slate-600";
    if (minutes < 60) return "bg-emerald-200/80 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50";
    if (minutes < 180) return "bg-emerald-300 dark:bg-emerald-700/60 border border-emerald-300 dark:border-emerald-700/50";
    if (minutes < 300) return "bg-emerald-400 dark:bg-emerald-600/80 border border-emerald-400 dark:border-emerald-600/50 shadow-[0_0_8px_rgba(52,211,153,0.3)]";
    return "bg-emerald-500 dark:bg-emerald-500 border border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]";
  };

  const getTooltipContent = (date: Date, minutes: number) => {
    const dateStr = format(date, 'yyyy年MM月dd日', { locale: zhCN });
    if (minutes === 0) return (
      <div className="flex flex-col gap-1 min-w-[120px]">
        <span className="font-medium text-slate-200 text-xs">{dateStr}</span>
        <span className="text-slate-400 text-xs">无游戏记录</span>
      </div>
    );
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    let timeStr = "";
    if (hours > 0) {
      timeStr = `${hours}小时${mins}分钟`;
    } else {
      timeStr = `${mins}分钟`;
    }

    return (
      <div className="flex flex-col gap-1 min-w-[120px]">
        <span className="font-medium text-white text-xs">{dateStr}</span>
        <span className="text-emerald-300 font-bold text-sm">{timeStr}</span>
      </div>
    );
  };

  // Group days by week for column-based layout
  const weeks = useMemo(() => {
    const weeksArray: Date[][] = [];
    let currentWeek: Date[] = [];

    days.forEach((day) => {
      if (getDay(day) === 0 && currentWeek.length > 0) {
        weeksArray.push(currentWeek);
        currentWeek = [];
      }
      currentWeek.push(day);
    });
    if (currentWeek.length > 0) {
      weeksArray.push(currentWeek);
    }
    return weeksArray;
  }, [days]);

  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    content: React.ReactNode;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent, date: Date, count: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    
    // Calculate position relative to the viewport
    const x = rect.left + rect.width / 2;
    const y = rect.top - 6;

    setTooltip({
      show: true,
      x,
      y,
      content: getTooltipContent(date, count)
    });
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  // Month labels
  const monthLabels = useMemo(() => {
    const labels: { text: string, index: number }[] = [];
    
    weeks.forEach((week, index) => {
      const firstDayOfMonth = week.find(d => d.getDate() === 1);
      
      if (index === 0) {
         labels.push({ text: format(week[0], 'MMM', { locale: zhCN }), index });
      } else if (firstDayOfMonth) {
         labels.push({ text: format(firstDayOfMonth, 'MMM', { locale: zhCN }), index });
      }
    });
    
    return labels;
  }, [weeks]);

  // Scroll to end on load
  useEffect(() => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [loading, weeks]);

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6 rounded-3xl border border-white/20 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-xl relative overflow-hidden"
    >
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2"></div>
      
      {/* Custom Tooltip Portal */}
      {tooltip?.show && createPortal(
        <div 
            className="fixed z-[9999] pointer-events-none transform -translate-x-1/2 -translate-y-full px-3 py-2 bg-slate-800 text-white text-xs rounded-lg shadow-lg border border-slate-700/50 whitespace-nowrap"
            style={{ 
                left: tooltip.x, 
                top: tooltip.y 
            }}
        >
            {tooltip.content}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-[-4px] w-2 h-2 bg-slate-800 rotate-45 border-r border-b border-slate-700/50"></div>
        </div>,
        document.body
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
             {loading ? (
                <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
             ) : (
                <>过去一年共活跃 {Math.floor(totalPlaytimeMinutes / 60)} 小时</>
             )}
          </h3>
      </div>

      {/* Heatmap Container */}
      {loading ? (
        <div className="w-full h-40 flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-500 w-8 h-8" />
        </div>
      ) : (
      <div className="relative group/scroll">
        {/* Scroll Indicators */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white dark:from-slate-900 to-transparent z-10 pointer-events-none opacity-0 md:opacity-100 transition-opacity"></div>
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-slate-900 to-transparent z-10 pointer-events-none opacity-0 md:opacity-100 transition-opacity"></div>
        
        <div 
            ref={scrollContainerRef}
            className="overflow-x-auto pb-4 hide-scrollbar scroll-smooth relative"
            style={{ 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none' 
            }}
        >
            <div className="min-w-[800px] w-fit mx-auto px-4">
                {/* Month Labels */}
                <div className="relative h-6 mb-2 ml-10 text-xs font-medium text-slate-400 dark:text-slate-500">
                    {monthLabels.map((label, i) => (
                        <div 
                            key={i} 
                            className="absolute top-0 whitespace-nowrap"
                            style={{ 
                                left: `${label.index * 19}px` // 19px = width (15) + gap (4)
                            }}
                        >
                            {label.text}
                        </div>
                    ))}
                </div>

                <div className="flex gap-1.5">
                    {/* Day Labels */}
                    <div className="flex flex-col gap-[4px] w-9 pr-2 text-[11px] text-right font-medium text-slate-400 dark:text-slate-500 shrink-0 pt-[1px]">
                        <div className="h-[15px]"></div>
                        <div className="h-[15px] flex items-center justify-end">一</div>
                        <div className="h-[15px]"></div>
                        <div className="h-[15px] flex items-center justify-end">三</div>
                        <div className="h-[15px]"></div>
                        <div className="h-[15px] flex items-center justify-end">五</div>
                        <div className="h-[15px]"></div>
                    </div>

                    {/* The Grid */}
                    <div className="flex gap-[4px] flex-1">
                        {weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-[4px]">
                                {week.map((day) => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const count = data[dateStr] || 0;
                                    return (
                                        <div
                                            key={dateStr}
                                            className={clsx(
                                                "w-[15px] h-[15px] rounded-[3px] transition-all duration-300 relative cursor-pointer",
                                                getColor(count),
                                                "hover:scale-110 hover:z-10 hover:shadow-lg"
                                            )}
                                            onMouseEnter={(e) => handleMouseEnter(e, day, count)}
                                            onMouseLeave={handleMouseLeave}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      </div>
      )}

      {/* Footer Legend */}
      {!loading && (
      <div className="flex items-center justify-end gap-3 mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
        <span className="mr-1">Less</span>
        <div className="flex gap-1.5">
            <div className="w-[15px] h-[15px] rounded-[2px] bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"></div>
            <div className="w-[15px] h-[15px] rounded-[2px] bg-emerald-200 dark:bg-emerald-900/40 border border-emerald-300/30"></div>
            <div className="w-[15px] h-[15px] rounded-[2px] bg-emerald-300 dark:bg-emerald-700/60 border border-emerald-400/30"></div>
            <div className="w-[15px] h-[15px] rounded-[2px] bg-emerald-400 dark:bg-emerald-600/80 border border-emerald-500/30"></div>
            <div className="w-[15px] h-[15px] rounded-[2px] bg-emerald-500 dark:bg-emerald-500 border border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
        </div>
        <span className="ml-1">More</span>
      </div>
      )}
      
      {/* Hide scrollbar CSS */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
      `}</style>
    </motion.div>
  );
};

export default ContributionGraph;
