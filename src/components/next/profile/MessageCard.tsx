'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  Heart, Reply, Trash2, X, Send, Loader2
} from 'lucide-react';
import clsx from 'clsx';
import MentionInput from '@/components/MentionInput';
import LevelBadge from '@/components/LevelBadge';

interface MessageCardProps {
  msg: any;
  depth?: number;
  user: any;
  isAdmin: boolean;
  profileOwner?: string;
  replyingTo: number | null;
  setReplyingTo: (id: number | null) => void;
  replyContent: string;
  setReplyContent: (content: string) => void;
  handleReply: (e: React.FormEvent, parentId: number) => void;
  handleDelete: (id: number) => void;
  handleLikeMessage: (id: number) => void;
  isReplying: boolean;
  formatTime: (timestamp: number) => string;
}

const MessageCard: React.FC<MessageCardProps> = ({ 
  msg, 
  depth = 0, 
  user, 
  isAdmin,
  profileOwner,
  replyingTo, 
  setReplyingTo, 
  replyContent, 
  setReplyContent, 
  handleReply, 
  handleDelete,
  handleLikeMessage,
  isReplying,
  formatTime 
}) => {
  const isReplyingToThis = replyingTo === msg.id;
  const canDelete = isAdmin || (user && user.username === msg.player) || (user && profileOwner && user.username === profileOwner);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={clsx("flex flex-col relative", depth > 0 && "mt-4")}
    >
      {depth > 0 && (
         <div className="absolute -left-4 top-0 bottom-0 w-[2px] bg-slate-200 dark:bg-slate-700 rounded-full" />
      )}

      <div className={clsx(
        "glass-panel p-5 rounded-2xl relative group transition-all duration-300 border border-slate-100/50 dark:border-slate-700/50",
        "hover:bg-white/90 dark:hover:bg-slate-800/90 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5",
        depth > 0 ? "bg-slate-50/80 dark:bg-slate-800/30" : "bg-white/60 dark:bg-slate-900/60"
      )}>
        <div className="flex items-start gap-4">
          <Link href={`/player/${msg.player}`} className="relative flex-shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden ring-2 ring-slate-100 dark:ring-slate-700 shadow-sm group-hover:ring-emerald-400 dark:group-hover:ring-emerald-500 transition-all duration-300">
              <img
                src={`https://cravatar.eu/helmavatar/${encodeURIComponent(msg.player)}/128.png`}
                alt={msg.player}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://cravatar.eu/helmavatar/MHF_Steve/128.png';
                }}
              />
            </div>
          </Link>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Link href={`/player/${msg.player}`} className="font-bold text-base text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors duration-300 hover:underline">
                  {msg.player}
                </Link>
                <LevelBadge level={msg.level} size="sm" />
                <span className="text-xs font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                  #{msg.id}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {formatTime(msg.timestamp)}
                </span>
                
                {user && (
                  <button 
                    onClick={() => handleLikeMessage(msg.id)}
                    className={clsx(
                      "flex items-center gap-1 transition-colors p-1 rounded-md",
                      msg.is_liked 
                        ? "text-red-500 bg-red-50 dark:bg-red-900/20" 
                        : "text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    )}
                    title={msg.is_liked ? "取消点赞" : "点赞"}
                  >
                    <Heart size={14} className={clsx(msg.is_liked && "fill-current")} />
                    {msg.likes > 0 && <span className="text-xs font-medium">{msg.likes}</span>}
                  </button>
                )}

                {user && !isReplyingToThis && (
                  <button 
                    onClick={() => setReplyingTo(msg.id)}
                    className="text-slate-400 hover:text-emerald-500 transition-colors p-1 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    title="回复"
                  >
                    <Reply size={14} />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="删除留言"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
            
            <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed">
              {msg.content}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {isReplyingToThis && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-4 pl-14 sm:pl-16"
            >
              <form onSubmit={(e) => handleReply(e, msg.id)} className="group bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                <MentionInput
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={`回复 @${msg.player}...`}
                  className="w-full bg-transparent border-none p-3 text-sm focus:ring-0 focus:outline-none resize-none placeholder:text-slate-400"
                  rows={3}
                  autoFocus
                />
                <div className="flex justify-end px-2 pb-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent('');
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                    title="取消回复"
                  >
                    <X size={16} />
                  </button>
                  <button
                    type="submit"
                    disabled={isReplying || !replyContent.trim()}
                    className="p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all hover:shadow-emerald-500/25"
                    title="发送回复"
                  >
                    {isReplying ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {msg.replies && msg.replies.length > 0 && (
        <div className="pl-4 sm:pl-8 space-y-4 mt-4">
          {msg.replies.map((reply: any) => (
            <MessageCard 
              key={reply.id} 
              msg={reply} 
              depth={depth + 1} 
              user={user}
              isAdmin={isAdmin}
              profileOwner={profileOwner}
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              handleReply={handleReply}
              handleDelete={handleDelete}
              handleLikeMessage={handleLikeMessage}
              isReplying={isReplying}
              formatTime={formatTime}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default MessageCard;
