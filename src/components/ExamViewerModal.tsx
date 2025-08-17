import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DentalImageViewer } from './DentalImageViewer';
import { toast } from 'sonner';

interface ExamData {
  id: string;
  file_path: string;
  overlay_file_path?: string;
  original_filename: string;
  processing_status: string;
  findings: any;
  analysis_confidence?: number;
  created_at: string;
}

interface ExamViewerModalProps {
  exam: ExamData;
  onClose: () => void;
}

export function ExamViewerModal({ exam, onClose }: ExamViewerModalProps) {
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [overlayImageUrl, setOverlayImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImageUrls();
  }, [exam]);

  const loadImageUrls = async () => {
    try {
      setLoading(true);

      // Load original image URL
      if (exam.file_path) {
        const { data: originalData } = await supabase.storage
          .from('dental-uploads')
          .createSignedUrl(exam.file_path, 3600);

        if (originalData?.signedUrl) {
          setOriginalImageUrl(originalData.signedUrl);
        }
      }

      // Load overlay image URL if available
      if (exam.overlay_file_path) {
        const { data: overlayData } = await supabase.storage
          .from('dental-overlays')
          .createSignedUrl(exam.overlay_file_path, 3600);

        if (overlayData?.signedUrl) {
          setOverlayImageUrl(overlayData.signedUrl);
        }
      }
    } catch (error) {
      console.error('Error loading image URLs:', error);
      toast.error('Erro ao carregar URLs das imagens');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="text-white text-center">
          <div className="h-8 w-8 animate-spin border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Carregando imagem...</p>
        </div>
      </div>
    );
  }

  if (!originalImageUrl) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="text-white text-center">
          <p>Erro ao carregar imagem</p>
          <button 
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-white text-black rounded"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  return (
    <DentalImageViewer
      imageId={exam.id}
      originalImageUrl={originalImageUrl}
      overlayImageUrl={overlayImageUrl}
      findings={Array.isArray(exam.findings) ? exam.findings : []}
      onClose={onClose}
    />
  );
}