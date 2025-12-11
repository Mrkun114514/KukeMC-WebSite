import api from '../utils/api';

export const toggleLikeAlbum = async (id: number) => {
  const response = await api.post<{ is_liked: boolean; likes: number }>(`/api/album/${id}/like`);
  // Normalize response to match post response structure (likes_count vs likes)
  return { is_liked: response.data.is_liked, likes_count: response.data.likes };
};

export const toggleCollectAlbum = async (id: number) => {
  const response = await api.post<{ is_collected: boolean; collects_count?: number }>(`/api/album/${id}/collect`);
  // Note: Backend might not return collects_count for album yet.
  return { is_collected: response.data.is_collected, collects_count: response.data.collects_count || 0 };
};

export const createAlbumComment = async (albumId: number, content: string) => {
    // Note: Backend endpoint /api/album/{id}/comment returns { status: "success", comment_count: count }
    // It does NOT return the comment object. This is a limitation.
    // Standard activity comment creation returns the comment object to append to list.
    // For now, we might not support commenting directly from feed for albums if UI expects full comment list logic.
    // Or we just call it and update count.
    const response = await api.post<{ status: string, comment_count: number }>(`/api/album/${albumId}/comment`, { content });
    return response.data;
};

export const deleteAlbum = async (id: number) => {
    const response = await api.delete(`/api/album/${id}`);
    return response.data;
};

export const updateAlbum = async (id: number, data: { title?: string; description?: string }) => {
    const response = await api.put(`/api/album/${id}`, data);
    return response.data;
};

export const getAlbum = async (id: number) => {
    const response = await api.get(`/api/album/${id}`);
    return response.data;
};
