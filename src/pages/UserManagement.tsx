import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft,
  Users as UsersIcon,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Search,
  Eye,
  Clock,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'dentist' | 'assistant' | 'viewer';
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface AuditEntry {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  user_id: string;
  ip_address: string;
  created_at: string;
  details: any;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const UserManagement = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRole[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'dentist' | 'assistant' | 'viewer'>('viewer');
  const [inviting, setInviting] = useState(false);
  const navigate = useNavigate();

  const roleLabels = {
    admin: 'Administrador',
    dentist: 'Dentista',
    assistant: 'Assistente',
    viewer: 'Visualizador'
  };

  const roleColors = {
    admin: 'destructive',
    dentist: 'default',
    assistant: 'secondary',
    viewer: 'outline'
  } as const;

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setSession(session);
      setUser(session.user);
      await loadUsers();
      await loadAuditLogs();
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

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`*`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as any) || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error("Erro ao carregar usuários");
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`*`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditLogs((((data as any) || []) as any[]).map((log: any) => ({
        ...log,
        ip_address: String(log.ip_address ?? ''),
      })));
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === "" || 
      user.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    
    return matchesSearch && matchesRole;
  });

  const updateUserRole = async (userId: string, newRole: UserRole['role']) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
      
      await loadUsers();
      toast.success("Permissão atualizada com sucesso!");
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error("Erro ao atualizar permissão");
    }
  };

  const removeUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      
      await loadUsers();
      toast.success("Usuário removido com sucesso!");
    } catch (error) {
      console.error('Error removing user:', error);
      toast.error("Erro ao remover usuário");
    }
  };

  const inviteUser = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    setInviting(true);
    try {
      // In a real implementation, you would:
      // 1. Send an invitation email
      // 2. Create a pending invitation record
      // 3. Handle the invitation acceptance flow
      
      // For now, we'll just simulate the invitation
      toast.success(`Convite enviado para ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole('viewer');
      setShowInviteDialog(false);
    } catch (error) {
      console.error('Error inviting user:', error);
      toast.error("Erro ao enviar convite");
    } finally {
      setInviting(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'UPDATE': return <Edit className="h-4 w-4 text-blue-500" />;
      case 'DELETE': return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'VIEW': return <Eye className="h-4 w-4 text-gray-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getResourceLabel = (type: string) => {
    switch (type) {
      case 'exam': return 'Exame';
      case 'patient': return 'Paciente';
      case 'report': return 'Relatório';
      case 'user': return 'Usuário';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando usuários...</p>
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
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Gestão de Usuários</h1>
                <p className="text-sm text-muted-foreground">
                  Controle de acesso e auditoria da clínica
                </p>
              </div>
            </div>
          </div>
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Convidar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="usuario@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Permissão</Label>
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
                <div className="flex gap-2">
                  <Button onClick={inviteUser} disabled={inviting} className="flex-1">
                    {inviting ? "Enviando..." : "Enviar Convite"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Usuários da Clínica</CardTitle>
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as permissões</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="dentist">Dentista</SelectItem>
                      <SelectItem value="assistant">Assistente</SelectItem>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Permissão</TableHead>
                      <TableHead>Adicionado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((userRole) => (
                      <TableRow key={userRole.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {userRole.profiles?.full_name || 'Nome não disponível'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {userRole.profiles?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleColors[userRole.role]}>
                            {roleLabels[userRole.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(userRole.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Select
                              value={userRole.role}
                              onValueChange={(value) => updateUserRole(userRole.user_id, value as UserRole['role'])}
                              disabled={userRole.role === 'admin' && userRole.user_id === user?.id}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="dentist">Dentista</SelectItem>
                                <SelectItem value="assistant">Assistente</SelectItem>
                                <SelectItem value="viewer">Visualizador</SelectItem>
                              </SelectContent>
                            </Select>
                            {userRole.user_id !== user?.id && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeUser(userRole.user_id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Audit Logs Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Log de Auditoria
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhuma atividade registrada</p>
                    </div>
                  ) : (
                    auditLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          {getActionIcon(log.action)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {log.profiles?.full_name || 'Usuário desconhecido'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {log.action}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {log.action} {getResourceLabel(log.resource_type).toLowerCase()}
                            </p>
                            <div className="text-xs text-muted-foreground mt-1">
                              {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Permissions Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Guia de Permissões</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="w-20 justify-center text-xs">Admin</Badge>
                    <span className="text-muted-foreground">Acesso total</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="w-20 justify-center text-xs">Dentista</Badge>
                    <span className="text-muted-foreground">Criar/editar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="w-20 justify-center text-xs">Assistente</Badge>
                    <span className="text-muted-foreground">Upload/visualizar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="w-20 justify-center text-xs">Visualizador</Badge>
                    <span className="text-muted-foreground">Somente leitura</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;