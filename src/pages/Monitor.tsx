import { motion } from 'framer-motion';
import { useTitle } from '../hooks/useTitle';
import { Activity } from 'lucide-react';

const Monitor = () => {
  useTitle('玩家数据 - KukeMC我的世界服务器');
  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="inline-flex items-center justify-center p-3 bg-blue-500/10 rounded-full mb-4"
            >
              <Activity className="w-8 h-8 text-blue-500 dark:text-blue-400 transition-colors duration-300" />
            </motion.div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4 transition-colors duration-300">在线玩家数据监控</h1>
            <p className="text-slate-600 dark:text-gray-400 max-w-2xl mx-auto transition-colors duration-300">
              实时查看服务器在线玩家数据统计
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-xl overflow-hidden border border-slate-200 dark:border-gray-700/50 h-[900px] transition-colors duration-300"
          >
            <iframe 
              src="https://monitor.0ctber.cn/" 
              style={{ width: '100%', height: '100%', border: 'none' }}
              title="服务器监控面板"
            >
              <p>您的浏览器不支持 iframe，请访问 <a href="https://monitor.0ctber.cn/" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">https://monitor.0ctber.cn/</a> 查看监控信息。</p>
            </iframe>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Monitor;
