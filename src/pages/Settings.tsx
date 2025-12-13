import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Shield,
  Save,
  MessageSquare,
  Loader2,
  AlertCircle,
  CheckCircle,
  Music,
  Tag,
  Disc,
  Play,
  Mail,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import ModalPortal from '../components/ModalPortal';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

const Settings = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { success, error, warning } = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
  
  // Profile State
  const [profile, setProfile] = useState({
    signature: '',
    bio: '',
    tags: [] as string[],
    music_id: '',
    custom_title: ''
  });
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Music Preview State
  const [musicPreview, setMusicPreview] = useState<{
    name: string;
    artist: string;
    cover: string | null;
  } | null>(null);
  const [checkingMusic, setCheckingMusic] = useState(false);

  // Security State (QQ)
  const [qqInfo, setQqInfo] = useState<{
    bound: boolean;
    qq?: string;
    name?: string;
    avatar?: string;
    bind_time?: number;
  }>({ bound: false });
  const [isQQActionLoading, setIsQQActionLoading] = useState(false);
  
  // Bind QQ Modal State
  const [bindModalOpen, setBindModalOpen] = useState(false);
  const [bindQQInput, setBindQQInput] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isBinding, setIsBinding] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!bindQQInput || bindQQInput.length < 5) {
      warning('请输入正确输入您的QQ号');
      return;
    }
    setIsSendingCode(true);
    try {
      await api.post('/whitelist/qq/send_code', { qq: bindQQInput });
      setCountdown(60);
      success('验证码已发送至您的QQ邮箱，请注意查收');
    } catch (err: any) {
      error(err.response?.data?.error || '验证码发送失败');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleConfirmBind = async () => {
    if (!bindQQInput || !verificationCode) {
      warning('请填写完整信息');
      return;
    }
    setIsBinding(true);
    try {
      await api.post('/whitelist/qq/verify_bind', { qq: bindQQInput, code: verificationCode });
      setBindModalOpen(false);
      fetchSecurityInfo();
      setBindQQInput('');
      setVerificationCode('');
      setCountdown(0);
      setSaveMessage({ type: 'success', text: 'QQ绑定成功' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      error(err.response?.data?.error || '绑定失败');
    } finally {
      setIsBinding(false);
    }
  };

  // Confirm Modal
  // Removed custom ConfirmModal state in favor of Context


  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchSecurityInfo();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await api.get(`/api/profile/${user?.username}`);
      setProfile({
        signature: res.data.signature || '',
        bio: res.data.bio || '',
        tags: res.data.tags || [],
        music_id: res.data.music_id || '',
        custom_title: res.data.custom_title || ''
      });
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const fetchSecurityInfo = async () => {
    try {
      const res = await api.get(`/whitelist/player/${user?.username}`);
      if (res.data.bound && res.data.qq) {
        try {
            const detailRes = await api.get(`/whitelist/qq/info/${res.data.qq}`);
            setQqInfo({
              bound: true,
              qq: res.data.qq,
              name: detailRes.data.name,
              avatar: detailRes.data.avatar
            });
        } catch (e) {
            setQqInfo({
              bound: true,
              qq: res.data.qq
            });
        }
      } else {
        setQqInfo({ bound: false });
      }
    } catch (err) {
      console.error('Failed to fetch security info', err);
    }
  };

  const checkMusic = async (id: string) => {
    if (!id || id.length < 4) {
        setMusicPreview(null);
        return;
    }
    setCheckingMusic(true);
    try {
        const res = await api.get(`/api/profile/music/${id}`);
        setMusicPreview(res.data);
    } catch (error) {
        console.error('Failed to check music:', error);
        setMusicPreview(null);
    } finally {
        setCheckingMusic(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        if (profile.music_id) {
            checkMusic(profile.music_id);
        } else {
            setMusicPreview(null);
        }
    }, 800);
    return () => clearTimeout(timer);
  }, [profile.music_id]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await api.post('/api/profile/update', profile);
      setSaveMessage({ type: 'success', text: '个人资料已更新' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage({ type: 'error', text: err.response?.data?.detail || '更新失败' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !profile.tags.includes(newTag.trim())) {
      if (profile.tags.length >= 5) {
        warning("最多只能添加5个标签");
        return;
      }
      setProfile(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setProfile(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleBindQQ = () => {
    setBindModalOpen(true);
  };

  const handleUnbindQQ = async () => {
    const isConfirmed = await confirm({
        title: '解绑QQ',
        message: '确定要解绑当前QQ吗？解绑后将无法通过QQ快速登录。',
        isDangerous: true,
        confirmText: '解绑',
    });

    if (!isConfirmed) return;

    setIsQQActionLoading(true);
    try {
        await api.post('/whitelist/qq/unbind');
        setQqInfo({ bound: false });
        success('解绑成功');
    } catch (err: any) {
        error(err.response?.data?.error || '解绑失败');
    } finally {
        setIsQQActionLoading(false);
    }
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 pt-24">
      <SEO title="个人设置 - KukeMC" />
      <ModalPortal>
        
        {/* Bind QQ Modal */}
        <AnimatePresence>
          {bindModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => setBindModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 z-10"
              >
                <div className="p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Mail className="text-blue-500" size={24} />
                      绑定 QQ
                    </h3>
                    <button
                      onClick={() => setBindModalOpen(false)}
                      className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        QQ 号码
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={bindQQInput}
                          onChange={(e) => setBindQQInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="请输入您的QQ号"
                          className="w-full pl-4 pr-32 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        />
                        <button
                          onClick={handleSendCode}
                          disabled={isSendingCode || countdown > 0 || !bindQQInput}
                          className="absolute right-2 top-1.5 bottom-1.5 px-3 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-w-[80px]"
                        >
                          {isSendingCode ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : countdown > 0 ? (
                            `${countdown}s 后重发`
                          ) : (
                            '发送验证码'
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        我们将向您的 QQ 邮箱 ({bindQQInput || '...'}@qq.com) 发送验证码
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        验证码
                      </label>
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="请输入6位验证码"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all tracking-widest text-center text-lg font-mono"
                        maxLength={6}
                      />
                    </div>

                    <button
                      onClick={handleConfirmBind}
                      disabled={isBinding || !verificationCode || !bindQQInput}
                      className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                    >
                      {isBinding ? <Loader2 size={18} className="animate-spin" /> : null}
                      立即绑定
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
              delayChildren: 0.2
            }
          }
        }}
        className="max-w-4xl mx-auto"
      >
        <motion.h1 
          variants={{
            hidden: { opacity: 0, y: -20 },
            visible: { opacity: 1, y: 0 }
          }}
          className="text-3xl font-bold text-slate-900 dark:text-white mb-8"
        >
          个人设置
        </motion.h1>
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, x: -20 },
              visible: { opacity: 1, x: 0 }
            }}
            className="w-full md:w-64 flex-shrink-0"
          >
            <nav className="space-y-2 sticky top-24">
              <button
                onClick={() => setActiveTab('profile')}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left backdrop-blur-sm border border-transparent",
                  activeTab === 'profile'
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white/20 dark:hover:bg-slate-800/30 hover:border-white/20 dark:hover:border-slate-700/30"
                )}
              >
                <User size={20} />
                个人资料
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-left backdrop-blur-sm border border-transparent",
                  activeTab === 'security'
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    : "text-slate-600 dark:text-slate-300 hover:bg-white/20 dark:hover:bg-slate-800/30 hover:border-white/20 dark:hover:border-slate-700/30"
                )}
              >
                <Shield size={20} />
                账号与安全
              </button>
            </nav>
          </motion.div>

          {/* Main Content */}
          <motion.div 
            variants={{
              hidden: { opacity: 0, x: 20 },
              visible: { opacity: 1, x: 0 }
            }}
            className="flex-1"
          >
            <div className="rounded-2xl p-6 sm:p-8 min-h-[600px] relative overflow-hidden backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border border-white/40 dark:border-slate-700/50 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
              
              <AnimatePresence mode="wait">
              {activeTab === 'profile' ? (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                      <User className="text-emerald-500" />
                      编辑资料
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          个性签名
                        </label>
                        <input
                          type="text"
                          value={profile.signature}
                          onChange={(e) => setProfile({ ...profile, signature: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:bg-white/90 dark:hover:bg-slate-800/90"
                          placeholder="一句话介绍自己..."
                          maxLength={50}
                        />
                        <p className="text-xs text-slate-400 mt-1 text-right">{profile.signature.length}/50</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          个人简介 (Bio)
                        </label>
                        <textarea
                          value={profile.bio}
                          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all min-h-[120px] hover:bg-white/90 dark:hover:bg-slate-800/90"
                          placeholder="详细介绍一下你自己..."
                          maxLength={500}
                        />
                        <p className="text-xs text-slate-400 mt-1 text-right">{profile.bio.length}/500</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          个人标签
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {profile.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm flex items-center gap-1">
                              <Tag size={12} />
                              {tag}
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(tag)}
                                className="hover:text-red-500 transition-colors ml-1"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:bg-white/90 dark:hover:bg-slate-800/90"
                            placeholder="添加标签 (回车确认)"
                            maxLength={10}
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          >
                            添加
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">最多5个标签，每个标签最多10个字</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          背景音乐 (网易云音乐)
                        </label>
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                           <div className="flex-1 w-full space-y-2">
                             <div className="relative">
                               <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 z-10 pointer-events-none">
                                 <Music size={16} />
                               </div>
                               <input
                                type="text"
                                value={profile.music_id}
                                onChange={(e) => {
                                   const val = e.target.value.replace(/[^0-9]/g, '');
                                   setProfile({ ...profile, music_id: val });
                                }}
                                className="w-full pl-10 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all hover:bg-white/90 dark:hover:bg-slate-800/90"
                                placeholder="输入网易云音乐歌曲ID"
                              />
                               {checkingMusic && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                      <Loader2 size={16} className="animate-spin text-emerald-500" />
                                  </div>
                               )}
                             </div>
                             <p className="text-xs text-slate-400">
                               在网易云音乐网页版链接中找到 id 参数，例如: https://music.163.com/#/song?id=<b>123456</b>
                             </p>
                           </div>
                           
                           {/* Music Preview Card */}
                           <AnimatePresence mode="wait">
                             {musicPreview && (
                               <motion.div 
                                 initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                 animate={{ opacity: 1, scale: 1, y: 0 }}
                                 exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                 className="flex-shrink-0 w-full md:w-64 bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-700 p-3 shadow-sm flex items-center gap-3"
                               >
                                  <div className="relative w-12 h-12 flex-shrink-0">
                                     {musicPreview.cover ? (
                                        <img src={musicPreview.cover} alt="Cover" className="w-full h-full rounded-lg object-cover shadow-md" />
                                     ) : (
                                        <div className="w-full h-full bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                                            <Disc size={20} className="text-slate-400" />
                                        </div>
                                     )}
                                     <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-sm">
                                         <Play size={8} fill="currentColor" />
                                     </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <div className="font-medium text-sm text-slate-900 dark:text-white truncate">
                                         {musicPreview.name || '未知歌曲'}
                                     </div>
                                     <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                         {musicPreview.artist || '未知歌手'}
                                     </div>
                                  </div>
                               </motion.div>
                             )}
                           </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-6">
                      <div className="text-sm">
                         {saveMessage && (
                           <span className={clsx(
                             "flex items-center gap-1.5",
                             saveMessage.type === 'success' ? "text-emerald-500" : "text-red-500"
                           )}>
                             {saveMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                             {saveMessage.text}
                           </span>
                         )}
                      </div>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 focus:ring-4 focus:ring-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg shadow-emerald-500/20"
                      >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        保存修改
                      </button>
                    </div>
                  </div>
                </form>
                </motion.div>
              ) : (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                <div className="space-y-8">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                      <Shield className="text-emerald-500" />
                      账号与安全
                    </h2>

                    <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-xl p-6 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          <div className={clsx(
                            "w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden",
                            qqInfo.bound ? "bg-blue-100 text-blue-500 dark:bg-blue-900/20" : "bg-slate-200 text-slate-400 dark:bg-slate-700"
                          )}>
                            {qqInfo.bound && qqInfo.avatar ? (
                                <img src={qqInfo.avatar} alt="QQ Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <MessageSquare size={24} />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1">
                                {qqInfo.bound ? (qqInfo.name || 'QQ 绑定') : 'QQ 绑定'}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-3">
                              {qqInfo.bound 
                                ? `已绑定 QQ: ${qqInfo.qq}` 
                                : "绑定 QQ 后可使用 QQ 快捷登录，并在个人主页显示 QQ 图标。"}
                            </p>
                            {qqInfo.bound ? (
                              <button
                                onClick={handleUnbindQQ}
                                disabled={isQQActionLoading}
                                className="text-red-500 hover:text-red-600 text-sm font-medium flex items-center gap-1 transition-colors"
                              >
                                {isQQActionLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                                解除绑定
                              </button>
                            ) : (
                              <button
                                onClick={handleBindQQ}
                                className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
                              >
                                立即绑定
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {qqInfo.bound && (
                          <span className="px-3 py-1 bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400 text-xs font-bold rounded-full">
                            已绑定
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Future: Password Change, Email Binding, etc. */}
                  </div>
                </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
