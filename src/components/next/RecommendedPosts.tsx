import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Post } from '@/types/activity';
import { getPosts } from '@/services/activity';
import { Loader2, Sparkles } from 'lucide-react';

interface RecommendedPostsProps {
  currentPostId: number;
  tags?: string[];
  category?: string;
  className?: string;
}

const RecommendedPosts: React.FC<RecommendedPostsProps> = ({ currentPostId, tags, category, className }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        // Simple recommendation logic: same tag and category preferred
        const tag = tags && tags.length > 0 ? tags[0] : undefined;
        const res = await getPosts({ 
          page: 1, 
          per_page: 6, 
          tag: tag,
          category: category,
          type: 'hot' // or latest
        });
        
        // Filter out current post and limit to 5
        const filtered = res.data
          .filter(p => p.id !== currentPostId)
          .slice(0, 5);
          
        setPosts(filtered);
      } catch (error) {
        console.error("Failed to load recommendations", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [currentPostId, tags, category]);

  if (!loading && posts.length === 0) return null;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}>
      <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-amber-500" /> 相关推荐
      </h3>
      
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-emerald-500" />
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => (
            <Link 
              key={post.id}
              href={`/activity/${post.id}`}
              className="block group"
            >
              <div className="flex gap-3">
                {post.images && post.images.length > 0 && (
                   <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-900">
                     <img src={post.images[0]} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                   </div>
                )}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-200 line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    {post.title || post.content.substring(0, 30)}
                  </h4>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {post.author.nickname || post.author.username}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecommendedPosts;
