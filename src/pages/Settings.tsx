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
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

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
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected' | 'testing'>('unknown');
  const [testingConnection, setTestingConnection] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getSession = async () => {
      try {
        console.log("Settings: Verificando sessão...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("Settings: Sem sessão, redirecionando para auth");
          navigate("/auth");
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

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
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
        .from('tenant_settings')
        .upsert({
          tenant_id: tenantId,
          ai_preferences: settings.ai_preferences,
          report_settings: settings.report_settings,
          notification_settings: settings.notification_settings,
          branding_settings: settings.branding_settings,
        });

      if (error) throw error;
      
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Erro ao salvar configurações");
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
    try {
      const { data, error } = await supabase.functions.invoke('update-google-credentials', {
        body: { 
          googleCredentials: googleCredentials.trim(),
          action: 'update'
        }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setConnectionStatus('connected');
        setGoogleCredentials(""); // Clear the textarea for security
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Error updating Google credentials:', error);
      toast.error(`Erro ao salvar credenciais: ${error.message}`);
      setConnectionStatus('disconnected');
    } finally {
      setSavingCredentials(false);
    }
  };

  const testGoogleConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('testing');
    
    try {
      const { data, error } = await supabase.functions.invoke('update-google-credentials', {
        body: { action: 'test' }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setConnectionStatus('connected');
      } else {
        toast.error(data.message || 'Falha no teste de conexão');
        setConnectionStatus('disconnected');
      }
    } catch (error) {
      console.error('Error testing Google connection:', error);
      toast.error("Erro ao testar conexão");
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="ai">IA</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="branding">Visual</TabsTrigger>
            <TabsTrigger value="integrations">Integrações</TabsTrigger>
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Identidade Visual
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
                          <p className="text-sm text-muted-foreground">Configuração necessária</p>
                        </div>
                      </>
                    )}
                    {connectionStatus === 'testing' && (
                      <>
                        <div className="h-5 w-5 animate-spin border-2 border-primary border-t-transparent rounded-full" />
                        <div>
                          <p className="font-medium">Testando conexão...</p>
                          <p className="text-sm text-muted-foreground">Verificando credenciais</p>
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
                        {savingCredentials ? "Salvando..." : "Salvar Credenciais"}
                      </Button>
                      
                      <Button
                        variant="outline"
                        onClick={clearGoogleCredentials}
                        disabled={!googleCredentials}
                      >
                        Limpar
                      </Button>
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