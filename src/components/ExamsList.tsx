import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { 
  FileImage, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Calendar,
  User,
  Edit,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Exam {
  id: string;
  patient_id: string;
  exam_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_images?: number;
  processed_images?: number;
  ai_analysis?: any;
  created_at: string;
  updated_at: string;
}

interface ExamsListProps {
  refreshTrigger?: string;
  onExamSelect?: (exam: Exam) => void;
  onExamEdit?: (exam: Exam) => void;
  onExamDelete?: (examId: string) => void;
}

export function ExamsList({ refreshTrigger, onExamSelect, onExamEdit, onExamDelete }: ExamsListProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExams = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setExams(data || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Erro ao carregar exames');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();

    // Configurar realtime subscription para detectar mudanças nos exames
    const channel = supabase
      .channel('exams-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'exams'
        },
        (payload) => {
          console.log('Exam updated:', payload);
          const updatedExam = payload.new as Exam;
          
          setExams(current => 
            current.map(exam => 
              exam.id === updatedExam.id 
                ? { ...exam, ...updatedExam }
                : exam
            )
          );

          // Mostrar notificação quando o exame for concluído
          if (updatedExam.status === 'completed') {
            toast.success(`Exame concluído: ${updatedExam.exam_type}`);
          } else if (updatedExam.status === 'failed') {
            toast.error(`Falha no processamento do exame: ${updatedExam.exam_type}`);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'exams'
        },
        (payload) => {
          console.log('New exam inserted:', payload);
          fetchExams(); // Recarregar lista completa para novos exames
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshTrigger]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'processing':
        return 'default';
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'processing':
        return 'Processando';
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Falhou';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Carregando Exames...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-12 w-12 rounded" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (exams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileImage className="h-5 w-5" />
            Exames Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum exame encontrado</h3>
            <p className="text-muted-foreground">
              Faça o upload de imagens dentais para começar
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-5 w-5" />
          Exames Recentes ({exams.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-start space-x-4 flex-1">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileImage className="h-6 w-6 text-primary" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      variant={getStatusColor(exam.status)}
                      className="flex items-center gap-1"
                    >
                      {getStatusIcon(exam.status)}
                      {getStatusText(exam.status)}
                    </Badge>
                    <Badge variant="outline">{exam.exam_type}</Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-3 w-3" />
                      <span className="font-medium">Paciente: {exam.patient_id}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(exam.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{exam.total_images} imagem{exam.total_images !== 1 ? 's' : ''}</span>
                      {exam.status === 'processing' && (
                        <span>{exam.processed_images}/{exam.total_images} processadas</span>
                      )}
                      {exam.ai_analysis?.avg_quality && (
                        <span>
                          Qualidade: {exam.ai_analysis.avg_quality.toFixed(1)}/10
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 ml-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onExamSelect?.(exam)}
                    className="flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    Ver Detalhes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onExamEdit?.(exam)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onExamDelete?.(exam.id)}
                    className="flex items-center gap-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}