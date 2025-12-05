import React, { useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { Copy, Check, ArrowRight, Gamepad2, Shield, Heart, Zap, Users, Calendar, Trophy, Camera, MessageSquare, ExternalLink, X, ZoomIn, ChevronLeft, ChevronRight, Box, Pickaxe, Sword, Leaf, Sun, FlaskConical, BedDouble, Cog, Skull, Infinity, Layers, Search, Ghost } from 'lucide-react';
import clsx from 'clsx';

// Data
const scenicImages = [
  {
    src: "https://m.ccw.site/gandi_application/user_assets/a0c2de8fe9a53e81deaf11fc19da6d52.jpg",
    title: "主城风景",
    description: "主城一处美好风光"
  },
  {
    src: "https://m.ccw.site/gandi_application/user_assets/0e7ef28c24e3ee63b7c9f31362e12803.jpg",
    title: "主城风景",
    description: "主城一处美好风光"
  },
  {
    src: "https://m.ccw.site/gandi_application/user_assets/caa27402a39899ce10964ecd2a544161.jpg",
    title: "其他风景",
    description: "粘液空岛-- 大唐不夜城"
  },
  {
    src: "https://m.ccw.site/gandi_application/user_assets/a17b7e2f515de9ee70f8e5b9d5585a0f.jpg",
    title: "其他风景",
    description: "机械动力-- 混凝土量产流水线"
  },
  {
    src: "https://m.ccw.site/gandi_application/user_assets/682263843b8e631893afa944f1dc85e8.jpg",
    title: "玩家合照",
    description: "职业战争-- 2024 跨年晚会"
  },
  {
    src: "https://cdn.nlark.com/yuque/0/2025/jpeg/25796891/1754700888552-413f40f0-6f16-49c4-8c65-0be2957f611e.jpeg",
    title: "玩家建筑",
    description: "趣味生存-- by taoliu666"
  },
  {
    src: "https://cdn.nlark.com/yuque/0/2025/jpeg/25796891/1754700888609-887adb7c-3f4b-45cb-8207-415d5f54c423.jpeg",
    title: "玩家建筑",
    description: "趣味生存-- by taoliu666"
  },
  {
    src: "https://cdn.nlark.com/yuque/0/2025/jpeg/25796891/1754700888845-b77ddfaa-6e73-4b80-9c28-84a998013407.jpeg",
    title: "玩家建筑",
    description: "趣味生存-- by taoliu666"
  },
  {
    src: "https://cdn.nlark.com/yuque/0/2025/jpeg/25796891/1754700888622-9f795130-e070-4529-bed7-4ffd73440611.jpeg",
    title: "玩家建筑",
    description: "趣味生存-- by taoliu666"
  },
  {
    src: "https://cdn.nlark.com/yuque/0/2025/jpeg/25796891/1755425471434-cdc637e8-58d3-4afe-8050-b69d48b9087f.jpeg",
    title: "玩家建筑",
    description: "趣味生存-- by taoliu666"
  },
  {
    src: "https://cdn.nlark.com/yuque/0/2025/png/25796891/1755425842611-fd33767e-53ab-4473-80cb-da06b71224d9.png",
    title: "主城风景",
    description: "趣味生存-- 主城风景"
  },
  {
    src: "https://cdn.nlark.com/yuque/0/2025/png/25796891/1755426230177-045a148b-2f81-414d-b398-52d0d16f4c69.png",
    title: "主城风景",
    description: "趣味生存-- 主城风景"
  },
  {
    src: "https://cdn.nlark.com/yuque/0/2025/png/25796891/1755426219735-d84afeb8-54ed-46a2-95be-8922bf7c30c0.png",
    title: "玩家合照",
    description: "主大厅-- 2025 跨年晚会"
  },
  {
    src: "https://cdn.nlark.com/yuque/0/2025/png/25796891/1755426204574-d319eff5-b7de-4e8b-9e61-b80478fe672d.png",
    title: "玩家合照",
    description: "主大厅-- 2025 跨年晚会"
  }
];

const servers = [
  {
    name: "趣味生存",
    desc: "原汁原味的生存体验，加入了丰富的趣味玩法，让你的生存之旅更加有趣。",
    version: "1.18.2 - 1.21.8",
    category: "survival",
    img: "https://m.ccw.site/gandi_application/user_assets/1ea2d690428204c6068f99736c08265a.jpg",
    icon: Pickaxe
  },
  {
    name: "纯净生存",
    desc: "高版本 1.21.8 纯净生存服务器，不限制红石 允许生电，真正的纯净生存体验。",
    version: "1.18.2 - 1.21.8",
    category: "survival",
    img: "https://m.ccw.site/gandi_application/user_assets/a8266c57901c25c261c22304623d6b69.jpg",
    icon: Leaf
  },
  {
    name: "避暑山庄",
    desc: "*友情链接* 耗时三年打造的监狱风云 进群916175816了解更多",
    version: "1.16.5 - 1.21.4",
    category: "survival",
    img: "https://m.ccw.site/gandi_application/user_assets/04850c78d2f633fb7b1439b7736211ec.jpg",
    icon: Sun
  },
  {
    name: "粘液空岛",
    desc: "体验独特的粘液科技魅力，打造属于你的科技帝国。拥有数百种机器与道具。",
    version: "1.12.2 - 1.21.8",
    category: "survival",
    img: "https://m.ccw.site/gandi_application/user_assets/7e43097682b27d85efab1d89ed4b0d70.jpg",
    icon: FlaskConical
  },
  {
    name: "职业战争",
    desc: "超过100种独特职业供你选择，由前网易MineMC职业策划精心设计。",
    version: "1.12.2 - 1.21.8",
    category: "minigame",
    img: "https://m.ccw.site/gandi_application/user_assets/2b8a1cc6f8739474b111ed1251278ba9.jpg",
    icon: Sword
  },
  {
    name: "起床战争",
    desc: "经典的小游戏玩法，保护你的床位并摧毁敌人的床位。",
    version: "1.12.2 - 1.21.8",
    category: "minigame",
    img: "https://m.ccw.site/gandi_application/user_assets/f7c5ca2df60d23ecf70d37bb19afa09f.jpg",
    icon: BedDouble
  },
  {
    name: "机械动力",
    desc: "探索机械动力模组的无限可能，建造复杂的机械系统，感受工业革命的魅力。",
    version: "1.21.1",
    category: "modded",
    img: "https://m.ccw.site/gandi_application/user_assets/a17b7e2f515de9ee70f8e5b9d5585a0f.jpg",
    icon: Cog
  },
  {
    name: "僵尸末日",
    desc: "最大程度的还原 Hypixel 僵尸末日小游戏，购买装备打败怪物。",
    version: "1.8 - 1.21.8",
    category: "minigame",
    img: "https://m.ccw.site/gandi_application/user_assets/4b2a56e7d537b207eac2d369e0923876.jpg",
    icon: Skull
  },
  {
    name: "无尽贪婪",
    desc: "基于无尽贪婪模组的服务器，探索强大的装备和物品，挑战各种强大的Boss。",
    version: "1.12.2",
    category: "modded",
    img: "https://m.ccw.site/gandi_application/user_assets/2a60641827556d97676692611f9189e8.jpg",
    icon: Infinity
  },
  {
    name: "搭路练习",
    desc: "专为PVP玩家设计的搭路练习服务器，提供各种难度的搭路挑战。",
    version: "1.8.9 - 1.21.8",
    category: "minigame",
    img: "https://m.ccw.site/gandi_application/user_assets/c5e42c138cd6e8e7b89d05574e24b90d.jpg",
    icon: Layers
  },
  {
    name: "密室杀手",
    desc: "紧张刺激的密室杀手游戏，平民、侦探、杀手，猜猜看到底是敌是友？",
    version: "1.12.2 - 1.21.8",
    category: "minigame",
    img: "https://m.ccw.site/gandi_application/user_assets/be85fcb20a66baa58eca6bce6d785bf1.jpg",
    icon: Search
  },
  {
    name: "后室",
    desc: "这里是...?",
    version: "1.18.2 - 1.21.8",
    category: "minigame",
    img: "https://m.ccw.site/gandi_application/user_assets/37eb412cf66eebe427ece00667d69a0a.png",
    icon: Ghost
  }
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  }
};

const Home = () => {

  const [copied, setCopied] = useState(false);
  const [copiedServer, setCopiedServer] = useState<string | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [category, setCategory] = useState('all');
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 2000);
  };

  const handleCopy = (e?: React.MouseEvent, ip: string = 'mc.kuke.ink', serverName?: string) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(ip);
    setCopied(true);
    if (serverName) {
      setCopiedServer(serverName);
      setTimeout(() => setCopiedServer(null), 2000);
    }
    showToast('服务器 IP 已复制到剪贴板！');
    setTimeout(() => setCopied(false), 2000);
  };

  const scrollToServers = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const element = document.getElementById('servers');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const filteredServers = category === 'all' 
    ? servers 
    : servers.filter(s => s.category === category);

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImage !== null) {
      setSelectedImage(selectedImage === 0 ? scenicImages.length - 1 : selectedImage - 1);
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImage !== null) {
      setSelectedImage(selectedImage === scenicImages.length - 1 ? 0 : selectedImage + 1);
    }
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 50,
        damping: 15
      }
    }
  };



  const { scrollY } = useScroll();
  const waveY = useTransform(scrollY, [0, 300], ["100%", "0%"]);

  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <motion.div 
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="w-full h-full"
          >
            <img 
              src="https://m.ccw.site/gandi_application/user_assets/a5417dc25fd821159f3e8362ba8e1ff2.jpg" 
              alt="Background" 
              className="w-full h-full object-cover"
            />
          </motion.div>
          
          {/* Immersive Overlay - Always dark for text readability */}
          <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[1px]" />
          
          {/* Subtle gradient at bottom for depth */}
          <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants} className="mb-2">
               <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-sm font-medium backdrop-blur-md">
                 Minecraft 1.21.x 粘液科技 & 多玩法群组
               </span>
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-7xl md:text-9xl font-black mb-6 tracking-tight text-white drop-shadow-2xl">
              Kuke<span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-cyan-300">MC</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-xl md:text-2xl text-slate-100 mb-10 max-w-2xl mx-auto font-light leading-relaxed drop-shadow-lg">
              探索无限可能，体验纯粹乐趣。<br/>
              <span className="text-brand-300 font-medium">火速！启动！</span>
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-12">
              <motion.button
                onClick={handleCopy}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative px-8 py-4 bg-brand-500 hover:bg-brand-400 text-white rounded-2xl font-bold text-lg transition-all shadow-[0_10px_30px_-10px_rgba(14,165,233,0.5)] flex items-center gap-3 overflow-hidden ring-4 ring-brand-500/20"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                {copied ? <Check size={20} /> : <Copy size={20} />}
                <span>{copied ? 'IP 已复制！' : 'mc.kuke.ink'}</span>
              </motion.button>
              
              <motion.a 
                href="#servers" 
                onClick={scrollToServers}
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255, 255, 255, 0.15)" }}
                whileTap={{ scale: 0.95 }}
                className="group px-8 py-4 bg-white/10 text-white rounded-2xl font-bold text-lg transition-all backdrop-blur-md flex items-center gap-2 border border-white/20 hover:border-white/40 shadow-lg"
              >
                服务器列表
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </motion.a>
            </motion.div>
          </motion.div>
        </div>

        {/* Wave Divider */}
        <motion.div 
          style={{ y: waveY }}
          className="absolute bottom-0 left-0 w-full leading-none z-20 translate-y-[1px]"
        >
            <svg className="relative block w-full h-[60px] sm:h-[120px]" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" 
                    className="fill-white dark:fill-slate-950 transition-colors duration-300"></path>
            </svg>
        </motion.div>
      </section>

      {/* Intro Section */}
      <section id="intro" className="py-24 relative bg-white dark:bg-slate-950 overflow-hidden transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-6">
                KukeMC Server <span className="text-brand-600 dark:text-brand-400">欢迎您</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-6">
                这是一个温馨和谐的多玩法群组服务器，提供了稳定流畅的体验。自从2023开服以来，
                我们努力创建一个环境良好、更公平公正的游戏氛围，和玩家们一起度过了很多愉快的时光。
                在这里的日子将会是你值得回忆的美好。
              </p>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed border-l-4 border-brand-500 pl-4 italic">
                我们保证不做影响平衡、破坏公平的行为。欢迎玩家提出意见或者举报违规行为，
                请大家自觉遵守游戏规则。
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 50, rotate: 2 }}
              whileInView={{ opacity: 1, x: 0, rotate: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-brand-500/20 blur-3xl rounded-full group-hover:bg-brand-500/30 transition-colors duration-500" />
              <motion.img 
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.5 }}
                src="https://m.ccw.site/gandi_application/user_assets/a5417dc25fd821159f3e8362ba8e1ff2.jpg" 
                alt="Intro" 
                className="relative rounded-2xl shadow-2xl border border-slate-200/50 dark:border-white/10 z-10"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Server List Section */}
      <section id="servers" className="py-24 relative bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">服务器列表</h2>
            <p className="text-slate-600 dark:text-slate-400">丰富多样的游戏玩法 - 都是我们的服务器！</p>
          </div>

          {/* Filter Buttons */}
          <div className="flex justify-center gap-4 mb-12 flex-wrap">
            {[
              { id: 'all', label: '全部服务器', icon: <Box size={18} /> },
              { id: 'survival', label: '生存服务器', icon: <Pickaxe size={18} /> },
              { id: 'minigame', label: '小游戏服务器', icon: <Sword size={18} /> },
              { id: 'modded', label: '模组服务器', icon: <Gamepad2 size={18} /> }
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setCategory(btn.id)}
                className={clsx(
                  'px-6 py-2 rounded-full flex items-center gap-2 font-medium transition-all duration-300 border',
                  category === btn.id
                    ? 'bg-brand-600 text-white border-brand-600 shadow-lg shadow-brand-500/25 scale-105'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                {btn.icon}
                {btn.label}
              </button>
            ))}
          </div>

          {/* Server Grid */}
          <motion.div 
            key={category}
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {filteredServers.map((server) => (
              <motion.div
                key={server.name}
                variants={cardVariants}
                whileHover={{ y: -8, transition: { duration: 0.3 } }}
                onClick={(e) => handleCopy(e, 'mc.kuke.ink', server.name)}
                className="group bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 hover:border-brand-500/50 transition-all shadow-lg hover:shadow-brand-500/10 cursor-pointer relative transform-gpu will-change-transform"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-900 rounded-t-xl transform-gpu -mb-px z-10">
                  <img 
                    src={server.img} 
                    alt={server.name}
                    className="block w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 will-change-transform"
                    style={{ backfaceVisibility: 'hidden' }}
                  />
                  {/* Hover Overlay */}
                  <div className={clsx(
                    "absolute -inset-1 z-10 bg-slate-900/80 transition-opacity duration-300 flex flex-col items-center justify-center backdrop-blur-sm",
                    copiedServer === server.name ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}>
                    {copiedServer === server.name ? (
                      <>
                        <Check size={32} className="text-green-400 mb-2" />
                        <span className="text-white font-bold text-lg">已复制!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={32} className="text-brand-400 mb-2 transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100" />
                        <span className="text-white font-bold text-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-150">点击复制 IP</span>
                        <span className="text-brand-400 text-sm mt-1 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-200">mc.kuke.ink</span>
                      </>
                    )}
                  </div>
                  
                  {/* Default Gradient (visible when not hovering) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-80 group-hover:opacity-0 transition-opacity duration-300" />
                  
                  {/* Version Badge (visible when not hovering) */}
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end group-hover:opacity-0 transition-opacity duration-300">
                    <span className="px-3 py-1 bg-brand-600/90 backdrop-blur-md text-xs font-bold text-white rounded-full shadow-lg">
                      {server.version}
                    </span>
                  </div>
                </div>
                <div className="p-6 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors relative z-0">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors flex items-center gap-2">
                    <server.icon size={24} className="text-brand-500" />
                    {server.name}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed line-clamp-2 group-hover:text-slate-800 dark:group-hover:text-slate-300 transition-colors">
                    {server.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="py-24 relative bg-white dark:bg-slate-950 overflow-hidden transition-colors duration-300">
        <style>{`
          @keyframes scroll-left {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes scroll-right {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }
          .animate-scroll-left-fast {
            animation: scroll-left 15s linear infinite;
          }
          .animate-scroll-right-fast {
            animation: scroll-right 15s linear infinite;
          }
          .pause-on-hover:hover {
            animation-play-state: paused;
          }
        `}</style>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">风景欣赏</h2>
        </div>
        
        <div className="relative flex flex-col gap-8">
          {/* Gradient Masks */}
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white dark:from-slate-950 to-transparent z-10 pointer-events-none transition-colors duration-300" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white dark:from-slate-950 to-transparent z-10 pointer-events-none transition-colors duration-300" />

          {/* Top Row - Scroll Left */}
          <div className="flex animate-scroll-left-fast pause-on-hover">
            {[...scenicImages, ...scenicImages].map((image, idx) => {
              const originalIndex = idx % scenicImages.length;
              return (
                <motion.div 
                  key={`row1-${idx}`}
                  whileHover={{ y: -5, scale: 1.02 }}
                  onClick={() => setSelectedImage(originalIndex)}
                  className="relative flex-shrink-0 w-[24rem] aspect-video rounded-xl overflow-hidden group cursor-pointer ring-1 ring-slate-200 dark:ring-white/10 hover:ring-brand-500/50 shadow-lg hover:shadow-brand-500/20 transition-all duration-300 mr-6"
                >
                  <img 
                    src={image.src} 
                    alt={image.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-white font-bold text-base">{image.title}</h4>
                        <ZoomIn className="w-4 h-4 text-brand-400" />
                      </div>
                      <p className="text-slate-300 text-xs line-clamp-2">{image.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bottom Row - Scroll Right */}
          <div className="flex animate-scroll-right-fast pause-on-hover">
            {[...scenicImages, ...scenicImages].reverse().map((image, idx) => {
              // Note: We need to calculate the correct original index for the reversed array
              // But simpler is just to use the image object itself if we want, or calc it.
              // scenicImages.length is 14. 
              // If we reverse [...scenicImages, ...scenicImages], the order is reversed.
              // To keep lightbox working correctly, we need to find the index of this image in the original scenicImages array.
              // Since image objects are references, we can just use indexOf (if unique) or just trust the content.
              // However, `scenicImages` might contain duplicates in definition? No, looks unique enough.
              const originalIndex = scenicImages.indexOf(image);
              
              return (
                <motion.div 
                  key={`row2-${idx}`}
                  whileHover={{ y: -5, scale: 1.02 }}
                  onClick={() => setSelectedImage(originalIndex)}
                  className="relative flex-shrink-0 w-[24rem] aspect-video rounded-xl overflow-hidden group cursor-pointer ring-1 ring-slate-200 dark:ring-white/10 hover:ring-brand-500/50 shadow-lg hover:shadow-brand-500/20 transition-all duration-300 mr-6"
                >
                  <img 
                    src={image.src} 
                    alt={image.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-white font-bold text-base">{image.title}</h4>
                        <ZoomIn className="w-4 h-4 text-brand-400" />
                      </div>
                      <p className="text-slate-300 text-xs line-clamp-2">{image.description}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl p-4 sm:p-8"
          >
            {/* Close Button */}
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 p-2 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors z-50"
            >
              <X size={32} />
            </button>

            {/* Navigation Buttons */}
            <button
              onClick={handlePrevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors z-50 hidden sm:block"
            >
              <ChevronLeft size={40} />
            </button>

            <button
              onClick={handleNextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors z-50 hidden sm:block"
            >
              <ChevronRight size={40} />
            </button>

            {/* Image Container */}
            <motion.div
              layoutId={`image-${selectedImage}`}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-7xl max-h-[85vh] w-full flex flex-col items-center"
            >
              <div className="relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-slate-200 dark:ring-white/10 bg-slate-100 dark:bg-slate-900">
                <img
                  src={scenicImages[selectedImage].src}
                  alt={scenicImages[selectedImage].title}
                  referrerPolicy="no-referrer"
                  className="max-h-[75vh] w-auto object-contain"
                />
              </div>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 text-center"
              >
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{scenicImages[selectedImage].title}</h3>
                <p className="text-slate-600 dark:text-slate-400 text-lg">{scenicImages[selectedImage].description}</p>
                <p className="text-slate-500 text-sm mt-2">
                  {selectedImage + 1} / {scenicImages.length}
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Features & Community Section */}
      <section className="py-24 relative overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-brand-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Features */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              <motion.h2 variants={itemVariants} className="text-3xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                <span className="w-1 h-8 bg-brand-500 rounded-full" />
                丰富的玩法 & 强劲配置
              </motion.h2>
              <div className="space-y-8">
                <motion.div variants={itemVariants} className="flex gap-5 group">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/10 to-brand-500/5 border border-brand-500/20 dark:border-brand-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-brand-500/5">
                    <Trophy className="w-7 h-7 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">12+ 种游戏模式</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      涵盖趣味生存、空岛、起床战争、职业战争、机械动力等多种玩法。
                      <br />
                      <span className="text-brand-600 dark:text-brand-400 font-medium">无限可能性，等你来探索！</span>
                    </p>
                  </div>
                </motion.div>
                
                <motion.div variants={itemVariants} className="flex gap-5 group">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/10 to-brand-500/5 border border-brand-500/20 dark:border-brand-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-brand-500/5">
                    <Zap className="w-7 h-7 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">强劲服务器配置</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      40核高性能CPU，96G超大内存，确保服务器流畅运行。
                      <br />
                      <span className="text-brand-600 dark:text-brand-400 font-medium">拒绝卡顿，享受极致体验！</span>
                    </p>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex gap-5 group">
                  <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500/10 to-brand-500/5 border border-brand-500/20 dark:border-brand-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-brand-500/5">
                    <Shield className="w-7 h-7 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">安全稳定的环境</h3>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      专业的反作弊系统和管理团队，全天候维护游戏环境。
                      <br />
                      <span className="text-brand-600 dark:text-brand-400 font-medium">公平竞技，畅享游戏乐趣！</span>
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>

            {/* Community */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={{
                hidden: { opacity: 0, x: 30 },
                visible: { 
                  opacity: 1, 
                  x: 0,
                  transition: { 
                    duration: 0.8, 
                    staggerChildren: 0.1,
                    delayChildren: 0.2
                  }
                }
              }}
              className="bg-white/80 dark:bg-slate-800/40 backdrop-blur-md rounded-3xl p-8 border border-slate-200/50 dark:border-slate-700/50 hover:border-brand-500/30 transition-all shadow-2xl relative group"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition duration-1000" />
              
              <div className="relative z-10">
                <motion.h2 variants={itemVariants} className="text-3xl font-bold text-slate-900 dark:text-white mb-6 flex items-center justify-between">
                  加入我们的社区
                  <Users className="w-8 h-8 text-brand-500/50" />
                </motion.h2>
                <motion.p variants={itemVariants} className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
                  与数千名玩家一起交流，分享游戏经验，参与各种有趣的活动。我们的社区永远欢迎新朋友！
                </motion.p>
                
                <motion.div variants={itemVariants} className="grid grid-cols-2 gap-6 mb-10">
                  {[
                    { icon: <MessageSquare />, text: "玩家交流", color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10" },
                    { icon: <Calendar />, text: "定期活动", color: "text-green-500 dark:text-green-400", bg: "bg-green-500/10" },
                    { icon: <Camera />, text: "最新动态", color: "text-purple-500 dark:text-purple-400", bg: "bg-purple-500/10" },
                    { icon: <Heart />, text: "温馨氛围", color: "text-red-500 dark:text-red-400", bg: "bg-red-500/10" },
                  ].map((item, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-3 text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/30 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg} ${item.color}`}>
                        {React.cloneElement(item.icon as React.ReactElement, { size: 18 })}
                      </div>
                      <span className="font-medium">{item.text}</span>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.a 
                  variants={itemVariants}
                  href="https://qm.qq.com/q/LVwHJncFSo" 
                  target="_blank" 
                  rel="noreferrer"
                  whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(14, 165, 233, 0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  className="block w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white text-center rounded-xl font-bold transition-all shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 relative overflow-hidden group/btn"
                >
                  <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                  <ExternalLink size={20} />
                  立即加入 QQ 群
                </motion.a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 bg-slate-900/90 backdrop-blur-md border border-brand-500/30 text-white rounded-full shadow-2xl shadow-brand-500/20"
          >
            <div className="bg-brand-500/20 p-1 rounded-full">
              <Check size={16} className="text-brand-400" />
            </div>
            <span className="font-medium text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;