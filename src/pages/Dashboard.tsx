import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileImage, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  UserIcon,
  LogOut,
  Stethoscope,
  Plus,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { ExamUpload } from '@/components/ExamUpload';
import { ExamsList } from '@/components/ExamsList';
import { ExamViewer } from '@/components/ExamViewer';

interface Exam {
  id: string;
  exam_type: string;
  status: string;
  created_at: string;
  patient_id: string;
  findings: any;
  ai_analysis: any;
}

interface DashboardProps {
  user: User;
}

const Dashboard = ({ user }: DashboardProps) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
    loadExams();
  }, []);

  const loadProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error('Error loading profile:', error);
    }
  };

  const loadExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setExams(data || []);
    } catch (error: any) {
      console.error('Error loading exams:', error);
      toast({
        title: "Erro ao carregar exames",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      // Clean up any auth state
      localStorage.clear();
      window.location.href = '/auth';
    } catch (error: any) {
      console.error('Error signing out:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatExamType = (type: string) => {
    const types: Record<string, string> = {
      panoramic: 'Panorâmica',
      periapical: 'Periapical',
      bitewing: 'Bitewing',
      cephalometric: 'Cefalométrica',
      cbct: 'CBCT'
    };
    return types[type] || type;
  };

  const handleUploadSuccess = () => {
    setShowUpload(false);
    setRefreshTrigger(Date.now().toString());
    loadExams();
    toast({
      title: "Upload realizado com sucesso",
      description: "As imagens foram enviadas e estão sendo processadas",
    });
  };

  const handleExamSelect = (exam: Exam) => {
    setSelectedExam(exam);
  };

  const handleBackFromViewer = () => {
    setSelectedExam(null);
    setRefreshTrigger(Date.now().toString());
    loadExams();
  };

  if (selectedExam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-medical-light/10 to-accent/20">
        <div className="container mx-auto px-4 py-8">
          <ExamViewer exam={selectedExam} onBack={handleBackFromViewer} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-medical-light/10 to-accent/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-info rounded-xl flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Dental Analytics</h1>
                <p className="text-sm text-muted-foreground">
                  Bem-vindo, {profile?.full_name || user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="shadow-soft border-border/50 hover:shadow-medium transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Plus className="w-5 h-5 mr-2 text-primary" />
                  Novo Exame
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Faça upload de uma nova imagem dental para análise
                </p>
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-info hover:from-primary/90 hover:to-info/90"
                  onClick={() => setShowUpload(true)}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload de Imagem
                </Button>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2 text-primary" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total de exames:</span>
                    <span className="font-medium">{exams.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Concluídos:</span>
                    <span className="font-medium text-green-600">
                      {exams.filter(e => e.status === 'completed').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-soft border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <UserIcon className="w-5 h-5 mr-2 text-primary" />
                  Perfil
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium">{profile?.full_name || 'Usuário'}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <Badge variant="secondary" className="text-xs">
                    {profile?.role || 'dentist'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Exams */}
          <ExamsList 
            refreshTrigger={refreshTrigger}
            onExamSelect={handleExamSelect}
          />
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <ExamUpload 
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
};

export default Dashboard;