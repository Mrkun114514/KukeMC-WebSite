import { useState, useEffect, useRef } from 'react';
import SEO from '../components/SEO';
import { AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { Plus, Flame, Clock, Search, Loader2, Hash, X, ChevronDown } from 'lucide-react';
import { Post } from '../types/activity';
import { getPosts, getHotTopics } from '../services/activity';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import clsx from 'clsx';
import { useSearchParams } from 'react-router-dom';

const Activity = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tagParam = searchParams.get('tag');
  
  const [activeTab, setActiveTab] = useState<'square' | 'following'>('square');
  const [squareSort, setSquareSort] = useState<'latest' | 'hot'>('latest');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [hotTopics, setHotTopics] = useState<{name: string, count: number}[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const fetchPosts = async (reset = false) => {
    setLoading(true);
    if (reset) {
      setPosts([]); 
      setPage(1);
    }

    try {
      const type = activeTab === 'following' ? 'following' : squareSort;
      const res = await getPosts({ 
        page: reset ? 1 : page, 
        per_page: 10, 
        type,
        tag: tagParam || undefined
      });

      if (reset) {
        setPosts(res.data);
      } else {
        setPosts(prev => [...prev, ...res.data]);
      }
      
      setHasMore(res.data.length >= 10);
      if (reset) {
        setPage(2);
      } else {
        setPage(p => p + 1);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const topics = await getHotTopics();
      setHotTopics(topics);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  useEffect(() => {
    fetchPosts(true);
  }, [activeTab, squareSort, tagParam]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchPosts();
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading && hasMore) {
          fetchPosts();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [loading, hasMore, activeTab, squareSort, tagParam, page]); // Add dependencies to ensure correct closure capture or re-observation

  const handlePostCreated = (newPost: Post) => {
    // If filtering by tag, only add if post has that tag (or just refresh)
    // Simple approach: just add to top if no filter or tag matches
    if (tagParam && !newPost.tags?.includes(tagParam)) return;
    
    if (activeTab === 'square' && squareSort === 'latest') {
      setPosts(prev => [newPost, ...prev]);
    }
    fetchTopics(); // Refresh topics
  };

  const handlePostUpdate = (updatedPost: Post) => {
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  const handlePostDelete = (postId: number) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 relative overflow-hidden">
      <SEO 
        title="动态广场 - KukeMC" 
        description="KukeMC 玩家动态广场，分享你的游戏瞬间，参与热门话题讨论。"
        url="/activity"
      />

      <PageTransition>
      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">动态广场</h1>
            <p className="text-slate-500 dark:text-slate-400">探索社区最新动态，分享你的游戏点滴</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 font-medium"
          >
            <Plus size={20} />
            发布动态
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Feed */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 w-fit">
              <button
                onClick={() => setActiveTab('square')}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'square'
                    ? "bg-emerald-500 text-white shadow-md"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                广场
              </button>
              <button
                onClick={() => setActiveTab('following')}
                className={clsx(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === 'following'
                    ? "bg-emerald-500 text-white shadow-md"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                关注的人
              </button>
            </div>

            {/* Sub Tabs for Square */}
            {activeTab === 'square' && (
              <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <button
                  onClick={() => setSquareSort('latest')}
                  className={clsx(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    squareSort === 'latest' ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <Clock size={16} /> 最新
                </button>
                <button
                  onClick={() => setSquareSort('hot')}
                  className={clsx(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    squareSort === 'hot' ? "text-red-500" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  )}
                >
                  <Flame size={16} /> 热门
                </button>
              </div>
            )}

            {/* Tag Filter Indicator */}
            {tagParam && (
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-medium">
                  <Hash size={16} />
                  <span>{tagParam}</span>
                  <button 
                    onClick={() => setSearchParams({})}
                    className="ml-1 p-0.5 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-full transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  的相关动态
                </span>
              </div>
            )}

            {/* Post List */}
            <div className="space-y-6">
              {loading && posts.length === 0 ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-emerald-500" />
                </div>
              ) : posts.length > 0 ? (
                <>
                  <AnimatePresence mode="popLayout">
                    {posts.map((post) => (
                      <PostCard 
                        key={post.id} 
                        post={post} 
                        onUpdate={handlePostUpdate}
                        onDelete={handlePostDelete}
                      />
                    ))}
                  </AnimatePresence>
                  
                  {hasMore && (
                    <div 
                      ref={loadMoreRef}
                      className="flex justify-center pt-8 pb-4"
                    >
                      <button
                        onClick={handleLoadMore}
                        disabled={loading}
                        className={clsx(
                          "group relative px-6 py-2 rounded-full transition-all duration-300 flex items-center gap-2",
                          loading 
                            ? "bg-transparent text-emerald-500 cursor-wait" 
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:shadow-md hover:-translate-y-0.5"
                        )}
                      >
                        {loading ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            <span className="animate-pulse font-medium">加载更多动态...</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown size={18} className="group-hover:translate-y-0.5 transition-transform" />
                            <span>加载更多</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search size={32} className="text-slate-400" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">这里空空如也</h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    {activeTab === 'following' 
                      ? '你关注的人还没有发布任何动态' 
                      : '还没有人发布动态，快来抢沙发吧！'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar (Optional: Recommended Users, Trending Tags, etc.) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Hot Topics Widget */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-24">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Flame size={18} className="text-red-500" /> 热门话题
              </h3>
              {hotTopics.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {hotTopics.map(topic => (
                    <button
                      key={topic.name}
                      onClick={() => setSearchParams({ tag: topic.name })}
                      className={clsx(
                        "px-3 py-1 rounded-full text-xs cursor-pointer transition-colors flex items-center gap-1",
                        tagParam === topic.name 
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400"
                      )}
                    >
                      #{topic.name}
                      <span className="opacity-60 text-[10px] ml-0.5">{topic.count}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
                  暂无热门话题
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      </PageTransition>

      <CreatePostModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={handlePostCreated}
      />
    </div>
  );
};

export default Activity;
