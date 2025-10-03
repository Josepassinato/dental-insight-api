import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { toast } from "sonner";

export function AdminMetrics() {
  const [loading, setLoading] = useState(true);
  const [examsPerDay, setExamsPerDay] = useState<any[]>([]);
  const [tenantUsage, setTenantUsage] = useState<any[]>([]);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      // Get exams per day (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: examsData } = await supabase
        .from('exams')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Group by day
      const examsByDay = examsData?.reduce((acc: any, exam) => {
        const date = new Date(exam.created_at).toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit' 
        });
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const examsChartData = Object.entries(examsByDay || {}).map(([date, count]) => ({
        date,
        exames: count,
      }));

      setExamsPerDay(examsChartData);

      // Get tenant usage (top 10 by exam count)
      const { data: tenantData } = await supabase
        .from('tenant_plans')
        .select('tenant_id, current_month_usage, tenants(name)')
        .order('current_month_usage', { ascending: false })
        .limit(10);

      const tenantChartData = tenantData?.map(t => ({
        name: (t.tenants as any)?.name || 'Sem nome',
        exames: t.current_month_usage,
      })) || [];

      setTenantUsage(tenantChartData);

    } catch (error) {
      console.error("Error loading chart data:", error);
      toast.error("Erro ao carregar dados dos gráficos");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando métricas...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Exames por Dia (Últimos 7 dias)</CardTitle>
          <CardDescription>Volume de exames processados diariamente</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={examsPerDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="exames" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 10 Clínicas por Uso</CardTitle>
          <CardDescription>Clínicas com maior uso de exames este mês</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={tenantUsage} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="exames" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
