import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  FileText, 
  Download, 
  Loader2, 
  CheckCircle,
  AlertTriangle,
  Eye,
  Printer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
  metadata?: any;
}

interface ReportGeneratorProps {
  exam: Exam;
  onReportGenerated?: (reportUrl: string) => void;
}

export function ReportGenerator({ exam, onReportGenerated }: ReportGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(
    exam.metadata?.report_file_path ? null : null
  );

  const generateReport = async () => {
    setGenerating(true);
    try {
      toast.info('Iniciando geração do relatório PDF...');

      // Call the edge function to generate PDF report
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `https://blwnzwkkykaobmclsvxg.supabase.co/functions/v1/generate-dental-report/v1/exams/${exam.id}/report.pdf`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro na geração do relatório');
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      // Create download URL
      const url = URL.createObjectURL(pdfBlob);
      setReportUrl(url);
      
      toast.success('Relatório PDF gerado com sucesso!');
      
      if (onReportGenerated) {
        onReportGenerated(url);
      }

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(`Erro ao gerar relatório: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = () => {
    if (reportUrl) {
      const a = document.createElement('a');
      a.href = reportUrl;
      a.download = `relatorio_dental_${exam.patient_id}_${exam.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Download do relatório iniciado');
    }
  };

  const openReport = () => {
    if (reportUrl) {
      window.open(reportUrl, '_blank');
    }
  };

  const getExamStatusInfo = () => {
    const hasFindings = exam.ai_analysis?.total_findings > 0;
    const isComplete = exam.status === 'completed';
    
    return {
      canGenerate: isComplete && exam.processed_images > 0,
      statusText: isComplete ? 'Exame processado' : 'Processamento pendente',
      statusColor: isComplete ? 'default' : 'secondary',
      findingsText: hasFindings 
        ? `${exam.ai_analysis.total_findings} achado${exam.ai_analysis.total_findings !== 1 ? 's' : ''} detectado${exam.ai_analysis.total_findings !== 1 ? 's' : ''}`
        : 'Nenhum achado detectado'
    };
  };

  const statusInfo = getExamStatusInfo();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Relatório PDF do Exame
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exam Status Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status do Exame:</span>
            <Badge variant={statusInfo.statusColor as any}>
              {statusInfo.canGenerate ? (
                <CheckCircle className="h-3 w-3 mr-1" />
              ) : (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              {statusInfo.statusText}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Imagens Processadas:</span>
            <span className="text-sm text-muted-foreground">
              {exam.processed_images || 0} de {exam.total_images || 0}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Achados Clínicos:</span>
            <span className="text-sm text-muted-foreground">
              {statusInfo.findingsText}
            </span>
          </div>

          {exam.ai_analysis?.avg_quality && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Qualidade das Imagens:</span>
              <span className="text-sm text-muted-foreground">
                {Math.round(exam.ai_analysis.avg_quality * 10)}/10
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Report Generation */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Relatório em PDF</h4>
          
          {exam.metadata?.report_generated_at && (
            <div className="text-xs text-muted-foreground">
              Último relatório gerado em: {' '}
              {new Date(exam.metadata.report_generated_at).toLocaleString('pt-BR')}
            </div>
          )}

          <div className="space-y-2">
            {!statusInfo.canGenerate ? (
              <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                Aguarde o processamento completo do exame para gerar o relatório
              </div>
            ) : (
              <div className="text-sm text-muted-foreground p-3 bg-blue-50 rounded-lg border border-blue-200">
                <CheckCircle className="h-4 w-4 inline mr-2 text-blue-600" />
                Exame pronto para gerar relatório detalhado com achados clínicos
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={generateReport}
              disabled={!statusInfo.canGenerate || generating}
              className="flex-1"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Relatório
                </>
              )}
            </Button>

            {reportUrl && (
              <>
                <Button
                  variant="outline"
                  onClick={downloadReport}
                  size="sm"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={openReport}
                  size="sm"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Report Features */}
        <div className="space-y-2">
          <h5 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
            O relatório inclui:
          </h5>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>Imagens originais</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>Overlays com detecções</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>Lista de achados</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>Explicações simplificadas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>Recomendações</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
              <span>Logo da clínica</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}