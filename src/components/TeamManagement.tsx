import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Trash2, Shield, Users } from "lucide-react";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  user_id: string;
  role: 'system_admin' | 'owner' | 'admin' | 'dentist' | 'assistant' | 'viewer';
  created_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    email: string;
  } | null;
}

export const TeamManagement = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'dentist' | 'assistant' | 'viewer'>('dentist');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    checkOwnerStatus();
    loadTeamMembers();
  }, []);

  const checkOwnerStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('is_tenant_owner');
      if (error) throw error;
      setIsOwner(data || false);
    } catch (error) {
      console.error('Erro ao verificar status de owner:', error);
    }
  };

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      
      // Get current user's session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Get user's tenant_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) {
        toast.error("Tenant não encontrado");
        return;
      }

      // Get all user_roles for this tenant
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar profiles separadamente
      const userIds = data?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Combinar os dados
      const membersWithProfiles = data?.map(member => ({
        ...member,
        profiles: profilesData?.find(p => p.id === member.user_id) || null
      }));

      setMembers(membersWithProfiles as any || []);
    } catch (error) {
      console.error('Erro ao carregar membros da equipe:', error);
      toast.error('Erro ao carregar membros da equipe');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    setInviting(true);
    try {
      // Nota: Implementação simplificada
      // Em produção, você deve criar um sistema de convites com links por email
      toast.info('Funcionalidade de convite em desenvolvimento. Por enquanto, peça ao usuário para criar uma conta primeiro.');
      setShowInviteDialog(false);
      setInviteEmail("");
    } catch (error) {
      console.error('Erro ao convidar usuário:', error);
      toast.error('Erro ao convidar usuário');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberRole: string) => {
    if (memberRole === 'owner') {
      toast.error('Não é possível remover o proprietário');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      toast.success('Membro removido com sucesso');
      loadTeamMembers();
    } catch (error) {
      console.error('Erro ao remover membro:', error);
      toast.error('Erro ao remover membro');
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'system_admin':
        return 'destructive';
      case 'owner':
        return 'default';
      case 'admin':
        return 'secondary';
      case 'dentist':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      system_admin: 'Admin Sistema',
      owner: 'Proprietário',
      admin: 'Administrador',
      dentist: 'Dentista',
      assistant: 'Assistente',
      viewer: 'Visualizador'
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipe
          </CardTitle>
          <CardDescription>Carregando membros da equipe...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Equipe
            </CardTitle>
            <CardDescription>
              Gerencie os membros da sua clínica e suas permissões
            </CardDescription>
          </div>
          {isOwner && (
            <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Convidar Membro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Convidar Novo Membro</DialogTitle>
                  <DialogDescription>
                    Convide um novo membro para sua equipe
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="usuario@exemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Função</Label>
                    <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dentist">Dentista</SelectItem>
                        <SelectItem value="assistant">Assistente</SelectItem>
                        <SelectItem value="viewer">Visualizador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleInviteUser} disabled={inviting}>
                    {inviting ? 'Enviando...' : 'Enviar Convite'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!isOwner && (
          <div className="mb-4 p-3 bg-muted rounded-lg flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            Apenas o proprietário pode gerenciar membros da equipe
          </div>
        )}
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Adicionado em</TableHead>
              {isOwner && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  {member.profiles?.full_name || 'Sem nome'}
                </TableCell>
                <TableCell>{member.profiles?.email}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(member.role)}>
                    {getRoleLabel(member.role)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Date(member.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
                {isOwner && (
                  <TableCell className="text-right">
                    {member.role !== 'owner' && member.role !== 'system_admin' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.id, member.role)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {members.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum membro na equipe ainda
          </div>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">Sobre as Funções</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li><strong>Admin Sistema:</strong> Acesso administrativo total ao SaaS</li>
            <li><strong>Proprietário:</strong> Acesso total à clínica, gerencia equipe e planos</li>
            <li><strong>Dentista:</strong> Pode criar e editar pacientes e exames</li>
            <li><strong>Assistente:</strong> Pode visualizar e adicionar dados básicos</li>
            <li><strong>Visualizador:</strong> Apenas visualização de dados</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
