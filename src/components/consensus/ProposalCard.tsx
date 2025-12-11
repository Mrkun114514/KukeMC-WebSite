import React from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Clock, Check, X, Shield, BarChart2, Edit2, ArrowRight } from 'lucide-react';
import clsx from 'clsx';
import { ConsensusProposal } from '../../types/consensus';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

interface ProposalCardProps {
  proposal: ConsensusProposal;
  onVoteSuccess: () => void;
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal }) => {
  const { user } = useAuth();

  const totalVotes = proposal.stats.total;
  const agreePercent = totalVotes > 0 ? (proposal.stats.agree / totalVotes) * 100 : 0;
  const disagreePercent = totalVotes > 0 ? (proposal.stats.disagree / totalVotes) * 100 : 0;

  const isEnded = proposal.end_time ? new Date(proposal.end_time) < new Date() : false;
  const isClosed = !proposal.is_active || isEnded;

  const isPassed = isEnded && (proposal.stats.agree > proposal.stats.disagree);
  const isRejected = isEnded && (proposal.stats.agree <= proposal.stats.disagree);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 transition-all duration-300",
        "border border-gray-200 dark:border-gray-800",
        "hover:border-blue-500/30 dark:hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 dark:hover:shadow-blue-900/10",
        "hover:-translate-y-1"
      )}
    >
      {/* Pass/Reject Stamps - More subtle */}
      {isEnded && (
        <div className="absolute -right-4 -top-4 opacity-10 dark:opacity-5 pointer-events-none select-none transform rotate-12">
           {isPassed ? (
             <Check className="w-32 h-32 text-green-500" />
           ) : (
             <X className="w-32 h-32 text-red-500" />
           )}
        </div>
      )}

      {/* Header & Meta */}
      <div className="mb-4 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span
            className={clsx(
              "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset",
              isClosed
                ? "bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700"
                : "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/20 dark:text-green-400 dark:ring-green-900/30"
            )}
          >
            {isClosed ? (isEnded ? "已结束" : "已关闭") : "进行中"}
          </span>
          <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {formatDistanceToNow(new Date(proposal.created_at), { addSuffix: true, locale: zhCN })}
            </span>
          </div>
        </div>

        <Link to={`/consensus/${proposal.id}`} className="block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 leading-tight">
            {proposal.title}
          </h3>
        </Link>
        
        {proposal.min_level > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded w-fit mt-2 border border-amber-100 dark:border-amber-900/30">
            <Shield className="h-3.5 w-3.5" />
            <span>Lv.{proposal.min_level} 以上可参与</span>
          </div>
        )}
      </div>

      {/* Content Preview */}
      <div className="mb-6 text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed flex-grow">
          {proposal.content}
      </div>

      {/* Voting Stats - Modernized */}
      <div className="mt-auto space-y-4">
         <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
               <span>支持 {agreePercent.toFixed(0)}%</span>
               <span>反对 {disagreePercent.toFixed(0)}%</span>
            </div>
            
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800 flex relative">
               <motion.div
                 initial={{ width: 0 }}
                 animate={{ width: `${agreePercent}%` }}
                 transition={{ duration: 1, ease: "easeOut" }}
                 className="h-full bg-green-500 rounded-full"
               />
               <div className="flex-1" /> {/* Spacer */}
               <motion.div
                 initial={{ width: 0 }}
                 animate={{ width: `${disagreePercent}%` }}
                 transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                 className="h-full bg-red-500 rounded-full"
               />
            </div>
         </div>
         
         {/* Action Area */}
         <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
             <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                 {totalVotes} 人已参与
             </div>

             {proposal.my_vote ? (
                 <div className="flex items-center gap-3">
                     <span className={clsx(
                         "text-xs font-bold px-2 py-1 rounded border uppercase",
                         proposal.my_vote.vote_type === 'agree' 
                             ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30"
                             : "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30"
                     )}>
                         已{proposal.my_vote.vote_type === 'agree' ? "支持" : "反对"}
                     </span>
                     {!isClosed && (
                        <Link 
                            to={`/consensus/${proposal.id}`}
                            className="text-gray-400 hover:text-blue-500 transition-colors"
                        >
                            <Edit2 className="w-4 h-4" />
                        </Link>
                     )}
                 </div>
             ) : !isClosed ? (
                 <Link
                     to={`/consensus/${proposal.id}`}
                     className="flex items-center gap-1 text-sm font-bold text-blue-600 dark:text-blue-400 hover:gap-2 transition-all"
                 >
                     参与投票 <ArrowRight className="w-4 h-4" />
                 </Link>
             ) : (
                 <span className="text-xs font-medium text-gray-400">投票已截止</span>
             )}
         </div>
      </div>
    </motion.div>
  );
};

export default ProposalCard;
