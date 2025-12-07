import api from '../utils/api';
import { Post, PostListResponse, CreatePostDTO, Comment } from '../types/activity';

export const getPosts = async (params: { 
  page?: number; 
  per_page?: number; 
  type?: 'latest' | 'hot' | 'following'; 
  author?: string; 
  tag?: string;
  is_collected?: boolean; 
}) => {
  const response = await api.get<PostListResponse>('/api/posts', { params });
  return response.data;
};

export const getHotTopics = async (query?: string) => {
  const params = query ? { query } : {};
  const response = await api.get<{name: string, count: number}[]>('/api/topics/hot', { params });
  return response.data;
};

export const getPost = async (id: number) => {
  const response = await api.get<Post>(`/api/posts/${id}`);
  return response.data;
};

export const createPost = async (data: CreatePostDTO) => {
  const response = await api.post<Post>('/api/posts', data);
  return response.data;
};

export const updatePost = async (id: number, data: Partial<CreatePostDTO>) => {
  const response = await api.put<Post>(`/api/posts/${id}`, data);
  return response.data;
};

export const deletePost = async (id: number) => {
  const response = await api.delete(`/api/posts/${id}`);
  return response.data;
};

export const toggleLikePost = async (id: number) => {
  const response = await api.post<{ is_liked: boolean; likes_count: number }>(`/api/posts/${id}/like`);
  return response.data;
};

export const toggleCollectPost = async (id: number) => {
  const response = await api.post<{ is_collected: boolean; collects_count: number }>(`/api/posts/${id}/collect`);
  return response.data;
};

export const getComments = async (postId: number) => {
  const response = await api.get<Comment[]>(`/api/posts/${postId}/comments`);
  return response.data;
};

export const createComment = async (postId: number, content: string, parentId?: number) => {
  const response = await api.post<Comment>(`/api/posts/${postId}/comments`, { content, parent_id: parentId });
  return response.data;
};

export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<{ url: string }>('/api/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};
