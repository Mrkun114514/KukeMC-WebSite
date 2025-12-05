import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useTitle } from '../hooks/useTitle';
import { motion } from 'framer-motion';
import { Search, Ban, ChevronLeft, ChevronRight, Terminal, Clock, Timer } from 'lucide-react';
import clsx from 'clsx';

interface BanRecord {
  id: number;
  name: string;
  created: string;
  source: string;
  expires: string;
  reason: string;
  banned_by_name: string | null;
  removed_by_name: string | null;
  active: boolean;
  server_scope: string;
}

interface BanListResponse {
  total: number;
  pages: number;
  current_page: number;
  data: BanRecord[];
}

const BanList = () => {
  useTitle('封禁列表-KukeMC-我的世界服务器(Minecraft)');
  const [data, setData] = useState<BanListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on search change
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const fetchBans = async () => {
      setLoading(true);
      try {
        const res = await api.get<BanListResponse>(`/api/banlist`, {
          params: {
            page,
            per_page: 20,
            search: debouncedSearch
          }
        });
        setData(res.data);
      } catch (error) {
        console.error('Error fetching ban list:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBans();
  }, [page, debouncedSearch]);

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr === 'forever') return null;
    
    try {
      // Handle format: 2026-12-01T13:16:47.993000 +0800
      // Remove microseconds (\.\d+)
      // Remove space before timezone (space + plus/minus)
      
      let cleaned = dateStr
        .replace(/(\.\d+)/, '') // Remove microseconds
        .replace(/\s+([+-])/, '$1'); // Remove space before timezone sign
      
      // cleaned should now be "2025-10-03T04:23:39+0800"
      
      let date = new Date(cleaned);
      
      if (isNaN(date.getTime())) {
        // Try adding colon to timezone if missing: +0800 -> +08:00
        if (/[+-]\d{4}$/.test(cleaned)) {
            const withColon = cleaned.replace(/([+-])(\d{2})(\d{2})$/, '$1$2:$3');
            date = new Date(withColon);
        }
      }
      
      if (isNaN(date.getTime())) {
         return null;
      }
      
      return date;
    } catch {
      return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = parseDate(dateStr);
    if (!date) return dateStr === 'forever' ? '永久' : dateStr;
    
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  };

  const calculateDuration = (startStr: string, endStr: string) => {
    if (endStr === 'forever') return '永久';
    
    const start = parseDate(startStr);
    const end = parseDate(endStr);
    
    if (!start || !end) return '未知';
    
    const diffMs = end.getTime() - start.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec}秒`;
    
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}分钟`;
    
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}小时`;
    
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 30) return `${diffDay}天`;
    
    const diffMonth = Math.floor(diffDay / 30);
    if (diffMonth < 12) return `${diffMonth}个月`;
    
    return `${Math.floor(diffDay / 365)}年`;
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (data?.pages || 1)) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="inline-flex items-center justify-center p-3 bg-red-500/10 rounded-full mb-4"
            >
              <Ban className="w-8 h-8 text-red-500" />
            </motion.div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4 transition-colors duration-300">封禁列表</h1>
            <p className="text-slate-600 dark:text-slate-400 transition-colors duration-300">服务器违规玩家公示</p>
          </div>

          {/* Search and Filter */}
          <div className="mb-8">
            <div className="relative max-w-md mx-auto">
              <input
                type="text"
                placeholder="搜索玩家名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg py-3 pl-12 pr-4 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-300 placeholder-slate-400 dark:placeholder-slate-500"
              />
              <Search className="absolute left-4 top-3.5 text-slate-400 dark:text-slate-500" size={20} />
            </div>
          </div>

          {/* Ban List Table */}
          <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors duration-300">
            {loading ? (
              <div className="p-12 flex justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full"
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium backdrop-blur-sm transition-colors duration-300">
                      <tr>
                        <th className="px-6 py-5">玩家</th>
                        <th className="px-6 py-5">封禁原因</th>
                        <th className="px-6 py-5">执行人</th>
                        <th className="px-6 py-5">时间/时长</th>
                        <th className="px-6 py-5">状态</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 transition-colors duration-300">
                      {data?.data.map((ban) => (
                        <tr key={ban.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors duration-200">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              <img
                                src={`https://cravatar.eu/helmavatar/${ban.name}/40.png`}
                                alt={ban.name}
                                className="w-10 h-10 rounded-lg shadow-sm"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://cravatar.eu/helmavatar/MHF_Steve/40.png`;
                                  }}
                              />
                              <span className="font-medium text-slate-900 dark:text-slate-200 transition-colors duration-300">{ban.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 transition-colors duration-300">
                              <Terminal size={16} className="text-slate-400 dark:text-slate-500" />
                              {ban.reason}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 dark:text-slate-400 transition-colors duration-300">
                            <div className="flex items-center gap-2">
                              {ban.banned_by_name && !['Console', '控制台'].includes(ban.banned_by_name) ? (
                                <img
                                  src={`https://cravatar.eu/helmavatar/${ban.source}/40.png`}
                                  alt={ban.source}
                                  className="w-6 h-6 rounded-md"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://cravatar.eu/helmavatar/MHF_Steve/40.png`;
                                  }}
                                />
                              ) : (
                                <Terminal className="w-6 h-6" />
                              )}
                              {ban.banned_by_name || 'Console'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs transition-colors duration-300" title={ban.created}>
                                <Clock size={14} />
                                {formatDate(ban.created)}
                              </div>
                              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-500 text-xs">
                                <Timer size={14} />
                                {ban.expires === 'forever' ? '永久' : calculateDuration(ban.created, ban.expires)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={clsx(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                              ban.active 
                                ? "bg-red-500/10 text-red-400 border-red-500/20"
                                : "bg-green-500/10 text-green-400 border-green-500/20"
                            )}>
                              {ban.active ? '封禁中' : '已解封'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {data && data.pages > 1 && (
                  <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between transition-colors duration-300">
                    <div className="text-sm text-slate-500 dark:text-slate-400 transition-colors duration-300">
                      第 {data.current_page} 页，共 {data.pages} 页
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-500 dark:text-slate-400 transition-colors duration-200"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <div className="flex items-center space-x-1">
                        {page > 2 && (
                          <>
                            <button onClick={() => handlePageChange(1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors duration-200">1</button>
                            {page > 3 && <span className="text-slate-400 dark:text-slate-500">...</span>}
                          </>
                        )}
                        {page > 1 && (
                          <button onClick={() => handlePageChange(page - 1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors duration-200">{page - 1}</button>
                        )}
                        <button className="w-8 h-8 rounded-lg bg-red-500 text-white">{page}</button>
                        {page < data.pages && (
                          <button onClick={() => handlePageChange(page + 1)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors duration-200">{page + 1}</button>
                        )}
                        {page < data.pages - 1 && (
                          <>
                            {page < data.pages - 2 && <span className="text-slate-400 dark:text-slate-500">...</span>}
                            <button onClick={() => handlePageChange(data.pages)} className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors duration-200">{data.pages}</button>
                          </>
                        )}
                      </div>
                      <button
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === data.pages}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-slate-500 dark:text-slate-400 transition-colors duration-200"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BanList;
