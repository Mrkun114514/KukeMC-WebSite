'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api, { generateUploadHeaders } from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Clock, MessageSquare, 
  AlertCircle, Loader2, Send, Shield, 
  Hash, Activity, CalendarDays,
  Reply, Trash2, X, Heart, Edit2, AlertTriangle, ThumbsUp, Image as ImageIcon, Upload, MessageCircle,
  UserPlus, UserMinus, Bookmark, Ban,
  Star, Play, Pause
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/context/AuthContext';
import PostCard from '@/components/next/PostCard';
import CommentSection, { UIComment } from '@/components/next/CommentSection';
import ContributionGraph from '@/components/ContributionGraph';
import { getPosts } from '@/services/activity';
import { followUser, unfollowUser, getFollowStats } from '@/services/follow';
import { getLevelColor } from '@/utils/levelUtils';
import { useCurrentUserLevel } from '@/hooks/useCurrentUserLevel';
import { useToast } from '@/context/ToastContext';
import { useConfirm } from '@/context/ConfirmContext';

import { Post, FollowStats } from '@/types/activity';
import MessageCard from './MessageCard';
import UserListModal from './UserListModal';

interface UserProfile {
  username: string;
  signature: string | null;
  bio: string | null;
  tags: string[];
  likes: number;
  total_likes: number;
  is_liked: boolean;
  likers: string[];
  custom_title?: string;
  music_id?: string | null;
}

interface MusicMeta {
  name: string;
  artist: string;
  cover: string | null;
  id: string;
  url?: string | null;
}

interface LevelInfo {
  username: string;
  level: number;
  current_xp: number;
  next_level_xp: number;
  level_start_xp: number;
  rank: number;
  progress: {
    current: number;
    max: number;
    start: number;
  };
}

interface Album {
  id: number;
  username: string;
  title: string;
  description: string | null;
  image_url: string;
  thumbnail_url?: string; // Add thumbnail field
  likes: number;
  created_at: string;
  is_liked: boolean;
  is_collected?: boolean;
  comment_count: number;
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
  warn_history: any[];
  warn_count: number;
}

interface Message {
  id: number;
  player: string;
  recipient?: string | null;
  level?: number;
  content: string;
  timestamp: number;
  parent_id: number | null;
  replies?: Message[];
  likes: number;
  is_liked: boolean;
}

const ADMIN_KEY_STORAGE = 'admin_key';

const getThumbnailUrl = (url: string) => {
  if (!url) return url;
  // Naming convention: name.ext -> name_thumb.ext
  const parts = url.split('.');
  if (parts.length < 2) return url;
  const ext = parts.pop();
  return `${parts.join('.')}_thumb.${ext}`;
};

const ProfileClient = () => {
  const params = useParams();
  const username = params?.username as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { error: toastError, success: toastSuccess, warning: toastWarning } = useToast();
  const { confirm } = useConfirm();
  
  const { user, token, loading: authLoading } = useAuth();
  
  const [details, setDetails] = useState<PlayerDetails | null>(null);
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null);
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

  // User List Modal State
  const [showUserList, setShowUserList] = useState<'followers' | 'following' | null>(null);
  const [userList, setUserList] = useState<{ username: string; nickname?: string }[]>([]);
  const [userListLoading, setUserListLoading] = useState(false);
  
  // Admin State
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState<string | null>(null);

  // Profile Extended State
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  // Music Player State
  const [musicMeta, setMusicMeta] = useState<MusicMeta | null>(null);
  const [isPlaying, setIsPlaying] = useState(false); // Default to false
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (profile?.music_id) {
       // Reset state when music changes
       setMusicMeta(null);
       setProgress(0);
       setIsPlaying(false); // Don't preemptively set playing state
       setAutoplayBlocked(false);
       
       api.get(`/api/profile/music/${profile.music_id}`)
         .then(res => {
           setMusicMeta(res.data);
         })
         .catch(err => console.error(err));
    }
  }, [profile?.music_id]);

  useEffect(() => {
    if (musicMeta && audioRef.current) {
        const audio = audioRef.current;
        audio.volume = 0.5;
        
        const attemptPlay = async () => {
            try {
                await audio.play();
            } catch (error) {
                console.log("Autoplay blocked:", error);
                setAutoplayBlocked(true);
                setIsPlaying(false);
            }
        };
        
        if (audio.readyState >= 3) {
            attemptPlay();
        } else {
            audio.addEventListener('canplay', attemptPlay, { once: true });
        }

        return () => {
            audio.removeEventListener('canplay', attemptPlay);
            audio.pause();
        };
    }
  }, [musicMeta]);

  // Handle interaction fallback for autoplay blocked
  useEffect(() => {
    const handleInteraction = () => {
        // Only run if autoplay was specifically blocked
        if (!autoplayBlocked) return;
        
        const audio = audioRef.current;
        if (!audio) return;
        
        // Try to play on interaction
        if (audio.paused) {
            const playPromise = audio.play();
            if (playPromise && typeof (playPromise as any).catch === 'function') {
                (playPromise as any).catch((err: any) => {
                    console.error("Interaction play failed", err);
                });
            }
        }
    };

    if (autoplayBlocked) {
        document.addEventListener('click', handleInteraction, { once: true });
        document.addEventListener('keydown', handleInteraction, { once: true });
        document.addEventListener('touchstart', handleInteraction, { once: true });
    }

    return () => {
        document.removeEventListener('click', handleInteraction);
        document.removeEventListener('keydown', handleInteraction);
        document.removeEventListener('touchstart', handleInteraction);
    };
  }, [autoplayBlocked]);


  // Album State
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isAlbumLoading, setIsAlbumLoading] = useState(true);
  
  // Activity & Follow State
  const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'collections' | 'albums'>('overview');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userCollections, setUserCollections] = useState<Post[]>([]);
  const [followStats, setFollowStats] = useState<FollowStats>({ followers_count: 0, following_count: 0, is_following: false });
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  
  const [collectedAlbums, setCollectedAlbums] = useState<Album[]>([]);
  const { level: currentUserLevel } = useCurrentUserLevel();
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    file: null as File | null
  });
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [albumComments, setAlbumComments] = useState<any[]>([]); // Relaxed type to avoid crash if model mismatches
  const [newComment, setNewComment] = useState('');
  const [isCommentLoading, setIsCommentLoading] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  
  // Cache state for tabs
  const [tabDataCache, setTabDataCache] = useState<{
    username: string | null,
    posts: { data: Post[], loaded: boolean },
    collections: { data: Post[], loaded: boolean }
  }>({
    username: null,
    posts: { data: [], loaded: false },
    collections: { data: [], loaded: false }
  });


  // Fetch public details that don't require auth or don't change with auth
  useEffect(() => {
    if (username) {
      fetchDetails(username);
      fetchLevelInfo(username);
    }
  }, [username]);

  // Fetch data that depends on user authentication (likes, follow status, etc.)
  useEffect(() => {
    if (authLoading) return; // Wait for auth to initialize

    // Use typeof window check for localStorage in SSR/SSG
    if (typeof window !== 'undefined') {
        const storedKey = localStorage.getItem(ADMIN_KEY_STORAGE);
        if (storedKey) {
            setAdminKey(storedKey);
            setIsAdmin(true);
        }
    }
    
    if (username) {
      fetchMessages(username);
      fetchProfile(username);
      fetchAlbums(username);
      fetchFollowStatsData(username);
    }
  }, [username, token, authLoading]); 

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'posts', 'collections', 'albums'].includes(tab)) {
        setActiveTab(tab as any);
    }
  }, [searchParams]);

  useEffect(() => {
    // Reset cache when switching users
    setTabDataCache({
      username: username || null,
      posts: { data: [], loaded: false },
      collections: { data: [], loaded: false }
    });
    setUserPosts([]);
    setUserCollections([]);
    setCollectedAlbums([]);
  }, [username]);

  useEffect(() => {
    if (username) {
      const isCacheValid = tabDataCache.username === username;

      if (activeTab === 'posts') {
         if (!isCacheValid || !tabDataCache.posts.loaded) {
             fetchUserPosts(username);
         } else {
             setUserPosts(tabDataCache.posts.data);
         }
      }
      if (activeTab === 'collections') {
         if (!isCacheValid || !tabDataCache.collections.loaded) {
             fetchUserCollections();
         } else {
             setUserCollections(tabDataCache.collections.data);
         }
      }
    }
  }, [username, token, activeTab, tabDataCache]);

  const fetchFollowStatsData = async (name: string) => {
    try {
      const stats = await getFollowStats(name);
      setFollowStats(stats);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUserPosts = async (name: string) => {
    setPostsLoading(true);
    try {
      const res = await getPosts({ author: name });
      setUserPosts(res.data);
      setTabDataCache(prev => ({ 
          ...prev, 
          username: name,
          posts: { data: res.data, loaded: true } 
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchUserCollections = async () => { 
    setPostsLoading(true);
    try {
      // Fetch collected posts (Now returns both posts and albums)
      const postsRes = await getPosts({ is_collected: true });
      setUserCollections(postsRes.data);
      
      setCollectedAlbums([]); 

      setTabDataCache(prev => ({ 
          ...prev, 
          username: username || prev.username,
          collections: { data: postsRes.data, loaded: true } 
      }));
    } catch (error) {
      console.error(error);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchUserList = async (type: 'followers' | 'following') => {
    if (!username) return;
    setUserListLoading(true);
    setShowUserList(type);
    setUserList([]); // Reset list before fetching
    try {
      const res = await api.get<any>(`/api/social/${type}/${username}`);
      if (Array.isArray(res.data)) {
        setUserList(res.data);
      } else if (res.data.data && Array.isArray(res.data.data)) {
        setUserList(res.data.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUserListLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!username || isFollowLoading) return;
    setIsFollowLoading(true);
    try {
      if (followStats.is_following) {
        await unfollowUser(username);
        setFollowStats(prev => ({ ...prev, is_following: false, followers_count: prev.followers_count - 1 }));
      } else {
        await followUser(username);
        setFollowStats(prev => ({ ...prev, is_following: true, followers_count: prev.followers_count + 1 }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const fetchAlbums = async (name: string) => {
    setIsAlbumLoading(true);
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await api.get<Album[]>(`/api/album/list/${name}`, {
        ...config,
        params: { _t: Date.now() }
      });
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
      
      const securityHeaders = await generateUploadHeaders();

      // Use internal API for upload
      const uploadRes = await api.post('/api/upload/image', imageFormData, {
         headers: {
            'Content-Type': 'multipart/form-data',
            ...securityHeaders
         }
      });
      
      const imageUrl = uploadRes.data.url;
      const thumbnailUrl = uploadRes.data.thumbnail_url;
      
      // 2. Create Album Entry
      await api.post('/api/album/upload', {
        title: uploadForm.title,
        description: uploadForm.description,
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl
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
    setAlbumComments([]);
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await api.get(`/api/album/${album.id}`, config);
      setAlbumComments(Array.isArray(res.data.comments) ? res.data.comments : []);
      setSelectedAlbum(prev => prev ? { ...prev, ...res.data } : null);
    } catch (err) {
      console.error(err);
      setAlbumComments([]); 
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

  const handleAlbumCollect = async (album: Album) => {
    if (!user) return;
    try {
      const res = await api.post(`/api/album/${album.id}/collect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const updateAlbum = (a: Album) => {
        if (a.id === album.id) {
          return { ...a, is_collected: res.data.is_collected };
        }
        return a;
      };
      
      setAlbums(prev => prev.map(updateAlbum));
      if (res.data.is_collected) {
          setCollectedAlbums(prev => {
              if (prev.find(a => a.id === album.id)) return prev;
              return [{ ...album, is_collected: true }, ...prev];
          });
      } else {
          setCollectedAlbums(prev => prev.filter(a => a.id !== album.id));
      }

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

    if (currentUserLevel !== null && currentUserLevel < 5) {
      alert('您的等级不足 5 级，无法评论。请前往游戏内升级！');
      return;
    }
    
    setIsSendingComment(true);
    try {
      const res = await api.post(`/api/album/${selectedAlbum.id}/comment`, { content: newComment }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data.data) {
         setAlbumComments(prev => [...(prev || []), res.data.data]);
      } else {
         const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
         const detailRes = await api.get(`/api/album/${selectedAlbum.id}`, config);
         setAlbumComments(Array.isArray(detailRes.data.comments) ? detailRes.data.comments : []);
      }
      
      setNewComment('');
      setAlbums(prev => prev.map(a => a.id === selectedAlbum.id ? { ...a, comment_count: a.comment_count + 1 } : a));
    } catch (err: any) {
      alert(err.response?.data?.detail || '评论失败');
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleDeleteAlbum = async (albumId: number) => {
    const isConfirmed = await confirm({
      title: '删除照片',
      message: '确定要删除这张照片吗？此操作无法撤销。',
      isDangerous: true,
      confirmText: '删除',
    });

    if (!isConfirmed) return;

    try {
      await api.delete(`/api/album/${albumId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (selectedAlbum?.id === albumId) setSelectedAlbum(null);
      setAlbums(prev => prev.filter(a => a.id !== albumId));
      toastSuccess('删除成功');
    } catch (err: any) {
      toastError(err.response?.data?.detail || '删除失败');
    }
  };

  const fetchProfile = async (name: string) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await api.get<UserProfile>(`/api/profile/${name}`, {
        ...config,
        params: { _t: Date.now() }
      });
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const handleBindQQ = () => {
    router.push('/settings');
  };

  const handleLike = async () => {
    if (!user || !username) return;
    try {
      await api.post('/api/profile/like', { target_username: username }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProfile(username);
    } catch (err: any) {
      toastError(err.response?.data?.detail || '操作失败');
    }
  };

  const fetchLevelInfo = async (name: string) => {
    try {
      const res = await api.get<LevelInfo>('/api/level/my-info', { params: { username: name } });
      setLevelInfo(res.data);
    } catch (err) {
      console.error('Failed to fetch level info', err);
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

  const handleLikeMessage = async (msgId: number) => {
    if (!user) return;
    try {
      const res = await api.post(`/api/message/${msgId}/like`, {}, {
         headers: { Authorization: `Bearer ${token}` }
      });
      
      const updateMsg = (msg: Message): Message => {
        if (msg.id === msgId) {
          return { ...msg, likes: res.data.likes, is_liked: res.data.liked };
        }
        if (msg.replies) {
          return { ...msg, replies: msg.replies.map(updateMsg) };
        }
        return msg;
      };
      
      setMessages(prev => prev.map(updateMsg));
    } catch (err: any) {
      console.error(err);
    }
  };

  const comments: UIComment[] = useMemo(() => {
    const mapMessage = (msg: Message): UIComment => ({
      id: msg.id,
      content: msg.content,
      created_at: msg.timestamp,
      author: {
        username: msg.player,
        nickname: msg.player,
        avatar: `https://cravatar.eu/helmavatar/${msg.player}/48.png`,
        level: msg.level
      },
      likes_count: msg.likes,
      is_liked: msg.is_liked,
      replies: (msg.replies || []).map(mapMessage),
      parent_id: msg.parent_id || undefined
    });
    return messages.map(mapMessage);
  }, [messages]);

  const handleCommentSubmit = async (content: string, parentId?: number) => {
     if (!user || !username) return;

     if (currentUserLevel !== null && currentUserLevel < 5) {
       toastError('您的等级不足 5 级，无法留言。请前往游戏内升级！');
       return;
     }

     if (parentId) {
         // Reply
         setIsReplying(true); 
         try {
             await api.post('/api/message/write', {
                message: content,
                player: user.username,
                recipient: username,
                parent_id: parentId
              }, {
                headers: { Authorization: `Bearer ${token}` }
              });
              fetchMessages(username);
              toastSuccess('回复成功');
         } catch (err: any) {
             toastError(err.response?.data?.error || '回复失败');
             throw err;
         } finally {
             setIsReplying(false);
         }
     } else {
         // New Post
         setIsPosting(true);
         try {
            await api.post('/api/message/write', {
                message: content,
                player: user.username,
                recipient: username,
                parent_id: null
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMessages(username);
            toastSuccess('留言发布成功');
         } catch (err: any) {
             toastError(err.response?.data?.error || '发布失败');
             throw err;
         } finally {
             setIsPosting(false);
         }
     }
  };

  const handleLikeComment = async (msgId: number) => {
      await handleLikeMessage(msgId);
  };

  const handleDeleteComment = async (msgId: number) => {
      await handleDelete(msgId);
  };

  const handleReply = async (e: React.FormEvent, parentId: number) => {
    e.preventDefault();
    if (!replyContent.trim() || !user || !username) return;

    setIsReplying(true);
    try {
      await api.post('/api/message/write', {
        message: replyContent,
        player: user.username,
        recipient: username, 
        parent_id: parentId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReplyContent('');
      setReplyingTo(null);
      fetchMessages(username);
      toastSuccess('回复成功');
    } catch (err: any) {
      toastError(err.response?.data?.error || '回复失败');
    } finally {
      setIsReplying(false);
    }
  };

  const handleDelete = async (id: number) => {
    const isConfirmed = await confirm({
      title: '删除留言',
      message: '确定要删除这条留言吗？此操作无法撤销。',
      isDangerous: true,
      confirmText: '删除',
    });

    if (!isConfirmed) return;

    const authHeader = adminKey ? `Bearer ${adminKey}` : (token ? `Bearer ${token}` : null);
    
    if (!authHeader) {
      toastError('无权删除');
      return;
    }

    try {
      await api.delete(`/api/message/${id}`, {
        headers: { 'Authorization': authHeader }
      });
      if (username) fetchMessages(username);
      toastSuccess('删除成功');
    } catch (err: any) {
      toastError('删除失败: ' + (err.response?.data?.error || err.message));
    }
  };

  const handlePostUpdate = (updatedPost: Post) => {
    setUserPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
    
    setUserCollections(prev => {
        const isInCollection = prev.some(p => p.id === updatedPost.id);
        if (isInCollection) {
            if (!updatedPost.is_collected) {
                return prev.filter(p => p.id !== updatedPost.id);
            }
            return prev.map(p => p.id === updatedPost.id ? updatedPost : p);
        } else if (updatedPost.is_collected) {
            return [updatedPost, ...prev];
        }
        return prev;
    });

    setTabDataCache(prev => {
      const newPostsData = prev.posts.data.map(p => p.id === updatedPost.id ? updatedPost : p);
      
      let newCollectionsData = prev.collections.data;
      const isInCollectionCache = newCollectionsData.some(p => p.id === updatedPost.id);
      
      if (isInCollectionCache) {
          if (!updatedPost.is_collected) {
              newCollectionsData = newCollectionsData.filter(p => p.id !== updatedPost.id);
          } else {
              newCollectionsData = newCollectionsData.map(p => p.id === updatedPost.id ? updatedPost : p);
          }
      } else if (updatedPost.is_collected) {
          newCollectionsData = [updatedPost, ...newCollectionsData];
      }

      return {
        ...prev,
        posts: { ...prev.posts, data: newPostsData },
        collections: { ...prev.collections, data: newCollectionsData }
      };
    });
  };

  const handlePostDelete = (postId: number) => {
    setUserPosts(prev => prev.filter(p => p.id !== postId));
    setUserCollections(prev => prev.filter(p => p.id !== postId));
    
    setTabDataCache(prev => ({
      ...prev,
      posts: { ...prev.posts, data: prev.posts.data.filter(p => p.id !== postId) },
      collections: { ...prev.collections, data: prev.collections.data.filter(p => p.id !== postId) }
    }));
  };

  const formatHistoryDate = (dateStr: string | number | null | undefined) => {
    if (!dateStr) return '未知日期';
    
    let date: Date;
    
    if (typeof dateStr === 'number') {
       if (dateStr < 10000000000) {
          date = new Date(dateStr * 1000);
       } else {
          date = new Date(dateStr);
       }
    } else {
       let processedStr = String(dateStr);
       
       if (processedStr.includes(' +')) {
          processedStr = processedStr.replace(' +', '+');
       } else if (processedStr.includes(' -')) {
          processedStr = processedStr.replace(' -', '-');
       }
       
       date = new Date(processedStr);
       
       if (isNaN(date.getTime())) {
          if (/^\d+$/.test(dateStr)) {
             const timestamp = parseInt(dateStr);
             if (!isNaN(timestamp)) {
                if (timestamp < 10000000000) {
                   date = new Date(timestamp * 1000);
                } else {
                   date = new Date(timestamp);
                }
             }
          }
       }
    }

    if (isNaN(date.getTime())) {
       if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
          const simpleDate = new Date(dateStr.substring(0, 10));
          if (!isNaN(simpleDate.getTime())) {
             return simpleDate.toLocaleDateString();
          }
       }
       return String(dateStr);
    }
    
    return date.toLocaleString('zh-CN', {
       year: 'numeric',
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
        <Link href="/stats" className="px-6 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
          返回排行榜
        </Link>
      </div>
    );
  }

  // Check ban status
  const isBanned = details.ban_history?.some((ban: any) => ban.active) || false;

  return <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 pt-24">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Profile Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={clsx(
            "relative overflow-hidden bg-white/80 dark:bg-slate-900/50 backdrop-blur-md rounded-3xl p-8 border shadow-xl transition-all duration-300",
            isBanned 
              ? "border-red-500/50 shadow-red-500/20" 
              : "border-slate-200 dark:border-slate-800"
          )}
        >
          {isBanned && (
            <div className="absolute -top-12 -right-12 z-10 pointer-events-none opacity-20 dark:opacity-10 rotate-12">
               <Ban size={300} className="text-red-500" />
            </div>
          )}
          <div className={clsx(
            "absolute top-0 left-0 w-full h-32",
            isBanned 
              ? "bg-gradient-to-r from-red-500/20 to-orange-500/20 dark:from-red-900/40 dark:to-orange-900/40"
              : "bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20"
          )} />
          
          <div className="relative flex flex-col md:flex-row gap-8 mt-4">
            <div className="relative group self-center md:self-end shrink-0">
              <div className={clsx(
                "w-32 h-32 rounded-2xl overflow-hidden ring-4 shadow-2xl relative",
                isBanned ? "ring-red-500 grayscale" : "ring-white dark:ring-slate-900"
              )}>
                <img
                  src={`https://cravatar.eu/helmavatar/${details.username}/256.png`}
                  alt={details.username}
                  className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
                {isBanned && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                     <Ban size={48} className="text-red-500 drop-shadow-lg" />
                  </div>
                )}
              </div>
              <div className={clsx(
                "absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center shadow-lg",
                details.online_now ? "bg-green-500" : "bg-slate-400"
              )} title={details.online_now ? "在线" : "离线"}>
                {details.online_now && <div className="w-2 h-2 bg-white rounded-full animate-ping" />}
              </div>
            </div>

            <div className="flex-1 text-center md:text-left mb-2 self-center md:self-end flex flex-col md:flex-row md:items-end justify-between w-full">
              <div className="flex-1">
                <div className="flex items-center justify-center md:justify-start gap-4 mb-2">
                <h1 className="text-4xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                  {details.username}
                  <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-1.5 align-middle">
                    <User size={14} />
                    {profile?.custom_title || '玩家'}
                  </span>
                  {levelInfo && (
                    <span className={`px-3 py-1 rounded-lg border ${getLevelColor(levelInfo.level).bg} ${getLevelColor(levelInfo.level).border} flex items-center gap-1.5`}>
                      <Star size={16} className={getLevelColor(levelInfo.level).icon} />
                      <span className={`text-sm font-bold ${getLevelColor(levelInfo.level).icon}`}>Lv.{levelInfo.level}</span>
                    </span>
                  )}
                </h1>
                
                <div className="flex items-center gap-3">
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

                  {/* Follow Button */}
                  {user && user.username !== details.username && (
                    <button
                      onClick={handleFollow}
                      disabled={isFollowLoading}
                      className={clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all border",
                        followStats.is_following
                          ? "bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                          : "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                      )}
                    >
                      {isFollowLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : followStats.is_following ? (
                        <>
                          <UserMinus size={16} />
                          <span className="font-medium">已关注</span>
                        </>
                      ) : (
                        <>
                          <UserPlus size={16} />
                          <span className="font-medium">关注</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              
                  {/* Follow Stats */}
              
              {/* Signature */}
              <div className="mb-4 text-slate-600 dark:text-slate-300 italic min-h-[1.5em]">
                {profile?.signature ? (
                  <span>"{profile.signature}"</span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 text-sm">这个人很懒，什么也没写...</span>
                )}
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-3 items-center">
                {details.qq ? (
                   <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm font-medium flex items-center gap-1.5">
                     <MessageSquare size={14} />
                     QQ已绑定
                   </span>
                ) : (
                  user && user.username === details.username && (
                    <button 
                      onClick={handleBindQQ}
                      className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-medium flex items-center gap-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                    >
                      <MessageSquare size={14} />
                      绑定QQ
                    </button>
                  )
                )}
                 {details.ban_count > 0 && (
                   <span className="px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-medium flex items-center gap-1.5">
                     <Shield size={14} />
                     {details.ban_count} 次封禁记录
                   </span>
                )}
                 {details.warn_count > 0 && (
                   <span className="px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-medium flex items-center gap-1.5">
                     <AlertTriangle size={14} />
                     {details.warn_count} 次警告记录
                   </span>
                )}
                
                {/* Edit Profile Button */}
                {user && user.username === details.username && (
                  <Link 
                    href="/settings"
                    className="ml-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-sm font-medium flex items-center gap-1.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                  >
                    <Edit2 size={14} />
                    编辑资料
                  </Link>
                )}
              </div>
              {isBanned && (
                 <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3 text-red-600 dark:text-red-400 animate-pulse">
                    <Ban size={20} className="shrink-0" />
                    <span className="font-medium text-sm">此玩家已被服务器封禁</span>
                 </div>
              )}
              </div>

              {/* Right Side Stats */}
              <div className="flex flex-col items-center md:items-end gap-4 mt-4 md:mt-0">
                  {/* Follow Stats */}
                  <div className="flex items-center gap-4 mb-2">
                    <div 
                      onClick={() => fetchUserList('following')}
                      className="flex flex-col items-center cursor-pointer group transition-all hover:-translate-y-0.5"
                    >
                      <span className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                        {followStats.following_count}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-indigo-400 transition-colors">关注</span>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                    <div 
                      onClick={() => fetchUserList('followers')}
                      className="flex flex-col items-center cursor-pointer group transition-all hover:-translate-y-0.5"
                    >
                      <span className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                        {followStats.followers_count}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-indigo-400 transition-colors">粉丝</span>
                    </div>
                  </div>

                  
                  <div className="text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider flex items-center gap-2 bg-slate-50 dark:bg-slate-800/30 px-3 py-1 rounded-full">
                    <span>最后登录</span>
                    <span className="text-slate-900 dark:text-white font-medium font-mono">
                       {details.last_login ? new Date(details.last_login).toLocaleDateString() : '未知'}
                    </span>
                  </div>
              </div>
            </div>


          </div>

          <div className="absolute top-6 right-6 flex flex-wrap justify-end gap-2 max-w-[40%]">
             {profile && profile.tags && profile.tags.length > 0 && profile.tags.map((tag, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 whitespace-nowrap shadow-sm">
                  #{tag}
                </span>
             ))}
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex justify-center gap-2 sm:gap-4 flex-wrap">
          <button
            onClick={() => setActiveTab('overview')}
            className={clsx(
              "px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2.5 text-sm sm:text-base relative",
              activeTab === 'overview'
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <User size={18} />
            个人主页
          </button>
          <button
            onClick={() => setActiveTab('posts')}
            className={clsx(
              "px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2.5 text-sm sm:text-base relative",
              activeTab === 'posts'
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Activity size={18} />
            动态
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={clsx(
              "px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2.5 text-sm sm:text-base relative",
              activeTab === 'collections'
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <Bookmark size={18} />
            收藏
          </button>
          <button
            onClick={() => setActiveTab('albums')}
            className={clsx(
              "px-6 py-2.5 rounded-xl font-medium transition-all duration-300 flex items-center gap-2.5 text-sm sm:text-base relative",
              activeTab === 'albums'
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            <ImageIcon size={18} />
            相册
          </button>
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' ? (
             <motion.div
               key="overview"
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: 20 }}
               transition={{ duration: 0.3, ease: "easeOut" }}
               className="space-y-8"
             >
               {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">



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
                      <Heart size={24} />
                    </div>
                    <div>
                      <div className="text-slate-500 dark:text-slate-400 text-sm">获得总赞数</div>
                      <div className="text-2xl font-bold text-slate-900 dark:text-white">{profile?.total_likes || 0}</div>
                    </div>
                  </div>
                   <div className="text-xs text-slate-500">
                      包括动态、相册、评论及主页获赞
                  </div>
                </div>
              </div>

               {/* Contribution Graph */}
               <ContributionGraph username={details.username} />

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
                              <Link href={`/player/${liker}`} key={liker} title={liker}>
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
                                <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">登录次数</div>
                                <div className="text-slate-700 dark:text-slate-300 font-mono text-sm">
                                    {details.login_count} 次
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

                    {/* Violation Records */}
                    {(details.warn_count > 0 || details.ban_count > 0) && (
                        <div className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                <AlertTriangle size={20} className="text-slate-400" />
                                违规记录
                            </h3>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                {details.ban_history && details.ban_history.map((ban, idx) => (
                                    <div key={`ban-${idx}`} className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] rounded font-bold uppercase">封禁</span>
                                            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                                                {formatHistoryDate(ban.time || ban.created)}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1 break-words">
                                            {ban.reason}
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-slate-500">
                                            <span>操作: {ban.banned_by_name}</span>
                                            <span>{ban.active ? '生效中' : '已过期'}</span>
                                        </div>
                                    </div>
                                ))}
                                {details.warn_history && details.warn_history.map((warn, idx) => (
                                    <div key={`warn-${idx}`} className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="px-1.5 py-0.5 bg-orange-500 text-white text-[10px] rounded font-bold uppercase">警告</span>
                                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                                {formatHistoryDate(warn.time || warn.created_at)}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-700 dark:text-slate-300 font-medium mb-1 break-words">
                                            {warn.reason}
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-slate-500">
                                            <span>操作: {warn.operator}</span>
                                            {warn.kicked && <span>已踢出</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                 </div>
     
                 {/* Right Column: Message Board */}
                 <div className="lg:col-span-2">
                   <CommentSection 
                       comments={comments}
                       currentUser={user}
                       onSubmit={handleCommentSubmit}
                       onDelete={handleDeleteComment}
                       onLike={handleLikeComment}
                       loading={msgLoading}
                       title="留言板"
                       className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 h-full"
                   />
                 </div>
              </div>
            </motion.div>
          ) : activeTab === 'posts' ? (
            <motion.div
              key="posts"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 gap-6">
                {postsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 size={32} className="animate-spin text-emerald-500" />
                  </div>
                ) : userPosts && userPosts.length > 0 ? (
                  userPosts.map(post => (
                    <PostCard 
                      key={`${post.type || 'post'}-${post.id}`} 
                      post={post} 
                      onUpdate={handlePostUpdate}
                      onDelete={handlePostDelete}
                    />
                  ))
                ) : (
                  <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <p className="text-slate-500">暂时没有动态</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'collections' ? (
            <motion.div
              key="collections"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {postsLoading ? (
                   <div className="flex justify-center py-12 col-span-full">
                    <Loader2 size={32} className="animate-spin text-emerald-500" />
                  </div>
                ) : ((userCollections?.length || 0) === 0 && (collectedAlbums?.length || 0) === 0) ? (
                  <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 col-span-full">
                    <p className="text-slate-500">暂时没有收藏的内容</p>
                  </div>
                ) : (
                  <>
                  {/* Merge and Sort Collections */}
                  {[
                    ...(userCollections || []).map(item => ({ type: (item.type || 'post') as 'post' | 'album', data: item, date: item.created_at })),
                    ...(collectedAlbums || []).map(album => ({ type: 'album' as const, data: album, date: album.created_at }))
                  ]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((item, idx) => (
                    <div key={`${item.type}-${item.data.id}-${idx}`} className="h-full">
                      {item.type === 'post' ? (
                        /* Compact Post Card */
                        <Link href={`/activity/${(item.data as Post).id}`} className="block group h-full">
                          <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col relative aspect-[4/5]">
                            {/* Type Badge */}
                            <div className="absolute top-2 right-2 z-10">
                                <span className="px-2 py-1 bg-black/40 backdrop-blur-sm text-white text-[10px] rounded-full flex items-center gap-1">
                                    <Activity size={10} />
                                    动态
                                </span>
                            </div>

                            {/* Post Image Cover if available */}
                            {(item.data as Post).images && (item.data as Post).images!.length > 0 ? (
                               <div className="relative h-[50%] overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                 <img 
                                   src={(item.data as Post).images![0]} 
                                   alt={(item.data as Post).title}
                                   className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                 />
                                 {(item.data as Post).images!.length > 1 && (
                                   <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                                     +{(item.data as Post).images!.length - 1}
                                   </div>
                                 )}
                               </div>
                            ) : (
                               /* Text-only Post visual pattern */
                               <div className="h-[50%] p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border-b border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center text-center relative overflow-hidden flex-shrink-0">
                                  <div className="absolute top-0 left-0 w-full h-full opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.05) 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                                  <MessageSquare size={24} className="text-indigo-400/50 mb-2 relative z-10" />
                                  <h3 className="font-bold text-slate-800 dark:text-slate-200 line-clamp-2 relative z-10 px-2 text-sm">
                                    {(item.data as Post).title}
                                  </h3>
                               </div>
                            )}
                            
                            <div className="p-3 flex-1 flex flex-col overflow-hidden">
                              <div className="flex-1 flex flex-col justify-center">
                                {/* Show title here only if image post (text post shows title in header) */}
                                {((item.data as Post).images && (item.data as Post).images!.length > 0) && (
                                  <h3 className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-sm">
                                    {(item.data as Post).title}
                                  </h3>
                                )}

                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                                  {(item.data as Post).content.replace(/[#*`]/g, '')}
                                </p>
                              </div>
                              
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto">
                                <div className="flex items-center gap-2 min-w-0">
                                   <img 
                                      src={`https://cravatar.eu/helmavatar/${(item.data as Post).author.username}/24.png`} 
                                      className="w-5 h-5 rounded-full flex-shrink-0"
                                      alt={(item.data as Post).author.username}
                                   />
                                   <span className="text-xs text-slate-500 truncate">
                                     {(item.data as Post).author.nickname || (item.data as Post).author.username}
                                   </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-slate-400 flex-shrink-0">
                                   <span className="flex items-center gap-1">
                                     <Heart size={12} className={clsx((item.data as Post).is_liked && "fill-red-500 text-red-500")} />
                                     {(item.data as Post).likes_count}
                                   </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ) : (
                        /* Album Card - Fixed aspect ratio */
                        <div className="group relative rounded-xl overflow-hidden bg-white dark:bg-slate-900 cursor-pointer border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all h-full flex flex-col aspect-[4/5]" onClick={() => openAlbumDetail(item.data as Album)}>
                           <div className="relative h-[50%] overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                             {/* Type Badge */}
                             <div className="absolute top-2 right-2 z-10">
                                <span className="px-2 py-1 bg-black/40 backdrop-blur-sm text-white text-[10px] rounded-full flex items-center gap-1">
                                    <ImageIcon size={10} />
                                    相册
                                </span>
                             </div>

                             <img 
                              src={getThumbnailUrl((item.data as Album).image_url)} 
                              alt={(item.data as Album).description || (item.data as Album).title} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                              onError={(e) => {
                                // Fallback to original image if thumbnail fails
                                (e.target as HTMLImageElement).src = (item.data as Album).image_url;
                              }}
                            />
                           </div>
                           
                           <div className="p-3 flex-1 flex flex-col overflow-hidden bg-white dark:bg-slate-900">
                              <div className="flex-1 flex flex-col justify-center">
                                 <h4 className="font-bold text-slate-900 dark:text-white mb-1 line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors text-sm">{(item.data as Album).title}</h4>
                                 <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">{(item.data as Album).description}</p>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 mt-auto">
                              <div className="flex items-center gap-2 min-w-0">
                                 <img 
                                    src={`https://cravatar.eu/helmavatar/${(item.data as any).author?.username || (item.data as Album).username}/24.png`} 
                                    className="w-5 h-5 rounded-full flex-shrink-0"
                                    alt={(item.data as any).author?.username || (item.data as Album).username}
                                 />
                                 <span className="text-xs text-slate-500 truncate">
                                   {(item.data as any).author?.nickname || (item.data as any).author?.username || (item.data as Album).username}
                                 </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-400 flex-shrink-0">
                                 <span className="flex items-center gap-1">
                                   <Heart size={12} className={clsx((item.data as Album).is_liked && "fill-red-500 text-red-500")} />
                                   {(item.data as any).likes_count !== undefined ? (item.data as any).likes_count : (item.data as Album).likes}
                                 </span>
                              </div>
                           </div>
                        </div>
                      </div>
                     )}
                   </div>
                 ))}
                  </>
                )}
              </div>
            </motion.div>
          ) : (
             <motion.div
               key="albums"
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
                               src={getThumbnailUrl(album.image_url)} 
                               alt={album.title}
                               className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105"
                               loading="lazy"
                               onError={(e) => {
                                 (e.target as HTMLImageElement).src = album.image_url;
                               }}
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



      {/* User List Modal */}
      <UserListModal 
        isOpen={showUserList !== null}
        onClose={() => setShowUserList(null)}
        title={showUserList === 'following' ? '关注列表' : '粉丝列表'}
        users={userList}
        loading={userListLoading}
      />

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
                <button onClick={closeUploadModal} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" title="关闭">
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
                  title="关闭"
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
                        <button onClick={() => setSelectedAlbum(null)} className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hidden md:block" title="关闭">
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

                        <button 
                          onClick={() => handleAlbumCollect(selectedAlbum)}
                          disabled={!user}
                          className={clsx(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all border text-sm font-medium",
                            selectedAlbum.is_collected 
                              ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800" 
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20",
                             !user && "opacity-50 cursor-not-allowed"
                          )}
                        >
                           <Bookmark size={16} className={clsx(selectedAlbum.is_collected && "fill-current")} />
                           {selectedAlbum.is_collected ? '已收藏' : '收藏'}
                        </button>
                     </div>
                  </div>

                  {/* Comments List */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[200px]">
                     {isCommentLoading ? (
                        <div className="flex justify-center py-8">
                           <Loader2 size={24} className="text-purple-500 animate-spin" />
                        </div>
                     ) : !albumComments || albumComments.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                           <p>暂无评论，快来抢沙发~</p>
                        </div>
                     ) : (
                        albumComments.map(comment => (
                           <div key={comment.id} className="flex gap-3 group">
                              <Link href={`/player/${comment.username}`}>
                                <img 
                                  src={`https://cravatar.eu/helmavatar/${comment.username}/32.png`} 
                                  alt={comment.username}
                                  className="w-8 h-8 rounded-md flex-shrink-0 bg-slate-200 hover:opacity-80 transition-opacity"
                                />
                              </Link>
                              <div className="flex-1 min-w-0">
                                 <div className="flex items-baseline justify-between mb-1">
                                    <Link href={`/player/${comment.username}`} className="font-bold text-sm text-slate-900 dark:text-white hover:text-emerald-500 hover:underline transition-colors">
                                      {comment.username}
                                    </Link>
                                    <span className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                                 </div>
                                 <p className="text-sm text-slate-600 dark:text-slate-300 break-words">{comment.content}</p>
                              </div>
                              {/* Delete Comment (Admin/Owner) */}
                              {(user && (user.username === comment.username || user.username === selectedAlbum.username || isAdmin)) && (
                                 <button 
                                   onClick={async () => {
                                      const isConfirmed = await confirm({
                                        title: '删除评论',
                                        message: '确定要删除这条评论吗？',
                                        isDangerous: true,
                                        confirmText: '删除'
                                      });
                                      if (!isConfirmed) return;
                                      try {
                                         await api.delete(`/api/album/comment/${comment.id}`, { headers: { Authorization: `Bearer ${token}` } });
                                         setAlbumComments(prev => prev.filter(c => c.id !== comment.id));
                                         // Update count
                                         setAlbums(prev => prev.map(a => a.id === selectedAlbum.id ? { ...a, comment_count: Math.max(0, a.comment_count - 1) } : a));
                                         toastSuccess('删除成功');
                                      } catch (e) { toastError('删除失败'); }
                                   }}
                                   className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                   title="删除评论"
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
                             title="发送评论"
                           >
                              {isSendingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                           </button>
                        </form>
                     ) : (
                        <div className="text-center text-sm text-slate-500">
                           <Link href="/login" className="text-purple-500 hover:underline">登录</Link> 后参与评论
                        </div>
                     )}
                  </div>
               </div>
            </motion.div>
           </div>
        )}
      </AnimatePresence>
      {/* Floating Music Player */}
      <AnimatePresence>
        {profile?.music_id && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-40"
          >
            <div className="relative group">
              {/* Main Player Card */}
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-3 pr-4 rounded-full shadow-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 transition-all hover:scale-105 hover:shadow-emerald-500/10">
                 {/* Album Art / Spinning Disc */}
                 <div className="relative w-10 h-10 flex items-center justify-center">
                    <div className={clsx(
                        "absolute inset-0 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-md bg-slate-900",
                        isPlaying ? "animate-[spin_8s_linear_infinite]" : ""
                    )}>
                       {musicMeta?.cover ? (
                          <img src={musicMeta.cover} alt="Cover" className="w-full h-full object-cover" />
                       ) : (
                          <div className="w-full h-full bg-[repeating-radial-gradient(#333_0,#333_2px,#000_3px,#000_4px)] opacity-50"></div>
                       )}
                    </div>
                    {!musicMeta?.cover && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 z-10"></div>
                    )}
                    {musicMeta?.cover && (
                         <div className="absolute w-2 h-2 bg-white/20 backdrop-blur-sm rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/40"></div>
                    )}
                 </div>
                 
                 {/* Controls & Info */}
                 <div className="flex flex-col gap-1 min-w-[140px]">
                    <div className="flex items-center justify-between gap-4">
                       <div className="flex flex-col overflow-hidden">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[110px] truncate leading-tight">
                            {musicMeta?.name || "加载中..."}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[110px] truncate leading-tight">
                            {musicMeta?.artist || "网易云音乐"}
                          </span>
                       </div>
                       
                       <button 
                         onClick={() => {
                            if (audioRef.current) {
                                if (isPlaying) audioRef.current.pause();
                                else audioRef.current.play();
                            }
                         }}
                         className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-slate-200 transition-colors flex-shrink-0"
                       >
                          {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current ml-0.5" />}
                       </button>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden cursor-pointer"
                         onClick={(e) => {
                             if (audioRef.current) {
                                 const rect = e.currentTarget.getBoundingClientRect();
                                 const x = e.clientX - rect.left;
                                 const width = rect.width;
                                 const percent = x / width;
                                 audioRef.current.currentTime = percent * audioRef.current.duration;
                                 setProgress(percent * 100);
                             }
                         }}
                    >
                       <motion.div 
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${progress}%` }}
                          layoutId="progressBar"
                       />
                    </div>
                 </div>

                 <audio 
                    ref={audioRef}
                    src={musicMeta?.url || `https://music.163.com/song/media/outer/url?id=${profile.music_id}.mp3`}
                    preload="auto"
                    loop
                    onPlay={() => {
                        setIsPlaying(true);
                        setAutoplayBlocked(false);
                    }}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    onError={(e) => {
                        console.error("Audio playback error:", e);
                        setIsPlaying(false);
                    }}
                    onTimeUpdate={() => {
                        if (audioRef.current) {
                            const current = audioRef.current.currentTime;
                            const duration = audioRef.current.duration;
                            if (duration) setProgress((current / duration) * 100);
                        }
                    }}
                    className="hidden"
                 />
              </div>
              
              {/* Tooltip */}
              <div className={clsx(
                  "absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1 px-2 rounded transition-opacity whitespace-nowrap pointer-events-none z-50",
                  autoplayBlocked ? "opacity-100 animate-bounce" : "opacity-0 group-hover:opacity-100"
              )}>
                 {autoplayBlocked ? "点击播放背景音乐" : "正在播放用户设置的背景音乐"}
                 <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900"></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  ;
};

export default ProfileClient;
