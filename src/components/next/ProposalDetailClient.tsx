'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
    ThumbsUp, ThumbsDown, AlertCircle, 
    Shield, User as UserIcon, Loader2, ArrowLeft, Calendar,
    BarChart2, Lock, ClipboardCheck
} from 'lucide-react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ConsensusProposal } from '@/types/consensus';
import { submitVote, getProposal, likeVote, replyVote } from '@/services/consensus';
import { useCurrentUserLevel } from '@/hooks/useCurrentUserLevel';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useToast } from '@/context/ToastContext';
import CommentSection, { UIComment } from '@/components/next/CommentSection';

const ProposalDetailClient = ({ initialId }: { initialId: number }) => {
  const router = useRouter();
  const { user } = useAuth();
  const { error: toastError } = useToast();
  const { level: userLevel } = useCurrentUserLevel();
  
  const [proposal, setProposal] = useState<ConsensusProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Voting state
  const [voteType, setVoteType] = useState<'agree' | 'disagree' | null>(null);
  const [reason, setReason] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isEditingVote, setIsEditingVote] = useState(false);

  const comments: UIComment[] = React.useMemo(() => {
    if (!proposal?.recent_votes) return [];
    return proposal.recent_votes.map(vote => ({
      id: vote.id,
      content: (proposal.type === 'discussion' || vote.vote_type === 'neutral')
          ? (vote.reason || '')
          : `**[${vote.vote_type === 'agree' ? '支持' : '反对'}]** ${vote.reason || ''}`,
      created_at: vote.updated_at,
      author: {
          username: vote.username,
          nickname: vote.username,
          avatar: vote.is_anonymous ? `https://cravatar.eu/helmavatar/Steve/48.png` : `https://cravatar.eu/helmavatar/${vote.username}/48.png`,
          custom_title: !vote.is_anonymous ? `Lv.${vote.user_level}` : undefined
      },
      likes_count: vote.likes?.length || 0,
      is_liked: vote.is_liked_by_me,
      replies: (vote.replies || []).map(r => ({
          id: r.id || Math.random(), // fallback if id missing
          content: r.content,
          created_at: r.created_at,
          author: {
              username: r.username,
              nickname: r.username,
              avatar: `https://cravatar.eu/helmavatar/${r.username}/48.png`,
              custom_title: `Lv.${r.user_level}`
          }
      }))
    }));
  }, [proposal]);

  const handleCommentSubmit = async (content: string, parentId?: number) => {
      if (!parentId || !proposal) return;
      
      try {
          const response = await replyVote(parentId, content);
          
          setProposal(prev => {
              if (!prev || !prev.recent_votes) return prev;
              const newVotes = prev.recent_votes.map(v => {
                  if (v.id === parentId) {
                      return {
                          ...v,
                          replies: [...(v.replies || []), response.reply]
                      };
                  }
                  return v;
              });
              return { ...prev, recent_votes: newVotes };
          });
      } catch (err: any) {
          toastError(err.response?.data?.detail || "回复失败");
          throw err;
      }
  };
  
  const handleCommentLike = async (commentId: number) => {
      try {
          await likeVote(commentId);
          setProposal(prev => {
              if (!prev || !prev.recent_votes) return prev;
              const newVotes = prev.recent_votes.map(v => {
                  if (v.id === commentId) {
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

  useEffect(() => {
    if (initialId) {
      fetchProposalDetails(initialId);
    }
  }, [initialId]);

  const fetchProposalDetails = async (proposalId: number) => {
      try {
          setLoading(true);
          const data = await getProposal(proposalId);
          setProposal(data);
          // Sync my vote state if available
          if (data.my_vote) {
              setVoteType(data.my_vote.vote_type);
              setReason(data.my_vote.reason || '');
              setIsAnonymous(data.my_vote.is_anonymous || false);
          }
      } catch (err) {
          console.error("Failed to fetch proposal details", err);
          setError("无法加载提议详情，请稍后重试");
      } finally {
          setLoading(false);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposal) return;

    const typeToSend = isDiscussion ? 'neutral' : voteType;
    if (!isDiscussion && !typeToSend) return;

    if (proposal.min_level > 0 && (userLevel === null || userLevel < proposal.min_level)) {
        setVoteError(`需要等级达到 Lv.${proposal.min_level} 才能参与`);
        return;
    }

    setIsSubmitting(true);
    setVoteError(null);

    try {
      await submitVote({
        proposal_id: proposal.id,
        vote_type: typeToSend!,
        reason: reason,
        is_anonymous: isAnonymous
      });
      await fetchProposalDetails(proposal.id);
      setIsEditingVote(false);
    } catch (err: any) {
      setVoteError(err.response?.data?.detail || "提交失败，请重试");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
      return (
          <div className="min-h-screen pt-24 pb-12 flex justify-center bg-slate-50/50 dark:bg-slate-950">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
      );
  }

  if (error || !proposal) {
      return (
          <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center text-center px-4 bg-slate-50/50 dark:bg-slate-950">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">出错了</h1>
              <p className="text-slate-500 dark:text-slate-400 mb-6">{error || "提议不存在"}</p>
              <button 
                  onClick={() => router.push('/consensus')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                  返回列表
              </button>
          </div>
      );
  }

  const isLevelSufficient = proposal.min_level === 0 || (userLevel !== null && userLevel >= proposal.min_level);
  const totalVotes = proposal.stats.total;
  const agreePercent = totalVotes > 0 ? (proposal.stats.agree / totalVotes) * 100 : 0;
  const disagreePercent = totalVotes > 0 ? (proposal.stats.disagree / totalVotes) * 100 : 0;
  const isEnded = proposal.end_time ? new Date(proposal.end_time) < new Date() : false;
  const isActive = proposal.is_active && !isEnded;
  const isDiscussion = proposal.type === 'discussion';

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen pt-24 pb-12"
    >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header Navigation */}
            <button 
                onClick={() => router.push('/consensus')}
                className="group mb-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
                <div className="p-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group-hover:border-slate-300 dark:group-hover:border-slate-600 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                </div>
                <span className="font-medium">返回提议列表</span>
            </button>

            {/* Title Section */}
            <div className="mb-8">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className={clsx(
                        "px-3 py-1 rounded-full text-xs font-bold border",
                        isActive 
                            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30"
                            : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                    )}>
                        {isActive ? "进行中" : "已结束"}
                    </span>
                    <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        发布于 {format(new Date(proposal.created_at), 'yyyy年MM月dd日')}
                    </span>
                    {proposal.min_level > 0 && (
                        <span className="text-sm text-amber-600 dark:text-amber-500 flex items-center gap-1 font-medium">
                            <Shield className="w-3.5 h-3.5" />
                            Lv.{proposal.min_level} 以上可参与
                        </span>
                    )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                    {proposal.title}
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Content & Comments */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Content Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-6 sm:p-8">
                            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <UserIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">管理员</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">官方发布</div>
                                </div>
                            </div>
                            <article className="prose prose-lg dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {proposal.content}
                                </ReactMarkdown>
                            </article>
                        </div>
                    </div>

                    {/* Comments Section */}
                    <CommentSection 
                        comments={comments}
                        currentUser={user}
                        onSubmit={handleCommentSubmit}
                        onLike={handleCommentLike}
                        loading={loading}
                        title="玩家讨论"
                        hideMainInput={true}
                        className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sm:p-8"
                    />
                </div>

                {/* Right Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Stats Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-blue-500" />
                            {isDiscussion ? "讨论统计" : "投票统计"}
                        </h3>
                        
                        <div className="space-y-6">
                            {!isDiscussion && (
                                <>
                                    {/* Agree Bar */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                                                <ThumbsUp className="w-4 h-4" /> 支持
                                            </span>
                                            <span className="font-bold text-slate-900 dark:text-white">{agreePercent.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${agreePercent}%` }}
                                                className="h-full bg-green-500 rounded-full"
                                            />
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">{proposal.stats.agree} 票</div>
                                    </div>

                                    {/* Disagree Bar */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                                                <ThumbsDown className="w-4 h-4" /> 反对
                                            </span>
                                            <span className="font-bold text-slate-900 dark:text-white">{disagreePercent.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${disagreePercent}%` }}
                                                className="h-full bg-red-500 rounded-full"
                                            />
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">{proposal.stats.disagree} 票</div>
                                    </div>
                                </>
                            )}

                            <div className={clsx(
                                "grid grid-cols-2 gap-4 text-center",
                                !isDiscussion && "pt-6 border-t border-slate-100 dark:border-slate-800"
                            )}>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalVotes}</div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">{isDiscussion ? "参与人数" : "总票数"}</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {proposal.end_time ? formatDistanceToNow(new Date(proposal.end_time), { locale: zhCN }) : '永久'}
                                    </div>
                                    <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                                        {isActive ? "剩余时间" : "已结束"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Vote Action Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 sticky top-24">
                        {proposal.my_vote && !isEditingVote ? (
                            <div className="text-center py-4">
                                <div className={clsx(
                                    "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl",
                                    isDiscussion 
                                        ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                                        : proposal.my_vote.vote_type === 'agree' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                )}>
                                    {isDiscussion 
                                        ? <ClipboardCheck className="w-8 h-8" /> 
                                        : proposal.my_vote.vote_type === 'agree' ? <ThumbsUp className="w-8 h-8" /> : <ThumbsDown className="w-8 h-8" />
                                    }
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                                    {isDiscussion ? "你已参与讨论" : `你已投 ${proposal.my_vote.vote_type === 'agree' ? "支持" : "反对"} 票`}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                                    感谢你的参与！
                                </p>
                                
                                {isActive && (
                                    <button 
                                        onClick={() => setIsEditingVote(true)}
                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
                                    >
                                        {isDiscussion ? "修改我的观点" : "修改我的投票"}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">
                                    {isEditingVote ? (isDiscussion ? "修改观点" : "修改投票") : (isDiscussion ? "参与讨论" : "参与投票")}
                                </h3>
                                
                                {!isLevelSufficient ? (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-xl p-4 flex items-start gap-3">
                                        <Lock className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-bold text-amber-800 dark:text-amber-400 text-sm">权限不足</div>
                                            <p className="text-amber-700 dark:text-amber-500/80 text-xs mt-1">
                                                需要等级达到 Lv.{proposal.min_level} 才能参与投票。
                                            </p>
                                        </div>
                                    </div>
                                ) : isActive ? (
                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {!isDiscussion && (
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setVoteType('agree')}
                                                    className={clsx(
                                                        "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                                                        voteType === 'agree'
                                                            ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                                            : "border-slate-200 hover:border-green-200 dark:border-slate-700 dark:hover:border-green-900"
                                                    )}
                                                >
                                                    <ThumbsUp className={clsx("w-6 h-6", voteType === 'agree' && "fill-current")} />
                                                    <span className="font-bold">支持</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setVoteType('disagree')}
                                                    className={clsx(
                                                        "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                                                        voteType === 'disagree'
                                                            ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                                            : "border-slate-200 hover:border-red-200 dark:border-slate-700 dark:hover:border-red-900"
                                                    )}
                                                >
                                                    <ThumbsDown className={clsx("w-6 h-6", voteType === 'disagree' && "fill-current")} />
                                                    <span className="font-bold">反对</span>
                                                </button>
                                            </div>
                                        )}

                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder={isDiscussion ? "发表你的看法..." : "说说你的理由... (推荐填写)"}
                                            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-24 text-sm"
                                            maxLength={500}
                                        />

                                        <div className="flex items-center justify-between pt-2">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isAnonymous} 
                                                    onChange={(e) => setIsAnonymous(e.target.checked)}
                                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:bg-slate-700 dark:border-slate-600 w-4 h-4"
                                                />
                                                <span className="text-sm text-slate-600 dark:text-slate-400">匿名{isDiscussion ? "参与" : "投票"}</span>
                                            </label>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting || (!isDiscussion && !voteType)}
                                            className={clsx(
                                                "w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2",
                                                (isDiscussion || voteType)
                                                    ? "bg-blue-600 hover:bg-blue-700 active:scale-95"
                                                    : "bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500 dark:text-slate-500 shadow-none"
                                            )}
                                        >
                                            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                                            {isEditingVote ? "更新" : "提交"}
                                        </button>

                                        {isEditingVote && (
                                            <button 
                                                type="button"
                                                onClick={() => setIsEditingVote(false)}
                                                className="w-full text-center text-sm text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                                            >
                                                取消
                                            </button>
                                        )}

                                        {voteError && (
                                            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                                                <AlertCircle className="w-4 h-4 shrink-0" />
                                                {voteError}
                                            </div>
                                        )}
                                    </form>
                                ) : (
                                    <div className="text-center py-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <Lock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                        <div className="font-bold text-slate-900 dark:text-white">投票已结束</div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">感谢关注</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
  );
};

export default ProposalDetailClient;
