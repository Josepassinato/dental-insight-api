import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DentalImageViewer } from "@/components/DentalImageViewer";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExamData {
  id: string;
  original_image_url: string;
  overlay_image_url?: string;
  findings: any[];
  created_at: string;
  metadata?: any;
}

const EmbedViewer = () => {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const apiKey = searchParams.get('apiKey');
  
  const [exam, setExam] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const validateAndLoadExam = async () => {
      if (!examId) {
        setError('Exam ID is required');
        setLoading(false);
        return;
      }

      if (!apiKey) {
        setError('API Key is required');
        setLoading(false);
        return;
      }

      try {
        // Get dental image data
        const { data: imageData, error: imageError } = await supabase
          .from('dental_images')
          .select(`
            id,
            file_path,
            overlay_file_path,
            created_at,
            findings,
            ai_analysis
          `)
          .eq('id', examId)
          .single();

        if (imageError) {
          throw imageError;
        }

        if (!imageData) {
          setError('Image not found');
          setLoading(false);
          return;
        }

        // Get image URLs from storage
        const { data: originalUrl } = await supabase.storage
          .from('dental-uploads')
          .createSignedUrl(imageData.file_path, 3600);

        let overlayUrl = null;
        if (imageData.overlay_file_path) {
          const { data: overlayUrlData } = await supabase.storage
            .from('dental-overlays')
            .createSignedUrl(imageData.overlay_file_path, 3600);
          overlayUrl = overlayUrlData?.signedUrl;
        }


        // Validate API key against tenant
        // Note: In a real implementation, you would validate the API key against a clinics table
        // For now, we'll just check if the API key is provided and valid format
        if (apiKey.length < 10) {
          setError('Invalid API Key');
          setLoading(false);
          return;
        }

        setExam({
          id: imageData.id,
          original_image_url: originalUrl?.signedUrl || '',
          overlay_image_url: overlayUrl,
          findings: Array.isArray(imageData.findings) ? imageData.findings : [],
          created_at: imageData.created_at,
          metadata: imageData.ai_analysis
        });

        // Notify parent window that viewer is ready
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'dental-viewer-ready',
            examId: examId
          }, '*');
        }

      } catch (error) {
        console.error('Error loading exam:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load exam';
        setError(errorMessage);
        
        // Notify parent window about error
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'dental-viewer-error',
            error: errorMessage
          }, '*');
        }
      } finally {
        setLoading(false);
      }
    };

    validateAndLoadExam();
  }, [examId, apiKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-muted-foreground mb-2">Exam Not Found</h2>
          <p className="text-muted-foreground">The requested exam could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DentalImageViewer
        imageId={exam.id}
        originalImageUrl={exam.original_image_url}
        overlayImageUrl={exam.overlay_image_url}
        findings={exam.findings}
      />
    </div>
  );
};

export default EmbedViewer;