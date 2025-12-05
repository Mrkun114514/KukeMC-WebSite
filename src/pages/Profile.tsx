import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import { useTitle } from '../hooks/useTitle';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Clock, MessageSquare, 
  Trophy, AlertCircle, Loader2, Send, Shield, 
  Hash, Activity, CalendarDays,
  Reply, Trash2, X, Heart, Edit2, Plus, AlertTriangle, ThumbsUp, PenLine, Image as ImageIcon, Upload, MessageCircle
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../context/AuthContext';

interface UserProfile {
  username: string;
  signature: string | null;
  bio: string | null;
  tags: string[];
  likes: number;
  is_liked: boolean;
  likers: string[];
  custom_title?: string;
}

interface Album {
  id: number;
  username: string;
  title: string;
  description: string | null;
  image_url: string;
  likes: number;
  created_at: string;
  is_liked: boolean;
  comment_count: number;
}

interface AlbumComment {
  id: number;
  username: string;
  content: string;
  created_at: string;
}

interface PlayerDetails {
  uuid: string;
  username: string;
  login_count: number;
  total_playtime: number; // minutes
  total_playtime_hours: number;
  last_login: string;
  last_logout: string | null;
  first_seen: string;
  last_play_date: string;
  days_played_30: number;
  recent_week_minutes: number;
  recent_week_hours: number;
  online_now: boolean;
  ip: string | null;
  location: string | null;
  qq: string | null;
  ban_history: any[];
  ban_count: number;
}

interface Message {
  id: number;
  player: string;
  recipient: string | null;
  content: string;
  timestamp: number;
  parent_id: number | null;
  replies?: Message[];
}

const ADMIN_KEY_STORAGE = 'admin_key';

// Reuse MessageCard from Messages.tsx but simplified for profile if needed
// Or I can copy paste it. Since I can't import internal component easily if not exported, I will copy it.
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
}: any) => {
  const isReplyingToThis = replyingTo === msg.id;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={clsx("flex flex-col relative", depth > 0 && "mt-4")}
    >
      {depth > 0 && (
         <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-slate-200 dark:bg-slate-700 rounded-full" />
      )}

      <div className={clsx(
        "glass-panel p-5 rounded-2xl relative group transition-all duration-300 border border-slate-100/50 dark:border-slate-700/50",
        "hover:bg-white/90 dark:hover:bg-slate-800/90 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5",
        depth > 0 ? "bg-slate-50/80 dark:bg-slate-800/30" : "bg-white/60 dark:bg-slate-900/60"
      )}>
        <div className="flex items-start gap-4">
          <div className="relative flex-shrink-0">
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
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300">
                  {msg.player}
                </span>
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  #{msg.id}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 dark:text-slate-500">
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
              </div>
            </div>
            
            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed">
              {msg.content}
            </p>

            {isAdmin && (
              <button
                onClick={() => handleDelete(msg.id)}
                className="absolute top-4 right-12 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
                title="删除留言"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isReplyingToThis && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-4 pl-14 sm:pl-16"
            >
              <form onSubmit={(e) => handleReply(e, msg.id)} className="group bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`回复 @${msg.player}...`}
                  className="w-full bg-transparent border-none p-3 text-sm focus:ring-0 focus:outline-none resize-none placeholder:text-slate-400"
                  rows={3}
                  autoFocus
                />
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

      {msg.replies && msg.replies.length > 0 && (
        <div className="pl-4 sm:pl-8 space-y-4 mt-4">
          {msg.replies.map((reply: any) => (
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

const Profile = () => {
  const { username } = useParams<{ username: string }>();
  useTitle(`${username} 的个人主页 - KukeMC`);
  const { user, token } = useAuth();
  
  const [details, setDetails] = useState<PlayerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Message Board State
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(true);
  const [postContent, setPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState<string | null>(null);

  // Profile Extended State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    signature: '',
    bio: '',
    tags: [] as string[],
    newTag: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Album State
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isAlbumLoading, setIsAlbumLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file: null as File | null
  });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumComments, setAlbumComments] = useState<AlbumComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'album'>('profile');

  useEffect(() => {
    const storedKey = localStorage.getItem(ADMIN_KEY_STORAGE);
    if (storedKey) {
      setAdminKey(storedKey);
      setIsAdmin(true);
    }
    if (username) {
      fetchDetails(username);
      fetchMessages(username);
      fetchProfile(username);
      fetchAlbums(username);
    }
  }, [username, token]);

  const fetchAlbums = async (name: string) => {
    setIsAlbumLoading(true);
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await api.get<Album[]>(`/api/album/list/${name}`, config);
      setAlbums(res.data);
    } catch (err) {
      console.error('Failed to fetch albums', err);
    } finally {
      setIsAlbumLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.title) return;

    setIsUploading(true);
    try {
      let fileToUpload = uploadForm.file;

      // Check size and compress if needed (limit 5MB)
      if (fileToUpload.size > 5 * 1024 * 1024) {
         try {
            fileToUpload = await compressImage(fileToUpload);
            if (fileToUpload.size > 5 * 1024 * 1024) {
               throw new Error('图片压缩后仍然超过5MB限制，请选择更小的图片');
            }
         } catch (e: any) {
            throw new Error(e.message || '图片压缩失败');
         }
      }

      // 1. Upload Image First
      const imageFormData = new FormData();
      imageFormData.append('file', fileToUpload); 
      
      const uploadRes = await fetch('https://api.xinyew.cn/api/jdtc', {
         method: 'POST',
         body: imageFormData
      });
      
      const uploadData = await uploadRes.json();
      
      if (uploadData.errno !== 0) {
        throw new Error(uploadData.message || '图片上传失败');
      }
      
      const imageUrl = uploadData.data.url;
      
      // 2. Create Album Entry
      await api.post('/api/album/upload', {
        title: uploadForm.title,
        description: uploadForm.description,
        image_url: imageUrl
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      closeUploadModal();
      if (username) fetchAlbums(username);
    } catch (err: any) {
      alert(err.message || '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const compressImage = (file: File): Promise<File> => {
     return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
           img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        
        img.onload = () => {
           const canvas = document.createElement('canvas');
           let width = img.width;
           let height = img.height;
           
           // Resize if too large (max dimension 1920px)
           const MAX_DIMENSION = 1920;
           if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
              if (width > height) {
                 height *= MAX_DIMENSION / width;
                 width = MAX_DIMENSION;
              } else {
                 width *= MAX_DIMENSION / height;
                 height = MAX_DIMENSION;
              }
           }
           
           canvas.width = width;
           canvas.height = height;
           const ctx = canvas.getContext('2d');
           if (!ctx) {
              reject(new Error('Canvas context not available'));
              return;
           }
           
           ctx.drawImage(img, 0, 0, width, height);
           
           // Start with quality 0.8 and go down if needed, but here we just do one pass
           // For more complex logic we could loop, but usually 0.7-0.8 jpeg is enough to reduce size significantly
           canvas.toBlob((blob) => {
              if (!blob) {
                 reject(new Error('Compression failed'));
                 return;
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                 type: 'image/jpeg',
                 lastModified: Date.now(),
              });
              resolve(compressedFile);
           }, 'image/jpeg', 0.7);
        };
        img.onerror = reject;
        
        reader.readAsDataURL(file);
     });
  };

  const closeUploadModal = () => {
     setShowUploadModal(false);
     setUploadForm({ title: '', description: '', file: null });
  };

  const openAlbumDetail = async (album: Album) => {
    setSelectedAlbum(album);
    setIsCommentLoading(true);
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await api.get(`/api/album/${album.id}`, config);
      setAlbumComments(res.data.comments);
      // Update album info in case likes changed
      setSelectedAlbum(prev => prev ? { ...prev, ...res.data } : null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCommentLoading(false);
    }
  };

  const handleAlbumLike = async (album: Album) => {
    if (!user) return;
    try {
      const res = await api.post(`/api/album/${album.id}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      const updateAlbum = (a: Album) => {
        if (a.id === album.id) {
          return { ...a, likes: res.data.likes, is_liked: res.data.status === 'liked' };
        }
        return a;
      };
      
      setAlbums(prev => prev.map(updateAlbum));
      if (selectedAlbum && selectedAlbum.id === album.id) {
        setSelectedAlbum(prev => prev ? updateAlbum(prev) : null);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || '操作失败');
    }
  };

  const handleAlbumComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlbum || !newComment.trim()) return;
    
    setIsSendingComment(true);
    try {
      const res = await api.post(`/api/album/${selectedAlbum.id}/comment`, { content: newComment }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlbumComments(prev => [...prev, res.data.data]);
      setNewComment('');
      // Update comment count in list
      setAlbums(prev => prev.map(a => a.id === selectedAlbum.id ? { ...a, comment_count: a.comment_count + 1 } : a));
    } catch (err: any) {
      alert(err.response?.data?.detail || '评论失败');
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleDeleteAlbum = async (albumId: number) => {
    if (!confirm('确定要删除这张图片吗？')) return;
    try {
      await api.delete(`/api/album/${albumId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (selectedAlbum?.id === albumId) setSelectedAlbum(null);
      setAlbums(prev => prev.filter(a => a.id !== albumId));
    } catch (err: any) {
      alert(err.response?.data?.detail || '删除失败');
    }
  };

  const fetchProfile = async (name: string) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await api.get<UserProfile>(`/api/profile/${name}`, config);
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const handleLike = async () => {
    if (!user || !username) return;
    try {
      const res = await api.post('/api/profile/like', { target_username: username }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Optimistic update or refetch
      fetchProfile(username);
    } catch (err: any) {
      alert(err.response?.data?.detail || '操作失败');
    }
  };

  const openEditModal = () => {
    if (!profile) return;
    setEditForm({
      signature: profile.signature || '',
      bio: profile.bio || '',
      tags: [...profile.tags],
      newTag: ''
    });
    setShowEditModal(true);
  };

  const handleAddTag = () => {
    const tag = editForm.newTag.trim();
    if (!tag) return;
    if (editForm.tags.length >= 6) {
      alert('最多只能添加6个标签');
      return;
    }
    if (tag.length > 10) {
      alert('标签长度不能超过10个字');
      return;
    }
    if (editForm.tags.includes(tag)) {
      alert('标签已存在');
      return;
    }
    setEditForm(prev => ({
      ...prev,
      tags: [...prev.tags, tag],
      newTag: ''
    }));
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tagToRemove)
    }));
  };

  const handleUpdateProfile = async () => {
    if (!user || !username) return;
    setIsUpdating(true);
    try {
      await api.post('/api/profile/update', {
        signature: editForm.signature,
        bio: editForm.bio,
        tags: editForm.tags
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowEditModal(false);
      fetchProfile(username);
    } catch (err: any) {
      alert(err.response?.data?.detail || '更新失败');
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchDetails = async (name: string) => {
    setLoading(true);
    try {
      const res = await api.get<PlayerDetails>(`/api/playtime/player/details`, { params: { name } });
      setDetails(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || '无法获取玩家信息');
      setDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (recipient: string) => {
    setMsgLoading(true);
    try {
      const response = await api.get<Message[]>('/api/message/read', { params: { recipient } });
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
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setMsgLoading(false);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() || !user || !username) return;

    setIsPosting(true);
    try {
      await api.post('/api/message/write', {
        message: postContent,
        player: user.username,
        recipient: username, // Set recipient
        parent_id: null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPostContent('');
      fetchMessages(username);
    } catch (err: any) {
      alert(err.response?.data?.error || '发布失败');
    } finally {
      setIsPosting(false);
    }
  };

  const handleReply = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    if (!replyContent.trim() || !user || !username) return;

    setIsReplying(true);
    try {
      await api.post('/api/message/write', {
        message: replyContent,
        player: user.username,
        recipient: username, // Replies also go to the profile owner context
        parent_id: parentId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReplyContent('');
      setReplyingTo(null);
      fetchMessages(username);
    } catch (err: any) {
      alert(err.response?.data?.error || '回复失败');
    } finally {
      setIsReplying(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条留言吗？')) return;
    if (!adminKey) return;

    try {
      await api.delete(`/api/message/${id}`, {
        headers: { 'Authorization': `Bearer ${adminKey}` }
      });
      if (username) fetchMessages(username);
    } catch (err: any) {
      alert('删除失败: ' + (err.response?.data?.error || err.message));
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={40} className="text-brand-500 animate-spin" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">未找到玩家</h1>
        <p className="text-slate-500 mb-8">{error || '该玩家不存在或从未进入过服务器。'}</p>
        <Link to="/stats" className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
          返回排行榜
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 pt-24">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden bg-white/80 dark:bg-slate-900/50 backdrop-blur-md rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl"
        >
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20" />
          
          <div className="relative flex flex-col md:flex-row gap-8 mt-4">
            <div className="relative group self-center md:self-end shrink-0">
              <div className="w-32 h-32 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-slate-900 shadow-2xl">
                <img
                  src={`https://cravatar.eu/helmavatar/${details.username}/256.png`}
                  alt={details.username}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className={clsx(
                "absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-lg",
                details.online_now ? "bg-green-500" : "bg-slate-400"
              )} title={details.online_now ? "在线" : "离线"}>
                {details.online_now && <div className="w-2 h-2 bg-white rounded-full animate-ping" />}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left mb-2 self-center md:self-end">
              <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white">{details.username}</h1>
                {/* Like Button */}
                {profile && (
                  <button
                    onClick={handleLike}
                    disabled={!user || user.username === details.username}
                    className={clsx(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border",
                      profile.is_liked 
                        ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
                      (!user || user.username === details.username) && "opacity-50 cursor-not-allowed"
                    )}
                    title={user?.username === details.username ? "不能给自己点赞" : (profile.is_liked ? "取消点赞" : "点赞")}
                  >
                    <Heart size={18} className={clsx(profile.is_liked && "fill-current")} />
                    <span className="font-bold">{profile.likes}</span>
                  </button>
                )}
              </div>
              
              {/* Signature */}
              <div className="mb-4 text-slate-600 dark:text-slate-300 italic min-h-[1.5em]">
                {profile?.signature ? (
                  <span>"{profile.signature}"</span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 text-sm">这个人很懒，什么也没写...</span>
                )}
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center">
                <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-1.5">
                  <User size={14} />
                  {profile?.custom_title || '玩家'}
                </span>
                {details.qq && (
                   <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium flex items-center gap-1.5">
                     <MessageSquare size={14} />
                     QQ已绑定
                   </span>
                )}
                 {details.ban_count > 0 && (
                   <span className="px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-1.5">
                     <Shield size={14} />
                     {details.ban_count} 次封禁记录
                   </span>
                )}
                
                {/* Edit Profile Button */}
                {user && user.username === details.username && (
                  <button 
                    onClick={openEditModal}
                    className="ml-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    <Edit2 size={14} />
                    编辑资料
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end justify-between min-h-[8rem] self-stretch">
               {/* Tags (Moved to Top Right of Content Area) */}
               <div className="flex flex-wrap justify-center md:justify-end gap-2 w-full mb-4 md:mb-0">
                 {profile && profile.tags && profile.tags.length > 0 && profile.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 whitespace-nowrap">
                      #{tag}
                    </span>
                 ))}
               </div>

               <div className="flex flex-col items-center md:items-end gap-1 mb-2 mt-auto">
                   <div className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                     最后登录
                   </div>
                   <div className="text-slate-900 dark:text-white font-medium font-mono text-lg">
                     {details.last_login ? new Date(details.last_login).toLocaleString() : '未知'}
                   </div>
               </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => setActiveTab('profile')}
            className={clsx(
              "px-6 py-2 rounded-full font-medium transition-all duration-300 flex items-center gap-2",
              activeTab === 'profile'
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg scale-105"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
          >
            <User size={18} />
            个人主页
          </button>
          <button
            onClick={() => setActiveTab('album')}
            className={clsx(
              "px-6 py-2 rounded-full font-medium transition-all duration-300 flex items-center gap-2",
              activeTab === 'album'
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg scale-105"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            )}
          >
            <ImageIcon size={18} />
            玩家相册
          </button>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'profile' ? (
             <motion.div
               key="profile"
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: 20 }}
               transition={{ duration: 0.3, ease: "easeOut" }}
               className="space-y-8"
             >
               {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500/30 transition-colors group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                      <Clock size={24} />
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 text-sm">总游戏时长</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">{details.total_playtime_hours} <span className="text-sm font-normal text-slate-500">小时</span></div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-purple-500/30 transition-colors group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-500 rounded-xl group-hover:scale-110 transition-transform">
                      <CalendarDays size={24} />
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 text-sm">首次加入</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white truncate" title={details.first_seen}>
                          {details.first_seen ? new Date(details.first_seen).toLocaleDateString() : '未知'}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                      已陪伴服务器 {Math.floor((Date.now() - new Date(details.first_seen).getTime()) / (1000 * 60 * 60 * 24))} 天
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/30 transition-colors group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                      <Activity size={24} />
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 text-sm">近30天活跃</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">{details.days_played_30} <span className="text-sm font-normal text-slate-500">天</span></div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${(details.days_played_30 / 30) * 100}%` }} />
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-500/30 transition-colors group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
                      <Trophy size={24} />
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 text-sm">登录次数</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">{details.login_count}</div>
                    </div>
                  </div>
                   <div className="text-xs text-slate-500">
                      平均每天登录 {(details.login_count / Math.max(1, Math.floor((Date.now() - new Date(details.first_seen).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(2)} 次
                  </div>
                </div>
              </div>

              {/* Detail Info Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 {/* Left Column: Detailed Properties */}
                 <div className="lg:col-span-1 space-y-6">
                    {/* Bio Card */}
                    <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <User size={20} className="text-slate-400" />
                            个人简介
                        </h3>
                        <div className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed text-sm">
                            {profile?.bio || "暂无简介"}
                        </div>
                    </div>
                    
                    {/* Liked By List (Mini) */}
                    {profile && profile.likers && profile.likers.length > 0 && (
                       <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                              <ThumbsUp size={20} className="text-slate-400" />
                              最近点赞
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {profile.likers.map(liker => (
                              <Link to={`/player/${liker}`} key={liker} title={liker}>
                                <img 
                                  src={`https://cravatar.eu/helmavatar/${liker}/32.png`} 
                                  className="w-8 h-8 rounded-md border border-slate-200 dark:border-slate-700 hover:scale-110 transition-transform"
                                  alt={liker}
                                />
                              </Link>
                            ))}
                          </div>
                       </div>
                    )}
     
                    <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Hash size={20} className="text-slate-400" />
                            基础信息
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">UUID</div>
                                <div className="font-mono text-xs sm:text-sm bg-slate-100 dark:bg-slate-950 p-2 rounded select-all text-slate-700 dark:text-slate-300 break-all">
                                    {details.uuid}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">绑定的QQ</div>
                                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                    <MessageSquare size={16} />
                                    <span>{details.qq || '未绑定'}</span>
                                </div>
                            </div>
                             <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">最近活跃 (7天)</div>
                                <div className="text-slate-700 dark:text-slate-300">
                                    {details.recent_week_hours} 小时 ({details.recent_week_minutes} 分钟)
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">最后登出</div>
                                <div className="text-slate-700 dark:text-slate-300 font-mono text-sm">
                                    {details.last_logout ? new Date(details.last_logout).toLocaleString() : '未知'}
                                </div>
                            </div>
                            <div>
                                 <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">最近游玩</div>
                                 <div className="text-slate-700 dark:text-slate-300 font-mono text-sm">
                                     {details.last_play_date || '未知'}
                                 </div>
                            </div>
                        </div>
                    </div>
                 </div>
     
                 {/* Right Column: Message Board */}
                 <div className="lg:col-span-2">
                    <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 h-full">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <MessageSquare size={24} className="text-emerald-500" />
                                留言板
                            </h3>
                            <span className="text-sm text-slate-500">{messages.length} 条留言</span>
                        </div>
     
                        {/* Post Box */}
                        <div className="mb-8">
                            {user ? (
                                <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                                    <form onSubmit={handlePost}>
                                        <textarea
                                            value={postContent}
                                            onChange={(e) => setPostContent(e.target.value)}
                                            placeholder={`给 ${details.username} 留言...`}
                                            className="w-full bg-transparent border-none resize-none focus:ring-0 focus:outline-none p-0 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 min-h-[80px]"
                                        />
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                                <img 
                                                    src={`https://cravatar.eu/helmavatar/${user.username}/32.png`} 
                                                    className="w-6 h-6 rounded bg-slate-200" 
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
                                 <div className="text-center py-6 bg-slate-50 dark:bg-slate-950/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                    <p className="text-slate-500 mb-2">登录后即可给TA留言</p>
                                    <Link to="/login" className="text-emerald-500 font-medium hover:underline">立即登录</Link>
                                 </div>
                            )}
                        </div>
     
                        {/* Message List */}
                        <div className="space-y-6">
                            {msgLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 size={32} className="text-emerald-500 animate-spin" />
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="text-center py-12 text-slate-500">
                                    还没有人给TA留言，快来抢沙发吧！
                                </div>
                            ) : (
                                messages.map(msg => (
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
                                ))
                            )}
                        </div>
                    </div>
                 </div>
              </div>
            </motion.div>
          ) : (
             <motion.div
               key="album"
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: -20 }}
               transition={{ duration: 0.3, ease: "easeOut" }}
               className="space-y-6"
             >
                {/* Album Header */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ImageIcon className="text-purple-500" size={28} />
                      {details.username} 的相册
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      共 {albums.length} 张照片 • 收获 {albums.reduce((acc, curr) => acc + curr.likes, 0)} 个赞
                    </p>
                  </div>
                  
                  {user && user.username === details.username && (
                    <button 
                      onClick={() => setShowUploadModal(true)}
                      className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                    >
                      <Upload size={18} />
                      上传新照片
                    </button>
                  )}
                </div>
       
                 {isAlbumLoading ? (
                    <div className="flex justify-center py-24">
                       <div className="flex flex-col items-center gap-4">
                          <Loader2 size={48} className="text-purple-500 animate-spin" />
                          <p className="text-slate-500">加载精彩瞬间...</p>
                       </div>
                    </div>
                 ) : albums.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 bg-white/50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                       <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                          <ImageIcon size={40} className="text-slate-300 dark:text-slate-600" />
                       </div>
                       <h3 className="text-xl font-medium text-slate-900 dark:text-white mb-2">相册空空如也</h3>
                       <p className="text-slate-500 dark:text-slate-400 max-w-sm text-center mb-8">
                         {user && user.username === details.username 
                           ? "快来分享你在服务器里的第一个精彩瞬间吧！" 
                           : "这位玩家还没有上传过任何照片，稍后再来看看吧。"}
                       </p>
                       {user && user.username === details.username && (
                         <button 
                           onClick={() => setShowUploadModal(true)}
                           className="px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                         >
                           立即上传
                         </button>
                       )}
                    </div>
                 ) : (
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
                      {albums.map(album => (
                        <div 
                          key={album.id} 
                          className="break-inside-avoid group relative bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer"
                          onClick={() => openAlbumDetail(album)}
                        >
                           <div className="relative aspect-auto overflow-hidden">
                             <img 
                               src={album.image_url} 
                               alt={album.title}
                               className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                               loading="lazy"
                             />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                           </div>
                           
                           <div className="p-4">
                              <h4 className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-1 group-hover:text-purple-500 transition-colors">
                                {album.title}
                              </h4>
                              {album.description && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                                  {album.description}
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                                 <div className="text-xs text-slate-400">
                                   {new Date(album.created_at).toLocaleDateString()}
                                 </div>
                                 <div className="flex items-center gap-3 text-sm text-slate-500">
                                    <span className={clsx("flex items-center gap-1", album.is_liked && "text-red-500")}>
                                       <Heart size={14} className={clsx(album.is_liked && "fill-current")} />
                                       {album.likes}
                                    </span>
                                    <span className="flex items-center gap-1">
                                       <MessageCircle size={14} />
                                       {album.comment_count}
                                    </span>
                                 </div>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                 )}
             </motion.div>
           )}
         </AnimatePresence>

        {/* Warning Banner */}
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-red-600 dark:text-red-400 text-sm mb-1">文明用语提醒</h4>
            <p className="text-sm text-red-500/80 dark:text-red-400/80">
              请在个人简介、签名及留言中保持文明用语。严禁发布广告、辱骂、色情或政治敏感内容。
              违规者将被永久封禁账号并清空所有数据。
            </p>
          </div>
        </div>

      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowEditModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">编辑个人资料</h3>
                <button onClick={() => setShowEditModal(false)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Signature */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    个性签名 (50字以内)
                  </label>
                  <input
                    type="text"
                    value={editForm.signature}
                    onChange={(e) => setEditForm({...editForm, signature: e.target.value})}
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    maxLength={50}
                    placeholder="写一句简短的签名..."
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    个人简介 (500字以内)
                  </label>
                  <textarea
                    value={editForm.bio}
                    onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                    className="w-full rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 h-32 resize-none"
                    maxLength={500}
                    placeholder="介绍一下你自己..."
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    个人标签 (最多6个)
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editForm.tags.map(tag => (
                      <div key={tag} className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-800">
                        <span className="text-sm">{tag}</span>
                        <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editForm.newTag}
                      onChange={(e) => setEditForm({...editForm, newTag: e.target.value})}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                      className="flex-1 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                      placeholder="添加新标签..."
                      maxLength={10}
                    />
                    <button 
                      onClick={handleAddTag}
                      disabled={editForm.tags.length >= 6}
                      className="px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    推荐标签: 生存玩家, 建筑党, 红石科技, PVP, 跑酷, 休闲
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {["生存玩家", "冒险玩家", "建筑玩家", "跑酷", "肝帝", "红石大佬", "粘液科技", "PVP大佬", "起床大神"].map(tag => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (!editForm.tags.includes(tag) && editForm.tags.length < 6) {
                            setEditForm(prev => ({...prev, tags: [...prev.tags, tag]}));
                          }
                        }}
                        className="px-2 py-0.5 text-xs border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-950/50">
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={handleUpdateProfile}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdating && <Loader2 size={16} className="animate-spin" />}
                  保存更改
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
              onClick={() => setShowUploadModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div>
                   <h3 className="text-2xl font-bold text-slate-900 dark:text-white">上传新照片</h3>
                   <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">分享你在服务器里的精彩瞬间</p>
                </div>
                <button onClick={closeUploadModal} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <form onSubmit={handleUpload} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    照片标题 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:border-transparent transition-all placeholder:text-slate-400"
                    placeholder="给这张照片起个好听的名字..."
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    照片描述 <span className="text-slate-400 font-normal">(选填)</span>
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-slate-900 dark:focus:ring-white focus:border-transparent h-32 resize-none transition-all placeholder:text-slate-400"
                    placeholder="这张照片背后有什么故事？说来听听..."
                  />
                </div>
                
                <div className="space-y-2">
                   <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    选择图片 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setUploadForm({...uploadForm, file: e.target.files ? e.target.files[0] : null})}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className={clsx(
                      "w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all",
                      uploadForm.file 
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10" 
                        : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 group-hover:border-slate-400 dark:group-hover:border-slate-600"
                    )}>
                       {uploadForm.file ? (
                          <>
                             <ImageIcon size={32} className="text-emerald-500" />
                             <div className="text-center">
                                <p className="font-medium text-emerald-700 dark:text-emerald-400">{uploadForm.file.name}</p>
                                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">点击可更换图片</p>
                                <p className="text-xs text-slate-400 mt-1">{(uploadForm.file.size / 1024 / 1024).toFixed(2)} MB</p>
                             </div>
                          </>
                       ) : (
                          <>
                             <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm">
                                <Upload size={24} className="text-slate-400" />
                             </div>
                             <div className="text-center">
                                <p className="font-medium text-slate-600 dark:text-slate-300">点击或拖拽上传图片</p>
                                <p className="text-xs text-slate-400 mt-1">支持 JPG, PNG, GIF 格式 (自动压缩)</p>
                             </div>
                          </>
                       )}
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 flex justify-end gap-4 border-t border-slate-100 dark:border-slate-800">
                  <button 
                    type="button"
                    onClick={closeUploadModal}
                    className="px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button 
                    type="submit"
                    disabled={isUploading || !uploadForm.file}
                    className="px-8 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center gap-2 font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        处理中...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        发布照片
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Album Detail Modal */}
      <AnimatePresence>
        {selectedAlbum && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setSelectedAlbum(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-7xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row max-h-[90vh]"
            >
               <button 
                  onClick={() => setSelectedAlbum(null)} 
                  className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors md:hidden"
                >
                  <X size={20} />
                </button>

               {/* Image Side */}
                <div className="flex-[1.5] bg-black flex items-center justify-center overflow-hidden relative group">
                   <img 
                     src={selectedAlbum.image_url} 
                     alt={selectedAlbum.title}
                     className="max-w-full max-h-[50vh] md:max-h-full object-contain"
                   />
                  
                  {/* Delete Button (Owner/Admin) */}
                  {(user && (user.username === selectedAlbum.username || isAdmin)) && (
                    <button
                      onClick={() => handleDeleteAlbum(selectedAlbum.id)}
                      className="absolute top-4 right-4 p-2 bg-red-500/80 text-white rounded-lg hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="删除图片"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
               </div>

               {/* Info Side */}
               <div className="w-full md:w-[400px] flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                     <div className="flex items-start justify-between mb-4">
                        <div>
                           <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{selectedAlbum.title}</h3>
                           <div className="text-sm text-slate-500 flex items-center gap-2">
                              <span>{new Date(selectedAlbum.created_at).toLocaleDateString()}</span>
                              <span>•</span>
                              <span>{selectedAlbum.username}</span>
                           </div>
                        </div>
                        <button onClick={() => setSelectedAlbum(null)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hidden md:block">
                          <X size={20} />
                        </button>
                     </div>
                     
                     {selectedAlbum.description && (
                        <p className="text-slate-600 dark:text-slate-300 text-sm mb-4 whitespace-pre-wrap">
                           {selectedAlbum.description}
                        </p>
                     )}

                     <div className="flex items-center gap-4">
                        <button 
                          onClick={() => handleAlbumLike(selectedAlbum)}
                          disabled={!user}
                          className={clsx(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border text-sm font-medium",
                            selectedAlbum.is_liked 
                              ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
                             !user && "opacity-50 cursor-not-allowed"
                          )}
                        >
                           <Heart size={16} className={clsx(selectedAlbum.is_liked && "fill-current")} />
                           {selectedAlbum.likes}
                        </button>
                     </div>
                  </div>

                  {/* Comments List */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[200px]">
                     {isCommentLoading ? (
                        <div className="flex justify-center py-8">
                           <Loader2 size={24} className="text-purple-500 animate-spin" />
                        </div>
                     ) : albumComments.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                           <p>暂无评论，快来抢沙发~</p>
                        </div>
                     ) : (
                        albumComments.map(comment => (
                           <div key={comment.id} className="flex gap-3 group">
                              <img 
                                src={`https://cravatar.eu/helmavatar/${comment.username}/32.png`} 
                                alt={comment.username}
                                className="w-8 h-8 rounded-md flex-shrink-0 bg-slate-200"
                              />
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-baseline justify-between mb-1">
                                    <span className="font-bold text-sm text-slate-900 dark:text-white">{comment.username}</span>
                                    <span className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                                 </div>
                                 <p className="text-sm text-slate-600 dark:text-slate-300 break-words">{comment.content}</p>
                              </div>
                              {/* Delete Comment (Admin/Owner) */}
                              {(user && (user.username === comment.username || user.username === selectedAlbum.username || isAdmin)) && (
                                 <button 
                                   onClick={async () => {
                                      if(!confirm('删除这条评论？')) return;
                                      try {
                                         await api.delete(`/api/album/comment/${comment.id}`, { headers: { Authorization: `Bearer ${token}` } });
                                         setAlbumComments(prev => prev.filter(c => c.id !== comment.id));
                                         // Update count
                                         setAlbums(prev => prev.map(a => a.id === selectedAlbum.id ? { ...a, comment_count: Math.max(0, a.comment_count - 1) } : a));
                                      } catch (e) { alert('删除失败'); }
                                   }}
                                   className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                 >
                                   <Trash2 size={14} />
                                 </button>
                              )}
                           </div>
                        ))
                     )}
                  </div>

                  {/* Comment Input */}
                  <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/30">
                     {user ? (
                        <form onSubmit={handleAlbumComment} className="relative">
                           <input
                             type="text"
                             value={newComment}
                             onChange={(e) => setNewComment(e.target.value)}
                             placeholder="写下你的评论..."
                             className="w-full pl-4 pr-12 py-2 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 text-sm"
                           />
                           <button 
                             type="submit"
                             disabled={!newComment.trim() || isSendingComment}
                             className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md disabled:opacity-50"
                           >
                              {isSendingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                           </button>
                        </form>
                     ) : (
                        <div className="text-center text-sm text-slate-500">
                           <Link to="/login" className="text-purple-500 hover:underline">登录</Link> 后参与评论
                        </div>
                     )}
                  </div>
               </div>
            </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
