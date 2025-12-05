import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useTitle } from '../hooks/useTitle';
import { motion } from 'framer-motion';
import { Search, Trophy, Clock, Calendar, User, BarChart2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Medal } from 'lucide-react';
import clsx from 'clsx';

interface OverviewData {
  total_players: string;
  today_online: string;
  active_players: string;
  total_playtime: string;
}

interface PlaytimeRecord {
  username: string;
  total_playtime?: number;
  recent_playtime?: number;
  login_count?: number;
  play_days?: number;
  last_login: string;
  online?: boolean;
}

interface RankingResponse {
  data: PlaytimeRecord[];
  pagination: {
    total_pages: number;
    current_page: number;
    total: number;
  };
}

const Stats = () => {
  useTitle('游玩时间-KukeMC-我的世界服务器(Minecraft)');
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [ranking, setRanking] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [mode, setMode] = useState<'total' | 'recent'>('total');
  const [days, setDays] = useState(30); // Default 30 days for recent

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchOverview = async () => {
    try {
      const res = await api.get<OverviewData>('/api/playtime/overview');
      setOverview(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRanking = async () => {
    setLoading(true);
    try {
      const url = mode === 'total' 
        ? '/api/playtime/total_ranking'
        : '/api/playtime/recent_ranking';
      
      const params: any = {
        page,
        per_page: 30,
        search: debouncedSearch
      };

      if (mode === 'recent') {
        params.days = days;
      }

      const res = await api.get<RankingResponse>(url, { params });
      setRanking(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  useEffect(() => {
    fetchRanking();
  }, [page, debouncedSearch, mode, days]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours === 0) return `${minutes}分钟`;
    return `${hours}小时${minutes}分钟`;
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-500">
            数据统计
          </h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            探索服务器的历史数据记录，查看排行榜和活跃玩家，感谢每一位玩家的陪伴。
          </p>
        </div>

        {/* Overview Cards */}
        {overview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <OverviewCard icon={<User className="text-blue-500 dark:text-blue-400" />} title="总玩家数" value={overview.total_players} color="blue" />
            <OverviewCard icon={<Clock className="text-emerald-500 dark:text-emerald-400" />} title="总游戏时长" value={overview.total_playtime} color="emerald" />
            <OverviewCard icon={<BarChart2 className="text-purple-500 dark:text-purple-400" />} title="今日在线" value={overview.today_online} color="purple" />
            <OverviewCard icon={<Trophy className="text-amber-500 dark:text-amber-400" />} title="活跃玩家" value={overview.active_players} color="amber" />
          </div>
        )}

        {/* Controls */}
        <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl p-6 border border-slate-200 dark:border-slate-800 mb-8 flex flex-col lg:flex-row justify-between gap-6 shadow-sm transition-colors duration-300">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex bg-slate-100 dark:bg-slate-950 rounded-lg p-1 border border-slate-200 dark:border-slate-800 transition-colors duration-300">
              <button
                onClick={() => { setMode('total'); setPage(1); }}
                className={clsx(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  mode === 'total' ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                )}
              >
                总排行榜
              </button>
              <button
                onClick={() => { setMode('recent'); setPage(1); }}
                className={clsx(
                  "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
                  mode === 'recent' ? "bg-brand-600 text-white shadow-sm shadow-brand-500/20" : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800"
                )}
              >
                近期活跃
              </button>
            </div>

            {mode === 'recent' && (
              <div className="relative">
                <select
                  value={days}
                  onChange={(e) => { setDays(Number(e.target.value)); setPage(1); }}
                  className="appearance-none bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm rounded-lg pl-4 pr-10 py-2 focus:ring-brand-500 focus:border-brand-500 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <option value={7}>最近 7 天</option>
                  <option value={30}>最近 30 天</option>
                  <option value={90}>最近 90 天</option>
                </select>
                <Calendar className="absolute right-3 top-2.5 text-slate-500 pointer-events-none" size={16} />
              </div>
            )}
            
            <button 
              onClick={() => { fetchRanking(); fetchOverview(); }}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
              title="刷新数据"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="relative w-full lg:w-72">
            <input
              type="text"
              placeholder="搜索玩家..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-11 pr-4 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <Search className="absolute left-4 top-3 text-slate-400 dark:text-slate-500" size={18} />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-medium backdrop-blur-sm transition-colors duration-300">
                <tr>
                  <th className="px-6 py-5">排名</th>
                  <th className="px-6 py-5">玩家</th>
                  <th className="px-6 py-5">游戏时长</th>
                  <th className="px-6 py-5">{mode === 'total' ? '登录次数' : '活跃天数'}</th>
                  <th className="px-6 py-5">最后登录</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-6 w-12 bg-slate-200 dark:bg-slate-800/50 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-8 w-48 bg-slate-200 dark:bg-slate-800/50 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-6 w-24 bg-slate-200 dark:bg-slate-800/50 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-6 w-16 bg-slate-200 dark:bg-slate-800/50 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-6 w-32 bg-slate-200 dark:bg-slate-800/50 rounded"></div></td>
                    </tr>
                  ))
                ) : ranking?.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-4">
                        <Search size={48} className="text-slate-300 dark:text-slate-700" />
                        <p className="text-lg">未找到相关玩家数据</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  ranking?.data.map((player, index) => {
                    const rank = (page - 1) * 30 + index + 1;
                    return (
                      <motion.tr
                        key={player.username}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={clsx(
                          "hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group",
                          rank === 1 ? "bg-yellow-500/5 hover:bg-yellow-500/10" : 
                          rank === 2 ? "bg-slate-400/5 hover:bg-slate-400/10" : 
                          rank === 3 ? "bg-orange-500/5 hover:bg-orange-500/10" : ""
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {rank === 1 ? <Medal className="text-yellow-500 dark:text-yellow-400" size={20} /> :
                             rank === 2 ? <Medal className="text-slate-400 dark:text-slate-300" size={20} /> :
                             rank === 3 ? <Medal className="text-orange-500 dark:text-orange-400" size={20} /> :
                             <span className="font-mono text-slate-500 w-5 text-center">{rank}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <img
                                src={`https://cravatar.eu/helmavatar/${player.username}/40.png`}
                                alt={player.username}
                                className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800 shadow-sm group-hover:scale-110 transition-transform"
                                onError={(e) => (e.target as HTMLImageElement).src = 'https://cravatar.eu/helmavatar/MHF_Steve/40.png'}
                              />
                              <div className={clsx("absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900",
                                player.online ? "bg-green-500" : "bg-slate-400 dark:bg-slate-600"
                              )} />
                            </div>
                            <Link to={`/player/${player.username}`} className={clsx("font-bold text-base hover:underline", 
                              rank === 1 ? "text-yellow-600 dark:text-yellow-400" : 
                              rank === 2 ? "text-slate-600 dark:text-slate-300" : 
                              rank === 3 ? "text-orange-600 dark:text-orange-400" : "text-slate-700 dark:text-slate-200"
                            )}>
                              {player.username}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-brand-600 dark:text-brand-300 font-medium">
                          {formatTime(Number(mode === 'total' ? player.total_playtime : player.recent_playtime))}
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-700 dark:text-slate-200 font-medium">{mode === 'total' ? player.login_count : player.play_days}</span>
                            <span className="text-xs">{mode === 'total' ? '次' : '天'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-sm">
                          {new Date(player.last_login).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {ranking && ranking.pagination.total_pages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-950/30 transition-colors duration-300">
              <div className="text-slate-500 dark:text-slate-400 text-sm">
                显示 {((ranking.pagination.current_page - 1) * 30) + 1} - {Math.min(ranking.pagination.current_page * 30, ranking.pagination.total)} 条，共 {ranking.pagination.total} 条
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 dark:text-slate-400 transition-colors"
                  title="第一页"
                >
                  <ChevronsLeft size={18} />
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 dark:text-slate-400 transition-colors"
                  title="上一页"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <div className="flex items-center gap-1 hidden sm:flex">
                  {(() => {
                    const totalPages = ranking.pagination.total_pages;
                    const pages = [];
                    const showMax = 5;
                    let start = Math.max(1, page - 2);
                    let end = Math.min(totalPages, start + showMax - 1);
                    
                    if (end - start < showMax - 1) {
                      start = Math.max(1, end - showMax + 1);
                    }
                    
                    for (let i = start; i <= end; i++) {
                      pages.push(i);
                    }
                    
                    return pages.map(p => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={clsx(
                          "w-9 h-9 rounded-lg text-sm font-bold transition-all duration-200",
                          p === page 
                            ? "bg-brand-600 text-white shadow-sm shadow-brand-500/25 scale-105" 
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        {p}
                      </button>
                    ));
                  })()}
                </div>

                <button
                  onClick={() => setPage(p => Math.min(ranking.pagination.total_pages, p + 1))}
                  disabled={page === ranking.pagination.total_pages}
                  className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 dark:text-slate-400 transition-colors"
                  title="下一页"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => setPage(ranking.pagination.total_pages)}
                  disabled={page === ranking.pagination.total_pages}
                  className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-slate-500 dark:text-slate-400 transition-colors"
                  title="最后一页"
                >
                  <ChevronsRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const OverviewCard = ({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string, color: string }) => (
  <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group shadow-sm">
    <div className={`p-4 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 group-hover:border-${color}-500/30 group-hover:shadow-sm group-hover:shadow-${color}-500/10 transition-all duration-300 shrink-0`}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{title}</p>
      <p className={clsx(
        "font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-brand-600 dark:group-hover:text-brand-100 transition-colors whitespace-nowrap",
        value.length > 12 ? "text-base" : value.length > 8 ? "text-lg" : "text-2xl"
      )} title={value}>{value}</p>
    </div>
  </div>
);

export default Stats;
