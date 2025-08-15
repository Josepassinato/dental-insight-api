import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Download, 
  Loader2, 
  CheckCircle,
  AlertTriangle,
  Eye,
  Share
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ReportGeneratorProps {
  exam: any;
  onReportGenerated?: (reportUrl: string) => void;
}

export function ReportGenerator({ exam, onReportGenerated }: ReportGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(
    exam?.metadata?.report_generated_at || null
  );

  const generateReport = async () => {
    setGenerating(true);
    
    try {
      // Call the edge function to generate PDF report
      const response = await fetch(
        `https://blwnzwkkykaobmclsvxg.supabase.co/functions/v1/generate-dental-report/v1/exams/${exam.id}/report.pdf`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
        throw new Error(errorData.error || 'Erro ao gerar relatório');
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      // Create download URL
      const url = URL.createObjectURL(pdfBlob);
      setReportUrl(url);
      setLastGenerated(new Date().toISOString());
      
      // Trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_dental_${exam.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast.success('Relatório PDF gerado com sucesso!');
      
      if (onReportGenerated) {
        onReportGenerated(url);
      }

    } catch (error: any) {
      console.error('Error generating report:', error);
      toast.error(`Erro ao gerar relatório: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const previewReport = () => {
    if (reportUrl) {
      window.open(reportUrl, '_blank');
    }
  };

  const shareReport = async () => {
    if (reportUrl) {
      try {
        await navigator.share({
          title: 'Relatório de Análise Dental',
          text: 'Relatório de análise dental gerado por IA',
          url: reportUrl
        });
      } catch (error) {
        // Fallback to copy URL
        await navigator.clipboard.writeText(reportUrl);
        toast.success('Link do relatório copiado!');
      }
    }
  };

  const getFindings = () => {
    if (!exam?.dental_images) return [];
    
    return exam.dental_images.flatMap((image: any) => image.findings || []);
  };

  const getSeverityCount = (severity: string) => {
    return getFindings().filter((f: any) => f.severity === severity).length;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Relatório PDF Profissional
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Status */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Status do Relatório:</span>
            {lastGenerated ? (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Disponível
              </Badge>
            ) : (
              <Badge variant="secondary">
                Não gerado
              </Badge>
            )}
          </div>
          
          {lastGenerated && (
            <div className="text-sm text-muted-foreground">
              Última geração: {format(new Date(lastGenerated), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </div>
          )}
        </div>

        <Separator />

        {/* Report Preview Info */}
        <div className="space-y-4">
          <h4 className="font-medium">📋 Conteúdo do Relatório:</h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Logo e informações da clínica</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Imagens originais + overlays</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>Análise detalhada por dente</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Explicações simplificadas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Recomendações clínicas</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Resumo estatístico</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Findings Summary */}
        <div className="space-y-4">
          <h4 className="font-medium">🔍 Resumo dos Achados:</h4>
          
          {getFindings().length === 0 ? (
            <div className="text-center py-4 text-green-600">
              <CheckCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">Nenhum achado significativo</p>
              <p className="text-sm text-muted-foreground">Estruturas dentárias em bom estado</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-yellow-50 rounded-lg border">
                <div className="text-2xl font-bold text-yellow-600">
                  {getSeverityCount('leve')}
                </div>
                <div className="text-sm text-yellow-700">Leves</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg border">
                <div className="text-2xl font-bold text-orange-600">
                  {getSeverityCount('moderada')}
                </div>
                <div className="text-sm text-orange-700">Moderadas</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border">
                <div className="text-2xl font-bold text-red-600">
                  {getSeverityCount('severa')}
                </div>
                <div className="text-sm text-red-700">Severas</div>
              </div>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            Total de imagens analisadas: {exam?.dental_images?.length || 0}
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={generateReport}
            disabled={generating}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            size="lg"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando Relatório...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {lastGenerated ? 'Regenerar Relatório PDF' : 'Gerar Relatório PDF'}
              </>
            )}
          </Button>

          {reportUrl && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={previewReport}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" />
                Visualizar
              </Button>
              <Button
                variant="outline"
                onClick={shareReport}
                className="flex-1"
              >
                <Share className="h-4 w-4 mr-2" />
                Compartilhar
              </Button>
            </div>
          )}
        </div>

        {/* Info Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Relatório Profissional</p>
              <p>
                O relatório PDF contém análise detalhada com explicações simplificadas 
                para o paciente e recomendações clínicas baseadas na inteligência artificial.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}