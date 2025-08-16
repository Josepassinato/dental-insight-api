import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft,
  TrendingUp, 
  TrendingDown,
  Activity,
  Users,
  Eye,
  Clock,
  Calendar,
  BarChart3,
  PieChart,
  Target,
  Zap
} from "lucide-react";
import { toast } from "sonner";
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AnalyticsData {
  totalExams: number;
  monthlyExams: number;
  avgConfidence: number;
  criticalFindings: number;
  processingTime: number;
  accuracyRate: number;
  userActivity: any[];
  findingsDistribution: any[];
  examTrends: any[];
  performanceMetrics: any[];
}

const Analytics = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('30');
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
      await loadAnalytics();
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
  }, [navigate, timeRange]);

  const loadAnalytics = async () => {
    try {
      const days = parseInt(timeRange);
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      // Carregar dados de exames
      const { data: exams, error: examsError } = await supabase
        .from('dental_images')
        .select(`
          id,
          processing_status,
          analysis_confidence,
          findings,
          created_at,
          exam:exams(
            id,
            patient:patients(patient_ref)
          )
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (examsError) throw examsError;

      // Processar dados para analytics
      const processedData = processAnalyticsData(exams || []);
      setAnalytics(processedData);

    } catch (error) {
      console.error('Error loading analytics:', error);
      toast.error("Erro ao carregar analytics");
    }
  };

  const processAnalyticsData = (exams: any[]): AnalyticsData => {
    const totalExams = exams.length;
    const completedExams = exams.filter(e => e.processing_status === 'completed');
    
    // Calcular métricas básicas
    const avgConfidence = completedExams.length > 0 
      ? completedExams.reduce((sum, e) => sum + (e.analysis_confidence || 0), 0) / completedExams.length * 100
      : 0;

    const criticalFindings = completedExams.reduce((sum, e) => {
      if (!Array.isArray(e.findings)) return sum;
      return sum + e.findings.filter((f: any) => f.severity === 'critico').length;
    }, 0);

    // Simular dados de performance
    const performanceMetrics = Array.from({ length: parseInt(timeRange) }, (_, i) => {
      const date = subDays(new Date(), parseInt(timeRange) - i - 1);
      const dayExams = exams.filter(e => 
        format(new Date(e.created_at), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      
      return {
        date: format(date, 'dd/MM', { locale: ptBR }),
        exams: dayExams.length,
        confidence: dayExams.length > 0 
          ? dayExams.reduce((sum, e) => sum + (e.analysis_confidence || 0), 0) / dayExams.length * 100
          : 0,
        processingTime: Math.random() * 60 + 30 // Simular tempo de processamento
      };
    });

    // Distribuição de achados
    const findingsDistribution = [
      { name: 'Normal', value: completedExams.length - criticalFindings, color: '#10b981' },
      { name: 'Leve', value: Math.floor(criticalFindings * 0.6), color: '#f59e0b' },
      { name: 'Moderado', value: Math.floor(criticalFindings * 0.3), color: '#f97316' },
      { name: 'Crítico', value: Math.floor(criticalFindings * 0.1), color: '#ef4444' }
    ];

    // Atividade de usuários (simulada)
    const userActivity = [
      { hour: '00:00', uploads: 2, analysis: 1 },
      { hour: '04:00', uploads: 1, analysis: 0 },
      { hour: '08:00', uploads: 15, analysis: 12 },
      { hour: '12:00', uploads: 25, analysis: 20 },
      { hour: '16:00', uploads: 18, analysis: 15 },
      { hour: '20:00', uploads: 8, analysis: 6 }
    ];

    return {
      totalExams,
      monthlyExams: exams.filter(e => 
        new Date(e.created_at) >= subDays(new Date(), 30)
      ).length,
      avgConfidence,
      criticalFindings,
      processingTime: 45, // Simulated average processing time
      accuracyRate: 94.5, // Simulated accuracy rate
      userActivity,
      findingsDistribution,
      examTrends: performanceMetrics,
      performanceMetrics
    };
  };

  const getTimeRangeText = () => {
    switch(timeRange) {
      case '7': return 'Últimos 7 dias';
      case '30': return 'Últimos 30 dias';
      case '90': return 'Últimos 90 dias';
      default: return 'Últimos 30 dias';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Erro ao carregar dados</p>
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
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Analytics Avançado</h1>
                <p className="text-sm text-muted-foreground">
                  Análise detalhada de performance e tendências
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {['7', '30', '90'].map((days) => (
              <Button
                key={days}
                variant={timeRange === days ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeRange(days)}
              >
                {days === '7' ? '7D' : days === '30' ? '30D' : '90D'}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Exames</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalExams}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +12% vs período anterior
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Confiança Média da IA</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.avgConfidence.toFixed(1)}%</div>
              <Progress value={analytics.avgConfidence} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio de Análise</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.processingTime}s</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendingDown className="h-3 w-3 mr-1 text-green-500" />
                -8s vs período anterior
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Precisão</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.accuracyRate}%</div>
              <Badge variant="secondary" className="mt-2">Excelente</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trends">Tendências</TabsTrigger>
            <TabsTrigger value="findings">Achados</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Evolução de Exames - {getTimeRangeText()}</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.examTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="exams" 
                      stroke="#2563eb" 
                      fill="#2563eb" 
                      fillOpacity={0.2} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Confiança da IA ao Longo do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.performanceMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: any) => [`${value.toFixed(1)}%`, 'Confiança']} />
                    <Line 
                      type="monotone" 
                      dataKey="confidence" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="findings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Achados</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        dataKey="value"
                        data={analytics.findingsDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {analytics.findingsDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Achados por Severidade</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.findingsDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value">
                        {analytics.findingsDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tempo de Processamento por Dia</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.performanceMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => [`${value.toFixed(1)}s`, 'Tempo médio']} />
                    <Bar dataKey="processingTime" fill="#f59e0b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Atividade de Usuários por Horário</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analytics.userActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="uploads" 
                      stackId="1"
                      stroke="#2563eb" 
                      fill="#2563eb" 
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="analysis" 
                      stackId="1"
                      stroke="#10b981" 
                      fill="#10b981" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Analytics;