export interface VoteReply {
  username: string;
  content: string;
  user_level: number;
  created_at: string;
}

export interface VoteComment {
  id: number;
  username: string;
  real_username?: string | null;
  vote_type: 'agree' | 'disagree';
  reason: string | null;
  user_level: number;
  updated_at: string;
  is_anonymous: boolean;
  likes: string[];
  replies: VoteReply[];
  is_liked_by_me: boolean;
}

export interface ConsensusProposal {
  id: number;
  title: string;
  content: string;
  created_at: string;
  end_time: string | null;
  min_level: number;
  is_active: boolean;
  stats: {
    agree: number;
    disagree: number;
    total: number;
  };
  my_vote: {
    vote_type: 'agree' | 'disagree';
    reason: string | null;
    updated_at: string;
    is_anonymous?: boolean;
  } | null;
  recent_votes?: VoteComment[];
}

export interface VotePayload {
  proposal_id: number;
  vote_type: 'agree' | 'disagree';
  reason: string;
  is_anonymous?: boolean;
}
