import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowLeft, MessageSquare, Send, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrentUserLevel } from '../hooks/useCurrentUserLevel';
import SEO from '../components/SEO';
import { Post, Comment } from '../types/activity';
import PostCard from '../components/PostCard';
import MentionInput from '../components/MentionInput';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../utils/api';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { getAlbum, createAlbumComment } from '../services/album';

const stripMarkdown = (markdown: string) => {
  if (!markdown) return "";
  return markdown
    .replace(/[#*`~>]/g, '') // Remove basic markdown chars
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with text
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim()
    .substring(0, 160); // Limit to 160 chars
};

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isAlbum = searchParams.get('type') === 'album';
  const { user, token, loading: authLoading } = useAuth();
  const { level: currentUserLevel } = useCurrentUserLevel();
  const navigate = useNavigate();
  
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [commentContent, setCommentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (id) {
      fetchPostAndComments(id);
    }
  }, [id, token, authLoading, isAlbum]);

  const fetchPostAndComments = async (postId: string) => {
    setLoading(true);
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      
      let fetchedPost: Post;
      let rawComments: Comment[] = [];

      if (isAlbum) {
        const albumData = await getAlbum(Number(postId));
        
        // Map Album to Post
        fetchedPost = {
            id: albumData.id,
            type: 'album',
            title: albumData.title,
            content: albumData.description || '',
            author: {
                username: albumData.username,
                // These might be missing if getAlbum doesn't return full author object
                // We'll use username as fallback
                nickname: albumData.nickname || albumData.username,
                avatar: albumData.avatar,
                custom_title: albumData.custom_title
            },
            created_at: albumData.created_at,
            likes_count: albumData.likes,
            comments_count: albumData.comment_count || (albumData.comments?.length || 0),
            collects_count: 0, // Album interface might not have this yet
            is_liked: albumData.is_liked,
            is_collected: albumData.is_collected || false,
            images: [albumData.image_url], // Main image
            tags: []
        };

        const albumComments = Array.isArray(albumData.comments) ? albumData.comments : [];
        rawComments = albumComments.map((c: any) => ({
            id: c.id,
            post_id: Number(postId),
            content: c.content,
            created_at: c.created_at,
            author: {
                username: c.username,
                nickname: c.nickname,
                custom_title: c.custom_title,
                avatar: c.avatar
            },
            replies: []
        }));

      } else {
        const [postRes, commentsRes] = await Promise.all([
            api.get<Post>(`/api/posts/${postId}`, config),
            api.get<Comment[]>(`/api/posts/${postId}/comments`, config)
        ]);
        fetchedPost = postRes.data;
        const responseData = commentsRes.data as any;
        rawComments = (Array.isArray(responseData) ? responseData : (responseData.data || [])) as Comment[];
      }

      setPost(fetchedPost);
      
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
      setError(err.response?.data?.detail || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !post) return;

    if (currentUserLevel !== null && currentUserLevel < 5) {
        alert('您的等级不足 5 级，无法评论。请前往游戏内升级！');
        return;
    }

    setIsSubmitting(true);
    try {
      if (isAlbum) {
         await createAlbumComment(post.id, commentContent);
         // Album comment doesn't return the comment object, refetch all
         await fetchPostAndComments(post.id.toString());
      } else {
         await api.post(`/api/posts/${post.id}/comments`, {
            content: commentContent,
            parent_id: replyingTo?.id
         }, {
            headers: { Authorization: `Bearer ${token}` }
         });
         // Refetch to be safe or append if response returned full comment
         await fetchPostAndComments(post.id.toString());
      }

      setCommentContent('');
      setReplyingTo(null);
    } catch (err: any) {
      alert(err.response?.data?.detail || '评论失败');
    } finally {
      setIsSubmitting(false);
    }
  };



  const handlePostUpdate = (updatedPost: Post) => {
    setPost(updatedPost);
  };

  const handlePostDelete = () => {
    navigate('/activity');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 size={40} className="text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">无法加载动态</h2>
          <p className="text-slate-500 mb-6">{error || '动态不存在或已被删除'}</p>
          <Link to="/activity" className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
            返回广场
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="relative z-10">
        {post ? (
          <SEO 
            title={`${post.title} - 动态详情`}
            description={stripMarkdown(post.content)}
            image={post.images && post.images.length > 0 ? post.images[0] : undefined}
            author={post.author.nickname || post.author.username}
            publishedTime={post.created_at}
            modifiedTime={post.updated_at}
            type="article"
            url={`/post/${post.id}`}
          />
        ) : (
          <SEO title="动态详情 - KukeMC" />
        )}
        <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>返回</span>
        </button>

        <div className="space-y-6">
          {/* 使用 PostCard 展示动态详情，但可以稍微定制样式如果需要 */}
          <PostCard 
            post={post} 
            onUpdate={handlePostUpdate} 
            onDelete={handlePostDelete}
            className="!cursor-default hover:!shadow-sm" // 覆盖 PostCard 的交互样式
            isDetail={true} // 开启详情模式
          />

          {/* Comments Section */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
              <MessageSquare className="text-emerald-500" size={20} />
              全部评论 ({comments.reduce((acc, curr) => acc + 1 + (curr.replies?.length || 0), 0)})
            </h3>

            {/* Comment Input */}
            {user ? (
              <form onSubmit={handleSubmitComment} className="mb-8">
                {replyingTo && (
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg mb-2 text-sm">
                    <span className="text-slate-500">
                      回复 <span className="font-bold text-emerald-500">@{replyingTo.author.nickname || replyingTo.author.username}</span>
                    </span>
                    <button 
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="relative">
                  <MentionInput
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder={replyingTo ? "写下你的回复..." : "发表你的看法..."}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4 pr-12 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none min-h-[100px] text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !commentContent.trim()}
                    className="absolute bottom-3 right-3 p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 mb-8">
                <p className="text-slate-500 mb-2">登录后参与讨论</p>
                <Link to="/login" className="text-emerald-500 font-medium hover:underline">
                  立即登录
                </Link>
              </div>
            )}

            {/* Comments List */}
            <div className="space-y-6">
              {comments.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  暂无评论，快来抢沙发吧！
                </div>
              ) : (
                comments.map(comment => (
                  <CommentItem 
                    key={comment.id} 
                    comment={comment} 
                    onReply={setReplyingTo}
                  />
                ))
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};

const CommentContent = ({ content }: { content: string }) => {
  const processed = content.replace(
    /@([^ \t\n\r\f\v@,.!?;:，。！？]+)/g, 
    (match, username) => `[${match}](/player/${username})`
  );
  
  return (
    <div className="prose dark:prose-invert prose-sm max-w-none text-slate-700 dark:text-slate-300 leading-relaxed break-words">
       <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
              a: ({node, ...props}) => (
                <Link to={props.href || '#'} className="text-emerald-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                  {props.children}
                </Link>
              ),
              p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />
          }}
       >
         {processed}
       </ReactMarkdown>
    </div>
  );
};

const CommentItem = ({ comment, onReply }: { comment: Comment, onReply: (comment: Comment) => void }) => {
  return (
    <div className="flex gap-4 group">
      <Link to={`/player/${comment.author.username}`} className="flex-shrink-0">
        <img 
          src={comment.author.avatar || `https://cravatar.eu/helmavatar/${comment.author.username}/64.png`}
          alt={comment.author.username}
          className="w-10 h-10 rounded-xl bg-slate-100"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Link to={`/player/${comment.author.username}`} className="font-bold text-slate-900 dark:text-white hover:text-emerald-500 transition-colors">
              {comment.author.nickname || comment.author.username}
            </Link>
            {comment.author.custom_title && comment.author.custom_title !== '玩家' && (
               <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                 {comment.author.custom_title}
               </span>
            )}
            <span className="text-xs text-slate-400">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: zhCN })}
            </span>
          </div>
          <button 
            onClick={() => onReply(comment)}
            className="text-slate-400 hover:text-emerald-500 text-sm opacity-0 group-hover:opacity-100 transition-all"
          >
            回复
          </button>
        </div>
        <CommentContent content={comment.content} />

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-slate-100 dark:border-slate-800">
            {comment.replies.map(reply => (
              <div key={reply.id} className="flex gap-3">
                <Link to={`/player/${reply.author.username}`} className="flex-shrink-0">
                  <img 
                    src={reply.author.avatar || `https://cravatar.eu/helmavatar/${reply.author.username}/64.png`}
                    alt={reply.author.username}
                    className="w-8 h-8 rounded-lg bg-slate-100"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link to={`/player/${reply.author.username}`} className="font-bold text-sm text-slate-900 dark:text-white hover:text-emerald-500 transition-colors">
                      {reply.author.nickname || reply.author.username}
                    </Link>
                     {reply.author.custom_title && reply.author.custom_title !== '玩家' && (
                       <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                         {reply.author.custom_title}
                       </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: zhCN })}
                    </span>
                  </div>
                  <CommentContent content={reply.content} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetail;
