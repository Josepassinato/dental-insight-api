import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  FileImage, 
  Brain,
  Eye,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DentalImage {
  id: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  image_type: string;
  processing_status: string;
  ai_analysis?: any;
  created_at: string;
}

interface Exam {
  id: string;
  patient_id: string;
  exam_type: string;
  status: string;
  total_images?: number;
  processed_images?: number;
  ai_analysis?: any;
  created_at: string;
  updated_at: string;
}

interface ExamViewerProps {
  exam: Exam;
  onBack: () => void;
}

export function ExamViewer({ exam, onBack }: ExamViewerProps) {
  const [images, setImages] = useState<DentalImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<DentalImage | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    fetchExamImages();
  }, [exam.id]);

  const fetchExamImages = async () => {
    try {
      // Temporary mock data until dental_images table is properly set up
      setImages([]);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching exam images:', error);
      toast.error('Erro ao carregar imagens do exame');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedImage) {
      loadImageUrl(selectedImage);
    }
  }, [selectedImage]);

  const loadImageUrl = async (image: DentalImage) => {
    setImageLoading(true);
    try {
      const { data } = await supabase.storage
        .from('dental-uploads')
        .createSignedUrl(image.file_path, 3600); // 1 hour expiry

      if (data?.signedUrl) {
        setImageUrl(data.signedUrl);
      }
    } catch (error) {
      console.error('Error loading image:', error);
      toast.error('Erro ao carregar imagem');
    } finally {
      setImageLoading(false);
    }
  };

  const downloadImage = async (image: DentalImage) => {
    try {
      const { data } = await supabase.storage
        .from('dental-uploads')
        .download(image.file_path);

      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = image.original_filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Erro ao baixar imagem');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
          <div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              Exame - Paciente {exam.patient_id}
            </h1>
            <p className="text-muted-foreground">
              {format(new Date(exam.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline">{exam.exam_type}</Badge>
          <Badge variant={exam.status === 'completed' ? 'default' : 'secondary'}>
            {exam.status === 'completed' ? 'Concluído' : 'Processando'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image Viewer */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Visualização da Imagem
                </span>
                {selectedImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadImage(selectedImage)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Baixar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedImage ? (
                <div className="space-y-4">
                  <div className="aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center">
                    {imageLoading ? (
                      <Skeleton className="w-full h-full" />
                    ) : imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={selectedImage.original_filename}
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <FileImage className="h-16 w-16 mx-auto mb-4" />
                        <p>Imagem não disponível</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{selectedImage.original_filename}</span>
                    <span>{formatFileSize(selectedImage.file_size)}</span>
                  </div>
                </div>
              ) : (
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <FileImage className="h-16 w-16 mx-auto mb-4" />
                    <p>Selecione uma imagem para visualizar</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Images List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Imagens ({images.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {images.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedImage(image)}
                    className={`w-full p-3 text-left rounded-lg border transition-colors ${
                      selectedImage?.id === image.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <div className="font-medium text-sm truncate">
                      {image.original_filename}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span>{image.image_type}</span>
                      <Badge 
                        variant={image.processing_status === 'completed' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {image.processing_status === 'completed' ? 'Processada' : 'Pendente'}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          {(selectedImage?.ai_analysis || exam.ai_analysis) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Análise por IA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="individual" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="individual">Imagem</TabsTrigger>
                    <TabsTrigger value="exam">Exame</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="individual" className="space-y-4">
                    {selectedImage?.ai_analysis ? (
                      <div className="space-y-4">
                        {selectedImage.ai_analysis.pontuacao && (
                          <div>
                            <h4 className="font-medium mb-1">Qualidade</h4>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${(selectedImage.ai_analysis.pontuacao / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {selectedImage.ai_analysis.pontuacao}/10
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {selectedImage.ai_analysis.estruturas && (
                          <div>
                            <h4 className="font-medium mb-2">Estruturas Identificadas</h4>
                            <p className="text-sm text-muted-foreground">
                              {Array.isArray(selectedImage.ai_analysis.estruturas) 
                                ? selectedImage.ai_analysis.estruturas.join(', ')
                                : selectedImage.ai_analysis.estruturas}
                            </p>
                          </div>
                        )}
                        
                        {selectedImage.ai_analysis.alteracoes && (
                          <div>
                            <h4 className="font-medium mb-2">Alterações Detectadas</h4>
                            <p className="text-sm text-muted-foreground">
                              {Array.isArray(selectedImage.ai_analysis.alteracoes) 
                                ? selectedImage.ai_analysis.alteracoes.join(', ')
                                : selectedImage.ai_analysis.alteracoes}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Análise não disponível para esta imagem
                      </p>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="exam" className="space-y-4">
                    {exam.ai_analysis ? (
                      <div className="space-y-4">
                        {exam.ai_analysis.avg_quality && (
                          <div>
                            <h4 className="font-medium mb-1">Qualidade Média</h4>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-muted rounded-full h-2">
                                <div 
                                  className="bg-primary h-2 rounded-full"
                                  style={{ width: `${(exam.ai_analysis.avg_quality / 10) * 100}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium">
                                {exam.ai_analysis.avg_quality.toFixed(1)}/10
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {exam.ai_analysis.findings && exam.ai_analysis.findings.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Achados Principais</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {exam.ai_analysis.findings.map((finding: string, index: number) => (
                                <li key={index}>• {finding}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {exam.ai_analysis.recommendations && exam.ai_analysis.recommendations.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Recomendações</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {exam.ai_analysis.recommendations.map((rec: string, index: number) => (
                                <li key={index}>• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Análise do exame ainda não disponível
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}