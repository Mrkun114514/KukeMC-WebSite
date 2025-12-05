import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTitle } from '../hooks/useTitle';
import { Heart, ExternalLink, Calendar, MessageCircle, Zap, Sparkles, Star, Loader2, AlertCircle } from 'lucide-react';
import api from '../utils/api';

interface Sponsor {
  id: number;
  name: string;
  name_color?: string;
  nameColor?: string; // Backend returns name_color, but let's support both or map it
  amount: number;
  amount_color?: string;
  amountColor?: string;
  message: string;
  platform: string;
  date: string;
  link?: string;
}

const platformColors: Record<string, string> = {
  WeChat: 'bg-[#09bb07]/10 text-[#09bb07] border-[#09bb07]/20',
  Alipay: 'bg-[#1678ff]/10 text-[#1678ff] border-[#1678ff]/20',
  QQ: 'bg-[#12b7f5]/10 text-[#12b7f5] border-[#12b7f5]/20',
  afdian: 'bg-[#946ce6]/10 text-[#946ce6] border-[#946ce6]/20',
};

const platformNames: Record<string, string> = {
  WeChat: '微信支付',
  Alipay: '支付宝',
  QQ: 'QQ支付',
  afdian: '爱发电',
};

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const Thanks = () => {
  useTitle('特别鸣谢-KukeMC-我的世界服务器(Minecraft)');
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const donate = {
    "text": "捐赠的所有收入将全部用于维护服务器！",
    "link": "https://afdian.com/a/kukemc",
    "images": [
      {
        "src": "https://m.ccw.site/gandi_application/user_assets/7ebd7661e9bc19c088de1b7825673b57.jpg",
        "name": "微信支付"
      },
      {
        "src": "https://m.ccw.site/gandi_application/user_assets/10dd46a5d2ccabc91d2ab9ca6f11b707.jpg",
        "name": "支付宝"
      }
    ]
  };

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        setLoading(true);
        const response = await api.get<Sponsor[]>('/api/thanks/');
        const mappedData = response.data.map(item => ({
          ...item,
          nameColor: item.name_color,
          amountColor: item.amount_color
        }));
        setSponsors(mappedData);
      } catch (err) {
        console.error("Failed to fetch sponsors:", err);
        setError("无法加载赞助列表，请稍后重试");
      } finally {
        setLoading(false);
      }
    };

    fetchSponsors();
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            className="inline-flex items-center justify-center p-4 bg-red-500/10 rounded-full mb-6 ring-1 ring-red-500/20"
          >
            <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
            >
                <Heart className="w-10 h-10 text-red-500 fill-current" />
            </motion.div>
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
            特别<span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-600 dark:from-red-400 dark:to-pink-600">鸣谢</span>
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            感谢每一位为 KukeMC 做出贡献的伙伴，是你们的支持让服务器变得更好。
          </p>
        </motion.div>

        {/* Sponsors Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-400 text-sm">正在加载赞助列表...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-red-400 gap-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20"
        >
          {sponsors.map((sponsor, index) => (
            <motion.div
              key={sponsor.id || index}
              variants={item}
              className="group relative bg-white/80 dark:bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:border-brand-500/30 dark:hover:border-slate-700 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-1"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-lg border border-slate-200 dark:border-slate-700">
                    {sponsor.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    {sponsor.link ? (
                      <a
                        href={sponsor.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`font-bold text-lg flex items-center gap-1 hover:underline ${sponsor.nameColor ? `text-${sponsor.nameColor}-500` : 'text-slate-900 dark:text-white'}`}
                        style={sponsor.nameColor ? { color: sponsor.nameColor } : {}}
                      >
                        {sponsor.name}
                        <ExternalLink className="w-3 h-3 opacity-50" />
                      </a>
                    ) : (
                      <span
                        className={`font-bold text-lg ${sponsor.nameColor ? '' : 'text-slate-900 dark:text-white'}`}
                        style={sponsor.nameColor ? { color: sponsor.nameColor } : {}}
                      >
                        {sponsor.name}
                      </span>
                    )}
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      {sponsor.date}
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full border ${platformColors[sponsor.platform] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'}`}>
                  {platformNames[sponsor.platform] || sponsor.platform}
                </span>
              </div>

              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-sm text-slate-500 dark:text-slate-400">赞助了</span>
                <span
                    className={`text-2xl font-bold font-mono ${!sponsor.amountColor ? 'text-brand-600 dark:text-brand-400' : ''}`}
                    style={sponsor.amountColor ? { color: sponsor.amountColor } : {}}
                >
                    ¥{sponsor.amount}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800/50 relative">
                <MessageCircle className="w-4 h-4 text-slate-400 dark:text-slate-600 absolute top-4 left-4" />
                <p className="text-slate-600 dark:text-slate-300 text-sm pl-6 italic">
                  "{sponsor.message}"
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
        )}

        {/* Donate Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/50 p-8 text-center md:p-12 shadow-2xl"
        >
            {/* Dynamic Background */}
            <motion.div 
                animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3], 
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-[100px]"
            />
            <motion.div 
                animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.5, 0.3], 
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-purple-500/20 blur-[100px]"
            />

            {/* Floating Icons */}
            <motion.div
                animate={{ y: [-10, 10, -10], rotate: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[10%] top-[20%] opacity-20"
            >
                <Star className="h-8 w-8 text-yellow-400 fill-yellow-400" />
            </motion.div>
            <motion.div
                animate={{ y: [10, -10, 10], rotate: [0, -15, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute right-[10%] top-[30%] opacity-20"
            >
                <Sparkles className="h-10 w-10 text-purple-400" />
            </motion.div>

            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-purple-500/5" />
            <div className="absolute inset-0 bg-grid-slate-900/[0.02] dark:bg-grid-white/[0.02] bg-[size:32px_32px]" />
            
            <div className="relative z-10">
                <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/20 relative"
                >
                    <div className="absolute inset-0 rounded-2xl bg-white/30 animate-ping opacity-20" />
                    <Heart className="relative z-10 h-8 w-8 text-white fill-white" />
                </motion.div>
                
                <div className="relative inline-block mb-4">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white md:text-4xl">支持我们</h2>
                    <Sparkles className="absolute -right-8 -top-4 h-6 w-6 animate-bounce text-yellow-400" />
                </div>
                
                <p className="mx-auto mb-10 max-w-2xl text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
                    {donate.text}
                </p>
                
                <div className="mx-auto mb-12 flex max-w-4xl flex-col justify-center gap-8 md:flex-row">
                    {donate.images.map((img, idx) => (
                        <motion.div 
                            key={idx} 
                            whileHover={{ y: -8, rotate: idx % 2 === 0 ? -1 : 1 }}
                            className="group relative overflow-hidden rounded-2xl bg-white p-3 shadow-xl transition-all duration-300"
                        >
                            {/* Shimmer Effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent z-10 pointer-events-none" />
                            
                            <div className="relative aspect-square w-80 overflow-hidden rounded-xl bg-slate-50">
                                <img 
                                    src={img.src} 
                                    alt={img.name} 
                                    className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-105" 
                                />
                            </div>
                            <div className="mt-3 border-t border-slate-100 pt-3">
                                <p className="font-bold text-slate-800">{img.name}</p>
                                <p className="text-xs text-slate-500">扫码支付</p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.a
                    href={donate.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    animate={{ 
                        boxShadow: ["0 10px 15px -3px rgba(99, 102, 241, 0.25)", "0 10px 25px -3px rgba(99, 102, 241, 0.5)", "0 10px 15px -3px rgba(99, 102, 241, 0.25)"]
                    }}
                    transition={{ 
                        boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-4 text-lg font-bold text-white transition-all duration-300"
                >
                    <span className="relative z-10 flex items-center gap-2">
                        <Zap className="h-5 w-5 fill-current animate-[pulse_2s_infinite]" />
                        前往爱发电赞助
                    </span>
                    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-600 to-indigo-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent z-0" />
                </motion.a>
            </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Thanks;
