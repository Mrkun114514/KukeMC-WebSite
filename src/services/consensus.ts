import api from '../utils/api';
import { ConsensusProposal, VotePayload } from '../types/consensus';

export const getProposals = async (activeOnly = false) => {
  const response = await api.get<ConsensusProposal[]>('/api/consensus/proposals', {
    params: { active_only: activeOnly }
  });
  return response.data;
};

export const getProposal = async (id: number) => {
  const response = await api.get<ConsensusProposal>(`/api/consensus/proposals/${id}`);
  return response.data;
};

export const submitVote = async (data: VotePayload) => {
  const response = await api.post('/api/consensus/vote', data);
  return response.data;
};

export const likeVote = async (voteId: number) => {
  const response = await api.post(`/api/consensus/votes/${voteId}/like`);
  return response.data;
};

export const replyVote = async (voteId: number, content: string) => {
  const response = await api.post(`/api/consensus/votes/${voteId}/reply`, { content });
  return response.data;
};
