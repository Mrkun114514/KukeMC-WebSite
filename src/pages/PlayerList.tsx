import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useTitle } from '../hooks/useTitle';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Users, Server as ServerIcon, RefreshCw, Wifi, WifiOff, Zap } from 'lucide-react';
import clsx from 'clsx';
import { SERVER_NAMES } from '../utils/servers';

interface Player {
  name: string;
  server: string;
  ping?: number;
}

interface PlayerListResponse {
  lastUpdate: string;
  players: Player[];
}

const PlayerList = () => {
  useTitle('在线玩家 - KukeMC');
  const [data, setData] = useState<PlayerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const res = await api.get<PlayerListResponse>('/api/playerlist');
      setData(res.data);
      setError('');
    } catch (err) {
      setError('无法获取玩家列表，请稍后重试。');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 60000);
    return () => clearInterval(interval);
  }, []);

  const filteredPlayers = useMemo(() => {
    if (!data) return [];
    return data.players.filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (SERVER_NAMES[player.server] || player.server).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'all' || player.server === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [data, searchTerm, activeTab]);

  // Calculate server counts for tabs
  const serverCounts = useMemo(() => {
    const counts: Record<string, number> = { all: data?.players.length || 0 };
    data?.players.forEach(p => {
      counts[p.server] = (counts[p.server] || 0) + 1;
    });
    return counts;
  }, [data]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-3xl dark:bg-brand-500/5 mix-blend-multiply dark:mix-blend-screen animate-blob" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-purple-500/10 blur-3xl dark:bg-purple-500/5 mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-2000" />
        <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/5 mix-blend-multiply dark:mix-blend-screen animate-blob animation-delay-4000" />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="space-y-2">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400"
            >
              在线玩家
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-slate-600 dark:text-slate-400 text-lg"
            >
              实时监控服务器在线状态与玩家分布
            </motion.p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-4 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md p-3 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-sm"
          >
            <div className="flex items-center gap-3 px-2">
              <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg text-brand-600 dark:text-brand-400">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Total Online</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">{data?.players.length || 0}</p>
              </div>
            </div>
            <div className="w-px h-10 bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-3 px-2">
              <button 
                onClick={fetchPlayers} 
                disabled={loading}
                className={clsx(
                  "p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95", 
                  loading ? "text-brand-500 animate-spin" : "text-slate-600 dark:text-slate-400"
                )}
                title="刷新列表"
              >
                <RefreshCw size={20} />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Controls Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6 mb-8"
        >
          {/* Search Bar */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex items-center">
              <div className="pl-4 text-slate-400">
                <Search size={20} />
              </div>
              <input
                type="text"
                placeholder="搜索玩家 ID 或服务器名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent border-none py-4 px-4 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-0 text-lg"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="mr-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Server Filter Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {Object.entries(SERVER_NAMES).map(([key, name]) => {
              const count = serverCounts[key] || 0;
              if (key !== 'all' && count === 0) return null;
              
              return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={clsx(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 flex items-center gap-2 border",
                  activeTab === key
                    ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30 scale-105"
                    : "bg-white/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400"
                )}
              >
                {key === 'all' ? <Users size={16} /> : <ServerIcon size={16} />}
                {name}
                <span className={clsx(
                  "px-2 py-0.5 rounded-full text-xs",
                  activeTab === key
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 dark:bg-slate-900 text-slate-500"
                )}>
                  {count}
                </span>
              </button>
              );
            })}
          </div>
        </motion.div>

        {/* Player Grid */}
        {loading && !data ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center text-red-500 mb-4">
              <WifiOff size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">连接失败</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md">{error}</p>
            <button 
              onClick={fetchPlayers}
              className="mt-6 px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
            >
              重试
            </button>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
             <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">未找到玩家</h3>
            <p className="text-slate-500 dark:text-slate-400">尝试切换服务器或使用不同的搜索词</p>
          </div>
        ) : (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredPlayers.map((player) => (
                <motion.div
                  layout
                  key={player.name}
                  variants={item}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, scale: 0.9 }}
                >
                  <Link 
                    to={`/player/${player.name}`}
                    className="block group relative bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:shadow-brand-500/10 hover:border-brand-500/30 dark:hover:border-brand-500/30 transition-all duration-300 overflow-hidden"
                  >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Zap className="text-brand-500" size={16} />
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-100 dark:ring-slate-800 group-hover:ring-brand-500/30 transition-all duration-300">
                        <img
                          src={`https://cravatar.eu/helmavatar/${player.name}/64.png`}
                          alt={player.name}
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://cravatar.eu/helmavatar/MHF_Steve/64.png';
                          }}
                        />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 truncate group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                        {player.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <ServerIcon size={12} />
                        <span className="truncate bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          {SERVER_NAMES[player.server] || player.server}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Online
                    </div>
                    {player.ping !== undefined && (
                      <div className={clsx(
                        "flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg",
                        player.ping < 100 ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" :
                        player.ping < 200 ? "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400" :
                        "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                      )}>
                        <Wifi size={12} />
                        {player.ping}ms
                      </div>
                    )}
                  </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PlayerList;
