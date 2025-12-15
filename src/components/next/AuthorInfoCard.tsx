'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Author, Post } from '@/types/activity';
import { User, Shield, MapPin, Calendar, Plus, Check } from 'lucide-react';
import api from '@/utils/api';
import { getFollowStats, followUser, unfollowUser } from '@/services/follow';
import { getPosts } from '@/services/activity';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import LevelBadge from '@/components/LevelBadge';

interface AuthorInfoCardProps {
  author: Author;
  className?: string;
}

const AuthorInfoCard: React.FC<AuthorInfoCardProps> = ({ author, className }) => {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    likes: 0
  });
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [profileRes, followData, postsRes] = await Promise.all([
            api.get(`/api/profile/${author.username}`),
            getFollowStats(author.username),
            getPosts({ author: author.username, page: 1, per_page: 3 })
        ]);

        setStats({
            posts: profileRes.data.posts_count || 0,
            likes: profileRes.data.total_likes || 0,
            followers: followData.followers_count || 0
        });
        setIsFollowing(followData.is_following);
        setRecentPosts(postsRes.data || []);
      } catch (error) {
        console.error('Failed to fetch author stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (author.username) {
        fetchStats();
    }
  }, [author.username]);

  const handleFollow = async () => {
    if (!user) {
        toastError('请先登录');
        return;
    }
    if (user.username === author.username) {
        toastError('不能关注自己');
        return;
    }
    
    setFollowLoading(true);
    try {
        if (isFollowing) {
            await unfollowUser(author.username);
            setIsFollowing(false);
            setStats(prev => ({ ...prev, followers: prev.followers - 1 }));
            success('已取消关注');
        } else {
            await followUser(author.username);
            setIsFollowing(true);
            setStats(prev => ({ ...prev, followers: prev.followers + 1 }));
            success('关注成功');
        }
    } catch (err: any) {
        toastError(err.response?.data?.detail || '操作失败');
    } finally {
        setFollowLoading(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
      <div className="flex flex-col items-center text-center">
        <Link href={`/player/${author.username}`} className="group relative">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 mb-4 ring-4 ring-slate-50 dark:ring-slate-800 group-hover:ring-emerald-500/20 transition-all">
              <img 
                src={
                    author.avatar 
                    ? (author.avatar.startsWith('http') ? author.avatar : `${api.defaults.baseURL || 'https://api.kuke.ink'}${author.avatar}`)
                    : `https://cravatar.eu/helmavatar/${author.username}/128.png`
                }
                alt={author.username} 
                className="w-full h-full object-cover" 
                onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cravatar.eu/helmavatar/MHF_Steve/128.png';
                }}
              />
          </div>
        </Link>
        
        <Link href={`/player/${author.username}`} className="hover:underline">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            {author.nickname || author.username}
          </h3>
        </Link>
        
        <div className="flex items-center gap-2 mb-3">
          <LevelBadge level={author.level} />
          {author.custom_title && (
            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-full font-medium">
              {author.custom_title}
            </span>
          )}
        </div>

        <div className="w-full grid grid-cols-3 gap-2 py-4 border-t border-slate-100 dark:border-slate-700 mt-2">
            <div className="text-center">
                <div className="text-xs text-slate-500 mb-1">动态</div>
                <div className="font-bold text-slate-700 dark:text-slate-300">
                    {loading ? '--' : stats.posts}
                </div>
            </div>
            <div className="text-center border-l border-slate-100 dark:border-slate-700">
                <div className="text-xs text-slate-500 mb-1">粉丝</div>
                <div className="font-bold text-slate-700 dark:text-slate-300">
                    {loading ? '--' : stats.followers}
                </div>
            </div>
            <div className="text-center border-l border-slate-100 dark:border-slate-700">
                <div className="text-xs text-slate-500 mb-1">获赞</div>
                <div className="font-bold text-slate-700 dark:text-slate-300">
                    {loading ? '--' : stats.likes}
                </div>
            </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-3 mb-4">
            <button
                onClick={handleFollow}
                disabled={followLoading || (user && user.username === author.username)}
                className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isFollowing 
                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600' 
                    : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }`}
            >
                {followLoading ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : isFollowing ? (
                    <>
                        <Check size={16} />
                        <span>已关注</span>
                    </>
                ) : (
                    <>
                        <Plus size={16} />
                        <span>关注</span>
                    </>
                )}
            </button>
            <Link 
              href={`/player/${author.username}`}
              className="flex items-center justify-center py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
            >
              查看主页
            </Link>
        </div>

        {/* Recent Posts Section */}
        {recentPosts.length > 0 && (
            <div className="w-full text-left pt-4 border-t border-slate-100 dark:border-slate-700">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">最近动态</h4>
                <div className="space-y-3">
                    {recentPosts.map(post => (
                        <Link key={post.id} href={`/activity/${post.id}`} className="block group">
                            <div className="flex gap-3">
                                {post.images && post.images.length > 0 ? (
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                                        <img src={post.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center shrink-0 text-slate-400">
                                        <Calendar size={20} />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <p className="text-sm text-slate-900 dark:text-slate-200 line-clamp-1 group-hover:text-emerald-500 transition-colors">
                                        {post.title || post.content.substring(0, 30)}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {new Date(post.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default AuthorInfoCard;
