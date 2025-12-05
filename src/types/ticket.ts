export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'rejected';

export interface Ticket {
  id: number;
  player_name: string;
  player_uuid: string;
  server: string | null;
  description: string;
  contact: string | null;
  status: TicketStatus;
  resolver: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketLog {
  id: number;
  actor: string;
  action: string;
  message: string;
  created_at: string;
}

export interface TicketDetailResponse {
  ok: boolean;
  item: Ticket;
  logs: TicketLog[];
}

export interface CreateTicketDTO {
  player_name: string;
  player_uuid: string;
  server?: string;
  description: string;
  contact?: string;
}
