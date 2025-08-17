import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download,
  Eye,
  EyeOff,
  AlertTriangle,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

interface DentalImageViewerProps {
  imageId: string;
  originalImageUrl: string;
  overlayImageUrl?: string;
  findings: DentalFinding[];
  onClose?: () => void;
}

export function DentalImageViewer({
  imageId, 
  originalImageUrl, 
  overlayImageUrl, 
  findings,
  onClose 
}: DentalImageViewerProps) {
  const [showOverlay, setShowOverlay] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [selectedFinding, setSelectedFinding] = useState<DentalFinding | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'leve':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'moderada':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'severa':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getFindingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'carie': 'Cárie',
      'perda_ossea': 'Perda Óssea',
      'restauracao_defeituosa': 'Restauração Defeituosa',
      'calculo': 'Cálculo',
      'gengivite': 'Gengivite',
      'periodontite': 'Periodontite',
      'impactacao': 'Impactação',
      'fratura': 'Fratura'
    };
    return labels[type] || type;
  };

  const drawImageWithOverlay = () => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImageUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onerror = (error) => {
      console.error('Error loading original image:', error);
      setImageLoaded(false);
      toast.error('Erro ao carregar imagem');
    };
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply transformations
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(zoom, zoom);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-img.width / 2, -img.height / 2);
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Draw overlay if enabled and available
      if (showOverlay && overlayImageUrl) {
        const overlayImg = new Image();
        overlayImg.crossOrigin = 'anonymous';
        overlayImg.onload = () => {
          ctx.globalAlpha = 0.8;
          ctx.drawImage(overlayImg, 0, 0);
          ctx.globalAlpha = 1;
        };
        overlayImg.onerror = (error) => {
          console.error('Error loading overlay image:', error);
        };
        overlayImg.src = overlayImageUrl;
      }

      // Draw manual annotations for findings
      if (showOverlay && findings.length > 0) {
        findings.forEach((finding, index) => {
          if (finding.bbox_coordinates) {
            const { x, y, width, height } = finding.bbox_coordinates;
            
            // Set color based on finding type
            let color = '#FF0000'; // Default red
            switch (finding.finding_type) {
              case 'carie':
                color = '#FF0000'; // Red
                break;
              case 'perda_ossea':
                color = '#FFA500'; // Orange
                break;
              case 'restauracao_defeituosa':
                color = '#0000FF'; // Blue
                break;
              case 'calculo':
                color = '#00FF00'; // Green
                break;
              default:
                color = '#FF0000';
            }
            
            // Draw bounding box
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);
            
            // Draw label
            ctx.fillStyle = color;
            ctx.font = '16px Arial';
            const label = `${getFindingTypeLabel(finding.finding_type)} (${Math.round(finding.confidence * 100)}%)`;
            ctx.fillText(label, x, y - 8);
            
            // Highlight selected finding
            if (selectedFinding?.id === finding.id) {
              ctx.strokeStyle = '#FFFF00'; // Yellow highlight
              ctx.lineWidth = 5;
              ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
            }
          }
        });
      }
      
      ctx.restore();
      setImageLoaded(true);
    };
    
    img.src = originalImageUrl;
  };

  useEffect(() => {
    drawImageWithOverlay();
  }, [originalImageUrl, overlayImageUrl, showOverlay, zoom, rotation, selectedFinding, findings]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.1));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };

  const downloadImage = async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `dental_analysis_${imageId}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success('Imagem baixada com sucesso');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error downloading image:', error);
      toast.error('Erro ao baixar imagem');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="w-full h-full max-w-7xl mx-4 flex gap-4 p-4">
        {/* Main Image Viewer */}
        <Card className="flex-1 flex flex-col">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Análise da Imagem Dental
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOverlay(!showOverlay)}
                >
                  {showOverlay ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Ocultar Overlay
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Mostrar Overlay
                    </>
                  )}
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleZoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleRotate}>
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Reset
                </Button>
                <Button variant="outline" size="sm" onClick={downloadImage}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
                {onClose && (
                  <Button variant="outline" size="sm" onClick={onClose}>
                    Fechar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 bg-black overflow-hidden">
            <div className="w-full h-full flex items-center justify-center min-h-[400px]">
              {!imageLoaded && (
                <div className="text-white text-center">
                  <div className="h-8 w-8 animate-spin border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p>Carregando imagem...</p>
                </div>
              )}
              <canvas
                ref={canvasRef}
                className={`max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing ${
                  !imageLoaded ? 'hidden' : ''
                }`}
                style={{
                  filter: imageLoaded ? 'none' : 'blur(5px)',
                  minWidth: imageLoaded ? 'auto' : '100px',
                  minHeight: imageLoaded ? 'auto' : '100px',
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Findings Panel */}
        <Card className="w-80 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Detecções ({findings.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4">
            {findings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Info className="h-8 w-8 mx-auto mb-2" />
                <p>Nenhuma detecção encontrada</p>
              </div>
            ) : (
              findings.map((finding, index) => (
                <div
                  key={finding.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedFinding?.id === finding.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedFinding(finding)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-sm">
                      {getFindingTypeLabel(finding.finding_type)}
                    </div>
                    <Badge className={`text-xs ${getSeverityColor(finding.severity)}`}>
                      {finding.severity}
                    </Badge>
                  </div>
                  
                  {finding.tooth_number && (
                    <div className="text-xs text-muted-foreground mb-1">
                      Dente: {finding.tooth_number}
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground mb-2">
                    Confiança: {Math.round(finding.confidence * 100)}%
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    {finding.description}
                  </p>
                  
                  {finding.bbox_coordinates && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Localização: ({finding.bbox_coordinates.x}, {finding.bbox_coordinates.y})
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}