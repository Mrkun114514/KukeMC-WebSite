import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User as UserIcon, 
  LogOut, 
  LayoutDashboard, 
  ChevronRight,
  Shield,
  FileText,
  MessageCircle,
  Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getFollowStats } from '../services/follow';
import { getMyLevelInfo } from '../services/leveling';
import LevelBadge from '@/components/LevelBadge';

interface UserProfileCardProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileCard = ({ isOpen, onClose }: UserProfileCardProps) => {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({ followers: 0, following: 0 });
  const [levelInfo, setLevelInfo] = useState<{ level: number; current_xp: number; next_level_xp: number } | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      const fetchData = async () => {
        try {
          const [followData, levelData] = await Promise.all([
            getFollowStats(user.username),
            getMyLevelInfo(user.username)
          ]);
          setStats({
            followers: followData.followers_count,
            following: followData.following_count
          });
          setLevelInfo(levelData);
        } catch (error) {
          console.error('Failed to fetch user data:', error);
        }
      };
      fetchData();
    }
  }, [isOpen, user]);

  if (!user) return null;

  const containerVariants = {
    hidden: { 
      opacity: 0, 
      y: 15, 
      scale: 0.95,
      x: "-50%",
      transition: { 
        duration: 0.2
      }
    },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      x: "-50%",
      transition: { 
        type: "spring", 
        stiffness: 350, 
        damping: 25,
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      y: 10, 
      scale: 0.95,
      x: "-50%",
      transition: { duration: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  const statVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="absolute top-full left-1/2 mt-2 w-80 z-50 origin-top"
          onMouseLeave={onClose}
        >
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
            {/* 顶部背景图 - 高度调整，颜色更浅更贴合主题 */}
            <div className="h-24 relative overflow-hidden group">
               {/* 主背景渐变 - 更浅的蓝青色系 */}
               <div className="absolute inset-0 bg-gradient-to-br from-sky-300 via-blue-400 to-indigo-400 dark:from-blue-800 dark:via-indigo-800 dark:to-purple-900"></div>
               
               {/* 噪点纹理叠加 */}
               <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-overlay"></div>
               
               {/* 装饰性网格 */}
               <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] opacity-30"></div>

               {/* 动态光晕与几何图形 - 改为蓝紫色系点缀 */}
               <motion.div 
                 animate={{ 
                   y: [0, -20, 0],
                   x: [0, 10, 0],
                   rotate: [0, 10, 0],
                   opacity: [0.3, 0.6, 0.3],
                 }}
                 transition={{ 
                   duration: 8, 
                   repeat: Infinity,
                   ease: "easeInOut" 
                 }}
                 className="absolute -top-10 -right-10 w-48 h-48 bg-blue-400/30 rounded-full blur-3xl mix-blend-screen"
               />
               <motion.div 
                 animate={{ 
                   y: [0, 15, 0],
                   x: [0, -10, 0],
                   scale: [1, 1.1, 1],
                   opacity: [0.2, 0.5, 0.2],
                 }}
                 transition={{ 
                   duration: 10, 
                   repeat: Infinity,
                   ease: "easeInOut",
                   delay: 1
                 }}
                 className="absolute top-10 -left-10 w-40 h-40 bg-purple-400/30 rounded-full blur-3xl mix-blend-screen"
               />

               {/* 悬浮的装饰圆环 */}
               <motion.div
                 animate={{ rotate: 360 }}
                 transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                 className="absolute top-4 right-8 w-16 h-16 border border-white/10 rounded-full border-dashed opacity-30"
               />
               
               {/* 右上角的小标签（可选） */}
               <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-2 py-0.5 text-[10px] text-white/80 font-medium">
                  KukeMC
               </div>
            </div>

            <div className="px-6 pb-6 relative">
              {/* 头像 - 居中且放大 */}
              <div className="relative -mt-12 mb-4 flex justify-center">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 20 }}
                  className="relative group cursor-pointer"
                >
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500"></div>
                    <Link to={`/player/${user.username}`}>
                        <img 
                            src={`https://cravatar.eu/helmavatar/${user.username}/128.png`} 
                            alt={user.username}
                            className="w-24 h-24 rounded-full border-[5px] border-white dark:border-slate-900 relative z-10 bg-white dark:bg-slate-800 transition-transform duration-300 group-hover:scale-105 shadow-lg"
                        />
                    </Link>
                    {user.role === 'admin' && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.3, type: "spring" }}
                          className="absolute bottom-1 right-1 bg-gradient-to-br from-yellow-300 to-yellow-500 text-yellow-900 p-1.5 rounded-full border-2 border-white dark:border-slate-900 z-20 shadow-sm" 
                          title="管理员"
                        >
                            <Shield size={14} fill="currentColor" />
                        </motion.div>
                    )}
                </motion.div>
              </div>

              {/* 用户名和等级 - 居中布局 */}
              <motion.div variants={itemVariants} className="text-center mb-6">
                <Link to={`/player/${user.username}`} className="inline-flex items-center gap-2 group">
                    <span className="text-xl font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {user.username}
                    </span>
                    <LevelBadge level={levelInfo?.level} size="md" />
                </Link>
                
                {/* 社交数据 - 增加交互动效 */}
                <div className="flex justify-center items-center gap-6 mt-3 text-sm">
                    <motion.div variants={statVariants} whileHover={{ scale: 1.1 }} className="flex flex-col items-center cursor-pointer group">
                        <span className="font-bold text-slate-900 dark:text-white text-base group-hover:text-emerald-500 transition-colors">{stats.following}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">关注</span>
                    </motion.div>
                    <div className="w-px h-8 bg-slate-100 dark:bg-slate-800"></div>
                    <motion.div variants={statVariants} whileHover={{ scale: 1.1 }} className="flex flex-col items-center cursor-pointer group">
                        <span className="font-bold text-slate-900 dark:text-white text-base group-hover:text-emerald-500 transition-colors">{stats.followers}</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">粉丝</span>
                    </motion.div>
                    <div className="w-px h-8 bg-slate-100 dark:bg-slate-800"></div>
                    <motion.div variants={statVariants} whileHover={{ scale: 1.1 }} className="flex flex-col items-center cursor-pointer group">
                        <span className="font-bold text-slate-900 dark:text-white text-base group-hover:text-emerald-500 transition-colors">0</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">动态</span>
                    </motion.div>
                </div>
              </motion.div>

              {/* 等级进度条 */}
              {levelInfo && (
                <motion.div variants={itemVariants} className="mb-6 group">
                    <div className="flex justify-between text-xs mb-2 text-slate-500 dark:text-slate-400 font-medium">
                        <span>经验进度</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{levelInfo.current_xp} / {levelInfo.next_level_xp}</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-[2px]">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(levelInfo.current_xp / levelInfo.next_level_xp) * 100}%` }}
                            transition={{ duration: 1.2, ease: "circOut", delay: 0.2 }}
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                        </motion.div>
                    </div>
                </motion.div>
              )}

              {/* 菜单列表 - 依次滑入 */}
              <div className="space-y-1.5 mb-5">
                {[
                  { to: `/player/${user.username}`, icon: UserIcon, label: '个人中心' },
                  { to: '/dashboard', icon: LayoutDashboard, label: '任务中心' },
                  { to: '/chat', icon: MessageCircle, label: '在线聊天' },
                  { to: '/tickets', icon: FileText, label: '我的工单' },
                  { to: '/settings', icon: Settings, label: '设置' }
                ].map((item) => (
                  <motion.div key={item.to} variants={itemVariants}>
                    <Link 
                      to={item.to} 
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-emerald-50 dark:bg-emerald-900/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <item.icon size={18} className="group-hover:scale-110 group-hover:text-emerald-500 transition-transform duration-300 relative z-10" />
                        <span className="font-medium relative z-10">{item.label}</span>
                        <ChevronRight size={14} className="ml-auto opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0 transition-all duration-300" />
                    </Link>
                  </motion.div>
                ))}
              </div>

              <motion.div variants={itemVariants} className="h-px bg-slate-100 dark:bg-slate-800 my-2" />

              {/* 底部操作 - 依次滑入 */}
              <div className="space-y-1.5">
                <motion.button 
                    variants={itemVariants}
                    onClick={() => { logout(); onClose(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group text-left relative overflow-hidden"
                >
                    <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="font-medium">退出登录</span>
                </motion.button>
              </div>

            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
