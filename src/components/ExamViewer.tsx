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
  AlertTriangle,
  Target,
  TrendingUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DentalImageViewer } from './DentalImageViewer';
import { ReportGenerator } from './ReportGenerator';

interface DentalFinding {
  id: string;
  tooth_number?: string;
  finding_type: string;
  severity: 'leve' | 'moderada' | 'severa';
  confidence: number;
  bbox_coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  description: string;
}

interface DentalImage {
  id: string;
  original_filename: string;
  file_path: string;
  overlay_file_path?: string;
  file_size: number;
  mime_type: string;
  image_type: string;
  processing_status: string;
  ai_analysis?: any;
  findings?: DentalFinding[];
  analysis_confidence?: number;
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
  const [overlayUrl, setOverlayUrl] = useState<string>('');
  const [findings, setFindings] = useState<DentalFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);

  useEffect(() => {
    fetchExamImages();
  }, [exam.id]);

  const fetchExamImages = async () => {
    try {
      // Since dental_images table was just created, for now we'll show empty state
      // until types are regenerated and we can use proper typing
      setImages([]);
      setLoading(false);
      
      // TODO: Replace with proper Supabase query once types are updated
      // const { data, error } = await supabase
      //   .from('dental_images')
      //   .select('*')
      //   .eq('exam_id', exam.id)
      //   .order('created_at', { ascending: true });
      
    } catch (error) {
      console.error('Error fetching exam images:', error);
      toast.error('Erro ao carregar imagens do exame');
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedImage) {
      loadImageUrls(selectedImage);
    }
  }, [selectedImage]);

  const loadImageUrls = async (image: DentalImage) => {
    setImageLoading(true);
    try {
      // Load original image
      const { data: originalData } = await supabase.storage
        .from('dental-uploads')
        .createSignedUrl(image.file_path, 3600);

      if (originalData?.signedUrl) {
        setImageUrl(originalData.signedUrl);
      }

      // Load overlay if available
      if (image.overlay_file_path) {
        const { data: overlayData } = await supabase.storage
          .from('dental-overlays')
          .createSignedUrl(image.overlay_file_path, 3600);

        if (overlayData?.signedUrl) {
          setOverlayUrl(overlayData.signedUrl);
        }
      }

      // Load findings for this image
      if (image.findings) {
        setFindings(image.findings);
      }
    } catch (error) {
      console.error('Error loading image URLs:', error);
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
                  Visualização Avançada
                </span>
                {selectedImage && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowImageViewer(true)}
                    >
                      <ZoomIn className="h-4 w-4 mr-2" />
                      Análise Detalhada
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadImage(selectedImage)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedImage ? (
                <div className="space-y-4">
                  <div className="aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center relative">
                    {imageLoading ? (
                      <Skeleton className="w-full h-full" />
                    ) : imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt={selectedImage.original_filename}
                          className="max-w-full max-h-full object-contain cursor-pointer"
                          onClick={() => setShowImageViewer(true)}
                        />
                        {overlayUrl && (
                          <img
                            src={overlayUrl}
                            alt="Overlay com detecções"
                            className="absolute inset-0 max-w-full max-h-full object-contain opacity-80 pointer-events-none"
                          />
                        )}
                        {findings.length > 0 && (
                          <Badge className="absolute top-2 right-2 bg-red-500 text-white">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {findings.length} detecção{findings.length !== 1 ? 'ões' : ''}
                          </Badge>
                        )}
                      </>
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <FileImage className="h-16 w-16 mx-auto mb-4" />
                        <p>Imagem não disponível</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Arquivo:</span>
                      <p className="text-muted-foreground truncate">{selectedImage.original_filename}</p>
                    </div>
                    <div>
                      <span className="font-medium">Tamanho:</span>
                      <p className="text-muted-foreground">{formatFileSize(selectedImage.file_size)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge variant={selectedImage.processing_status === 'completed' ? 'default' : 'secondary'}>
                        {selectedImage.processing_status === 'completed' ? 'Processada' : 'Pendente'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Confiança:</span>
                      <p className="text-muted-foreground">
                        {selectedImage.analysis_confidence ? 
                          `${Math.round(selectedImage.analysis_confidence * 100)}%` : 
                          'N/A'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Quick Findings Preview */}
                  {findings.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        <span className="font-medium">Detecções Principais:</span>
                      </div>
                      {findings.slice(0, 3).map((finding, index) => (
                        <div key={finding.id} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{finding.finding_type}</span>
                          <Badge variant={finding.severity === 'severa' ? 'destructive' : 'outline'}>
                            {finding.severity}
                          </Badge>
                        </div>
                      ))}
                      {findings.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{findings.length - 3} detecções adicionais
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <FileImage className="h-16 w-16 mx-auto mb-4" />
                    <p>Selecione uma imagem para visualizar</p>
                    <p className="text-sm mt-2">Pipeline de IA avançado ativo</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Status and Findings Summary */}
        <div className="space-y-6">
          {/* Report Generator */}
          <ReportGenerator 
            exam={exam}
            onReportGenerated={(url) => {
              console.log('Report generated:', url);
            }}
          />
          {/* Pipeline Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Pipeline de IA Avançado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    ✅ Ativo
                  </Badge>
                </div>
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3 text-red-500" />
                    <span>Detecção de cáries</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3 text-orange-500" />
                    <span>Análise de perda óssea</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3 text-blue-500" />
                    <span>Restaurações defeituosas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-3 w-3 text-green-500" />
                    <span>Cálculos e gengivite</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          {/* Images List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileImage className="h-5 w-5" />
                Imagens ({images.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {images.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileImage className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Nenhuma imagem processada</h3>
                  <p className="text-sm">
                    Faça upload de imagens dentais para análise automática
                  </p>
                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>Detecção automática por IA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>Overlays com marcações</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span>Análise estruturada</span>
                    </div>
                  </div>
                </div>
              ) : (
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
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={image.processing_status === 'completed' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {image.processing_status === 'completed' ? 'Processada' : 'Pendente'}
                          </Badge>
                          {image.findings && image.findings.length > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {image.findings.length}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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

      {/* Advanced Image Viewer Modal */}
      {showImageViewer && selectedImage && imageUrl && (
        <DentalImageViewer
          imageId={selectedImage.id}
          originalImageUrl={imageUrl}
          overlayImageUrl={overlayUrl}
          findings={findings}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </div>
  );
}