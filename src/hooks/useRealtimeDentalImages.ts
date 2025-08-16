import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DentalImage {
  id: string;
  file_path: string;
  overlay_file_path: string | null;
  original_filename: string;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  findings: any[];
  analysis_confidence: number | null;
  created_at: string;
  exam: {
    patient: {
      patient_ref: string;
    };
  };
}

export const useRealtimeDentalImages = () => {
  const [images, setImages] = useState<DentalImage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Função para buscar imagens iniciais
  const fetchImages = async () => {
    try {
      const { data, error } = await supabase
        .from('dental_images')
        .select(`
          id,
          file_path,
          overlay_file_path,
          original_filename,
          processing_status,
          findings,
          analysis_confidence,
          created_at,
          exam:exams(
            patient:patients(
              patient_ref
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching dental images:', error);
        return;
      }

      setImages(data as DentalImage[] || []);
    } catch (error) {
      console.error('Error in fetchImages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Configurar realtime subscription
  useEffect(() => {
    // Buscar dados iniciais
    fetchImages();

    // Configurar canal de realtime
    const channel = supabase
      .channel('dental-images-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dental_images'
        },
        (payload) => {
          console.log('Dental image updated:', payload);
          
          const updatedImage = payload.new as any;
          
          setImages(current => 
            current.map(img => 
              img.id === updatedImage.id 
                ? { ...img, ...updatedImage }
                : img
            )
          );

          // Mostrar notificação baseada no status
          if (updatedImage.processing_status === 'completed') {
            toast({
              title: "Análise Concluída",
              description: `Imagem ${updatedImage.original_filename} foi processada com sucesso.`,
            });
          } else if (updatedImage.processing_status === 'failed') {
            toast({
              title: "Falha na Análise",
              description: `Erro ao processar ${updatedImage.original_filename}.`,
              variant: "destructive",
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dental_images'
        },
        (payload) => {
          console.log('New dental image inserted:', payload);
          
          // Para novos inserts, precisamos buscar dados completos incluindo relações
          fetchImages();
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  return {
    images,
    loading,
    refetch: fetchImages
  };
};