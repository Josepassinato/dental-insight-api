import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Video {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  duration: string;
}

interface OnboardingVideosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const videos: Video[] = [
  {
    id: "intro",
    title: "Introdução ao exm-ai.com",
    description: "Conheça a plataforma e seus recursos principais",
    youtubeId: "dQw4w9WgXcQ", // Replace with real video IDs
    duration: "3:45",
  },
  {
    id: "upload",
    title: "Como fazer upload de imagens",
    description: "Aprenda a enviar radiografias e fotos para análise",
    youtubeId: "dQw4w9WgXcQ",
    duration: "2:30",
  },
  {
    id: "analysis",
    title: "Entendendo as análises de IA",
    description: "Interprete os resultados e achados da IA",
    youtubeId: "dQw4w9WgXcQ",
    duration: "4:15",
  },
  {
    id: "patients",
    title: "Gerenciamento de pacientes",
    description: "Organize prontuários e histórico de consultas",
    youtubeId: "dQw4w9WgXcQ",
    duration: "3:00",
  },
  {
    id: "reports",
    title: "Gerando relatórios profissionais",
    description: "Crie relatórios personalizados para seus pacientes",
    youtubeId: "dQw4w9WgXcQ",
    duration: "2:45",
  },
];

export const OnboardingVideos = ({ open, onOpenChange, onComplete }: OnboardingVideosProps) => {
  const [watchedVideos, setWatchedVideos] = useState<string[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const { toast } = useToast();

  const handleVideoWatch = async (videoId: string) => {
    if (watchedVideos.includes(videoId)) return;

    const newWatchedVideos = [...watchedVideos, videoId];
    setWatchedVideos(newWatchedVideos);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from("onboarding_progress")
          .update({ 
            videos_watched: newWatchedVideos,
            completed_steps: ['tour', 'videos']
          })
          .eq("user_id", user.id);

        if (error) throw error;

        toast({
          title: "Vídeo marcado como assistido!",
          description: `${newWatchedVideos.length} de ${videos.length} vídeos assistidos.`,
        });

        if (newWatchedVideos.length === videos.length) {
          setTimeout(() => {
            onComplete();
          }, 1000);
        }
      }
    } catch (error) {
      console.error("Error updating video progress:", error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Vídeos Tutoriais</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <p className="text-sm text-muted-foreground">
              Assista aos vídeos tutoriais para aprender a usar todas as funcionalidades do exm-ai.com.
              Progresso: {watchedVideos.length}/{videos.length}
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {videos.map((video) => {
                const isWatched = watchedVideos.includes(video.id);

                return (
                  <Card
                    key={video.id}
                    className="p-4 cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setCurrentVideo(video)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        {isWatched ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <PlayCircle className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm mb-1">{video.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {video.description}
                        </p>
                        <span className="text-xs text-muted-foreground">{video.duration}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="w-full"
            >
              Continuar mais tarde
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {currentVideo && (
        <Dialog open={!!currentVideo} onOpenChange={() => setCurrentVideo(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{currentVideo.title}</DialogTitle>
            </DialogHeader>
            <div className="aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${currentVideo.youtubeId}`}
                title={currentVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onLoad={() => handleVideoWatch(currentVideo.id)}
              />
            </div>
            <p className="text-sm text-muted-foreground">{currentVideo.description}</p>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
