import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  LogOut, 
  Upload, 
  Search, 
  Calendar as CalendarIcon, 
  Eye, 
  FileText, 
  AlertTriangle,
  Users,
  Activity,
  TrendingUp,
  Filter,
  Settings,
  Plus,
  Building2,
  BarChart3,
  Globe,
  Archive,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { DentalImageUpload } from "@/components/DentalImageUpload";
import { DentalImageViewer } from "@/components/DentalImageViewer";

interface TenantPlan {
  plan_type: 'basic' | 'professional' | 'enterprise';
  monthly_exam_limit: number;
  current_month_usage: number;
}

interface ExamData {
  id: string;
  file_path: string;
  overlay_file_path?: string;
  original_filename: string;
  processing_status: string;
  findings: any;
  analysis_confidence?: number;
  created_at: string;
  exam?: {
    patient?: {
      patient_ref: string;
    };
  };
}

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  created_at: string;
  user: {
    full_name: string;
  };
  details: any;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamData[]>([]);
  const [filteredExams, setFilteredExams] = useState<ExamData[]>([]);
  const [tenantPlan, setTenantPlan] = useState<TenantPlan | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamData | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");

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
      await loadDashboardData();
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

  const loadDashboardData = async () => {
    try {
      // Load exams
      const { data: examsData, error: examsError } = await supabase
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
            patient:patients(patient_ref)
          )
        `)
        .order('created_at', { ascending: false });

      if (examsError) throw examsError;
      
      const processedExams = (examsData || []).map(exam => ({
        ...exam,
        findings: Array.isArray(exam.findings) ? exam.findings : []
      }));
      
      setExams(processedExams);
      setFilteredExams(processedExams);

      // Load tenant plan
      const { data: planData, error: planError } = await supabase
        .from('tenant_plans')
        .select('plan_type, monthly_exam_limit, current_month_usage')
        .single();

      if (planError && planError.code !== 'PGRST116') {
        console.error('Error loading plan:', planError);
      } else {
        setTenantPlan(planData);
      }

      // Load audit logs (simplified)
      setAuditLogs([]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error("Erro ao carregar dados do dashboard");
    }
  };

  // Filter exams based on search criteria
  useEffect(() => {
    let filtered = [...exams];

    if (searchTerm) {
      filtered = filtered.filter(exam => 
        exam.original_filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.exam?.patient?.patient_ref?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(exam => exam.processing_status === statusFilter);
    }

    if (urgencyFilter !== "all") {
      // Filter by urgency based on findings
      filtered = filtered.filter(exam => {
        const hasUrgentFindings = Array.isArray(exam.findings) && 
          exam.findings.some((finding: any) => finding.severity === urgencyFilter);
        return hasUrgentFindings;
      });
    }

    if (dateRange?.from) {
      filtered = filtered.filter(exam => 
        new Date(exam.created_at) >= dateRange.from!
      );
    }

    if (dateRange?.to) {
      filtered = filtered.filter(exam => 
        new Date(exam.created_at) <= dateRange.to!
      );
    }

    setFilteredExams(filtered);
  }, [exams, searchTerm, statusFilter, urgencyFilter, dateRange]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critico': return 'bg-destructive text-destructive-foreground';
      case 'alto': return 'bg-warning text-warning-foreground';
      case 'moderado': return 'bg-info text-info-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground';
      case 'processing': return 'bg-info text-info-foreground';
      case 'pending': return 'bg-warning text-warning-foreground';
      case 'failed': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'processing': return 'Processando';
      case 'pending': return 'Pendente';
      case 'failed': return 'Falhou';
      default: return status;
    }
  };

  const canUploadMore = () => {
    if (!tenantPlan) return true; // Allow upload if no plan data
    return tenantPlan.current_month_usage < tenantPlan.monthly_exam_limit;
  };

  const usagePercentage = tenantPlan ? 
    (tenantPlan.current_month_usage / tenantPlan.monthly_exam_limit) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-primary">DentalAI</h1>
              <p className="text-sm text-muted-foreground">
                Bem-vindo, {user?.user_metadata?.full_name || user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/patients")}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Pacientes
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/analytics")}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/integrations")}
              className="flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              Integrações
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/backup")}
              className="flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              Backup
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/settings")}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Configurações
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/users")}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Usuários
            </Button>
            <Button
              onClick={() => setShowUpload(true)}
              disabled={!canUploadMore()}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Exame
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Exames</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{exams.length}</div>
              <p className="text-xs text-muted-foreground">
                {filteredExams.length} filtrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uso Mensal</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {tenantPlan?.current_month_usage || 0}/{tenantPlan?.monthly_exam_limit || 50}
              </div>
              <Progress value={usagePercentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plano Atual</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {tenantPlan?.plan_type || 'Basic'}
              </div>
              <p className="text-xs text-muted-foreground">
                {usagePercentage > 90 ? 'Próximo do limite' : 'Uso normal'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Achados Críticos</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {exams.filter(exam => 
                  Array.isArray(exam.findings) && 
                  exam.findings.some((f: any) => f.severity === 'critico')
                ).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Requerem atenção
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Nome do arquivo ou paciente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="processing">Processando</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="failed">Falhou</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Urgência</Label>
                <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="critico">Crítico</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                    <SelectItem value="moderado">Moderado</SelectItem>
                    <SelectItem value="leve">Leve</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Data</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          `${format(dateRange.from, "dd/MM/yy", { locale: ptBR })} - ${format(dateRange.to, "dd/MM/yy", { locale: ptBR })}`
                        ) : (
                          format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                        )
                      ) : (
                        "Selecionar data"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Exams Table */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Exames</CardTitle>
            <CardDescription>
              Lista de todos os exames processados ({filteredExams.length} exames)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Achados</TableHead>
                  <TableHead>Confiança</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExams.map((exam) => (
                  <TableRow key={exam.id}>
                    <TableCell className="font-medium">
                      {exam.original_filename}
                    </TableCell>
                    <TableCell>
                      {exam.exam?.patient?.patient_ref || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(exam.processing_status)}>
                        {getStatusText(exam.processing_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {Array.isArray(exam.findings) && exam.findings.length > 0 ? (
                          exam.findings.slice(0, 2).map((finding: any, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className={getSeverityColor(finding.severity)}
                            >
                              {finding.finding_type}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Nenhum achado</span>
                        )}
                        {Array.isArray(exam.findings) && exam.findings.length > 2 && (
                          <Badge variant="outline">+{exam.findings.length - 2}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {exam.analysis_confidence ? 
                        `${Math.round(exam.analysis_confidence * 100)}%` : 
                        'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      {format(new Date(exam.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedExam(exam)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Log de Auditoria</CardTitle>
            <CardDescription>
              Registro de atividades recentes no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{log.action}</p>
                    <p className="text-sm text-muted-foreground">
                      {log.user?.full_name} - {log.resource_type}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Enviar Novo Exame</h2>
            <DentalImageUpload onUploadComplete={() => {
              setShowUpload(false);
              loadDashboardData();
            }} />
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => setShowUpload(false)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Exam Viewer Modal */}
      {selectedExam && (
        <DentalImageViewer
          imageId={selectedExam.id}
          originalImageUrl={selectedExam.file_path}
          overlayImageUrl={selectedExam.overlay_file_path}
          findings={selectedExam.findings || []}
          onClose={() => setSelectedExam(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;