'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { MessageSquare, ThumbsUp, Trash2, MessageCircle, Send, X, MoreHorizontal, Loader2, Smile, Image as ImageIcon, AtSign } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MentionInput from './MentionInput';
import clsx from 'clsx';
import api, { generateUploadHeaders } from '@/utils/api';

import LevelBadge from '@/components/LevelBadge';

// --- Types ---
export interface UIComment {
  id: number;
  content: string;
  created_at: string | number;
  author: {
    username: string;
    nickname?: string;
    avatar?: string;
    custom_title?: string;
    level?: number;
  };
  replies?: UIComment[];
  parent_id?: number;
  likes_count?: number;
  is_liked?: boolean;
}

interface CommentSectionProps {
  comments: UIComment[];
  currentUser: any; // User object from context
  onSubmit: (content: string, parentId?: number) => Promise<void>;
  onDelete?: (commentId: number) => Promise<void>;
  onLike?: (commentId: number) => Promise<void>;
  loading?: boolean;
  title?: string;
  className?: string;
  hideMainInput?: boolean;
}

// --- Helper Components ---

const formatCommentTime = (timestamp: string | number) => {
  try {
    if (!timestamp) return '刚刚';
    
    let date: Date;
    
    if (typeof timestamp === 'number') {
        if (timestamp < 10000000000) {
            date = new Date(timestamp * 1000);
        } else {
            date = new Date(timestamp);
        }
    } else {
        const num = Number(timestamp);
        if (!isNaN(num) && !isNaN(parseFloat(timestamp as string))) {
             if (num < 10000000000) {
                date = new Date(num * 1000);
             } else {
                date = new Date(num);
             }
        } else {
             date = new Date(timestamp);
        }
    }

    if (isNaN(date.getTime()) || date.getFullYear() < 2020) return '刚刚';
    return formatDistanceToNow(date, { addSuffix: true, locale: zhCN }).replace('大约 ', '');
  } catch (e) {
    return '刚刚';
  }
};

const CommentImage = (props: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <img 
        {...props} 
        className="max-w-full h-auto max-h-[300px] rounded-lg border border-slate-200 dark:border-slate-700 cursor-zoom-in transition-transform hover:scale-[1.02] object-contain bg-slate-50 dark:bg-slate-900/50 my-2"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
      />
      {isOpen && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(false);
          }}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <img 
              src={props.src} 
              alt={props.alt} 
              className="max-w-full max-h-[90vh] rounded-lg shadow-2xl animate-in zoom-in-95 duration-200 object-contain"
              onClick={(e) => e.stopPropagation()} 
            />
            <button 
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
            >
              <X size={24} />
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

const CommentContent = ({ content }: { content: string }) => {
  const processed = content.replace(
    /@([^ \t\n\r\f\v@,.!?;:，。！？]+)/g, 
    (match, username) => `[${match}](/player/${username})`
  );
  
  return (
    <span className="prose dark:prose-invert prose-sm max-w-none text-slate-700 dark:text-slate-300 leading-relaxed break-words inline">
       <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
              a: ({node, ...props}) => (
                <Link href={props.href || '#'} className="text-emerald-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                  {props.children}
                </Link>
              ),
              p: ({node, ...props}) => <span className="inline" {...props} />,
              img: CommentImage
          }}
       >
         {processed}
       </ReactMarkdown>
    </span>
  );
};

const COMMON_EMOJIS = ['😀', '😂', '🤣', '😍', '🥰', '😎', '🤔', '😭', '👍', '👎', '🎉', '🔥', '❤️', '👀', '✨'];

const CommentInput = ({ 
  onSubmit, 
  placeholder = "发表评论...", 
  buttonText = "发表评论",
  autoFocus = false,
  onCancel
}: { 
  onSubmit: (content: string) => Promise<void>, 
  placeholder?: string, 
  buttonText?: string,
  autoFocus?: boolean,
  onCancel?: () => void
}) => {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const [emojiPickerPos, setEmojiPickerPos] = useState<{ top: number; left: number } | null>(null);

  const updateEmojiPickerPos = () => {
    if (emojiButtonRef.current) {
        const rect = emojiButtonRef.current.getBoundingClientRect();
        setEmojiPickerPos({
            top: rect.top + window.scrollY - 310, 
            left: rect.left + window.scrollX
        });
    }
  };

  useEffect(() => {
    if (showEmojiPicker) {
        updateEmojiPickerPos();
        window.addEventListener('resize', updateEmojiPickerPos);
        window.addEventListener('scroll', updateEmojiPickerPos, true);
    }
    return () => {
        window.removeEventListener('resize', updateEmojiPickerPos);
        window.removeEventListener('scroll', updateEmojiPickerPos, true);
    };
  }, [showEmojiPicker]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && uploadedImages.length === 0) return;
    
    setIsSubmitting(true);
    try {
      let finalContent = content;
      if (uploadedImages.length > 0) {
          finalContent += '\n\n' + uploadedImages.map(url => `![](${url})`).join('\n');
      }
      
      await onSubmit(finalContent);
      setContent('');
      setUploadedImages([]);
      if (onCancel) onCancel();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const insertText = (text: string, selectionOffset = 0) => {
    const textarea = textareaRef.current;
    if (!textarea) {
        setContent(prev => prev + text);
        return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newContent = content.substring(0, start) + text + content.substring(end);
    
    setContent(newContent);
    
    setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + text.length + selectionOffset;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };
  
  const handleEmojiClick = (emoji: string) => {
    insertText(emoji);
    setShowEmojiPicker(false);
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }
    
    setIsUploading(true);
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        const securityHeaders = await generateUploadHeaders();
        
        const res = await api.post('/api/upload/image', formData, {
             headers: {
                'Content-Type': 'multipart/form-data',
                ...securityHeaders
             }
        });
        
        setUploadedImages(prev => [...prev, res.data.url]);
        
    } catch (error) {
        console.error(error);
        alert('图片上传失败');
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleMentionClick = () => {
      insertText('@');
  };

  const isExpanded = isFocused || content.trim().length > 0 || uploadedImages.length > 0;

  return (
    <form onSubmit={handleSubmit} className="relative group">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <div className={clsx(
        "relative rounded-2xl transition-all duration-300",
        isFocused 
          ? "bg-white dark:bg-slate-900 border border-emerald-500/50 dark:border-emerald-500/50" 
          : "bg-slate-50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800"
      )}>
        <MentionInput
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={clsx(
            "w-full bg-transparent border-none outline-none resize-none text-slate-900 dark:text-white text-base placeholder:text-slate-400/80 p-5 transition-all duration-300 ease-in-out",
            "custom-scrollbar",
            "min-h-[60px]"
          )}
        />
        
        {/* Image Previews */}
        {uploadedImages.length > 0 && (
            <div className="px-5 pb-3 flex flex-wrap gap-2">
                {uploadedImages.map((url, index) => (
                    <div key={index} className="relative group/image">
                        <img 
                            src={url} 
                            alt="Uploaded preview" 
                            className="w-20 h-20 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                        />
                        <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity shadow-sm"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>
        )}
        
        {/* Toolbar & Actions */}
        <div className={clsx(
            "flex items-center justify-between px-4 overflow-hidden transition-all duration-300 ease-in-out border-t",
            isExpanded 
                ? "max-h-[60px] py-3 opacity-100 border-slate-100 dark:border-slate-800/50" 
                : "max-h-0 py-0 opacity-0 border-transparent",
            isFocused ? "bg-slate-50/50 dark:bg-slate-900/50" : "bg-transparent",
            "rounded-b-2xl"
        )}>
            {/* Left: Tools */}
            <div className="flex items-center gap-1 relative">
                <button 
                    ref={emojiButtonRef}
                    type="button" 
                    onMouseDown={(e) => {
                        e.preventDefault();
                        setShowEmojiPicker(!showEmojiPicker);
                    }}
                    className={clsx(
                        "p-2 rounded-full transition-colors relative",
                        showEmojiPicker 
                            ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" 
                            : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                    )}
                    title="表情"
                >
                    <Smile size={20} />
                </button>
                
                <button 
                    type="button" 
                    onMouseDown={(e) => {
                        e.preventDefault();
                        handleImageClick();
                    }}
                    disabled={isUploading}
                    className={clsx(
                        "p-2 rounded-full transition-colors",
                        isUploading 
                            ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 animate-pulse cursor-wait" 
                            : "text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                    )}
                    title="图片"
                >
                    {isUploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                </button>
                <button 
                    type="button" 
                    onMouseDown={(e) => {
                        e.preventDefault();
                        handleMentionClick();
                    }}
                    className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-full transition-colors" 
                    title="提及"
                >
                    <AtSign size={20} />
                </button>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                {onCancel && (
                    <button 
                        type="button"
                        onClick={onCancel}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        取消
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting || (!content.trim() && uploadedImages.length === 0)}
                    className={clsx(
                        "flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white transition-all duration-300 shadow-md",
                        (content.trim() || uploadedImages.length > 0)
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 translate-y-0" 
                        : "bg-slate-300 dark:bg-slate-700 text-slate-100 cursor-not-allowed shadow-none"
                    )}
                >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    <span>{isSubmitting ? '发送中...' : buttonText}</span>
                </button>
            </div>
        </div>
        
        {/* Emoji Picker Portal */}
        {showEmojiPicker && mounted && createPortal(
            <>
                <div 
                    className="fixed inset-0 z-[9998]" 
                    onClick={() => setShowEmojiPicker(false)} 
                />
                {emojiPickerPos && (
                    <div 
                        className="absolute z-[9999] p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 grid grid-cols-6 gap-2 w-72 animate-in fade-in zoom-in-95 duration-200 origin-bottom-left"
                        style={{
                            top: emojiPickerPos.top,
                            left: emojiPickerPos.left
                        }}
                    >
                        {COMMON_EMOJIS.map(emoji => (
                            <button
                                key={emoji}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleEmojiClick(emoji)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xl transition-colors flex items-center justify-center"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                )}
            </>,
            document.body
        )}
      </div>
    </form>
  );
};

const CommentItem = ({ 
  comment, 
  currentUser, 
  onReply, 
  replyingToId,
  onSubmitReply,
  onDelete, 
  onLike,
  depth = 0 
}: { 
  comment: UIComment, 
  currentUser: any, 
  onReply: (comment: UIComment | null) => void,
  replyingToId: number | null,
  onSubmitReply: (content: string) => Promise<void>,
  onDelete?: (id: number) => void,
  onLike?: (id: number) => void,
  depth?: number
}) => {
  const isOwner = currentUser && (currentUser.username === comment.author.username || currentUser.role === 'admin');
  const isReplying = replyingToId === comment.id;

  // Common Reply Input Area
  const replyInputArea = (
    <div 
      className={clsx(
        "grid transition-[grid-template-rows] duration-300 ease-in-out",
        isReplying ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}
    >
       <div className="overflow-hidden">
           <div className={clsx(
               "transition-all duration-300 transform origin-top",
               isReplying ? "opacity-100 translate-y-0 pt-4 pb-2" : "opacity-0 -translate-y-4 pt-0 pb-0"
           )}>
               <div className="flex gap-3">
                   <img 
                      src={currentUser?.avatar || `https://cravatar.eu/helmavatar/${currentUser?.username}/64.png`}
                      alt="Current User"
                      className="w-8 h-8 rounded-lg bg-slate-100 object-cover hidden sm:block border border-slate-200 dark:border-slate-700"
                   />
                   <div className="flex-1">
                      <CommentInput 
                          onSubmit={onSubmitReply}
                          placeholder={`回复 @${comment.author.nickname || comment.author.username}...`}
                          buttonText="回复"
                          autoFocus={isReplying}
                          onCancel={() => onReply(null)}
                      />
                   </div>
              </div>
          </div>
       </div>
    </div>
  );

  // Main Comment Style
  if (depth === 0) {
    return (
      <div className="flex gap-4 group">
        <Link href={`/player/${comment.author.username}`} className="flex-shrink-0">
          <img 
            src={comment.author.avatar || `https://cravatar.eu/helmavatar/${comment.author.username}/64.png`}
            alt={comment.author.username}
            className="w-10 h-10 rounded-xl bg-slate-100 object-cover border border-slate-200 dark:border-slate-700 transition-all hover:scale-105"
          />
        </Link>
        
        <div className="flex-1 min-w-0">
          {/* Header: Name and Badges */}
          <div className="flex items-center gap-2 mb-1">
            <Link 
              href={`/player/${comment.author.username}`} 
              className="font-bold text-slate-900 dark:text-white hover:text-emerald-500 transition-colors text-sm"
            >
              {comment.author.nickname || comment.author.username}
            </Link>
            
            <LevelBadge level={comment.author.level} />

            {comment.author.custom_title && comment.author.custom_title !== '玩家' && (
               <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50">
                 {comment.author.custom_title}
               </span>
            )}
          </div>

          {/* Content */}
          <div className="mb-2">
            <div className="prose dark:prose-invert prose-sm max-w-none text-slate-700 dark:text-slate-300 leading-relaxed break-words">
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                        a: ({node, ...props}) => (
                        <Link href={props.href || '#'} className="text-emerald-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                            {props.children}
                        </Link>
                        ),
                        p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
                        img: CommentImage
                    }}
                >
                    {comment.content.replace(
                        /@([^ \t\n\r\f\v@,.!?;:，。！？]+)/g, 
                        (match, username) => `[${match}](/player/${username})`
                    )}
                </ReactMarkdown>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
            <span>{formatCommentTime(comment.created_at)}</span>
            
            {onLike && (
              <button 
                onClick={() => onLike(comment.id)}
                className="flex items-center gap-1 hover:text-emerald-500 transition-colors"
              >
                <ThumbsUp size={12} />
                <span>{comment.likes_count || 0}</span>
              </button>
            )}

            <button 
              onClick={() => onReply(isReplying ? null : comment)}
              className={clsx(
                "transition-all duration-200 px-2 py-0.5 rounded-md -ml-2",
                isReplying 
                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" 
                  : "hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-500"
              )}
            >
              {isReplying ? '取消回复' : '回复'}
            </button>

            {isOwner && onDelete && (
              <button 
                onClick={() => onDelete(comment.id)}
                className="hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                删除
              </button>
            )}
          </div>

          {/* Inline Reply Input */}
          {replyInputArea}

          {/* Nested Replies Container - Rendered Inside */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="space-y-3">
              {comment.replies.map(reply => (
                <CommentItem 
                  key={reply.id} 
                  comment={reply} 
                  currentUser={currentUser}
                  onReply={onReply}
                  replyingToId={replyingToId}
                  onSubmitReply={onSubmitReply}
                  onDelete={onDelete}
                  onLike={onLike}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Reply Style (Compact)
  return (
    <div className="flex gap-2 group">
      <Link href={`/player/${comment.author.username}`} className="flex-shrink-0 mt-0.5">
        <img 
          src={comment.author.avatar || `https://cravatar.eu/helmavatar/${comment.author.username}/64.png`}
          alt={comment.author.username}
          className="w-6 h-6 rounded-lg bg-slate-100 object-cover border border-slate-200 dark:border-slate-700 transition-all hover:scale-105"
        />
      </Link>
      
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
            <Link 
              href={`/player/${comment.author.username}`} 
              className="font-bold text-xs text-slate-700 dark:text-slate-200 hover:text-emerald-500 transition-colors"
            >
              {comment.author.nickname || comment.author.username}
            </Link>
            
            <LevelBadge level={comment.author.level} size="sm" />

            {comment.author.custom_title && comment.author.custom_title !== '玩家' && (
               <span className="px-1 py-0 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/50 scale-90 origin-left">
                 {comment.author.custom_title}
               </span>
            )}
            
            <span className="text-sm text-slate-800 dark:text-slate-300 break-words">
                 <span className="inline-block"><CommentContent content={comment.content} /></span>
            </span>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
          <span>{formatCommentTime(comment.created_at)}</span>
          
          {onLike && (
            <button 
              onClick={() => onLike(comment.id)}
              className="flex items-center gap-1 hover:text-emerald-500 transition-colors"
            >
              <ThumbsUp size={11} />
              <span>{comment.likes_count || 0}</span>
            </button>
          )}

          <button 
            onClick={() => onReply(isReplying ? null : comment)}
            className={clsx(
              "transition-all duration-200 px-2 py-0.5 rounded-md -ml-2",
              isReplying 
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" 
                : "hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-500"
            )}
          >
            {isReplying ? '取消回复' : '回复'}
          </button>

          {isOwner && onDelete && (
            <button 
              onClick={() => onDelete(comment.id)}
              className="hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
            >
              删除
            </button>
          )}
        </div>
        
        {/* Inline Reply Input */}
        {replyInputArea}

        {/* Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2 space-y-2">
              {comment.replies.map(reply => (
                <CommentItem 
                  key={reply.id} 
                  comment={reply} 
                  currentUser={currentUser}
                  onReply={onReply}
                  replyingToId={replyingToId}
                  onSubmitReply={onSubmitReply}
                  onDelete={onDelete}
                  onLike={onLike}
                  depth={depth + 1}
                />
              ))}
            </div>
        )}
      </div>
    </div>
  );
};

// --- Main Component ---

const CommentSection: React.FC<CommentSectionProps> = ({
  comments,
  currentUser,
  onSubmit,
  onDelete,
  onLike,
  loading = false,
  title = "评论",
  className,
  hideMainInput = false
}) => {
  const [replyingTo, setReplyingTo] = useState<UIComment | null>(null);

  const handleReplySubmit = async (content: string) => {
    if (!replyingTo) return;
    await onSubmit(content, replyingTo.id);
    setReplyingTo(null);
  };

  const handleMainSubmit = async (content: string) => {
    await onSubmit(content);
  };

  return (
    <div className={clsx("bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8", className)}>
      {/* Title */}
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
        <MessageSquare className="text-emerald-500" size={20} />
        {title} <span className="text-slate-400 font-normal text-sm ml-1">({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})</span>
      </h3>

      {/* Main Input */}
      {!hideMainInput && (currentUser ? (
        <div className="flex gap-4 mb-8">
           <img 
              src={currentUser.avatar || `https://cravatar.eu/helmavatar/${currentUser.username}/64.png`}
              alt={currentUser.username}
              className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 dark:border-slate-700 flex-shrink-0"
            />
            <div className="flex-1">
                <CommentInput onSubmit={handleMainSubmit} />
            </div>
        </div>
      ) : (
        <div className="text-center py-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 mb-8">
            <p className="text-slate-500 mb-2 text-sm">登录后参与讨论</p>
            <Link href="/login" className="text-emerald-500 font-medium hover:underline text-sm">
                立即登录
            </Link>
        </div>
      ))}

      {/* Comments List */}
      <div>
        {loading ? (
           <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
           </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            暂无评论，快来抢沙发吧！
          </div>
        ) : (
          comments.map((comment, index) => (
            <React.Fragment key={comment.id}>
                {index > 0 && (
                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-4"></div>
                )}
                <CommentItem 
                  comment={comment} 
                  currentUser={currentUser}
                  onReply={setReplyingTo}
                  replyingToId={replyingTo?.id || null}
                  onSubmitReply={handleReplySubmit}
                  onDelete={onDelete}
                  onLike={onLike}
                />
            </React.Fragment>
          ))
        )}
      </div>
    </div>
  );
};

export default CommentSection;
