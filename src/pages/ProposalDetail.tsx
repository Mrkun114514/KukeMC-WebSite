import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ThumbsUp, ThumbsDown, AlertCircle, MessageSquare, Heart, 
    Shield, User as UserIcon, Send, Loader2, ArrowLeft, Calendar,
    BarChart2, Lock
} from 'lucide-react';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ConsensusProposal } from '../types/consensus';
import { submitVote, getProposal, likeVote, replyVote } from '../services/consensus';
import { useCurrentUserLevel } from '../hooks/useCurrentUserLevel';
import { getLevelColor } from '../utils/levelUtils';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const ProposalDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Reply state
  const [replyingTo, setReplyingTo] = useState<number | null>(null); // vote id
  const [replyContent, setReplyContent] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProposalDetails(parseInt(id));
    }
  }, [id]);

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
    if (!voteType || !proposal) return;

    if (proposal.min_level > 0 && (userLevel === null || userLevel < proposal.min_level)) {
        setVoteError(`需要等级达到 Lv.${proposal.min_level} 才能参与`);
        return;
    }

    setIsSubmitting(true);
    setVoteError(null);

    try {
      await submitVote({
        proposal_id: proposal.id,
        vote_type: voteType,
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

  const handleLike = async (voteId: number) => {
      try {
          await likeVote(voteId);
          // Optimistic update
          setProposal(prev => {
              if (!prev || !prev.recent_votes) return prev;
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
      if (!replyContent.trim() || !proposal) return;
      setSubmittingReply(true);
      try {
          const response = await replyVote(voteId, replyContent);
          setReplyContent("");
          setReplyingTo(null);
          
          // Optimistic update
          setProposal(prev => {
              if (!prev || !prev.recent_votes) return prev;
              const newVotes = prev.recent_votes.map(v => {
                  if (v.id === voteId) {
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
          alert(err.response?.data?.detail || "回复失败");
      } finally {
          setSubmittingReply(false);
      }
  };

  if (loading) {
      return (
          <div className="min-h-screen pt-24 pb-12 flex justify-center bg-gray-50/50 dark:bg-[#0a0a0a]">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
      );
  }

  if (error || !proposal) {
      return (
          <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center text-center px-4 bg-gray-50/50 dark:bg-[#0a0a0a]">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">出错了</h1>
              <p className="text-gray-500 dark:text-gray-400 mb-6">{error || "提议不存在"}</p>
              <button 
                  onClick={() => navigate('/consensus')}
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

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen pt-24 pb-12"
    >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header Navigation */}
            <button 
                onClick={() => navigate('/consensus')}
                className="group mb-8 flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
                <div className="p-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-colors">
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
                            : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700"
                    )}>
                        {isActive ? "进行中" : "已结束"}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
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
                <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">
                    {proposal.title}
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Content & Comments */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Content Card */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                        <div className="p-6 sm:p-8">
                            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <UserIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-white">管理员</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">官方发布</div>
                                </div>
                            </div>
                            <article className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-300">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {proposal.content}
                                </ReactMarkdown>
                            </article>
                        </div>
                    </div>

                    {/* Comments Section */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            玩家讨论
                            <span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                                {proposal.recent_votes?.length || 0}
                            </span>
                        </h3>

                        <div className="space-y-8">
                            {proposal.recent_votes?.map((vote) => {
                                const levelStyle = getLevelColor(vote.user_level || 0);
                                return (
                                <div key={vote.id} className="group bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-all hover:shadow-sm">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="shrink-0">
                                            <img 
                                                src={vote.is_anonymous ? `https://cravatar.eu/helmavatar/Steve/48.png` : `https://cravatar.eu/helmavatar/${vote.username}/48.png`}
                                                alt={vote.username}
                                                className={clsx(
                                                    "w-12 h-12 rounded-xl shadow-sm ring-2 ring-gray-50 dark:ring-gray-800 transition-transform group-hover:scale-105",
                                                    vote.is_anonymous && "opacity-70 grayscale"
                                                )}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900 dark:text-white text-base">
                                                        {vote.username}
                                                    </span>
                                                    {!vote.is_anonymous && (
                                                        <span className={clsx(
                                                            "text-[10px] px-2 py-0.5 rounded-md font-bold border uppercase tracking-wider",
                                                            levelStyle.bg,
                                                            levelStyle.text,
                                                            levelStyle.border
                                                        )}>
                                                            Lv.{vote.user_level}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {formatDistanceToNow(new Date(vote.updated_at), { addSuffix: true, locale: zhCN })}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className={clsx(
                                                    "text-xs font-bold px-2 py-0.5 rounded-md border shrink-0",
                                                    vote.vote_type === 'agree'
                                                        ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30"
                                                        : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
                                                )}>
                                                    {vote.vote_type === 'agree' ? "支持" : "反对"}
                                                </span>
                                                {vote.reason && (
                                                    <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2 group-hover:line-clamp-none transition-all">
                                                        {vote.reason}
                                                    </p>
                                                )}
                                            </div>
                                            
                                            <div className="flex items-center gap-6">
                                                <button 
                                                    onClick={() => handleLike(vote.id)}
                                                    className={clsx(
                                                        "flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-red-500",
                                                        vote.is_liked_by_me ? "text-red-500" : "text-gray-400 dark:text-gray-500"
                                                    )}
                                                >
                                                    <Heart className={clsx("w-4 h-4", vote.is_liked_by_me && "fill-current")} />
                                                    {vote.likes?.length || 0}
                                                </button>
                                                <button 
                                                    onClick={() => setReplyingTo(replyingTo === vote.id ? null : vote.id)}
                                                    className="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-blue-500 transition-colors"
                                                >
                                                    <MessageSquare className="w-4 h-4" />
                                                    回复
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Reply Input */}
                                    <AnimatePresence>
                                        {replyingTo === vote.id && (
                                            <motion.div 
                                                initial={{ opacity: 0, height: 0, y: -10 }}
                                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                                exit={{ opacity: 0, height: 0, y: -10 }}
                                                className="mb-4 pl-[4rem]"
                                            >
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={replyContent}
                                                        onChange={(e) => setReplyContent(e.target.value)}
                                                        placeholder={`回复 ${vote.username}...`}
                                                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
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
                                                        className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                                    >
                                                        {submittingReply ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Replies List */}
                                    {vote.replies && vote.replies.length > 0 && (
                                        <div className="pl-[4rem] space-y-3">
                                            {vote.replies.map((reply, idx) => {
                                                    const replyLevelStyle = getLevelColor(reply.user_level || 0);
                                                    return (
                                                    <div key={idx} className="bg-gray-50 dark:bg-gray-800/30 rounded-xl p-4 border border-gray-100 dark:border-gray-800/50">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <img 
                                                                src={`https://cravatar.eu/helmavatar/${reply.username}/24.png`}
                                                                alt={reply.username}
                                                                className="w-6 h-6 rounded-md bg-gray-200 dark:bg-gray-700"
                                                            />
                                                            <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                                {reply.username}
                                                            </span>
                                                            <span className={clsx(
                                                                "text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase",
                                                                replyLevelStyle.bg,
                                                                replyLevelStyle.text,
                                                                replyLevelStyle.border
                                                            )}>
                                                                Lv.{reply.user_level}
                                                            </span>
                                                            <span className="text-xs text-gray-400 ml-auto">
                                                                {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: zhCN })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-300 pl-8">
                                                            {reply.content}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                );
                            })}
                            
                            {(!proposal.recent_votes || proposal.recent_votes.length === 0) && (
                                <div className="text-center py-12">
                                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <MessageSquare className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <h4 className="text-gray-900 dark:text-white font-medium mb-1">暂无评论</h4>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm">快来发表你的第一条观点吧~</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Stats Card */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-blue-500" />
                            投票统计
                        </h3>
                        
                        <div className="space-y-6">
                            {/* Agree Bar */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                                        <ThumbsUp className="w-4 h-4" /> 支持
                                    </span>
                                    <span className="font-bold text-gray-900 dark:text-white">{agreePercent.toFixed(1)}%</span>
                                </div>
                                <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${agreePercent}%` }}
                                        className="h-full bg-green-500 rounded-full"
                                    />
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{proposal.stats.agree} 票</div>
                            </div>

                            {/* Disagree Bar */}
                            <div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                                        <ThumbsDown className="w-4 h-4" /> 反对
                                    </span>
                                    <span className="font-bold text-gray-900 dark:text-white">{disagreePercent.toFixed(1)}%</span>
                                </div>
                                <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${disagreePercent}%` }}
                                        className="h-full bg-red-500 rounded-full"
                                    />
                                </div>
                                <div className="text-xs text-gray-500 mt-1">{proposal.stats.disagree} 票</div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalVotes}</div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">总票数</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {proposal.end_time ? formatDistanceToNow(new Date(proposal.end_time), { locale: zhCN }) : '永久'}
                                    </div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                                        {isActive ? "剩余时间" : "已结束"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Vote Action Card */}
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sticky top-24">
                        {proposal.my_vote && !isEditingVote ? (
                            <div className="text-center py-4">
                                <div className={clsx(
                                    "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl",
                                    proposal.my_vote.vote_type === 'agree' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                                )}>
                                    {proposal.my_vote.vote_type === 'agree' ? <ThumbsUp className="w-8 h-8" /> : <ThumbsDown className="w-8 h-8" />}
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                    你已投 {proposal.my_vote.vote_type === 'agree' ? "支持" : "反对"} 票
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                                    感谢你的参与！
                                </p>
                                
                                {isActive && (
                                    <button 
                                        onClick={() => setIsEditingVote(true)}
                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline"
                                    >
                                        修改我的投票
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
                                    {isEditingVote ? "修改投票" : "参与投票"}
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
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setVoteType('agree')}
                                                className={clsx(
                                                    "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all",
                                                    voteType === 'agree'
                                                        ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                                        : "border-gray-200 hover:border-green-200 dark:border-gray-700 dark:hover:border-green-900"
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
                                                        : "border-gray-200 hover:border-red-200 dark:border-gray-700 dark:hover:border-red-900"
                                                )}
                                            >
                                                <ThumbsDown className={clsx("w-6 h-6", voteType === 'disagree' && "fill-current")} />
                                                <span className="font-bold">反对</span>
                                            </button>
                                        </div>

                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            placeholder="说说你的理由... (推荐填写)"
                                            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none h-24 text-sm"
                                            maxLength={500}
                                        />

                                        <div className="flex items-center justify-between pt-2">
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isAnonymous} 
                                                    onChange={(e) => setIsAnonymous(e.target.checked)}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 w-4 h-4"
                                                />
                                                <span className="text-sm text-gray-600 dark:text-gray-400">匿名投票</span>
                                            </label>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting || !voteType}
                                            className={clsx(
                                                "w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2",
                                                voteType
                                                    ? "bg-blue-600 hover:bg-blue-700 active:scale-95"
                                                    : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed text-gray-500 dark:text-gray-500 shadow-none"
                                            )}
                                        >
                                            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
                                            {isEditingVote ? "更新投票" : "提交投票"}
                                        </button>

                                        {isEditingVote && (
                                            <button 
                                                type="button"
                                                onClick={() => setIsEditingVote(false)}
                                                className="w-full text-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
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
                                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <div className="font-bold text-gray-900 dark:text-white">投票已结束</div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">感谢关注</p>
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

export default ProposalDetail;
