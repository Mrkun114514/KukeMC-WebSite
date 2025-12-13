import { useState, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Heart, MessageSquare, Bookmark, Share2, Trash2, Check, Edit2, Send, X, Loader2 } from 'lucide-react';
import { Post, Comment } from '../types/activity';
import { useAuth } from '../context/AuthContext';
import { toggleLikePost, toggleCollectPost, deletePost } from '../services/activity';
import { toggleLikeAlbum, toggleCollectAlbum, deleteAlbum, getAlbum, createAlbumComment } from '../services/album';
import { followUser, unfollowUser } from '../services/follow';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import CreatePostModal from './CreatePostModal';
import api from '../utils/api';
import MentionInput from './MentionInput';
import { useCurrentUserLevel } from '../hooks/useCurrentUserLevel';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

interface PostCardProps {
  post: Post;
  onUpdate?: (updatedPost: Post) => void;
  onDelete?: (postId: number) => void;
  className?: string;
  isDetail?: boolean; // New prop to distinguish detail view
}

const PostCard = forwardRef<HTMLDivElement, PostCardProps>(({ post, onUpdate, onDelete, className, isDetail = false }, ref) => {
  const { user, token } = useAuth();
  const { level: currentUserLevel } = useCurrentUserLevel();
  const { success, error, warning } = useToast();
  const { confirm } = useConfirm();
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isCollected, setIsCollected] = useState(post.is_collected);
  const [collectsCount, setCollectsCount] = useState(post.collects_count);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isCollectLoading, setIsCollectLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isFollowing, setIsFollowing] = useState(post.author.is_following);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // Comments & Expansion State
  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const fetchComments = async (force: boolean = false) => {
    if (comments.length > 0 && !force) return; // Already loaded and not forced
    setLoadingComments(true);
    try {
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      
      let rawComments: Comment[] = [];
      
      if (post.type === 'album') {
         // Album comments logic
         const albumData = await getAlbum(post.id);
         const albumComments = Array.isArray(albumData.comments) ? albumData.comments : [];
         // Map flat album comments to Comment interface structure
         rawComments = albumComments.map((c: any) => ({
            id: c.id,
            post_id: post.id,
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
         // Standard post comments logic
         const res = await api.get<Comment[]>(`/api/posts/${post.id}/comments`, config);
         const responseData = res.data as any;
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

      rootComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setComments(rootComments);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleExpand = () => {
    if (isDetail) return; // Don't expand in detail view (it's already full)
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    if (newExpandedState) {
        fetchComments();
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || !user) return;

    if (currentUserLevel !== null && currentUserLevel < 5) {
      warning('您的等级不足 5 级，无法评论。请前往游戏内升级！');
      return;
    }

    setIsSubmittingComment(true);
    try {
      if (post.type === 'album') {
        // Album comment submission
        await createAlbumComment(post.id, commentContent);
        // Album API doesn't return the comment object, so we must refetch
        setComments([]); // Clear to force refetch
        await fetchComments(true);
      } else {
        // Standard post comment submission
        await api.post(`/api/posts/${post.id}/comments`, {
            content: commentContent,
            parent_id: replyingTo?.id
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        // Clear and reload
        setComments([]); // Clear to force refetch
        await fetchComments(true);
      }
      
      setCommentContent('');
      setReplyingTo(null);
      
      // Update comment count locally
      if (onUpdate) {
        onUpdate({
            ...post,
            comments_count: post.comments_count + 1
        });
      }
    } catch (err: any) {
      error(err.response?.data?.detail || '评论失败');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    try {
      let url = `${window.location.origin}/activity/${post.id}`;
      if (post.type === 'album') {
        url += '?type=album';
      }
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      error('复制链接失败，请手动复制');
    }
  };

  const handleUpdateSuccess = (updatedPost: Post) => {
    if (onUpdate) {
        onUpdate(updatedPost);
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || isFollowLoading) return;
    
    setIsFollowLoading(true);
    try {
        if (isFollowing) {
            await unfollowUser(post.author.username);
            setIsFollowing(false);
        } else {
            await followUser(post.author.username);
            setIsFollowing(true);
        }
    } catch (error) {
        console.error(error);
    } finally {
        setIsFollowLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user || isLikeLoading) return;
    setIsLikeLoading(true);
    try {
      let res;
      if (post.type === 'album') {
        res = await toggleLikeAlbum(post.id);
      } else {
        res = await toggleLikePost(post.id);
      }
      
      setIsLiked(res.is_liked);
      setLikesCount(res.likes_count);
      if (onUpdate) onUpdate({ ...post, is_liked: res.is_liked, likes_count: res.likes_count });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleCollect = async () => {
    if (!user || isCollectLoading) return;
    setIsCollectLoading(true);
    try {
      let res;
      if (post.type === 'album') {
        res = await toggleCollectAlbum(post.id);
      } else {
        res = await toggleCollectPost(post.id);
      }
      
      setIsCollected(res.is_collected);
      setCollectsCount(res.collects_count);
      if (onUpdate) onUpdate({ ...post, is_collected: res.is_collected, collects_count: res.collects_count });
    } catch (error) {
      console.error(error);
    } finally {
      setIsCollectLoading(false);
    }
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: '删除内容',
      message: '确定要删除这条内容吗？此操作无法撤销。',
      isDangerous: true,
      confirmText: '删除',
    });

    if (!isConfirmed) return;

    try {
      if (post.type === 'album') {
        await deleteAlbum(post.id);
      } else {
        await deletePost(post.id);
      }
      if (onDelete) onDelete(post.id);
      success('删除成功');
    } catch (err: any) {
      console.error(err);
      error(err.response?.data?.detail || '删除失败');
    }
  };

  const isAuthor = user?.username === post.author.username;
  
  // Process content to link mentions
  const processedContent = post.content.replace(
    /@([^ \t\n\r\f\v@,.!?;:，。！？]+)/g, 
    (match, username) => `[${match}](/player/${username})`
  );

  return (
    <motion.div 
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx("bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-md transition-all duration-300", className)}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link to={`/player/${post.author.username}`} className="flex-shrink-0">
              <img 
                src={post.author.avatar || `https://cravatar.eu/helmavatar/${post.author.username}/128.png`}
                alt={post.author.username}
                className="w-10 h-10 rounded-xl object-cover border-2 border-slate-100 dark:border-slate-700"
                onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cravatar.eu/helmavatar/MHF_Steve/128.png';
                }}
              />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Link to={`/player/${post.author.username}`} className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 transition-colors block">
                  {post.author.nickname || post.author.username}
                </Link>
                {post.author.custom_title && post.author.custom_title !== '玩家' && (
                   <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                     {post.author.custom_title}
                   </span>
                )}
                
                {/* Follow Button */}
                {!isAuthor && user && (
                    <button
                        onClick={handleFollow}
                        className={clsx(
                            "ml-2 text-xs px-2 py-0.5 rounded-full font-medium transition-all duration-300 border",
                            isFollowing 
                                ? "text-slate-400 border-slate-200 hover:text-red-500 hover:border-red-200 bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-red-900/20"
                                : "text-emerald-600 border-emerald-200 hover:bg-emerald-50 bg-white dark:bg-slate-800 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/20"
                        )}
                    >
                        {isFollowLoading ? '...' : isFollowing ? '已关注' : '+ 关注'}
                    </button>
                )}
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: zhCN })}
                {post.type === 'album' && <span className="ml-1 text-purple-500 font-medium">• 发布了相册</span>}
              </span>
            </div>
          </div>
          
          {isAuthor && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="text-slate-400 hover:text-emerald-500 transition-colors p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={handleDelete}
                className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {post.type === 'album' ? (
           <div className="mb-4">
               {/* Album Style Content */}
               <h3 className="font-bold text-xl mb-3 text-slate-900 dark:text-white">{post.title}</h3>
               
               {post.images && post.images.length > 0 && (
                   <div className="rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 mb-4 cursor-pointer relative group" 
                        onClick={() => {
                            // Ideally open lightbox or navigate to user album
                            // For now just prevent link click or maybe navigate to user profile
                            // window.location.href = `/player/${post.author.username}?tab=albums`
                            // Or use Link
                        }}>
                        <Link to={`/player/${post.author.username}?tab=albums`}>
                          <img 
                            src={post.images[0]} 
                            alt={post.title} 
                            className="w-full h-auto max-h-[600px] object-contain bg-black/5 dark:bg-black/20"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                              <span className="bg-black/60 text-white px-4 py-2 rounded-full backdrop-blur-md text-sm font-medium transform scale-95 group-hover:scale-100 transition-all">查看相册</span>
                          </div>
                        </Link>
                   </div>
               )}
               
               {post.content && (
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {post.content}
                  </p>
               )}
           </div>
        ) : (
        <Link to={`/activity/${post.id}`} className={clsx("block group", isDetail && "pointer-events-none")}>
          <div className="mb-4">
            <h3 className={clsx("font-bold text-slate-900 dark:text-white mb-2 transition-colors", isDetail ? "text-2xl" : "text-xl group-hover:text-emerald-600 dark:group-hover:text-emerald-400")}>
              {post.title}
            </h3>
            
            {/* Images Grid */}
            {post.images && post.images.length > 0 && (
              <div className={clsx("grid gap-2 mb-4", 
                post.images.length === 1 ? "grid-cols-1" : 
                post.images.length === 2 ? "grid-cols-2" : 
                "grid-cols-3"
              )}>
                {post.images.slice(0, isDetail ? undefined : 3).map((img, idx) => (
                  <div key={idx} className={clsx("relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 aspect-video", post.images!.length === 1 && "aspect-[2/1]")}>
                    <img 
                      src={img} 
                      alt={`Image ${idx + 1}`} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                    {!isDetail && idx === 2 && post.images!.length > 3 && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-xl backdrop-blur-sm">
                        +{post.images!.length - 3}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className={clsx(
              "prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300",
              (isDetail || isExpanded) ? "prose-base" : "prose-sm line-clamp-6",
              "prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0"
            )}>
               <ReactMarkdown 
                 remarkPlugins={[remarkGfm]}
                 components={{
                   a: ({node, ...props}) => (
                     <Link to={props.href || '#'} className="text-emerald-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                       {props.children}
                     </Link>
                   )
                 }}
               >
                 {(isDetail || isExpanded) ? processedContent : processedContent.slice(0, 300) + (processedContent.length > 300 ? '...' : '')}
               </ReactMarkdown>
            </div>
          </div>
        </Link>
        )}

        {/* Tags (Optional) */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map(tag => (
              <Link 
                key={tag} 
                to={`/activity?tag=${tag}`}
                className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              disabled={!user}
              className={clsx(
                "flex items-center gap-1.5 text-sm transition-colors",
                isLiked 
                  ? "text-red-500" 
                  : "text-slate-500 hover:text-red-500"
              )}
            >
              <Heart size={18} className={clsx(isLiked && "fill-current")} />
              <span>{likesCount > 0 ? likesCount : '点赞'}</span>
            </button>

            <button 
               onClick={(e) => {
                 if (!isDetail) {
                     e.preventDefault();
                     handleToggleExpand();
                 }
               }}
               className={clsx(
                 "flex items-center gap-1.5 text-sm transition-colors",
                 isExpanded ? "text-emerald-600" : "text-slate-500 hover:text-emerald-600"
               )}
             >
               <MessageSquare size={18} className={clsx(isExpanded && "fill-current")} />
               <span>{post.comments_count > 0 ? post.comments_count : '评论'}</span>
             </button>

            <button 
              onClick={handleCollect}
              disabled={!user}
              className={clsx(
                "flex items-center gap-1.5 text-sm transition-colors",
                isCollected 
                  ? "text-amber-500" 
                  : "text-slate-500 hover:text-amber-500"
              )}
            >
              <Bookmark size={18} className={clsx(isCollected && "fill-current")} />
              <span>{collectsCount > 0 ? collectsCount : '收藏'}</span>
            </button>
          </div>
          
          <button 
            onClick={handleShare}
            className={clsx(
              "transition-colors flex items-center gap-1.5",
              isCopied ? "text-emerald-500" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            )}
            title="复制链接"
          >
            {isCopied ? <Check size={18} /> : <Share2 size={18} />}
            {isCopied && <span className="text-xs font-medium">已复制</span>}
          </button>
        </div>

        {/* Expanded Comment Section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              key="expanded-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-6 mt-4 border-t border-slate-100 dark:border-slate-700">
                 {/* Input Area */}
                 {user ? (
                   <form onSubmit={handleSubmitComment} className="mb-6">
                     {replyingTo && (
                       <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg mb-2 text-sm">
                         <span className="text-slate-500">
                           回复 <span className="font-bold text-emerald-500">@{replyingTo.author.nickname || replyingTo.author.username}</span>
                         </span>
                         <button 
                           type="button"
                           onClick={() => setReplyingTo(null)}
                           className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
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
                         className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 pr-12 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none resize-none min-h-[80px] text-sm text-slate-900 dark:text-white"
                       />
                       <button
                         type="submit"
                         disabled={isSubmittingComment || !commentContent.trim()}
                         className="absolute bottom-2 right-2 p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                       >
                         {isSubmittingComment ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                       </button>
                     </div>
                   </form>
                 ) : (
                   <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 mb-6">
                     <p className="text-sm text-slate-500 mb-2">登录后参与讨论</p>
                     <Link to="/login" className="text-emerald-500 text-sm font-medium hover:underline">
                       立即登录
                     </Link>
                   </div>
                 )}

                 {/* Comments List */}
                 <div className="space-y-4">
                   {loadingComments ? (
                     <div className="flex justify-center py-4">
                       <Loader2 size={24} className="text-emerald-500 animate-spin" />
                     </div>
                   ) : comments.length === 0 ? (
                     <div className="text-center py-8 text-slate-500 text-sm">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <CreatePostModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleUpdateSuccess}
        post={post}
      />
    </motion.div>
  );
});

PostCard.displayName = 'PostCard';

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
  if (!comment || !comment.author) return null; // Safety check
  
  return (
    <div className="flex gap-3 group">
      <Link to={`/player/${comment.author.username}`} className="flex-shrink-0">
        <img 
          src={comment.author.avatar || `https://cravatar.eu/helmavatar/${comment.author.username}/64.png`}
          alt={comment.author.username}
          className="w-8 h-8 rounded-lg bg-slate-100"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Link to={`/player/${comment.author.username}`} className="font-bold text-sm text-slate-900 dark:text-white hover:text-emerald-500 transition-colors">
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
            className="text-slate-400 hover:text-emerald-500 text-xs opacity-0 group-hover:opacity-100 transition-all"
          >
            回复
          </button>
        </div>
        <CommentContent content={comment.content} />

        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-2 space-y-3 pl-3 border-l-2 border-slate-100 dark:border-slate-800">
            {comment.replies.map(reply => (
              <div key={reply.id} className="flex gap-2">
                <Link to={`/player/${reply.author.username}`} className="flex-shrink-0">
                  <img 
                    src={reply.author.avatar || `https://cravatar.eu/helmavatar/${reply.author.username}/64.png`}
                    alt={reply.author.username}
                    className="w-6 h-6 rounded bg-slate-100"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Link to={`/player/${reply.author.username}`} className="font-bold text-xs text-slate-900 dark:text-white hover:text-emerald-500 transition-colors">
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

export default PostCard;
