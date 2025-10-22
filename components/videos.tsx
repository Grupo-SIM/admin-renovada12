// components/video-categories/index.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card, Badge, Button, CardContent } from "@/components/ui/global";
import { videoCategoryService, VideoCategory, Video0 } from "@/services/category";
import { useToast } from "@/hooks/use-toast";
import { useConfirmation } from "@/hooks/use-confirmation";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import VideoModal from "./modal";

const VideoCategories = () => {
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | null>(null);
  const [videos, setVideos] = useState<Video0[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { confirm, isOpen, options, onConfirm, onCancel } = useConfirmation();

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
    confirm(
      {
        title: "Excluir Categoria",
        description: "Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.",
        confirmText: "Excluir",
        cancelText: "Cancelar",
        variant: "destructive",
      },
      async () => {
        try {
          await videoCategoryService.deleteCategory(id);
          toast({
            title: "Sucesso",
            description: "Categoria excluída com sucesso!",
          });
          fetchCategories();
        } catch (error) {
          toast({
            title: "Erro",
            description: "Falha ao excluir a categoria",
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleDeleteVideo = async (id: string) => {
    confirm(
      {
        title: "Excluir Vídeo",
        description: "Tem certeza que deseja excluir este vídeo? Esta ação não pode ser desfeita.",
        confirmText: "Excluir",
        cancelText: "Cancelar",
        variant: "destructive",
      },
      async () => {
        try {
          await videoCategoryService.deleteVideo(id);
          toast({
            title: "Sucesso",
            description: "Vídeo excluído com sucesso!",
          });
          if (selectedCategory) {
            fetchVideosForCategory(selectedCategory.id);
          }
        } catch (error) {
          toast({
            title: "Erro",
            description: "Falha ao excluir o vídeo",
            variant: "destructive",
          });
        }
      }
    );
  };

  const handleVideoCreated = () => {
    // Atualiza a lista de vídeos da categoria selecionada
    if (selectedCategory?.id) {
      fetchVideosForCategory(selectedCategory.id);
    } else {
      // Se não há categoria selecionada, recarrega as categorias
      fetchCategories();
    }
  };

  return (
    <>
      <style jsx>{`
        .overlay {
          -webkit-overflow-scrolling: touch;
        }
        
        .overlay::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .overlay::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .overlay::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }
        
        .overlay::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        
        .always-show-scrollbar {
          overflow-y: scroll !important;
          -webkit-overflow-scrolling: touch;
        }
      `}</style>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
        <div 
          style={{overflowX:"auto", overflowY: "hidden", height: 70, marginRight: 20}} 
          className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:space-x-2 w-full sm:w-auto overlay always-show-scrollbar"
        >
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
        <VideoModal mode="create" onSuccess={handleVideoCreated} />
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

      {options && (
        <ConfirmationDialog
          open={isOpen}
          onOpenChange={onCancel}
          title={options.title}
          description={options.description}
          confirmText={options.confirmText}
          cancelText={options.cancelText}
          variant={options.variant}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </>
  );
};

export default VideoCategories;