import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Filter, Loader2 } from 'lucide-react';
import ProposalCard from '../components/consensus/ProposalCard';
import { getProposals } from '../services/consensus';
import { ConsensusProposal } from '../types/consensus';
import SEO from '../components/SEO';

const ConsensusPage: React.FC = () => {
  const [proposals, setProposals] = useState<ConsensusProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await getProposals(activeOnly);
      setProposals(data);
    } catch (error) {
      console.error("Failed to fetch proposals", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeOnly]);

  return (
    <>
      <SEO 
        title="玩家众议 - KukeMC" 
        description="参与KukeMC服务器的决策，为您支持的提案投票，共同建设更好的社区。" 
      />
      
      <div className="min-h-screen pb-20 pt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header Section */}
          <div className="mb-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex justify-center"
            >
              <div className="rounded-full bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <ClipboardCheck className="h-8 w-8" />
              </div>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-4xl"
            >
              玩家众议中心
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-auto mt-4 max-w-2xl text-lg text-gray-600 dark:text-gray-400"
            >
              您的声音很重要。参与服务器发展决策，投票表达您的观点，让我们共同塑造 KukeMC 的未来。
            </motion.p>
          </div>

          {/* Filters */}
          <div className="mb-8 flex justify-end">
            <button
              onClick={() => setActiveOnly(!activeOnly)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeOnly
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <Filter className="h-4 w-4" />
              {activeOnly ? '只显示进行中' : '显示全部'}
            </button>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {proposals.length > 0 ? (
                proposals.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    onVoteSuccess={fetchData}
                  />
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
                  <p>暂无相关提案</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ConsensusPage;
