import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft,
  Settings as SettingsIcon,
  User as UserIcon,
  Palette,
  Zap,
  Key,
  Bell,
  Shield,
  Trash2,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Cloud,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { vertexGenerate } from "@/lib/vertexClient";
import { TeamManagement } from "@/components/TeamManagement";

interface TenantSettings {
  ai_preferences: {
    confidence_threshold: number;
    auto_generate_reports: boolean;
    preferred_analysis_type: string;
    enable_overlay_generation: boolean;
  };
  report_settings: {
    default_template: string;
    include_patient_photos: boolean;
    show_confidence_scores: boolean;
    auto_sign_reports: boolean;
  };
  notification_settings: {
    email_on_completion: boolean;
    slack_integration: boolean;
    webhook_url: string | null;
  };
  branding_settings: {
    clinic_name: string;
    logo_url: string;
    primary_color: string;
    secondary_color: string;
  };
}

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: any;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<TenantSettings | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNewApiKey, setShowNewApiKey] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [googleCredentials, setGoogleCredentials] = useState("");
  const [googleProjectId, setGoogleProjectId] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected' | 'testing'>('unknown');
  const [connectionDetails, setConnectionDetails] = useState<any>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const [vertexTesting, setVertexTesting] = useState(false);
  const [vertexResponse, setVertexResponse] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getSession = async () => {
      try {
        console.log("Settings: Verificando sessão...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("Settings: Sem sessão, redirecionando para auth");
          // Adiciona um pequeño delay para permitir que o usuário veja a página antes do redirect
          setTimeout(() => {
            navigate("/auth");
          }, 100);
          return;
        }

        console.log("Settings: Sessão encontrada, carregando dados...");
        setSession(session);
        setUser(session.user);
        await loadSettings();
        await loadApiKeys();
        setLoading(false);
        console.log("Settings: Carregamento completo");
      } catch (error) {
        console.error("Settings: Erro durante inicialização:", error);
        setLoading(false);
      }
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

  const loadSettings = async () => {
    try {
      console.log("Settings: Carregando configurações...");
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) {
        console.log("Settings: userId não encontrado");
        return;
      }

      console.log("Settings: Buscando perfil do usuário...");
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error("Settings: Erro ao buscar perfil:", profileError);
        throw profileError;
      }

      const tenantId = profile?.tenant_id as string | null;
      if (!tenantId) {
        console.log("Settings: Tenant não encontrado no perfil");
        toast.error("Tenant não encontrado");
        return;
      }

      console.log("Settings: Tenant encontrado:", tenantId);

      const { data, error } = await supabase
        .from('tenant_settings')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        const mapped: TenantSettings = {
          ai_preferences: typeof (data as any).ai_preferences === 'string'
            ? JSON.parse((data as any).ai_preferences as any)
            : ((data as any).ai_preferences ?? {
                confidence_threshold: 0.8,
                auto_generate_reports: true,
                preferred_analysis_type: "comprehensive",
                enable_overlay_generation: true
              }),
          report_settings: typeof (data as any).report_settings === 'string'
            ? JSON.parse((data as any).report_settings as any)
            : ((data as any).report_settings ?? {
                default_template: "professional",
                include_patient_photos: true,
                show_confidence_scores: true,
                auto_sign_reports: false
              }),
          notification_settings: typeof (data as any).notification_settings === 'string'
            ? JSON.parse((data as any).notification_settings as any)
            : ((data as any).notification_settings ?? {
                email_on_completion: true,
                slack_integration: false,
                webhook_url: null
              }),
          branding_settings: typeof (data as any).branding_settings === 'string'
            ? JSON.parse((data as any).branding_settings as any)
            : ((data as any).branding_settings ?? {
                clinic_name: "",
                logo_url: "",
                primary_color: "#2563eb",
                secondary_color: "#64748b"
              }),
        };
        setSettings(mapped);
      } else {
        await createDefaultSettings(tenantId);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error("Erro ao carregar configurações");
    }
  };

  const createDefaultSettings = async (tenantId: string) => {
    const defaultSettings: TenantSettings = {
      ai_preferences: {
        confidence_threshold: 0.8,
        auto_generate_reports: true,
        preferred_analysis_type: "comprehensive",
        enable_overlay_generation: true
      },
      report_settings: {
        default_template: "professional",
        include_patient_photos: true,
        show_confidence_scores: true,
        auto_sign_reports: false
      },
      notification_settings: {
        email_on_completion: true,
        slack_integration: false,
        webhook_url: null
      },
      branding_settings: {
        clinic_name: "",
        logo_url: "",
        primary_color: "#2563eb",
        secondary_color: "#64748b"
      }
    };

    const { error } = await supabase
      .from('tenant_settings')
      .insert({
        tenant_id: tenantId,
        ai_preferences: defaultSettings.ai_preferences,
        report_settings: defaultSettings.report_settings,
        notification_settings: defaultSettings.notification_settings,
        branding_settings: defaultSettings.branding_settings,
      });

    if (error) throw error;
    setSettings(defaultSettings);
  };

  const loadApiKeys = async () => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const getCurrentUserTenantId = async () => {
    try {
      console.log("Settings: Obtendo tenant_id atual...");
      
      // First check if session is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        console.error("Settings: Erro de sessão:", sessionError);
        throw new Error('Sessão inválida. Faça login novamente.');
      }

      const userId = session.user.id;
      console.log("Settings: User ID obtido:", userId);

      // Get tenant_id from profile with retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', userId)
            .single();

          if (profileError) {
            console.error(`Settings: Erro ao buscar perfil (tentativa ${retryCount + 1}):`, profileError);
            if (retryCount === maxRetries - 1) {
              throw new Error(`Erro ao obter perfil do usuário: ${profileError.message}`);
            }
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Progressive delay
            continue;
          }

          if (!profile?.tenant_id) {
            console.log("Settings: tenant_id não encontrado no perfil, usando user_id como fallback");
            return userId; // Use user_id as fallback
          }

          console.log("Settings: tenant_id encontrado:", profile.tenant_id);
          return profile.tenant_id;
        } catch (error) {
          console.error(`Settings: Erro na tentativa ${retryCount + 1}:`, error);
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    } catch (error) {
      console.error("Settings: Erro ao obter tenant_id:", error);
      throw error;
    }
  };

  const saveSettings = async () => {
    if (!settings) {
      toast.error("Nenhuma configuração para salvar");
      return;
    }

    setSaving(true);
    console.log("Settings: Iniciando salvamento...");
    
    try {
      // Get tenant ID with improved error handling
      const tenantId = await getCurrentUserTenantId();
      console.log("Settings: Salvando para tenant:", tenantId);

      // Validate settings before saving
      if (!settings.ai_preferences || !settings.report_settings || 
          !settings.notification_settings || !settings.branding_settings) {
        throw new Error("Configurações incompletas. Recarregue a página e tente novamente.");
      }

      // Save with upsert and retry logic
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          const { error } = await supabase
            .from('tenant_settings')
            .upsert({
              tenant_id: tenantId,
              ai_preferences: settings.ai_preferences,
              report_settings: settings.report_settings,
              notification_settings: settings.notification_settings,
              branding_settings: settings.branding_settings,
            }, {
              onConflict: 'tenant_id'
            });

          if (error) {
            console.error(`Settings: Erro no salvamento (tentativa ${retryCount + 1}):`, error);
            if (retryCount === maxRetries - 1) {
              throw new Error(`Falha ao salvar configurações: ${error.message}`);
            }
            retryCount++;
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            continue;
          }

          console.log("Settings: Configurações salvas com sucesso!");
          toast.success("Configurações salvas com sucesso!");
          break;
        } catch (error) {
          console.error(`Settings: Erro na tentativa de salvamento ${retryCount + 1}:`, error);
          retryCount++;
          if (retryCount >= maxRetries) {
            throw error;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    } catch (error: any) {
      console.error('Settings: Erro final no salvamento:', error);
      
      // Provide specific error messages
      let errorMessage = "Erro ao salvar configurações";
      if (error.message?.includes('Sessão inválida')) {
        errorMessage = "Sessão expirada. Faça login novamente.";
        setTimeout(() => navigate("/auth"), 2000);
      } else if (error.message?.includes('Tenant não encontrado')) {
        errorMessage = "Erro de permissão. Contate o suporte.";
      } else if (error.message?.includes('configurações incompletas')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const generateApiKey = async () => {
    if (!newApiKeyName.trim()) {
      toast.error("Nome da API key é obrigatório");
      return;
    }

    try {
      // Generate a new API key
      const keyBytes = new Uint8Array(32);
      crypto.getRandomValues(keyBytes);
      const fullKey = `sk_${Array.from(keyBytes, byte => byte.toString(16).padStart(2, '0')).join('')}`;
      const keyPrefix = fullKey.substring(0, 12) + '...';
      
      // Hash the key for storage (in real implementation, use proper hashing)
      const keyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(fullKey));
      const keyHashHex = Array.from(new Uint8Array(keyHash), byte => 
        byte.toString(16).padStart(2, '0')
      ).join('');

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', userId)
        .maybeSingle();

      const tenantId = profile?.tenant_id as string | null;
      if (!tenantId) throw new Error('Tenant não encontrado');

      const { error } = await supabase
        .from('api_keys')
        .insert({
          name: newApiKeyName,
          key_hash: keyHashHex,
          key_prefix: keyPrefix,
          permissions: { read: true, write: true } as any,
          created_by: userId,
          tenant_id: tenantId,
        });

      if (error) throw error;

      setGeneratedApiKey(fullKey);
      setNewApiKeyName("");
      setShowNewApiKey(false);
      await loadApiKeys();
      
      toast.success("API key gerada com sucesso!");
    } catch (error) {
      console.error('Error generating API key:', error);
      toast.error("Erro ao gerar API key");
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      await loadApiKeys();
      toast.success("API key removida com sucesso!");
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error("Erro ao remover API key");
    }
  };

  const updateGoogleCredentials = async () => {
    if (!googleCredentials.trim()) {
      toast.error("Chave JSON é obrigatória");
      return;
    }

    setSavingCredentials(true);
    console.log("Settings: Validando credenciais Google Cloud...");
    
    try {
      // Primeiro, validar o JSON
      let parsedCredentials;
      try {
        parsedCredentials = JSON.parse(googleCredentials.trim());
      } catch (error) {
        throw new Error("JSON inválido. Verifique o formato da chave.");
      }

      console.log("Settings: JSON validado, verificando campos obrigatórios...");

      // Validar campos obrigatórios
      const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
      for (const field of requiredFields) {
        if (!parsedCredentials[field]) {
          throw new Error(`Campo obrigatório ausente: ${field}`);
        }
      }

      if (parsedCredentials.type !== 'service_account') {
        throw new Error('Tipo de credencial inválido. Esperado: service_account');
      }

      // Preenche o Project ID automaticamente para facilitar
      setGoogleProjectId(parsedCredentials.project_id || '');

      console.log("Settings: Validação completa, tentando salvar via edge function...");

      // Try to call the edge function to validate and potentially save
      let retryCount = 0;
      const maxRetries = 3;
      let lastError;

      while (retryCount < maxRetries) {
        try {
          const { data, error } = await supabase.functions.invoke('google-auth-test', {
            body: {
              action: 'update',
              googleCredentials: googleCredentials.trim()
            }
          });

          if (error) {
            console.error(`Settings: Erro na edge function (tentativa ${retryCount + 1}):`, error);
            lastError = error;
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
              continue;
            }
            throw error;
          }

          if (data?.success) {
            console.log("Settings: Credenciais validadas via edge function");
            toast.success("Credenciais validadas com sucesso! Use o link abaixo para configurar os segredos no Supabase.");
            setConnectionStatus('disconnected'); // Ainda precisa configurar segredos
          } else {
            throw new Error(data?.message || 'Falha na validação das credenciais');
          }
          break;
        } catch (error) {
          console.error(`Settings: Erro na tentativa ${retryCount + 1}:`, error);
          lastError = error;
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          }
        }
      }

      if (retryCount >= maxRetries) {
        // Fallback to local validation only
        console.log("Settings: Edge function falhou, usando validação local apenas");
        toast.success("JSON validado localmente. Use o link abaixo para configurar manualmente nos segredos do Supabase.");
        setConnectionStatus('disconnected');
      }
      
    } catch (error: any) {
      console.error('Settings: Erro ao validar credenciais:', error);
      
      let errorMessage = "Erro ao validar credenciais";
      if (error.message?.includes('JSON inválido')) {
        errorMessage = error.message;
      } else if (error.message?.includes('Campo obrigatório')) {
        errorMessage = error.message;
      } else if (error.message?.includes('Tipo de credencial')) {
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      setConnectionStatus('disconnected');
    } finally {
      setSavingCredentials(false);
    }
  };

  const testVertexAI = async () => {
    setVertexTesting(true);
    setVertexResponse(null);
    
    try {
      console.log("Settings: Testando Vertex AI...");
      const response = await vertexGenerate("Olá, este é um teste da integração Vertex AI!");
      setVertexResponse(response);
      toast.success("Teste do Vertex AI realizado com sucesso!");
    } catch (error) {
      console.error("Settings: Erro no teste Vertex AI:", error);
      toast.error(`Erro no teste: ${error.message}`);
    } finally {
      setVertexTesting(false);
    }
  };

  const testGoogleConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('testing');
    setConnectionDetails(null);
    console.log("Settings: Iniciando teste de conexão Google Cloud...");
    
    try {
      let requestBody: any = { action: 'test' };
      
      // Se há JSON no campo, use-o para o teste
      if (googleCredentials.trim()) {
        try {
          // Validar se é um JSON válido, mas enviar como string
          JSON.parse(googleCredentials.trim());
          requestBody.googleCredentials = googleCredentials.trim();
          console.log("Settings: Usando credenciais do campo para teste");
        } catch (jsonError) {
          toast.error("JSON inválido no campo. Corrija o formato ou limpe o campo para testar com segredos salvos.");
          setConnectionStatus('disconnected');
          setTestingConnection(false);
          return;
        }
      } else {
        console.log("Settings: Testando com credenciais dos segredos Supabase");
      }

      // Retry logic for edge function calls
      let retryCount = 0;
      const maxRetries = 3;
      let lastError;

      while (retryCount < maxRetries) {
        try {
          console.log(`Settings: Tentativa ${retryCount + 1} de chamada da edge function...`);
          
          const result = await Promise.race([
            supabase.functions.invoke('google-auth-test', {
              body: requestBody
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout na conexão')), 30000)
            )
          ]) as any;
          
          const { data, error } = result;

          if (error) {
            console.error(`Settings: Erro na edge function (tentativa ${retryCount + 1}):`, error);
            lastError = error;
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
              continue;
            }
            throw error;
          }

          console.log("Settings: Resposta da edge function:", data);

          if (data && data.success) {
            toast.success(data.message || "Conexão estabelecida com sucesso!");
            setConnectionStatus('connected');
            setConnectionDetails(data);
            
            // Atualizar o Project ID se disponível
            if (data.project_id && !googleProjectId) {
              setGoogleProjectId(data.project_id);
            }
          } else {
            const errorMsg = data?.message || 'Falha no teste de conexão';
            console.error("Settings: Teste falhou:", errorMsg);
            toast.error(errorMsg);
            setConnectionStatus('disconnected');
            setConnectionDetails(data);
          }
          break;
        } catch (error: any) {
          console.error(`Settings: Erro na tentativa ${retryCount + 1}:`, error);
          lastError = error;
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
          }
        }
      }

      if (retryCount >= maxRetries && lastError) {
        throw lastError;
      }
    } catch (error: any) {
      console.error('Settings: Erro final no teste de conexão:', error);
      
      let errorMessage = "Erro ao testar conexão";
      if (error.message?.includes('Timeout')) {
        errorMessage = "Timeout na conexão. Verifique sua internet e tente novamente.";
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = "Erro de rede. Verifique sua conexão.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      setConnectionStatus('disconnected');
    } finally {
      setTestingConnection(false);
    }
  };

  const clearGoogleCredentials = () => {
    setGoogleCredentials("");
    setConnectionStatus('unknown');
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copiada!");
  };

  const updateAIPreference = (key: keyof TenantSettings['ai_preferences'], value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      ai_preferences: {
        ...settings.ai_preferences,
        [key]: value
      }
    });
  };

  const updateReportSetting = (key: keyof TenantSettings['report_settings'], value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      report_settings: {
        ...settings.report_settings,
        [key]: value
      }
    });
  };

  const updateNotificationSetting = (key: keyof TenantSettings['notification_settings'], value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      notification_settings: {
        ...settings.notification_settings,
        [key]: value
      }
    });
  };

  const updateBrandingSetting = (key: keyof TenantSettings['branding_settings'], value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      branding_settings: {
        ...settings.branding_settings,
        [key]: value
      }
    });
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando configurações...</p>
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
              <SettingsIcon className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Configurações</h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie suas preferências e configurações da clínica
                </p>
              </div>
            </div>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="ai" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="ai">IA</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="branding">Visual</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
            <TabsTrigger value="team">
              <Users className="h-4 w-4 mr-2" />
              Equipe
            </TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
          </TabsList>

          {/* AI Preferences */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Preferências de Análise por IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Limite de Confiança ({settings.ai_preferences.confidence_threshold * 100}%)</Label>
                  <Slider
                    value={[settings.ai_preferences.confidence_threshold * 100]}
                    onValueChange={(value) => updateAIPreference('confidence_threshold', value[0] / 100)}
                    max={100}
                    min={50}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Achados abaixo deste limite serão marcados como incertos
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Gerar Relatórios Automaticamente</Label>
                      <p className="text-sm text-muted-foreground">
                        Cria relatórios PDF automaticamente após análise
                      </p>
                    </div>
                    <Switch
                      checked={settings.ai_preferences.auto_generate_reports}
                      onCheckedChange={(checked) => updateAIPreference('auto_generate_reports', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Gerar Overlays Visuais</Label>
                      <p className="text-sm text-muted-foreground">
                        Marca achados diretamente nas imagens
                      </p>
                    </div>
                    <Switch
                      checked={settings.ai_preferences.enable_overlay_generation}
                      onCheckedChange={(checked) => updateAIPreference('enable_overlay_generation', checked)}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Tipo de Análise Preferido</Label>
                  <Select
                    value={settings.ai_preferences.preferred_analysis_type}
                    onValueChange={(value) => updateAIPreference('preferred_analysis_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick">Rápida</SelectItem>
                      <SelectItem value="standard">Padrão</SelectItem>
                      <SelectItem value="comprehensive">Abrangente</SelectItem>
                      <SelectItem value="detailed">Detalhada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Settings */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Relatórios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Template Padrão</Label>
                  <Select
                    value={settings.report_settings.default_template}
                    onValueChange={(value) => updateReportSetting('default_template', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Básico</SelectItem>
                      <SelectItem value="professional">Profissional</SelectItem>
                      <SelectItem value="detailed">Detalhado</SelectItem>
                      <SelectItem value="summary">Resumido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Incluir Fotos do Paciente</Label>
                      <p className="text-sm text-muted-foreground">
                        Adiciona imagens originais nos relatórios
                      </p>
                    </div>
                    <Switch
                      checked={settings.report_settings.include_patient_photos}
                      onCheckedChange={(checked) => updateReportSetting('include_patient_photos', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Mostrar Scores de Confiança</Label>
                      <p className="text-sm text-muted-foreground">
                        Exibe percentuais de confiança da IA
                      </p>
                    </div>
                    <Switch
                      checked={settings.report_settings.show_confidence_scores}
                      onCheckedChange={(checked) => updateReportSetting('show_confidence_scores', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Assinar Relatórios Automaticamente</Label>
                      <p className="text-sm text-muted-foreground">
                        Adiciona assinatura digital automática
                      </p>
                    </div>
                    <Switch
                      checked={settings.report_settings.auto_sign_reports}
                      onCheckedChange={(checked) => updateReportSetting('auto_sign_reports', checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Configurações de Notificações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email ao Concluir Análise</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba email quando uma análise for concluída
                    </p>
                  </div>
                  <Switch
                    checked={settings.notification_settings.email_on_completion}
                    onCheckedChange={(checked) => updateNotificationSetting('email_on_completion', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Integração com Slack</Label>
                    <p className="text-sm text-muted-foreground">
                      Envie notificações para canal do Slack
                    </p>
                  </div>
                  <Switch
                    checked={settings.notification_settings.slack_integration}
                    onCheckedChange={(checked) => updateNotificationSetting('slack_integration', checked)}
                  />
                </div>

                {settings.notification_settings.slack_integration && (
                  <div className="space-y-2">
                    <Label>Webhook URL do Slack</Label>
                    <Input
                      value={settings.notification_settings.webhook_url || ''}
                      onChange={(e) => updateNotificationSetting('webhook_url', e.target.value)}
                      placeholder="https://hooks.slack.com/services/..."
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding */}
          <TabsContent value="branding" className="space-y-6">
            {/* White Label CTA Card */}
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  White Label Completo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Configure uma identidade visual completa para sua clínica com logo, cores personalizadas, domínio próprio, landing page customizada e muito mais.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">Novo</Badge>
                    <span>Domínio Custom • Landing Page • Email Branding • Relatórios Personalizados</span>
                  </div>
                  <Button 
                    onClick={() => navigate("/settings/white-label")}
                    className="w-full"
                  >
                    <Palette className="mr-2 h-4 w-4" />
                    Acessar Configuração White Label
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Identidade Visual (Básico)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Nome da Clínica</Label>
                  <Input
                    value={settings.branding_settings.clinic_name}
                    onChange={(e) => updateBrandingSetting('clinic_name', e.target.value)}
                    placeholder="Nome da sua clínica"
                  />
                </div>

                <div className="space-y-2">
                  <Label>URL do Logo</Label>
                  <Input
                    value={settings.branding_settings.logo_url}
                    onChange={(e) => updateBrandingSetting('logo_url', e.target.value)}
                    placeholder="https://exemplo.com/logo.png"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={settings.branding_settings.primary_color}
                        onChange={(e) => updateBrandingSetting('primary_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={settings.branding_settings.primary_color}
                        onChange={(e) => updateBrandingSetting('primary_color', e.target.value)}
                        placeholder="#2563eb"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Cor Secundária</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={settings.branding_settings.secondary_color}
                        onChange={(e) => updateBrandingSetting('secondary_color', e.target.value)}
                        className="w-16 h-10"
                      />
                      <Input
                        value={settings.branding_settings.secondary_color}
                        onChange={(e) => updateBrandingSetting('secondary_color', e.target.value)}
                        placeholder="#64748b"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Integração Google Cloud
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Connection Status */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {connectionStatus === 'connected' && (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <div>
                            <p className="font-medium text-green-700">Conectado</p>
                            <p className="text-sm text-muted-foreground">Google Cloud configurado com sucesso</p>
                          </div>
                        </>
                      )}
                      {connectionStatus === 'disconnected' && (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <div>
                            <p className="font-medium text-red-700">Desconectado</p>
                            <p className="text-sm text-muted-foreground">
                              {googleCredentials.trim() ? 
                                "Teste com JSON do campo ou salve as credenciais nos segredos" : 
                                "Configure as credenciais nos segredos do Supabase"
                              }
                            </p>
                          </div>
                        </>
                      )}
                      {connectionStatus === 'testing' && (
                        <>
                          <div className="h-5 w-5 animate-spin border-2 border-primary border-t-transparent rounded-full" />
                          <div>
                            <p className="font-medium">Testando conexão...</p>
                            <p className="text-sm text-muted-foreground">
                              {googleCredentials.trim() ? 
                                "Verificando JSON fornecido" : 
                                "Verificando credenciais dos segredos"
                              }
                            </p>
                          </div>
                        </>
                      )}
                      {connectionStatus === 'unknown' && (
                        <>
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          <div>
                            <p className="font-medium text-yellow-700">Status desconhecido</p>
                            <p className="text-sm text-muted-foreground">Teste a conexão para verificar</p>
                          </div>
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={testGoogleConnection}
                      disabled={testingConnection}
                    >
                      {testingConnection ? "Testando..." : "Testar Conexão"}
                    </Button>
                  </div>

                  {/* Connection Details */}
                  {connectionDetails && connectionStatus === 'connected' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-3">✅ Detalhes da Conexão</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {connectionDetails.project_id && (
                          <div>
                            <span className="font-medium text-green-800">Project ID:</span>
                            <span className="ml-2 text-green-700">{connectionDetails.project_id}</span>
                          </div>
                        )}
                        {connectionDetails.client_email && (
                          <div>
                            <span className="font-medium text-green-800">Client Email:</span>
                            <span className="ml-2 text-green-700 truncate block">{connectionDetails.client_email}</span>
                          </div>
                        )}
                        {connectionDetails.credentials_source && (
                          <div>
                            <span className="font-medium text-green-800">Origem:</span>
                            <span className="ml-2 text-green-700">
                              {connectionDetails.credentials_source === 'provided_json' ? 'JSON fornecido' : 'Segredos salvos'}
                            </span>
                          </div>
                        )}
                        {connectionDetails.tests && (
                          <div className="md:col-span-2">
                            <span className="font-medium text-green-800">APIs Testadas:</span>
                            <div className="ml-2 mt-1 space-y-1">
                              {connectionDetails.tests.project_api && (
                                <div className="text-green-700 text-xs">
                                  ✓ Cloud Resource Manager API: {connectionDetails.tests.project_api.status}
                                </div>
                              )}
                              {connectionDetails.tests.storage_api && (
                                <div className="text-green-700 text-xs">
                                  ✓ Cloud Storage API: {connectionDetails.tests.storage_api.status}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {connectionDetails.credentials_source === 'provided_json' && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                          <p className="text-amber-800">
                            💡 <strong>Dica:</strong> O teste funcionou com o JSON fornecido. Para persistir a configuração, 
                            salve as credenciais nos segredos do Supabase usando o link acima.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Details */}
                  {connectionDetails && connectionStatus === 'disconnected' && connectionDetails.error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-900 mb-2">❌ Erro na Conexão</h4>
                      <p className="text-sm text-red-800">{connectionDetails.error}</p>
                      {connectionDetails.message && (
                        <p className="text-sm text-red-700 mt-2">{connectionDetails.message}</p>
                      )}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Vertex AI Test */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Teste Vertex AI (Gemini)</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Teste a integração com o Google Cloud Vertex AI usando o modelo Gemini
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Zap className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">Teste Vertex AI</p>
                        <p className="text-sm text-muted-foreground">Verificar conexão com modelo Gemini</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={testVertexAI}
                      disabled={vertexTesting}
                    >
                      {vertexTesting ? "Testando..." : "Testar Vertex AI"}
                    </Button>
                  </div>

                  {/* Vertex Response */}
                  {vertexResponse && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-medium text-green-900 mb-2">✅ Resposta do Vertex AI</h4>
                      {vertexResponse.candidates?.[0]?.content?.parts?.[0]?.text && (
                        <div className="text-sm text-green-800 bg-white p-3 rounded border">
                          <p className="font-medium mb-1">Resposta do Gemini:</p>
                          <p>{vertexResponse.candidates[0].content.parts[0].text}</p>
                        </div>
                      )}
                      <details className="mt-3">
                        <summary className="text-sm font-medium text-green-700 cursor-pointer">Ver resposta completa</summary>
                        <pre className="text-xs bg-white p-3 rounded border mt-2 overflow-auto max-h-60">
                          {JSON.stringify(vertexResponse, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Credentials Management */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Chave de Serviço Google Cloud</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cole aqui o conteúdo completo do arquivo JSON da sua Service Account do Google Cloud
                    </p>
                  </div>

                  <div className="space-y-3">
                    <Textarea
                      value={googleCredentials}
                      onChange={(e) => setGoogleCredentials(e.target.value)}
                      placeholder={`{
  "type": "service_account",
  "project_id": "seu-projeto",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "...@seu-projeto.iam.gserviceaccount.com",
  ...
}`}
                      className="min-h-[200px] font-mono text-sm"
                    />

                    <div className="flex gap-3">
                      <Button
                        onClick={updateGoogleCredentials}
                        disabled={savingCredentials || !googleCredentials.trim()}
                      >
                        {savingCredentials ? "Validando..." : "Validar JSON"}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={clearGoogleCredentials}
                        disabled={!googleCredentials}
                      >
                        Limpar
                      </Button>
                    </div>

                    {/* Project ID Field */}
                    <div className="space-y-2">
                      <Label>Project ID do Google Cloud</Label>
                      <Input
                        value={googleProjectId}
                        onChange={(e) => setGoogleProjectId(e.target.value)}
                        placeholder="ex: meu-projeto-123"
                      />
                      <p className="text-xs text-muted-foreground">Opcional: será preenchido automaticamente ao validar o JSON.</p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => googleProjectId && copyApiKey(googleProjectId)}
                          disabled={!googleProjectId}
                        >
                          Copiar Project ID
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => googleCredentials.trim() && copyApiKey(googleCredentials.trim())}
                          disabled={!googleCredentials.trim()}
                        >
                          Copiar JSON
                        </Button>
                      </div>
                    </div>

                    {/* Instruções para salvar segredos */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <h4 className="font-medium text-amber-900 mb-3">⚠️ Como salvar os Segredos no Supabase</h4>
                      <p className="text-sm text-amber-800 mb-2">
                        Por segurança, os segredos devem ser salvos diretamente no Supabase. Após validar o JSON:
                      </p>
                      <ul className="text-sm text-amber-800 list-disc list-inside mb-3">
                        <li>Abra a página de Segredos das Funções</li>
                        <li>Crie/Atualize <code>GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY</code> com o JSON completo</li>
                        <li>Crie/Atualize <code>GOOGLE_CLOUD_PROJECT_ID</code> com o seu Project ID</li>
                      </ul>
                      <a
                        href="https://supabase.com/dashboard/project/blwnzwkkykaobmclsvxg/settings/functions"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-amber-900"
                      >
                        Abrir página de Segredos do Supabase
                      </a>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">📋 Como obter a chave do Google Cloud:</h4>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>Acesse o <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                      <li>Navegue para "IAM & Admin" → "Service Accounts"</li>
                      <li>Crie ou selecione uma Service Account</li>
                      <li>Clique em "Keys" → "Add Key" → "Create New Key"</li>
                      <li>Escolha formato JSON e baixe o arquivo</li>
                      <li>Copie todo o conteúdo do arquivo e cole no campo acima</li>
                    </ol>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="font-medium text-amber-900 mb-2">⚠️ Importante:</h4>
                    <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                      <li>Esta chave será armazenada de forma segura no Supabase</li>
                      <li>Não compartilhe esta chave com terceiros</li>
                      <li>A Service Account deve ter permissões para acessar Vertex AI</li>
                      <li>O campo será limpo automaticamente após salvar por segurança</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Team Management */}
          <TabsContent value="team" className="space-y-6">
            <TeamManagement />
          </TabsContent>

          {/* API Keys */}
          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Chaves de API
                  </CardTitle>
                  <Button onClick={() => setShowNewApiKey(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova API Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma API key cadastrada</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {apiKeys.map((key) => (
                      <div key={key.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{key.name}</h4>
                            <p className="text-sm text-muted-foreground">{key.key_prefix}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant={key.is_active ? "default" : "secondary"}>
                                {key.is_active ? "Ativa" : "Inativa"}
                              </Badge>
                              {key.last_used_at && (
                                <span className="text-xs text-muted-foreground">
                                  Último uso: {new Date(key.last_used_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteApiKey(key.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* New API Key Form */}
                {showNewApiKey && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-medium mb-4">Criar Nova API Key</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nome da API Key</Label>
                        <Input
                          value={newApiKeyName}
                          onChange={(e) => setNewApiKeyName(e.target.value)}
                          placeholder="Ex: Integração Sistema X"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={generateApiKey}>
                          Gerar API Key
                        </Button>
                        <Button variant="outline" onClick={() => setShowNewApiKey(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Generated API Key Display */}
                {generatedApiKey && (
                  <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                    <h4 className="font-medium mb-2 text-green-800">API Key Gerada com Sucesso!</h4>
                    <p className="text-sm text-green-700 mb-4">
                      ⚠️ Copie esta chave agora. Ela não será exibida novamente por motivos de segurança.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={generatedApiKey}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={() => copyApiKey(generatedApiKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setGeneratedApiKey(null)}
                    >
                      Fechar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;