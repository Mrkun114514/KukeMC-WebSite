'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCurrentUserLevel } from '@/hooks/useCurrentUserLevel';
import { Post, Comment } from '@/types/activity';
import PostCard from './PostCard';
import CommentSection, { UIComment } from './CommentSection';
import AuthorInfoCard from './AuthorInfoCard';
import RecommendedPosts from './RecommendedPosts';
import api from '@/utils/api';
import { useToast } from '@/context/ToastContext';
import { createAlbumComment, getAlbum } from '@/services/album';

const PostDetailClient = ({ initialPost, isAlbum = false }: { initialPost: Post, isAlbum?: boolean }) => {
  const { user, token, loading: authLoading } = useAuth();
  const { level: currentUserLevel } = useCurrentUserLevel();
  const { warning, error: toastError } = useToast();
  const router = useRouter();
  
  const [post, setPost] = useState<Post | null>(initialPost);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false); // Initial load is done by server
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (post) {
      const key = `viewed_post_${post.id}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, 'true');
        // Logic to increment view count on backend would go here
        api.post(`/api/posts/${post.id}/view`).catch(err => {
            console.error('Failed to increment view count:', err);
        });
      }
    }
  }, [post]);

  useEffect(() => {
    // Fetch comments on mount
    if (initialPost) {
        fetchComments(initialPost.id.toString());
    }
  }, [initialPost, token]);

  const fetchComments = async (postId: string) => {
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      
      let rawComments: Comment[] = [];

      if (isAlbum) {
        // For album, we might need to re-fetch album to get comments if they are embedded
        // But let's assume we use the getAlbum service if needed, or if API provides a separate endpoint
        // Based on original code, getAlbum returns everything.
        // But here we want to fetch just comments if possible, or re-fetch full object.
        // Let's re-fetch full object to be safe and consistent with original logic
        const albumData = await getAlbum(Number(postId));
        const albumComments = Array.isArray(albumData.comments) ? albumData.comments : [];
        
        rawComments = albumComments.map((c: any) => {
            const commentAuthor = c.author || c.user || c;
            return {
                id: c.id,
                post_id: Number(postId),
                content: c.content,
                created_at: c.created_at,
                author: {
                    username: commentAuthor.username || 'User',
                    nickname: commentAuthor.nickname || commentAuthor.username || 'User',
                    custom_title: commentAuthor.custom_title,
                    avatar: commentAuthor.avatar
                },
                replies: []
            };
        });

      } else {
        const commentsRes = await api.get<Comment[]>(`/api/posts/${postId}/comments`, config);
        const responseData = commentsRes.data as any;
        rawComments = (Array.isArray(responseData) ? responseData : (responseData.data || [])) as Comment[];
      }

      const commentMap = new Map<number, Comment>();
      const rootComments: Comment[] = [];

      rawComments.forEach(c => {
        commentMap.set(c.id, { ...c, replies: [] });
      });

      rawComments.forEach(c => {
        const processedComment = commentMap.get(c.id)!;
        if (c.parent_id) {
          const parent = commentMap.get(c.parent_id);
          if (parent) {
            parent.replies?.push(processedComment);
          } else {
            rootComments.push(processedComment);
          }
        } else {
          rootComments.push(processedComment);
        }
      });

      // Sort by time
      rootComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setComments(rootComments);
    } catch (err: any) {
      console.error(err);
      // Don't set main error if just comments fail
    }
  };
  
  const handleCommentSubmit = async (content: string, parentId?: number) => {
    if (!post) return;

    if (currentUserLevel !== null && currentUserLevel < 5) {
        warning('您的等级不足 5 级，无法评论。请前往游戏内升级！');
        return;
    }

    try {
      if (isAlbum) {
         await createAlbumComment(post.id, content);
         await fetchComments(post.id.toString());
      } else {
         await api.post(`/api/posts/${post.id}/comments`, {
            content: content,
            parent_id: parentId
         }, {
            headers: { Authorization: `Bearer ${token}` }
         });
         await fetchComments(post.id.toString());
      }
    } catch (err: any) {
      toastError(err.response?.data?.detail || '评论失败');
      throw err;
    }
  };

  const handleCommentDelete = async (commentId: number) => {
    if (!confirm('确定要删除这条评论吗？')) return;
    
    try {
      if (isAlbum) {
         await api.delete(`/api/album/comment/${commentId}`, { headers: { Authorization: `Bearer ${token}` } });
      } else {
         await api.delete(`/api/posts/comments/${commentId}`, { headers: { Authorization: `Bearer ${token}` } });
      }
      // Refresh comments
      await fetchComments(post!.id.toString());
    } catch (err: any) {
      console.error(err);
      toastError(err.response?.data?.detail || '删除失败');
    }
  };

  const handlePostUpdate = (updatedPost: Post) => {
    setPost(updatedPost);
  };

  const handlePostDelete = () => {
    router.push('/activity');
  };

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">无法加载动态</h2>
          <p className="text-slate-500 mb-6">{error || '动态不存在或已被删除'}</p>
          <Link href="/activity" className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
            返回广场
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="relative z-10 max-w-6xl mx-auto">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>返回</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Sidebar (Author & Recommendations) */}
          <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
             <div className="sticky top-24 space-y-6">
                <AuthorInfoCard author={post.author} />
                <RecommendedPosts 
                  currentPostId={post.id} 
                  tags={post.tags}
                  category={post.category}
                />
             </div>
          </div>

          {/* Right Column: Post Content */}
          <div className="lg:col-span-9 space-y-6 order-1 lg:order-2">
            <PostCard 
              post={post} 
              onUpdate={handlePostUpdate} 
              onDelete={handlePostDelete}
              className="!cursor-default hover:!shadow-sm" 
              isDetail={true} 
            />

            {/* Comments Section */}
            <CommentSection 
              comments={comments as unknown as UIComment[]}
              currentUser={user}
              onSubmit={handleCommentSubmit}
              onDelete={handleCommentDelete}
              loading={loading}
              title="全部评论"
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailClient;
