import React, { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { MessageSquare, Trash2, Reply, AlertCircle, Loader2, Send, X, User as UserIcon } from 'lucide-react';
import clsx from 'clsx';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import MentionInput from '../components/MentionInput';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import LevelBadge from '../components/LevelBadge';

interface Message {
  id: number;
  player: string;
  recipient?: string | null;
  level?: number;
  content: string;
  timestamp: number;
  parent_id: number | null;
  replies?: Message[];
}

const ADMIN_KEY_STORAGE = 'admin_key';

// --- Sub Components ---

const MessageContent = ({ content }: { content: string }) => {
  const processed = content.replace(
    /@([^ \t\n\r\f\v@,.!?;:，。！？]+)/g, 
    (match, username) => `[${match}](/player/${username})`
  );
  
  return (
    <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed">
       <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
              a: ({node, ...props}) => (
                <Link to={props.href || '#'} className="text-emerald-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                  {props.children}
                </Link>
              ),
              p: ({node, ...props}) => <span {...props} /> // Use span to avoid block nesting issues inside div with pre-wrap if needed, or just p
          }}
       >
         {processed}
       </ReactMarkdown>
    </div>
  );
};

const MessageCard = ({ 
  msg, 
  depth = 0, 
  user, 
  isAdmin, 
  replyingTo, 
  setReplyingTo, 
  replyContent, 
  setReplyContent, 
  handleReply, 
  handleDelete, 
  isReplying,
  formatTime 
}: { 
  msg: Message; 
  depth?: number;
  user: any;
  isAdmin: boolean;
  replyingTo: number | null;
  setReplyingTo: (id: number | null) => void;
  replyContent: string;
  setReplyContent: (content: string) => void;
  handleReply: (e: React.FormEvent, parentId: number) => void;
  handleDelete: (id: number) => void;
  isReplying: boolean;
  formatTime: (timestamp: number) => string;
}) => {
  const isReplyingToThis = replyingTo === msg.id;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={clsx("flex flex-col relative", depth > 0 && "mt-4")}
    >
      {/* Connecting Line for Replies */}
      {depth > 0 && (
         <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-slate-200 dark:bg-slate-700 rounded-full" />
      )}

      <div className={clsx(
        "glass-panel p-5 rounded-2xl relative group transition-all duration-300 border border-slate-100/50 dark:border-slate-700/50",
        "hover:bg-white/90 dark:hover:bg-slate-800/90 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5",
        depth > 0 ? "bg-slate-50/80 dark:bg-slate-800/30" : "bg-white/60 dark:bg-slate-900/60"
      )}>
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <Link to={`/player/${msg.player}`} className="relative flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden ring-2 ring-slate-100 dark:ring-slate-700 shadow-sm group-hover:ring-emerald-400 dark:group-hover:ring-emerald-500 transition-all duration-300">
              <img
                src={`https://cravatar.eu/helmavatar/${encodeURIComponent(msg.player)}/128.png`}
                alt={msg.player}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://cravatar.eu/helmavatar/MHF_Steve/128.png';
                }}
              />
            </div>
          </Link>
          
          <div className="flex-1 min-w-0">
            {/* Header Info */}
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Link to={`/player/${msg.player}`} className="font-bold text-base text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300 hover:underline">
                  {msg.player}
                </Link>
                <LevelBadge level={msg.level} size="sm" />
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  #{msg.id}
                </span>
                {msg.recipient && (
                  <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded-full">
                    <span className="text-xs">To</span>
                    <Link 
                      to={`/player/${msg.recipient}`}
                      className="font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <img 
                        src={`https://cravatar.eu/helmavatar/${msg.recipient}/16.png`} 
                        className="w-4 h-4 rounded-sm" 
                        alt=""
                      />
                      {msg.recipient}
                    </Link>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {formatTime(msg.timestamp)}
                </span>
                {user && !isReplyingToThis && (
                  <button 
                    onClick={() => setReplyingTo(msg.id)}
                    className="text-slate-400 hover:text-emerald-500 transition-colors p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    title="回复"
                  >
                    <Reply size={14} />
                  </button>
                )}
                {/* Delete Button (Admin or Owner) - Moved here to avoid overlap */}
                {(isAdmin || (user && user.username === msg.player)) && (
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="删除留言"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            
            {/* Content */}
            <MessageContent content={msg.content} />
          </div>
        </div>

        {/* Inline Reply Form */}
        <AnimatePresence>
          {isReplyingToThis && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-4 pl-14 sm:pl-16"
            >
              <form onSubmit={(e) => handleReply(e, msg.id)} className="group bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                <div className="relative">
                  <MentionInput
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`回复 @${msg.player}...`}
                    className="w-full bg-transparent border-none p-3 text-sm focus:ring-0 focus:outline-none resize-none placeholder:text-slate-400 min-h-[80px]"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end px-2 pb-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                  <button
                    type="submit"
                    disabled={isReplying || !replyContent.trim()}
                    className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all hover:shadow-emerald-500/25"
                  >
                    {isReplying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nested Replies */}
      {msg.replies && msg.replies.length > 0 && (
        <div className="pl-4 sm:pl-8 space-y-4 mt-4">
          {msg.replies.map(reply => (
            <MessageCard 
              key={reply.id} 
              msg={reply} 
              depth={depth + 1} 
              user={user}
              isAdmin={isAdmin}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              handleReply={handleReply}
              handleDelete={handleDelete}
              isReplying={isReplying}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

const Messages = () => {
  const { user, token, loading: authLoading } = useAuth();
  const { error: toastError, success: toastSuccess, warning } = useToast();
  const { confirm } = useConfirm();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState<string | null>(null);

  // Posting State
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  
  // Reply State
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    const storedKey = localStorage.getItem(ADMIN_KEY_STORAGE);
    if (storedKey) {
      setAdminKey(storedKey);
      setIsAdmin(true);
    }
    fetchMessages();
  }, [authLoading, token]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await api.get<Message[]>('/api/message/read');
      const data = response.data;
      
      const messageMap = new Map<number, Message>();
      const rootMessages: Message[] = [];

      data.forEach(msg => {
        messageMap.set(msg.id, { ...msg, replies: [] });
      });

      data.forEach(msg => {
        const processedMsg = messageMap.get(msg.id)!;
        if (msg.parent_id) {
          const parent = messageMap.get(msg.parent_id);
          if (parent) {
            parent.replies?.push(processedMsg);
          } else {
            rootMessages.push(processedMsg);
          }
        } else {
          rootMessages.push(processedMsg);
        }
      });

      // Sort: Latest first
      const sortMessages = (msgs: Message[]) => {
        msgs.sort((a, b) => b.timestamp - a.timestamp);
        msgs.forEach(msg => {
          if (msg.replies && msg.replies.length > 0) {
            msg.replies.sort((a, b) => b.timestamp - a.timestamp);
          }
        });
      };
      
      sortMessages(rootMessages);
      setMessages(rootMessages);
      setError(null);
    } catch (err) {
      setError('无法加载留言列表，请稍后重试');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim()) return;
    if (!user) return;

    setIsPosting(true);
    try {
      await api.post('/api/message/write', {
        message: postContent,
        player: user.username,
        parent_id: null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPostContent('');
      fetchMessages();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 
                      (err.response?.data?.detail ? JSON.stringify(err.response.data.detail) : '发布失败');
      toastError(errorMsg);
    } finally {
      setIsPosting(false);
    }
  };

  const handleReply = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    if (!user) return;

    setIsReplying(true);
    try {
      await api.post('/api/message/write', {
        message: replyContent,
        player: user.username,
        parent_id: parentId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReplyContent('');
      setReplyingTo(null);
      fetchMessages();
    } catch (err: any) {
       const errorMsg = err.response?.data?.error || 
                      (err.response?.data?.detail ? JSON.stringify(err.response.data.detail) : '回复失败');
      toastError(errorMsg);
    } finally {
      setIsReplying(false);
    }
  };

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: '删除留言',
      message: '确定要删除这条留言吗？',
      isDangerous: true,
      confirmText: '删除',
    });

    if (!isConfirmed) return;
    
    if (!adminKey && !token) {
        warning('请先登录');
        return;
    }

    try {
      const headers: any = {};
      if (adminKey) {
        headers['Authorization'] = `Bearer ${adminKey}`;
      } else if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      await api.delete(`/api/message/${id}`, {
        headers
      });
      fetchMessages();
      toastSuccess('删除成功');
    } catch (err: any) {
      toastError('删除失败: ' + (err.response?.data?.error || err.message));
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(/\//g, '-');
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <SEO title="留言板 - KukeMC" description="KukeMC 服务器留言板，玩家可以在这里畅所欲言。" url="/messages" />
      <PageTransition>
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 text-gradient">玩家留言</h1>
            <p className="text-slate-500 dark:text-gray-400 text-sm sm:text-base">
              分享游戏心得，记录精彩瞬间
            </p>
          </div>
        </div>

        {/* Main Posting Area */}
        <div className="mb-8">
          {user ? (
            <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
              <form onSubmit={handlePost}>
                  <MentionInput
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    placeholder={`以 ${user.username} 的身份留言...`}
                    className="w-full bg-transparent border-none resize-none focus:ring-0 focus:outline-none p-0 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 min-h-[80px]"
                  />
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                          <img 
                              src={`https://cravatar.eu/helmavatar/${user.username}/32.png`} 
                              className="w-6 h-6 rounded bg-slate-200" 
                              alt={user.username}
                          />
                          <span>以 {user.username} 身份</span>
                      </div>
                      <button
                          type="submit"
                          disabled={isPosting || !postContent.trim()}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                          {isPosting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                          发布
                      </button>
                  </div>
              </form>
            </div>
          ) : (
            <div className="glass-panel p-8 rounded-2xl text-center border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
              <MessageSquare size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">想要参与讨论？</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">登录后即可发布留言并回复他人</p>
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
              >
                <UserIcon size={18} />
                <span>立即登录</span>
              </Link>
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <div className="glass-panel p-5 rounded-xl flex items-center gap-4 border border-emerald-100 dark:border-emerald-900/20 bg-emerald-50/30 dark:bg-emerald-900/10">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600 dark:text-emerald-400">
                    <MessageSquare size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">游戏内留言</h3>
                    <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 px-2 py-1 rounded">/lmsg &lt;内容&gt;</code>
                </div>
            </div>
            <div className="glass-panel p-5 rounded-xl flex items-center gap-4 border border-blue-100 dark:border-blue-900/20 bg-blue-50/30 dark:bg-blue-900/10">
                 <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                    <Reply size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1">游戏内回复</h3>
                    <code className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/30 px-2 py-1 rounded">/lmsg reply &lt;id&gt; &lt;内容&gt;</code>
                </div>
            </div>
        </div>

        {/* Message List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={40} className="text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-400 text-sm">正在加载留言...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-red-400 gap-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300 dark:text-slate-600">
              <MessageSquare size={32} />
            </div>
            <p className="text-slate-500 dark:text-slate-400">暂无留言，快来抢占沙发吧！</p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map(msg => (
              <MessageCard 
                key={msg.id} 
                msg={msg} 
                user={user}
                isAdmin={isAdmin}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
                handleReply={handleReply}
                handleDelete={handleDelete}
                isReplying={isReplying}
                formatTime={formatTime}
              />
            ))}
          </div>
        )}
      </div>
      </PageTransition>
    </div>
  );
};

export default Messages;
