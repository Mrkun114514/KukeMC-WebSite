import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, CheckCircle, Copy, Terminal, ArrowLeft, ShieldCheck, Server, User, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTitle } from '../hooks/useTitle';

const Login = () => {
  useTitle('玩家登录');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  
  const [step, setStep] = useState<'input' | 'verify' | 'success'>('input');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  const handleInitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await api.post('/api/player-auth/init', { username });
      const newCode = res.data.code;
      setCode(newCode);
      setStep('verify');
      // Start polling
      // Clear existing timer if any
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      
      // Use closure to capture the current code, or use ref.
      // The issue is that 'code' state variable inside setInterval callback refers to the initial state (empty string) due to closure.
      // We need to pass the newCode explicitly or use a ref.
      pollTimerRef.current = setInterval(() => checkStatus(username, newCode), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to initialize login');
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async (currentUsername: string, currentCode: string) => {
    try {
      const res = await api.get('/api/player-auth/check', {
        params: { username: currentUsername, code: currentCode }
      });
      
      if (res.data.verified) {
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        setStep('success');
        // Wait a bit to show success animation then login & redirect
        setTimeout(() => {
          login(res.data.user, res.data.token);
          const from = (location.state as any)?.from?.pathname || '/';
          navigate(from);
        }, 2000);
      }
    } catch (err) {
      // Ignore errors during polling
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(`/weblogin ${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    exit: { opacity: 0, y: -20 }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 z-10">
        {/* Left Side: Info/Branding */}
        <div className="hidden lg:flex flex-col justify-center p-8 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm font-medium mb-4">
              <ShieldCheck size={16} />
              <span>安全验证系统</span>
            </div>
            <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
              欢迎回到 <br/>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">
                KukeMC
              </span>
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md">
              请使用您的 Minecraft 游戏账号进行验证登录。无需注册密码，通过游戏内指令即可快速安全地登录。
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-4 mt-8"
          >
            <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
              <Server className="w-8 h-8 text-blue-500 mb-3" />
              <h3 className="font-semibold text-slate-900 dark:text-white">即时同步</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                数据与游戏服务器实时互通
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
              <User className="w-8 h-8 text-cyan-500 mb-3" />
              <h3 className="font-semibold text-slate-900 dark:text-white">账号安全</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                无需密码，杜绝盗号风险
              </p>
            </div>
          </motion.div>
        </div>

        {/* Right Side: Login Form */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 lg:p-12 relative"
        >
          <button 
            onClick={() => navigate('/')}
            className="absolute top-6 left-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="mt-8">
             <AnimatePresence mode="wait">
                {step === 'input' && (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">玩家登录</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-2">请输入您的游戏ID以开始验证</p>
                    </div>

                    <form onSubmit={handleInitLogin} className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Minecraft ID
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="例如: Steve"
                            className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium"
                            autoFocus
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            <img 
                              src={`https://cravatar.eu/helmavatar/${username || 'Steve'}/24.png`}
                              alt="avatar"
                              className="w-6 h-6 rounded"
                            />
                          </div>
                        </div>
                      </div>

                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center"
                        >
                          {error}
                        </motion.div>
                      )}

                      <button
                        type="submit"
                        disabled={loading || !username}
                        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/25 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                      >
                        {loading ? <Loader2 className="animate-spin" size={24} /> : '获取验证指令'}
                      </button>
                    </form>
                  </motion.div>
                )}

                {step === 'verify' && (
                  <motion.div
                    key="verify"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="text-center"
                  >
                    <div className="mb-8">
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">验证身份</h2>
                      <p className="text-slate-500 dark:text-slate-400 mt-2">请在游戏内输入以下指令</p>
                    </div>
                    
                    <div 
                      className="bg-slate-900 rounded-xl p-6 mb-8 relative group cursor-pointer border border-slate-800 shadow-inner overflow-hidden" 
                      onClick={copyCode}
                    >
                      <div className="flex items-center justify-center gap-3 text-green-400 font-mono text-xl font-bold tracking-wide">
                        <Terminal size={24} />
                        <span>/weblogin {code}</span>
                      </div>
                      
                      {/* Copy Overlay */}
                      <div className={clsx(
                        "absolute inset-0 flex items-center justify-center bg-slate-900/95 transition-all duration-200 backdrop-blur-sm",
                        copied ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}>
                        <span className={clsx(
                          "font-medium flex items-center gap-2 transition-transform duration-200",
                          copied ? "text-green-400 scale-110" : "text-white scale-100"
                        )}>
                          {copied ? <Check size={20} /> : <Copy size={20} />}
                          {copied ? '已复制到剪贴板' : '点击复制指令'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                        <Loader2 className="animate-spin" size={20} />
                        <span>正在等待验证...</span>
                      </div>
                      <p className="text-sm text-slate-400">
                         请不要关闭此页面，验证成功后将自动跳转
                      </p>
                      <button 
                        onClick={() => {
                           setStep('input');
                           if (pollTimerRef.current) clearInterval(pollTimerRef.current);
                        }}
                        className="mt-4 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                      >
                        返回修改ID
                      </button>
                    </div>
                  </motion.div>
                )}

                {step === 'success' && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle size={48} className="text-green-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                      验证成功
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                      正在跳转至首页...
                    </p>
                  </motion.div>
                )}
             </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
