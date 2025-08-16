import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft,
  Download,
  Upload,
  Database,
  FileText,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Archive
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BackupJob {
  id: string;
  type: 'full' | 'patients' | 'exams' | 'reports';
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  completed_at: string | null;
  file_url: string | null;
  file_size: number | null;
}

interface ImportJob {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total_records: number;
  processed_records: number;
  errors: string[];
  created_at: string;
}

const BackupExport = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [backupJobs, setBackupJobs] = useState<BackupJob[]>([]);
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [exportType, setExportType] = useState<'full' | 'patients' | 'exams' | 'reports'>('full');
  const [dateRange, setDateRange] = useState('30');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setSession(session);
      setUser(session.user);
      await loadBackupJobs();
      await loadImportJobs();
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate("/auth");
      } else {
        setSession(session);
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadBackupJobs = async () => {
    try {
      // Simulated backup jobs - in real implementation would load from database
      const simulatedJobs: BackupJob[] = [
        {
          id: '1',
          type: 'full',
          status: 'completed',
          progress: 100,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
          file_url: '/exports/backup-full-2024-01-15.zip',
          file_size: 45678901
        },
        {
          id: '2',
          type: 'exams',
          status: 'running',
          progress: 65,
          created_at: new Date().toISOString(),
          completed_at: null,
          file_url: null,
          file_size: null
        }
      ];
      setBackupJobs(simulatedJobs);
    } catch (error) {
      console.error('Error loading backup jobs:', error);
    }
  };

  const loadImportJobs = async () => {
    try {
      // Simulated import jobs
      const simulatedJobs: ImportJob[] = [
        {
          id: '1',
          filename: 'pacientes-sistema-anterior.csv',
          status: 'completed',
          progress: 100,
          total_records: 1250,
          processed_records: 1250,
          errors: [],
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
      setImportJobs(simulatedJobs);
    } catch (error) {
      console.error('Error loading import jobs:', error);
    }
  };

  const startExport = async () => {
    setIsExporting(true);
    try {
      const newJob: BackupJob = {
        id: crypto.randomUUID(),
        type: exportType,
        status: 'pending',
        progress: 0,
        created_at: new Date().toISOString(),
        completed_at: null,
        file_url: null,
        file_size: null
      };

      setBackupJobs([newJob, ...backupJobs]);
      
      // Simulate export progress
      setTimeout(() => {
        setBackupJobs(prev => prev.map(job => 
          job.id === newJob.id ? { ...job, status: 'running' as const } : job
        ));
      }, 1000);

      toast.success("Export iniciado com sucesso!");
    } catch (error) {
      console.error('Error starting export:', error);
      toast.error("Erro ao iniciar export");
    } finally {
      setIsExporting(false);
    }
  };

  const downloadBackup = (job: BackupJob) => {
    if (job.file_url) {
      // In real implementation, would download from actual URL
      toast.success("Download iniciado!");
    }
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const newJob: ImportJob = {
        id: crypto.randomUUID(),
        filename: file.name,
        status: 'pending',
        progress: 0,
        total_records: 0,
        processed_records: 0,
        errors: [],
        created_at: new Date().toISOString()
      };

      setImportJobs([newJob, ...importJobs]);
      
      // Simulate import processing
      setTimeout(() => {
        setImportJobs(prev => prev.map(job => 
          job.id === newJob.id 
            ? { ...job, status: 'processing' as const, total_records: 1000 }
            : job
        ));
      }, 1000);

      toast.success("Import iniciado com sucesso!");
    } catch (error) {
      console.error('Error starting import:', error);
      toast.error("Erro ao iniciar import");
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'running':
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'failed': return 'Falhou';
      case 'running': return 'Executando';
      case 'processing': return 'Processando';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'full': return 'Backup Completo';
      case 'patients': return 'Pacientes';
      case 'exams': return 'Exames';
      case 'reports': return 'Relatórios';
      default: return type;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando backup e exportação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <Archive className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Backup e Exportação</h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie backups, exportações e importações de dados
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="export" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="export">Exportar Dados</TabsTrigger>
            <TabsTrigger value="import">Importar Dados</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          {/* Export */}
          <TabsContent value="export" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Exportar Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Tipo de Exportação</Label>
                      <Select value={exportType} onValueChange={(value: any) => setExportType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full">Backup Completo</SelectItem>
                          <SelectItem value="patients">Apenas Pacientes</SelectItem>
                          <SelectItem value="exams">Apenas Exames</SelectItem>
                          <SelectItem value="reports">Apenas Relatórios</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Período</Label>
                      <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">Últimos 7 dias</SelectItem>
                          <SelectItem value="30">Últimos 30 dias</SelectItem>
                          <SelectItem value="90">Últimos 90 dias</SelectItem>
                          <SelectItem value="365">Último ano</SelectItem>
                          <SelectItem value="all">Todos os dados</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={startExport} 
                      disabled={isExporting}
                      className="w-full"
                    >
                      {isExporting ? "Iniciando..." : "Iniciar Exportação"}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Informações do Export</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Formato:</span>
                        <span>ZIP com CSVs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Compressão:</span>
                        <span>Habilitada</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Criptografia:</span>
                        <span>AES-256</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Validade:</span>
                        <span>7 dias</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import */}
          <TabsContent value="import" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Importar Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8">
                  <div className="text-center space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <h3 className="font-medium">Selecione um arquivo para importar</h3>
                      <p className="text-sm text-muted-foreground">
                        Suporte a CSV, XLSX e formatos de backup do sistema
                      </p>
                    </div>
                    <div>
                      <Input
                        type="file"
                        accept=".csv,.xlsx,.zip"
                        onChange={handleFileImport}
                        disabled={isImporting}
                        className="max-w-xs mx-auto"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Pacientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Campos: nome, CPF, telefone, endereço, email
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Exames</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Campos: paciente_id, tipo, data, observações
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Histórico</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Campos: paciente_id, data, diagnóstico, tratamento
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History */}
          <TabsContent value="history" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Backup Jobs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Exportações Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {backupJobs.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma exportação realizada</p>
                      </div>
                    ) : (
                      backupJobs.map((job) => (
                        <div key={job.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(job.status)}
                              <span className="font-medium">{getTypeLabel(job.type)}</span>
                            </div>
                            <Badge variant="outline">
                              {getStatusLabel(job.status)}
                            </Badge>
                          </div>
                          
                          {job.status === 'running' && (
                            <div className="mb-2">
                              <Progress value={job.progress} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {job.progress}% concluído
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {format(new Date(job.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                            <div className="flex items-center gap-2">
                              {job.file_size && (
                                <span className="text-muted-foreground">
                                  {formatFileSize(job.file_size)}
                                </span>
                              )}
                              {job.status === 'completed' && job.file_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => downloadBackup(job)}
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Import Jobs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Importações Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {importJobs.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma importação realizada</p>
                      </div>
                    ) : (
                      importJobs.map((job) => (
                        <div key={job.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(job.status)}
                              <span className="font-medium">{job.filename}</span>
                            </div>
                            <Badge variant="outline">
                              {getStatusLabel(job.status)}
                            </Badge>
                          </div>
                          
                          {job.status === 'processing' && (
                            <div className="mb-2">
                              <Progress value={job.progress} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {job.processed_records} de {job.total_records} registros
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {format(new Date(job.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                            {job.status === 'completed' && (
                              <span className="text-green-600 font-medium">
                                {job.processed_records} registros importados
                              </span>
                            )}
                          </div>

                          {job.errors.length > 0 && (
                            <div className="mt-2 text-xs text-red-600">
                              {job.errors.length} erro(s) encontrado(s)
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BackupExport;