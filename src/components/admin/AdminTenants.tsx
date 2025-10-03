import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Edit, AlertCircle, CheckCircle, Clock } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  plan?: {
    plan_type: string;
    monthly_exam_limit: number;
    current_month_usage: number;
    is_active: boolean;
    is_trial: boolean;
    trial_ends_at?: string;
  };
}

export function AdminTenants({ onUpdate }: { onUpdate: () => void }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({
    plan_type: "basic",
    monthly_exam_limit: 50,
    is_active: true,
  });

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_plans (
            plan_type,
            monthly_exam_limit,
            current_month_usage,
            is_active,
            is_trial,
            trial_ends_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTenants(data.map(t => ({
        ...t,
        plan: t.tenant_plans?.[0]
      })) as Tenant[]);
    } catch (error) {
      console.error("Error loading tenants:", error);
      toast.error("Erro ao carregar clínicas");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditForm({
      plan_type: tenant.plan?.plan_type || "basic",
      monthly_exam_limit: tenant.plan?.monthly_exam_limit || 50,
      is_active: tenant.plan?.is_active !== false,
    });
  };

  const handleSave = async () => {
    if (!editingTenant) return;

    try {
      const { error } = await supabase
        .from('tenant_plans')
        .update({
          plan_type: editForm.plan_type as 'basic' | 'professional' | 'enterprise',
          monthly_exam_limit: editForm.monthly_exam_limit,
          is_active: editForm.is_active,
        })
        .eq('tenant_id', editingTenant.id);

      if (error) throw error;

      toast.success("Plano atualizado com sucesso");
      setEditingTenant(null);
      loadTenants();
      onUpdate();
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Erro ao atualizar plano");
    }
  };

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Carregando clínicas...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestão de Clínicas</CardTitle>
        <CardDescription>Gerenciar planos e limites de todas as clínicas</CardDescription>
        <div className="mt-4">
          <Input
            placeholder="Buscar por nome ou slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Clínica</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Uso / Limite</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTenants.map((tenant) => (
              <TableRow key={tenant.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{tenant.name}</div>
                    <div className="text-sm text-muted-foreground">{tenant.slug}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {tenant.plan?.plan_type || "Nenhum"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {tenant.plan?.current_month_usage || 0} / {tenant.plan?.monthly_exam_limit || 0}
                  </div>
                </TableCell>
                <TableCell>
                  {tenant.plan?.is_trial ? (
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      Trial
                    </Badge>
                  ) : tenant.plan?.is_active ? (
                    <Badge variant="default">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ativo
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Inativo
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(tenant)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar Plano - {editingTenant?.name}</DialogTitle>
                        <DialogDescription>
                          Ajustar configurações do plano da clínica
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Tipo de Plano</Label>
                          <Select
                            value={editForm.plan_type}
                            onValueChange={(value) => setEditForm({ ...editForm, plan_type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="professional">Professional</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Limite Mensal de Exames</Label>
                          <Input
                            type="number"
                            value={editForm.monthly_exam_limit}
                            onChange={(e) => setEditForm({ ...editForm, monthly_exam_limit: parseInt(e.target.value) })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select
                            value={editForm.is_active ? "active" : "inactive"}
                            onValueChange={(value) => setEditForm({ ...editForm, is_active: value === "active" })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Ativo</SelectItem>
                              <SelectItem value="inactive">Inativo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button onClick={handleSave} className="w-full">
                          Salvar Alterações
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
