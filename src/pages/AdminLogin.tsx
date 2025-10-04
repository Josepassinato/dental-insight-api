import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar se já está logado como admin
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Verificar se é system admin
      const { data: isSystemAdmin } = await supabase.rpc('is_system_admin');
      
      if (isSystemAdmin) {
        navigate("/admin");
      }
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Fazer login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("Credenciais inválidas");
        return;
      }

      if (!data.user) {
        toast.error("Erro ao fazer login");
        return;
      }

      // Verificar se o usuário é system_admin
      const { data: isSystemAdmin, error: roleError } = await supabase
        .rpc('is_system_admin');

      if (roleError || !isSystemAdmin) {
        // Fazer logout imediatamente se não for admin
        await supabase.auth.signOut();
        toast.error("Acesso negado. Esta área é restrita a administradores do sistema.");
        return;
      }

      toast.success("Login de administrador realizado com sucesso!");
      navigate("/admin");
    } catch (error) {
      console.error("Error during admin login:", error);
      toast.error("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-900/50 backdrop-blur">
        <CardHeader className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-red-500/10 border-2 border-red-500">
              <Shield className="h-10 w-10 text-red-500" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-white">
              Painel de Administração
            </CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              Acesso restrito apenas para administradores do sistema
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-slate-200">
                Email do Administrador
              </Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="admin@sistema.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-slate-200">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                  Verificando credenciais...
                </div>
              ) : (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Entrar como Administrador
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/auth")}
              className="text-slate-400 hover:text-slate-200"
            >
              Voltar para login de usuário
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
