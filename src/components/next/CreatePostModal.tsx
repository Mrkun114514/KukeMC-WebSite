'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Send, Flame, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MarkdownEditor from '../MarkdownEditor';
import { createPost, updatePost, getHotTopics, getCategories } from '@/services/activity';
import { updateAlbum } from '@/services/album';
import { Post } from '@/types/activity';
import ModalPortal from '../ModalPortal';
import { useCurrentUserLevel } from '@/hooks/useCurrentUserLevel';
import { useToast } from '@/context/ToastContext';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPost: any) => void;
  post?: Post; // If provided, we are in edit mode
}

const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, onSuccess, post }) => {
  const { level: currentUserLevel } = useCurrentUserLevel();
  const { warning } = useToast();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('daily');
  const [availableCategories, setAvailableCategories] = useState<{ id: string; label: string; }[]>([
    { id: 'daily', label: '日常分享' },
    { id: 'tech', label: '技术探讨' },
    { id: 'tutorial', label: '教程指导' }
  ]);
  
  // Tag System State
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [suggestions, setSuggestions] = useState<{name: string, count: number}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const mouseDownTargetRef = useRef<EventTarget | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!post;
  const isAlbum = post?.type === 'album';

  // Initialize state when opening or post changes
  useEffect(() => {
    if (isOpen && post) {
      setTitle(post.title);
      setContent(post.content);
      setTags(post.tags || []);
      setCategory(post.category || 'daily');
    } else if (isOpen && !post) {
      // Reset for create mode
      setTitle('');
      setContent('');
      setTags([]);
      setTagInput('');
      setCategory('daily');
    }
  }, [isOpen, post]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        if (data && data.length > 0) {
          setAvailableCategories(data.map((c: any) => ({ id: c.slug, label: c.label })));
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch suggestions when input changes (debounced ideally, but for now direct)
  useEffect(() => {
    if (isAlbum) return; // No tags for albums

    const fetchSuggestions = async () => {
        try {
            // Always fetch if focused, but maybe filter by input
            // If input is empty, we want "Recommended" tags
            const res = await getHotTopics(tagInput);
            // Filter out already selected tags
            setSuggestions(res.filter(t => !tags.includes(t.name)));
        } catch (e) {
            console.error(e);
        }
    };
    
    if (isOpen) {
        const timer = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(timer);
    }
  }, [tagInput, tags, isOpen, isAlbum]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) && 
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTag = (tagToAdd: string) => {
    const cleanTag = tagToAdd.trim().replace(/^#/, '');
    if (cleanTag && !tags.includes(cleanTag) && tags.length < 10) {
      setTags([...tags, cleanTag]);
      setTagInput('');
      setShowSuggestions(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      if (tagInput.trim()) {
        handleAddTag(tagInput);
      }
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      // Remove last tag if input is empty
      handleRemoveTag(tags[tags.length - 1]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (currentUserLevel !== null && currentUserLevel < 5) {
      warning('您的等级不足 5 级，无法发布动态。请前往游戏内升级！');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      // Extract tags from content if any
      const contentTags = (content.match(/#[^\s#.,;!?，。！？]+/g) || [])
          .map(t => t.replace(/^#/, ''));
      // Merge unique tags
      const finalTags = Array.from(new Set([...tags, ...contentTags]));

      // Extract images from content for preview grid
      const imageMatches = content.match(/!\[.*?\]\((.*?)\)/g) || [];
      const images = imageMatches.map(match => {
          const urlMatch = match.match(/\((.*?)\)/);
          return urlMatch ? urlMatch[1] : '';
      }).filter(url => url);

      let result;
      
      if (isEditing && post) {
        if (isAlbum) {
            // Update Album
            result = await updateAlbum(post.id, {
                title,
                description: content // Map content to description
            });
        } else {
            // Update Post
            result = await updatePost(post.id, {
                title,
                content,
                tags: finalTags,
                category,
                images
            });
        }
      } else {
        // Create Post
        result = await createPost({ 
            title, 
            content, 
            tags: finalTags, 
            category, 
            images 
        });
      }

      onSuccess(result);
      
      // Reset form
      setTitle('');
      setContent('');
      setTags([]);
      setTagInput('');
      onClose();
    } catch (err) {
      setError(isEditing ? '更新失败，请重试' : '发布失败，请重试');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = isEditing 
    ? (isAlbum ? '编辑相册' : '编辑动态') 
    : '发布动态';

  return (
    <ModalPortal>
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onMouseDown={(e) => {
              mouseDownTargetRef.current = e.target;
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && mouseDownTargetRef.current === e.currentTarget) {
                onClose();
              }
            }}
          >
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col relative border border-slate-200/50 dark:border-slate-700/50" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-slate-200/50 dark:border-slate-800/50 shrink-0">
                <h2 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">{modalTitle}</h2>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <form id="create-post-form" onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        {error}
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        标题
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={isAlbum ? "相册标题" : "给你的动态起个标题..."}
                        className="w-full px-4 py-3 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 font-medium"
                        maxLength={100}
                      />
                    </div>

                    {!isAlbum && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        选择分区
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {availableCategories.map(cat => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategory(cat.id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                              category === cat.id
                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-emerald-200 dark:hover:border-emerald-500/30'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    )}

                    {!isAlbum && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        标签话题 <span className="text-slate-400 font-normal text-xs ml-1">(回车添加，最多10个)</span>
                      </label>
                      
                      <div className="relative">
                        <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:border-emerald-500 transition-all min-h-[52px]">
                          <AnimatePresence mode="popLayout">
                            {tags.map(tag => (
                              <motion.div 
                                layout
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                key={tag} 
                                className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/20 dark:to-teal-500/20 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-100 dark:border-emerald-500/20 shadow-sm group"
                              >
                                <span className="text-sm font-medium">#{tag}</span>
                                <button 
                                  type="button"
                                  onClick={() => handleRemoveTag(tag)} 
                                  className="p-0.5 rounded-full hover:bg-emerald-200/50 dark:hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-700 dark:text-emerald-400/80 dark:hover:text-emerald-200 transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </motion.div>
                            ))}
                          </AnimatePresence>

                          <div className="flex-1 relative min-w-[120px]">
                             <input
                               ref={inputRef}
                               type="text"
                               value={tagInput}
                               onChange={(e) => setTagInput(e.target.value)}
                               onKeyDown={handleKeyDown}
                               onFocus={() => setShowSuggestions(true)}
                               placeholder={tags.length === 0 ? "添加标签 (如: #粘液空岛)" : ""}
                               className="w-full h-full py-1.5 bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder-slate-400 text-sm"
                             />
                          </div>
                        </div>

                        {/* Suggestions Dropdown */}
                        <AnimatePresence>
                          {showSuggestions && suggestions.length > 0 && (
                            <motion.div
                              ref={suggestionsRef}
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              transition={{ duration: 0.2 }}
                              className="absolute z-50 left-0 right-0 top-full mt-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden max-h-60 overflow-y-auto ring-1 ring-black/5"
                            >
                              <div className="px-3 py-2 text-xs font-bold text-slate-500 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 backdrop-blur-sm sticky top-0 z-10">
                                {tagInput ? '搜索结果' : '热门推荐'}
                              </div>
                              {suggestions.map((suggestion) => (
                                <button
                                  key={suggestion.name}
                                  type="button"
                                  onClick={() => handleAddTag(suggestion.name)}
                                  className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                                >
                                  <span className="text-sm text-slate-700 dark:text-slate-300 font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                                    #{suggestion.name}
                                  </span>
                                  {suggestion.count > 0 && (
                                    <span className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-orange-500">
                                      <Flame size={12} />
                                      {suggestion.count}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {isAlbum ? '描述' : '内容'}
                      </label>
                      <MarkdownEditor
                        value={content}
                        onChange={setContent}
                        placeholder={isAlbum ? "介绍一下这个相册..." : "分享你的想法... (支持Markdown和图片粘贴)"}
                        minHeight="min-h-[300px]"
                      />
                    </div>
                  </form>
                </div>

                <div className="p-4 border-t border-slate-200/50 dark:border-slate-800/50 flex justify-end gap-3 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-md rounded-b-2xl">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors font-medium"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    form="create-post-form"
                    disabled={isSubmitting || !title.trim() || !content.trim()}
                    className="flex items-center gap-2 px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 transition-all font-medium"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> {isEditing ? '保存中...' : '发布中...'}
                      </>
                    ) : (
                      <>
                        {isEditing ? <Save size={18} /> : <Send size={18} />} {isEditing ? '保存修改' : '发布动态'}
                      </>
                    )}
                  </button>
                </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </ModalPortal>
  );
};

export default CreatePostModal;
