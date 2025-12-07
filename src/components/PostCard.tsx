import { useState, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Heart, MessageSquare, Bookmark, Share2, Trash2, Check, Edit2 } from 'lucide-react';
import { Post } from '../types/activity';
import { useAuth } from '../context/AuthContext';
import { toggleLikePost, toggleCollectPost, deletePost } from '../services/activity';
import { toggleLikeAlbum, toggleCollectAlbum, deleteAlbum } from '../services/album';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import CreatePostModal from './CreatePostModal';

interface PostCardProps {
  post: Post;
  onUpdate?: (updatedPost: Post) => void;
  onDelete?: (postId: number) => void;
  className?: string;
  isDetail?: boolean; // New prop to distinguish detail view
}

const PostCard = forwardRef<HTMLDivElement, PostCardProps>(({ post, onUpdate, onDelete, className, isDetail = false }, ref) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.is_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count);
  const [isCollected, setIsCollected] = useState(post.is_collected);
  const [collectsCount, setCollectsCount] = useState(post.collects_count);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [isCollectLoading, setIsCollectLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/activity/${post.id}`;
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('复制链接失败，请手动复制');
    }
  };

  const handleUpdateSuccess = (updatedPost: Post) => {
    if (onUpdate) {
        onUpdate(updatedPost);
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
    if (!window.confirm('确定要删除这条内容吗？')) return;
    try {
      if (post.type === 'album') {
        await deleteAlbum(post.id);
      } else {
        await deletePost(post.id);
      }
      if (onDelete) onDelete(post.id);
    } catch (error) {
      console.error(error);
      alert('删除失败');
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
              isDetail ? "prose-base" : "prose-sm line-clamp-6",
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
                 {isDetail ? processedContent : processedContent.slice(0, 300) + (processedContent.length > 300 ? '...' : '')}
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

            <Link 
              to={post.type === 'album' ? `/player/${post.author.username}?tab=albums` : `/activity/${post.id}`}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-600 transition-colors"
            >
              <MessageSquare size={18} />
              <span>{post.comments_count > 0 ? post.comments_count : '评论'}</span>
            </Link>

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

export default PostCard;
