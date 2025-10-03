import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, Users, TrendingUp, AlertCircle, Activity } from "lucide-react";
import { AdminTenants } from "@/components/admin/AdminTenants";
import { AdminPlans } from "@/components/admin/AdminPlans";
import { AdminSupport } from "@/components/admin/AdminSupport";
import { AdminMetrics } from "@/components/admin/AdminMetrics";
import { GoogleConnectionTest } from "@/components/GoogleConnectionTest";
import { TestDentalAnalysis } from "@/components/TestDentalAnalysis";

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [metrics, setMetrics] = useState({
    totalTenants: 0,
    activeTenants: 0,
    trialTenants: 0,
    totalExams: 0,
    activeUsers: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Acesso negado");
        navigate("/");
        return;
      }

      // Verificar se o usuário é system admin usando is_system_admin()
      const { data: adminCheck, error } = await supabase
        .rpc('is_system_admin');

      if (error || !adminCheck) {
        toast.error("Acesso negado. Esta área é restrita ao administrador do sistema.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadMetrics();
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast.error("Erro ao verificar permissões");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      // Get total tenants
      const { count: totalTenants } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true });

      // Get active tenants (with active plans)
      const { count: activeTenants } = await supabase
        .from('tenant_plans')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('is_trial', false);

      // Get trial tenants
      const { count: trialTenants } = await supabase
        .from('tenant_plans')
        .select('*', { count: 'exact', head: true })
        .eq('is_trial', true);

      // Get total exams
      const { count: totalExams } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true });

      // Get active users (users with profiles)
      const { count: activeUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setMetrics({
        totalTenants: totalTenants || 0,
        activeTenants: activeTenants || 0,
        trialTenants: trialTenants || 0,
        totalExams: totalExams || 0,
        activeUsers: activeUsers || 0,
      });
    } catch (error) {
      console.error("Error loading metrics:", error);
      toast.error("Erro ao carregar métricas");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gestão completa do SaaS</p>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Clínicas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalTenants}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clínicas Ativas</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeTenants}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Trial</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.trialTenants}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Exames</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalExams}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="metrics" className="space-y-4">
          <TabsList>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
            <TabsTrigger value="tenants">Clínicas</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="support">Suporte</TabsTrigger>
            <TabsTrigger value="tests">Testes IA</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics">
            <AdminMetrics />
          </TabsContent>

          <TabsContent value="tenants">
            <AdminTenants onUpdate={loadMetrics} />
          </TabsContent>

          <TabsContent value="plans">
            <AdminPlans />
          </TabsContent>

          <TabsContent value="support">
            <AdminSupport />
          </TabsContent>

          <TabsContent value="tests">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GoogleConnectionTest />
              <TestDentalAnalysis />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
