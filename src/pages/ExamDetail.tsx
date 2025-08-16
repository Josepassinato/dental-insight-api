import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { ExamResult } from '@/components/ExamResult';
import { DentalImageViewer } from '@/components/DentalImageViewer';

interface ExamDetail {
  id: string;
  original_filename: string;
  file_path: string;
  overlay_file_path: string | null;
  processing_status: string;
  analysis_confidence: number | null;
  findings: any[];
  created_at: string;
  exam: {
    patient: {
      patient_ref: string;
      age: number | null;
      cpf: string | null;
    };
  };
}

export default function ExamDetailPage() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [overlayUrl, setOverlayUrl] = useState<string>('');

  useEffect(() => {
    if (!examId) {
      navigate('/dashboard');
      return;
    }

    loadExamDetail();
  }, [examId]);

  const loadExamDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('dental_images')
        .select(`
          id,
          original_filename,
          file_path,
          overlay_file_path,
          processing_status,
          analysis_confidence,
          findings,
          created_at,
          exam:exams(
            patient:patients(
              patient_ref,
              age,
              cpf
            )
          )
        `)
        .eq('id', examId)
        .single();

      if (error) {
        console.error('Error loading exam detail:', error);
        toast.error('Erro ao carregar detalhes do exame');
        navigate('/dashboard');
        return;
      }

      setExam(data as ExamDetail);
    } catch (error) {
      console.error('Error loading exam detail:', error);
      toast.error('Erro ao carregar detalhes do exame');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const openImageViewer = async () => {
    if (!exam) return;

    try {
      // Get signed URL for the main image
      const { data: imageData, error: imageError } = await supabase.storage
        .from('dental-uploads')
        .createSignedUrl(exam.file_path, 3600);

      if (imageError) {
        console.error('Error getting image URL:', imageError);
        toast.error('Erro ao carregar imagem');
        return;
      }

      setImageUrl(imageData.signedUrl);

      // Get overlay URL if available
      if (exam.overlay_file_path) {
        const { data: overlayData, error: overlayError } = await supabase.storage
          .from('dental-overlays')
          .createSignedUrl(exam.overlay_file_path, 3600);

        if (!overlayError && overlayData) {
          setOverlayUrl(overlayData.signedUrl);
        }
      }

      setShowImageViewer(true);
    } catch (error) {
      console.error('Error opening image viewer:', error);
      toast.error('Erro ao abrir visualizador de imagem');
    }
  };

  const downloadReport = async () => {
    if (!exam) return;

    try {
      // Generate and download report
      const reportContent = generateTextReport(exam);
      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_exame_${exam.original_filename}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Relatório baixado com sucesso');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Erro ao baixar relatório');
    }
  };

  const generateTextReport = (examData: ExamDetail): string => {
    const date = new Date(examData.created_at).toLocaleString('pt-BR');
    let report = `RELATÓRIO DE ANÁLISE DENTAL\n`;
    report += `=====================================\n\n`;
    report += `Paciente: ${examData.exam.patient.patient_ref}\n`;
    report += `Arquivo: ${examData.original_filename}\n`;
    report += `Data da Análise: ${date}\n`;
    report += `Status: ${examData.processing_status}\n`;
    if (examData.analysis_confidence) {
      report += `Confiança da Análise: ${Math.round(examData.analysis_confidence * 100)}%\n`;
    }
    report += `\n`;

    if (examData.findings && examData.findings.length > 0) {
      report += `ACHADOS CLÍNICOS (${examData.findings.length}):\n`;
      report += `=====================================\n\n`;
      
      examData.findings.forEach((finding, index) => {
        report += `${index + 1}. ${finding.finding_type?.toUpperCase() || 'ACHADO'}\n`;
        if (finding.tooth_number) report += `   Dente: ${finding.tooth_number}\n`;
        if (finding.precise_location) report += `   Localização: ${finding.precise_location}\n`;
        if (finding.clinical_severity) report += `   Severidade: ${finding.clinical_severity}\n`;
        if (finding.confidence) report += `   Confiança: ${Math.round(finding.confidence * 100)}%\n`;
        if (finding.description) report += `   Descrição: ${finding.description}\n`;
        
        if (finding.clinical_recommendations && Array.isArray(finding.clinical_recommendations)) {
          report += `   Recomendações:\n`;
          finding.clinical_recommendations.forEach((rec: string) => {
            report += `   - ${rec}\n`;
          });
        }
        report += `\n`;
      });
    } else {
      report += `NENHUM ACHADO SIGNIFICATIVO DETECTADO\n`;
      report += `=====================================\n`;
      report += `A análise automatizada não identificou problemas evidentes nesta imagem.\n`;
      report += `Recomenda-se avaliação clínica complementar se necessário.\n\n`;
    }

    report += `\n---\n`;
    report += `Relatório gerado automaticamente pelo sistema de análise dental com IA\n`;
    report += `Este relatório deve ser interpretado por um profissional qualificado\n`;

    return report;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Carregando detalhes do exame...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card>
          <CardContent className="text-center py-8">
            <p>Exame não encontrado</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Detalhes do Exame</h1>
            <p className="text-muted-foreground">Análise completa da imagem dental</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={openImageViewer}>
            <Eye className="h-4 w-4 mr-2" />
            Ver Imagem
          </Button>
          <Button variant="outline" onClick={downloadReport}>
            <Download className="h-4 w-4 mr-2" />
            Baixar Relatório
          </Button>
        </div>
      </div>

      {/* Exam Result Component */}
      <ExamResult result={exam} />

      {/* Image Viewer Modal */}
      {showImageViewer && imageUrl && (
        <DentalImageViewer
          imageId={exam.id}
          originalImageUrl={imageUrl}
          overlayImageUrl={overlayUrl}
          findings={exam.findings || []}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </div>
  );
}