import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ThumbsUp, ThumbsDown, AlertCircle, MessageSquare, Heart, Shield, User as UserIcon, Send, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ModalPortal from '../ModalPortal';
import { ConsensusProposal } from '../../types/consensus';
import { submitVote, getProposal, likeVote, replyVote } from '../../services/consensus';
import { useCurrentUserLevel } from '../../hooks/useCurrentUserLevel';
import { useAuth } from '../../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface VoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: ConsensusProposal;
  onSuccess: () => void;
}

const VoteModal: React.FC<VoteModalProps> = ({ isOpen, onClose, proposal: initialProposal, onSuccess }) => {
  const { user } = useAuth();
  const { level: userLevel } = useCurrentUserLevel();
  const [fullProposal, setFullProposal] = useState<ConsensusProposal>(initialProposal);
  
  const [voteType, setVoteType] = useState<'agree' | 'disagree'>(
    initialProposal.my_vote?.vote_type || 'agree'
  );
  const [reason, setReason] = useState(initialProposal.my_vote?.reason || '');
  const [isAnonymous, setIsAnonymous] = useState(initialProposal.my_vote?.is_anonymous || false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<number | null>(null); // vote id
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    if (isOpen) {
        fetchProposalDetails();
    }
  }, [isOpen, initialProposal.id]);

  const fetchProposalDetails = async () => {
      try {
          const data = await getProposal(initialProposal.id);
          setFullProposal(data);
          // Sync my vote state if available
          if (data.my_vote) {
              setVoteType(data.my_vote.vote_type);
              setReason(data.my_vote.reason || '');
              setIsAnonymous(data.my_vote.is_anonymous || false);
          }
      } catch (err) {
          console.error("Failed to fetch proposal details", err);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voteType) return;

    if (initialProposal.min_level > 0 && (userLevel === null || userLevel < initialProposal.min_level)) {
        setError(`需要等级达到 Lv.${initialProposal.min_level} 才能参与`);
        return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitVote({
        proposal_id: initialProposal.id,
        vote_type: voteType,
        reason: reason,
        is_anonymous: isAnonymous
      });
      await fetchProposalDetails(); // Refresh comments
      onSuccess();
      // Don't close immediately, let user see result or continue interacting
    } catch (err: any) {
      setError(err.response?.data?.detail || "提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (voteId: number) => {
      try {
          await likeVote(voteId);
          // Optimistic update
          setFullProposal(prev => {
              if (!prev.recent_votes) return prev;
              const newVotes = prev.recent_votes.map(v => {
                  if (v.id === voteId) {
                      const isLiked = !v.is_liked_by_me;
                      return {
                          ...v,
                          is_liked_by_me: isLiked,
                          likes: isLiked 
                              ? [...v.likes, user?.username || ''] 
                              : v.likes.filter(u => u !== user?.username)
                      };
                  }
                  return v;
              });
              return { ...prev, recent_votes: newVotes };
          });
      } catch (err) {
          console.error("Failed to like vote", err);
      }
  };

  const handleReplySubmit = async (voteId: number) => {
      if (!replyContent.trim()) return;
      setSubmittingReply(true);
      try {
          await replyVote(voteId, replyContent);
          setReplyContent("");
          setReplyingTo(null);
          await fetchProposalDetails(); // Refresh to show new reply
      } catch (err: any) {
          alert(err.response?.data?.detail || "回复失败");
      } finally {
          setSubmittingReply(false);
      }
  };

  const isLevelSufficient = initialProposal.min_level === 0 || (userLevel !== null && userLevel >= initialProposal.min_level);

  return (
    <ModalPortal>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-6xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
          onClick={e => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/50 dark:bg-black/50 hover:bg-white dark:hover:bg-black transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>

          {/* Left Panel: Proposal Content */}
          <div className="w-full md:w-5/12 flex flex-col border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar h-full">
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                        {fullProposal.title}
                    </h2>
                    <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                            <UserIcon className="w-4 h-4" />
                            管理员
                        </span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(fullProposal.created_at), { addSuffix: true, locale: zhCN })}</span>
                        {fullProposal.min_level > 0 && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                                <Shield className="w-3 h-3" />
                                Lv.{fullProposal.min_level} +
                            </span>
                        )}
                    </div>
                </div>

                <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {fullProposal.content}
                    </ReactMarkdown>
                </div>
            </div>
          </div>

          {/* Right Panel: Voting & Interaction */}
          <div className="w-full md:w-7/12 flex flex-col h-full bg-white dark:bg-gray-900">
            {/* 1. Vote Form Area */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setVoteType('agree')}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                                voteType === 'agree'
                                    ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                    : "border-gray-200 hover:border-green-200 dark:border-gray-700 dark:hover:border-green-900"
                            )}
                        >
                            <ThumbsUp className={clsx("w-5 h-5", voteType === 'agree' && "fill-current")} />
                            <span className="font-bold">支持</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setVoteType('disagree')}
                            className={clsx(
                                "flex-1 flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                                voteType === 'disagree'
                                    ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                    : "border-gray-200 hover:border-red-200 dark:border-gray-700 dark:hover:border-red-900"
                            )}
                        >
                            <ThumbsDown className={clsx("w-5 h-5", voteType === 'disagree' && "fill-current")} />
                            <span className="font-bold">反对</span>
                        </button>
                    </div>

                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="说说你的理由... (选填)"
                        className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-24"
                        maxLength={500}
                    />

                    <div className="flex items-center justify-between">
                        <label className={clsx(
                            "flex items-center gap-2 cursor-pointer select-none transition-opacity",
                            !isLevelSufficient && "opacity-50 cursor-not-allowed"
                        )}>
                            <input 
                                type="checkbox" 
                                checked={isAnonymous} 
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                                disabled={!isLevelSufficient}
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">匿名投票</span>
                        </label>

                        <button
                            type="submit"
                            disabled={isSubmitting || !isLevelSufficient}
                            className={clsx(
                                "px-6 py-2.5 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2",
                                isLevelSufficient 
                                    ? "bg-blue-600 hover:bg-blue-700 active:scale-95"
                                    : "bg-gray-400 cursor-not-allowed"
                            )}
                        >
                            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {fullProposal.my_vote ? "更新投票" : "提交投票"}
                        </button>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </form>
            </div>

            {/* 2. Comments List Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50/30 dark:bg-black/20">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    玩家讨论 ({fullProposal.recent_votes?.length || 0})
                </h3>

                <div className="space-y-6">
                    {fullProposal.recent_votes?.map((vote) => (
                        <div key={vote.id} className="flex gap-4 group">
                            <div className="shrink-0">
                                <img 
                                    src={vote.is_anonymous ? `https://cravatar.eu/helmavatar/Steve/48.png` : `https://cravatar.eu/helmavatar/${vote.username}/48.png`}
                                    alt={vote.username}
                                    className={clsx(
                                        "w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700",
                                        vote.is_anonymous && "opacity-70 grayscale"
                                    )}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-gray-900 dark:text-white text-sm">
                                        {vote.username}
                                    </span>
                                    {!vote.is_anonymous && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-mono">
                                            Lv.{vote.user_level}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400">
                                        {formatDistanceToNow(new Date(vote.updated_at), { addSuffix: true, locale: zhCN })}
                                    </span>
                                </div>

                                <div className="flex items-center gap-2 mb-2">
                                    <span className={clsx(
                                        "text-xs font-bold px-2 py-0.5 rounded border",
                                        vote.vote_type === 'agree'
                                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30"
                                            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
                                    )}>
                                        {vote.vote_type === 'agree' ? "支持" : "反对"}
                                    </span>
                                    {vote.reason && (
                                        <p className="text-gray-700 dark:text-gray-300 text-sm break-words">
                                            {vote.reason}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <button 
                                        onClick={() => handleLike(vote.id)}
                                        className={clsx(
                                            "flex items-center gap-1 transition-colors hover:text-red-500",
                                            vote.is_liked_by_me && "text-red-500"
                                        )}
                                    >
                                        <Heart className={clsx("w-3.5 h-3.5", vote.is_liked_by_me && "fill-current")} />
                                        {vote.likes?.length || 0}
                                    </button>
                                    <button 
                                        onClick={() => setReplyingTo(replyingTo === vote.id ? null : vote.id)}
                                        className="flex items-center gap-1 hover:text-blue-500 transition-colors"
                                    >
                                        <MessageSquare className="w-3.5 h-3.5" />
                                        回复
                                    </button>
                                </div>

                                {/* Reply Input */}
                                {replyingTo === vote.id && (
                                    <div className="mt-3 flex gap-2 animate-in fade-in slide-in-from-top-2">
                                        <input
                                            type="text"
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            placeholder={`回复 ${vote.username}...`}
                                            className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleReplySubmit(vote.id);
                                                }
                                            }}
                                        />
                                        <button 
                                            onClick={() => handleReplySubmit(vote.id)}
                                            disabled={submittingReply || !replyContent.trim()}
                                            className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {submittingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </button>
                                    </div>
                                )}

                                {/* Replies List */}
                                {vote.replies && vote.replies.length > 0 && (
                                    <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-100 dark:border-gray-800">
                                        {vote.replies.map((reply, idx) => (
                                            <div key={idx} className="flex gap-3">
                                                <img 
                                                    src={`https://cravatar.eu/helmavatar/${reply.username}/32.png`}
                                                    alt={reply.username}
                                                    className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700"
                                                />
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                                                            {reply.username}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400">
                                                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: zhCN })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                                        {reply.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    
                    {(!fullProposal.recent_votes || fullProposal.recent_votes.length === 0) && (
                        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>暂无评论，快来发表你的观点吧~</p>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalPortal>
  );
};

export default VoteModal;
