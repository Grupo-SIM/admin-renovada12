// components/video-categories/index.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, Badge, Button, CardContent } from "@/components/ui/global";
import { videoCategoryService, VideoCategory, Video0 } from "@/services/category";
import { useToast } from "@/hooks/use-toast";
import VideoModal from "./modal";

const VideoCategories = () => {
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | null>(null);
  const [videos, setVideos] = useState<Video0[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await videoCategoryService.getAllCategories();
      setCategories(response.data);
      if (response.data.length > 0 && !selectedCategory) {
        setSelectedCategory(response.data[0]);
        fetchVideosForCategory(response.data[0].id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVideosForCategory = async (categoryId: string) => {
    setIsLoading(true);
    try {
      const response = await videoCategoryService.getVideosByCategory(categoryId);
      setVideos(response.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load videos for this category",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      try {
        await videoCategoryService.deleteCategory(id);
        toast({
          title: "Success",
          description: "Category deleted successfully!",
        });
        fetchCategories();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete category",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (confirm("Are you sure you want to delete this video?")) {
      try {
        await videoCategoryService.deleteVideo(id);
        toast({
          title: "Success",
          description: "Video deleted successfully!",
        });
        if (selectedCategory) {
          fetchVideosForCategory(selectedCategory.id);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete video",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
        <div style={{overflowX:"auto", overflowY: "hidden", height: 70, marginRight: 20}} className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:space-x-2 w-full sm:w-auto overlay">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory?.id === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSelectedCategory(category);
                fetchVideosForCategory(category.id);
              }}
              style={{minWidth: "200px", minHeight:"50px"}}
              className="w-full sm:w-auto "
            >
              {category.name}
            </Button>
          ))}
        </div>
        <VideoModal mode="create" onSuccess={() => fetchVideosForCategory(selectedCategory?.id as string)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {videos.map((video) => (
          <Card key={video.id}>
            <div className="relative aspect-video bg-gray-100">
              <img
                src={`https://img.youtube.com/vi/${video.videoId}/maxresdefault.jpg`}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-sm line-clamp-2">
                  {video.title}
                </h3>
                <Badge variant="outline">{selectedCategory?.name}</Badge>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteVideo(video.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
    </>
  );
};

export default VideoCategories;