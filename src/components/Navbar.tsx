import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Home, 
  Users, 
  Ban, 
  BarChart3, 
  Map as MapIcon,
  MessageSquare,
  Shirt,
  Megaphone,
  Activity,
  Heart,
  BookOpen,
  Radio,
  MoreHorizontal,
  ChevronDown,
  ExternalLink,
  Ticket,
  Compass,
  ClipboardCheck,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import api from '../utils/api';

import { NotificationList } from './NotificationList';
import { UserProfileCard } from './UserProfileCard';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface NavLinkItem {
  name: string;
  path: string;
  icon: any;
  relatedPaths?: string[];
  external?: boolean;
}

// Extract NavItem component to prevent re-creation on each render (fixes animation reset)
const NavItem = ({ link, isMobile = false, isActive }: { link: NavLinkItem, isMobile?: boolean, isActive: boolean }) => {
  const Icon = link.icon;
  
  const content = (
    <>
      <div className="relative z-10 flex items-center gap-2">
        <Icon size={isMobile ? 20 : 18} className={clsx(isActive && !isMobile ? "text-blue-600 dark:text-blue-400" : "")} />
        <span className={clsx(isActive && !isMobile ? "font-semibold text-blue-600 dark:text-blue-400" : "")}>{link.name}</span>
        {link.external && (
          <ExternalLink size={12} className={clsx("opacity-50", isActive ? "text-blue-600 dark:text-blue-400" : "")} />
        )}
      </div>
      {isActive && !isMobile && (
        <motion.div
          layoutId="navbar-indicator"
          className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-lg -z-0"
          transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
        />
      )}
    </>
  );

  const className = clsx(
    'relative px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center gap-2 group',
    isMobile 
      ? 'w-full p-3 text-base'
      : 'hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50',
    isActive
      ? isMobile ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : ''
      : 'text-slate-600 dark:text-slate-300'
  );

  if (link.external) {
    return (
      <a
        href={link.path}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <Link to={link.path} className={className}>
      {content}
    </Link>
  );
};

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const [ticketCount, setTicketCount] = useState(0);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cycleTheme = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const ThemeIcon = {
    light: Sun,
    dark: Moon,
    system: Monitor
  }[theme] || Sun;

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setShowProfileCard(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setShowProfileCard(false);
    }, 200);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchCount = async () => {
        try {
          const res = await api.get('/api/feedback/stats/unprocessed_count');
          if (res.data.ok) setTicketCount(res.data.count);
        } catch (e) {}
      };
      fetchCount();
      const interval = setInterval(fetchCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
    setShowMore(false);
  }, [location]);

  const primaryLinks: NavLinkItem[] = [
    { name: '首页', path: '/', icon: Home },
    { name: '动态', path: '/activity', icon: Compass },
    { name: '公告', path: '/news', icon: Megaphone, relatedPaths: ['/changelog'] },
    { name: '众议', path: '/consensus', icon: ClipboardCheck },
    { name: '玩家', path: '/players', icon: Users },
    { name: '封禁', path: '/bans', icon: Ban },
    { name: '统计', path: '/stats', icon: BarChart3 },
  ];

  const secondaryLinks: NavLinkItem[] = [
    { name: '工单', path: '/tickets', icon: Ticket },
    { name: '监控', path: '/monitor', icon: Activity },
    { name: '留言', path: '/messages', icon: MessageSquare },
    { name: '皮肤', path: '/skin', icon: Shirt },
    { name: '文档', path: 'https://www.yuque.com/0ctber/kukemc-server/', icon: BookOpen, external: true },
    { name: '地图', path: 'https://map.kuke.ink', icon: MapIcon, external: true },
    { name: '状态', path: 'https://status.kuke.ink', icon: Radio, external: true },
    { name: '鸣谢', path: '/thanks', icon: Heart },
  ];

  const allLinks = [...primaryLinks, ...secondaryLinks];

  // Check if any secondary link is active
  const isMoreActive = secondaryLinks.some(link => 
    location.pathname === link.path || (link.relatedPaths && link.relatedPaths.includes(location.pathname))
  );

  return (
    <nav
      className={clsx(
        'fixed top-0 w-full z-40 transition-all duration-300 border-b border-transparent',
        scrolled ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-800/50 py-2 shadow-sm' : 'bg-transparent py-4'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group relative z-50">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img 
                src="https://m.ccw.site/gandi_application/user_assets/2a6bb37880317d2bb5525ab560618e04.png" 
                alt="KukeMC Logo" 
                className="h-9 w-9 relative z-10 transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">
              KukeMC
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            <div className="flex items-center gap-1">
              {primaryLinks.map((link) => {
                 const isActive = location.pathname === link.path || (link.relatedPaths?.includes(location.pathname) ?? false);
                 return <NavItem key={link.path} link={link} isActive={isActive} />;
              })}
              
              {/* More Menu Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowMore(!showMore)}
                  onBlur={() => setTimeout(() => setShowMore(false), 200)}
                  className={clsx(
                    'relative px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center gap-2 group outline-none',
                    isMoreActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  )}
                >
                  <div className="relative z-10 flex items-center gap-2">
                    <MoreHorizontal size={18} />
                    <span>更多</span>
                    <ChevronDown size={14} className={clsx("transition-transform duration-200", showMore ? "rotate-180" : "")} />
                  </div>
                  {isMoreActive && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-lg -z-0"
                    />
                  )}
                </button>

                <AnimatePresence>
                  {showMore && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden py-1 z-50"
                    >
                      {secondaryLinks.map((link) => {
                        const isActive = location.pathname === link.path || (link.relatedPaths?.includes(location.pathname) ?? false);
                        return (
                        <Link
                          key={link.path}
                          to={link.external ? '#' : link.path}
                          onClick={(e) => {
                            if (link.external) {
                              e.preventDefault();
                              window.open(link.path, '_blank');
                            }
                          }}
                          className={clsx(
                            "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-white"
                          )}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <link.icon size={16} />
                            {link.name}
                            {link.path === '/tickets' && ticketCount > 0 && (
                              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                                {ticketCount}
                              </span>
                            )}
                          </div>
                          {link.external && <ExternalLink size={12} className="opacity-50" />}
                        </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className="hidden lg:flex items-center gap-3 pl-4">
             <button
                onClick={cycleTheme}
                className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
             >
                <ThemeIcon size={20} />
             </button>
             <NotificationList />
             <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
            {user ? (
              <div 
                className="relative"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <Link to={`/player/${user.username}`} className="flex items-center gap-3 pl-1 py-2">
                  <div className="flex items-center gap-3 rounded-xl pl-1 pr-4 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <img 
                      src={`https://cravatar.eu/helmavatar/${user.username}/32.png`} 
                      alt={user.username}
                      className="w-8 h-8 rounded-lg ring-2 ring-white dark:ring-slate-800"
                    />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none">{user.username}</span>
                  </div>
                </Link>
                <UserProfileCard isOpen={showProfileCard} onClose={() => setShowProfileCard(false)} />
              </div>
            ) : (
              <Link
                to="/login"
                className="group relative px-6 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-bold transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
              >
                <span>登录</span>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-20 transition-opacity" />
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center gap-3">
            <button
              onClick={cycleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus:outline-none"
            >
              <ThemeIcon size={20} />
            </button>
            <NotificationList />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <div className="px-4 py-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {user ? (
                 <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                    <Link 
                      to={`/player/${user.username}`}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-4 flex-1"
                    >
                      <img 
                        src={`https://cravatar.eu/helmavatar/${user.username}/64.png`} 
                        alt={user.username}
                        className="w-12 h-12 rounded-xl shadow-sm"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-lg text-slate-900 dark:text-white">{user.username}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">点击查看个人主页</div>
                      </div>
                    </Link>
                    <button 
                      onClick={logout} 
                      className="px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm font-medium"
                    >
                      退出
                    </button>
                 </div>
              ) : (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-100 dark:border-blue-900/30">
                   <h3 className="font-bold text-slate-900 dark:text-white mb-2">欢迎来到 KukeMC</h3>
                   <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">登录以访问更多功能</p>
                   <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="block w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-center shadow-lg shadow-blue-500/20"
                  >
                    立即登录
                  </Link>
                </div>
              )}

              <div className="space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 pl-2">菜单</div>
                {allLinks.map((link) => {
                   const isActive = location.pathname === link.path || (link.relatedPaths?.includes(location.pathname) ?? false);
                   return <NavItem key={link.path} link={link} isMobile={true} isActive={isActive} />;
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
