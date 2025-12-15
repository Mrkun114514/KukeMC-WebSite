export interface Author {
  username: string;
  avatar?: string;
  nickname?: string;
  custom_title?: string;
  is_following?: boolean;
  level?: number;
}

export interface Post {
  id: number;
  type?: 'post' | 'album'; // Added type
  title: string;
  content: string;
  author: Author;
  created_at: string;
  updated_at?: string;
  likes_count: number;
  comments_count: number;
  collects_count: number;
  is_liked: boolean;
  is_collected: boolean;
  images?: string[]; // URLs of images in the post (if extracted or attached)
  tags?: string[];
  category?: string; // Added category
  views_count?: number; // Added views_count
}

export interface Comment {
  id: number;
  post_id: number;
  author: Author;
  content: string;
  created_at: string;
  parent_id?: number; // For nested comments
  replies?: Comment[];
  likes_count?: number;
  is_liked?: boolean;
}

export interface CreatePostDTO {
  title: string;
  content: string;
  images?: string[];
  tags?: string[];
  category?: string;
}

export interface PostListResponse {
  data: Post[];
  total: number;
  page: number;
  per_page: number;
}

export interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}
