"use client";
import React, { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Edit2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Button } from "../components/ui/global";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  zodResolver,
} from "@/components/ui/form";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Video0Create } from "@/services/category";
import { imageService } from "@/services/image";
import { VideoCategory, videoCategoryService } from "@/services/category";
import { useToast } from "@/hooks/use-toast";

export type VideoType =
  | "MINISTRACAO"
  | "TESTEMUNHO"
  | "DEVOCIONAL"
  | "PARA_FAMILIA";

export interface Video {
  id: string;
  title: string;
  videoId: string;
  thumb: string;
  type: VideoType;
  createdAt: string;
}

type ModalMode = "create" | "edit" | "delete";

interface VideoModalProps {
  video?: Video | null;
  onSuccess?: () => void;
  mode?: ModalMode;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const extractYouTubeId = (input: string): string => {
  // Check if the input is a URL
  try {
    const url = new URL(input);
    // Handle youtube.com and youtu.be URLs
    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v") || input;
    } else if (url.hostname === "youtu.be") {
      return url.pathname.slice(1); // Remove the leading slash
    }
  } catch {
    // If input is not a URL, assume it's already a video ID
    return input;
  }
  return input;
};

const videoFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  videoId: z
    .string()
    .min(1, "Video ID is required")
    .transform(extractYouTubeId),
  categoryVideoId: z.string().min(1, "Category is required"),
});

type VideoFormValues = z.infer<typeof videoFormSchema>;

const VideoModal: React.FC<VideoModalProps> = ({
  video = null,
  onSuccess,
  mode = "create",
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    video?.thumb || null
  );
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<VideoCategory[]>([]);

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: {
      title: video?.title || "",
      videoId: video?.videoId || "",
    },
  });

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await videoCategoryService.getAllCategories();
      setCategories(response.data);
      form.setValue("categoryVideoId", response.data[0]?.id || "");
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

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (data: VideoFormValues): Promise<void> => {
    try {
      setLoading(true);

      const videoData = {
        ...data,
      };

      if (mode === "create") {
        await videoCategoryService.createVideo(videoData);
        toast({
          title: "Sucesso",
          description: "Vídeo criado com sucesso!",
        });
        onSuccess?.();
        setOpen(false);
      } else if (mode === "delete" && video?.id) {
        await videoCategoryService.deleteVideo(video.id);
        toast({
          title: "Sucesso",
          description: "Vídeo deletado com sucesso!",
        });
        onSuccess?.();
        setOpen(false);
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Falha ao processar a solicitação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderTriggerButton = (): JSX.Element => {
    if (mode === "create") {
      return (
        <Button variant="default" className="gap-2">
          <Plus size={16} />
          Add Video
        </Button>
      );
    } else if (mode === "delete") {
      return (
        <Button variant="destructive" size="icon">
          <Trash2 size={16} />
        </Button>
      );
    } else {
      return (
        <Button variant="ghost" size="icon">
          <Edit2 size={16} />
        </Button>
      );
    }
  };

  const renderTitle = (): string => {
    if (mode === "create") return "Add New Video";
    if (mode === "delete") return "Delete Video";
    return "Edit Video";
  };

  const renderContent = (): JSX.Element => {
    if (mode === "delete") {
      return (
        <div className="space-y-4">
          <p>Você tem certeza que quer deletar este video?</p>
          <p className="font-medium">{video?.title}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleSubmit(form.getValues())}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="videoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube Video ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryVideoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{renderTriggerButton()}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{renderTitle()}</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default VideoModal;
