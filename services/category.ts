// services/videoCategoryService.ts
import axios from 'axios';

export interface VideoCategory {
  id: string;
  name: string;
  createdAt: string;
  Video0: Video0[];
}

export interface Video0 {
  id: string;
  title: string;
  videoId: string;
  categoryVideoId: string;
  createdAt: string;
}

export interface CategoryCreate {
  name: string;
}

export interface Video0Create {
  title: string;
  videoId: string;
  categoryVideoId: string;
}

const api = axios.create({
  baseURL: process.env.API_URL || 'https://api-renovada.jbmidia.com'
});

export const videoCategoryService = {
  // Get all categories
  getAllCategories: async () => {
    const response = await api.get<{ data: VideoCategory[] }>('/category-video');
    return response.data;
  },

  // Get category by ID
  getCategoryById: async (id: string) => {
    const response = await api.get<{ data: VideoCategory }>(`/category-video/${id}`);
    return response.data;
  },

  // Create new category
  createCategory: async (categoryData: CategoryCreate) => {
    const response = await api.post<VideoCategory>('/category-video', categoryData);
    return response.data;
  },

  // Update category
  updateCategory: async (id: string, categoryData: CategoryCreate) => {
    const response = await api.put<VideoCategory>(`/category-video/${id}`, categoryData);
    return response.data;
  },

  // Delete category
  deleteCategory: async (id: string) => {
    const response = await api.delete<VideoCategory>(`/category-video/${id}`);
    return response.data;
  },

  // Get videos by category
  getVideosByCategory: async (categoryId: string) => {
    const response = await api.get<{ data: Video0[] }>(`/video0/category/${categoryId}`);
    return response.data;
  },

  // Create new video in category
  createVideo: async (videoData: Video0Create) => {
    const response = await api.post<Video0>('/video0', videoData);
    return response.data;
  },

  // Update video
  updateVideo: async (id: string, videoData: Partial<Video0Create>) => {
    const response = await api.put<Video0>(`/video0/${id}`, videoData);
    return response.data;
  },

  // Delete video
  deleteVideo: async (id: string) => {
    const response = await api.delete<Video0>(`/video0/${id}`);
    return response.data;
  }
};