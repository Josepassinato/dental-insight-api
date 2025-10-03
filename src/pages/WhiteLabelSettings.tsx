import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Eye, Check, X, AlertCircle } from "lucide-react";
import { BrandingPreview } from "@/components/BrandingPreview";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTenantBranding } from "@/contexts/TenantBrandingContext";

interface BrandingSettings {
  clinic_name?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  custom_domain?: string;
  custom_domain_verified?: boolean;
  hero_title?: string;
  hero_subtitle?: string;
  hero_cta_text?: string;
  features_enabled?: boolean;
  pricing_enabled?: boolean;
  contact_email?: string;
  phone?: string;
  company_address?: string;
  email_header_color?: string;
  email_footer_text?: string;
  email_logo_url?: string;
}

export default function WhiteLabelSettings() {
  const { toast } = useToast();
  const { branding: contextBranding, tenantId: contextTenantId, refreshBranding } = useTenantBranding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [branding, setBranding] = useState<BrandingSettings>({
    clinic_name: "",
    primary_color: "#2563eb",
    secondary_color: "#64748b",
    accent_color: "#f59e0b",
    features_enabled: true,
    pricing_enabled: false,
    email_header_color: "#2563eb",
  });
  const [previewMode, setPreviewMode] = useState(false);
  const [domainVerifying, setDomainVerifying] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (contextBranding) {
      setBranding(contextBranding as BrandingSettings);
    }
    if (contextTenantId) {
      setTenantId(contextTenantId);
    }
  }, [contextBranding, contextTenantId]);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user.id)
        .single();

      if (!profile?.tenant_id) return;
      setTenantId(profile.tenant_id);

      const { data: settings } = await supabase
        .from("tenant_settings")
        .select("branding_settings")
        .eq("tenant_id", profile.tenant_id)
        .single();

      if (settings?.branding_settings) {
        setBranding(settings.branding_settings as BrandingSettings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!tenantId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenant_settings")
        .update({
          branding_settings: branding as any,
        })
        .eq("tenant_id", tenantId);

      if (error) throw error;

      // Refresh the branding context to apply changes immediately
      await refreshBranding();

      toast({
        title: "Configurações salvas",
        description: "Suas configurações de branding foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "logo" | "favicon" | "email_logo"
  ) => {
    const file = event.target.files?.[0];
    if (!file || !tenantId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${tenantId}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("tenant-branding")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("tenant-branding")
        .getPublicUrl(fileName);

      const fieldMap = {
        logo: "logo_url",
        favicon: "favicon_url",
        email_logo: "email_logo_url",
      };

      setBranding((prev) => ({
        ...prev,
        [fieldMap[type]]: publicUrl,
      }));

      toast({
        title: "Upload concluído",
        description: `${type === "logo" ? "Logo" : type === "favicon" ? "Favicon" : "Logo do email"} enviado com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!branding.custom_domain || !tenantId) return;

    setDomainVerifying(true);
    try {
      // Check if domain already exists
      const { data: existingDomain } = await supabase
        .from("tenant_domains")
        .select("*")
        .eq("domain", branding.custom_domain)
        .eq("tenant_id", tenantId)
        .single();

      if (!existingDomain) {
        // Create new domain entry
        const verificationToken = crypto.randomUUID();
        const { error } = await supabase
          .from("tenant_domains")
          .insert({
            tenant_id: tenantId,
            domain: branding.custom_domain,
            verification_token: verificationToken,
            verified: false,
          });

        if (error) throw error;

        toast({
          title: "Domínio adicionado",
          description: "Configure os registros DNS conforme as instruções abaixo.",
        });
      } else {
        toast({
          title: "Domínio já existe",
          description: existingDomain.verified
            ? "Este domínio já está verificado."
            : "Este domínio está aguardando verificação DNS.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao verificar domínio",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDomainVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">White Label</h1>
          <p className="text-muted-foreground">
            Personalize a identidade visual da sua clínica
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="mr-2 h-4 w-4" />
            {previewMode ? "Ocultar" : "Visualizar"}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Alterações
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <Tabs defaultValue="identity" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="identity">Identidade</TabsTrigger>
              <TabsTrigger value="domain">Domínio</TabsTrigger>
              <TabsTrigger value="landing">Landing</TabsTrigger>
              <TabsTrigger value="email">Email</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Identidade Visual</CardTitle>
                  <CardDescription>
                    Configure logo, cores e elementos visuais
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="clinic_name">Nome da Clínica</Label>
                    <Input
                      id="clinic_name"
                      value={branding.clinic_name || ""}
                      onChange={(e) =>
                        setBranding({ ...branding, clinic_name: e.target.value })
                      }
                      placeholder="Clínica Odonto Plus"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Logo Principal</Label>
                    <div className="flex items-center gap-4">
                      {branding.logo_url && (
                        <img
                          src={branding.logo_url}
                          alt="Logo"
                          className="h-16 w-auto object-contain"
                        />
                      )}
                      <Button
                        variant="outline"
                        disabled={uploading}
                        onClick={() => document.getElementById("logo-upload")?.click()}
                      >
                        {uploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Upload Logo
                      </Button>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "logo")}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      PNG, JPG ou SVG (máx. 2MB)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Favicon</Label>
                    <div className="flex items-center gap-4">
                      {branding.favicon_url && (
                        <img
                          src={branding.favicon_url}
                          alt="Favicon"
                          className="h-8 w-8 object-contain"
                        />
                      )}
                      <Button
                        variant="outline"
                        disabled={uploading}
                        onClick={() => document.getElementById("favicon-upload")?.click()}
                      >
                        {uploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Upload Favicon
                      </Button>
                      <input
                        id="favicon-upload"
                        type="file"
                        accept="image/x-icon,image/png"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "favicon")}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      ICO ou PNG 32x32px
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary_color">Cor Primária</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primary_color"
                          type="color"
                          value={branding.primary_color || "#2563eb"}
                          onChange={(e) =>
                            setBranding({ ...branding, primary_color: e.target.value })
                          }
                          className="h-10 w-20"
                        />
                        <Input
                          value={branding.primary_color || "#2563eb"}
                          onChange={(e) =>
                            setBranding({ ...branding, primary_color: e.target.value })
                          }
                          placeholder="#2563eb"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondary_color">Cor Secundária</Label>
                      <div className="flex gap-2">
                        <Input
                          id="secondary_color"
                          type="color"
                          value={branding.secondary_color || "#64748b"}
                          onChange={(e) =>
                            setBranding({ ...branding, secondary_color: e.target.value })
                          }
                          className="h-10 w-20"
                        />
                        <Input
                          value={branding.secondary_color || "#64748b"}
                          onChange={(e) =>
                            setBranding({ ...branding, secondary_color: e.target.value })
                          }
                          placeholder="#64748b"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accent_color">Cor Destaque</Label>
                      <div className="flex gap-2">
                        <Input
                          id="accent_color"
                          type="color"
                          value={branding.accent_color || "#f59e0b"}
                          onChange={(e) =>
                            setBranding({ ...branding, accent_color: e.target.value })
                          }
                          className="h-10 w-20"
                        />
                        <Input
                          value={branding.accent_color || "#f59e0b"}
                          onChange={(e) =>
                            setBranding({ ...branding, accent_color: e.target.value })
                          }
                          placeholder="#f59e0b"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="domain" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Domínio Customizado</CardTitle>
                  <CardDescription>
                    Configure seu próprio domínio para a plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom_domain">Domínio</Label>
                    <div className="flex gap-2">
                      <Input
                        id="custom_domain"
                        value={branding.custom_domain || ""}
                        onChange={(e) =>
                          setBranding({ ...branding, custom_domain: e.target.value })
                        }
                        placeholder="diagnostico.suaclinica.com.br"
                      />
                      <Button
                        onClick={handleVerifyDomain}
                        disabled={domainVerifying || !branding.custom_domain}
                      >
                        {domainVerifying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Verificar"
                        )}
                      </Button>
                    </div>
                  </div>

                  {branding.custom_domain && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-semibold mb-2">Configuração DNS Necessária:</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm">
                          <li>Adicione um registro A apontando para: <code className="bg-muted px-1 py-0.5 rounded">185.158.133.1</code></li>
                          <li>Adicione um registro CNAME para www apontando para seu domínio</li>
                          <li>Aguarde até 48h para propagação DNS</li>
                          <li>SSL será configurado automaticamente</li>
                        </ol>
                      </AlertDescription>
                    </Alert>
                  )}

                  {branding.custom_domain_verified && (
                    <Alert>
                      <Check className="h-4 w-4" />
                      <AlertDescription>
                        Domínio verificado e SSL ativo!
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="landing" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Landing Page</CardTitle>
                  <CardDescription>
                    Personalize sua página inicial
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hero_title">Título Principal</Label>
                    <Input
                      id="hero_title"
                      value={branding.hero_title || ""}
                      onChange={(e) =>
                        setBranding({ ...branding, hero_title: e.target.value })
                      }
                      placeholder="Diagnóstico Dentário Inteligente"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hero_subtitle">Subtítulo</Label>
                    <Textarea
                      id="hero_subtitle"
                      value={branding.hero_subtitle || ""}
                      onChange={(e) =>
                        setBranding({ ...branding, hero_subtitle: e.target.value })
                      }
                      placeholder="Revolucione sua prática com IA"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hero_cta_text">Texto do Botão CTA</Label>
                    <Input
                      id="hero_cta_text"
                      value={branding.hero_cta_text || ""}
                      onChange={(e) =>
                        setBranding({ ...branding, hero_cta_text: e.target.value })
                      }
                      placeholder="Começar Agora"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="features_enabled"
                      checked={branding.features_enabled}
                      onCheckedChange={(checked) =>
                        setBranding({ ...branding, features_enabled: checked })
                      }
                    />
                    <Label htmlFor="features_enabled">Exibir seção de recursos</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="pricing_enabled"
                      checked={branding.pricing_enabled}
                      onCheckedChange={(checked) =>
                        setBranding({ ...branding, pricing_enabled: checked })
                      }
                    />
                    <Label htmlFor="pricing_enabled">Exibir seção de preços</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Email de Contato</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={branding.contact_email || ""}
                      onChange={(e) =>
                        setBranding({ ...branding, contact_email: e.target.value })
                      }
                      placeholder="contato@suaclinica.com.br"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={branding.phone || ""}
                      onChange={(e) =>
                        setBranding({ ...branding, phone: e.target.value })
                      }
                      placeholder="+55 11 99999-9999"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Branding de Email</CardTitle>
                  <CardDescription>
                    Personalize os emails enviados pela plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Logo do Email</Label>
                    <div className="flex items-center gap-4">
                      {branding.email_logo_url && (
                        <img
                          src={branding.email_logo_url}
                          alt="Email Logo"
                          className="h-12 w-auto object-contain"
                        />
                      )}
                      <Button
                        variant="outline"
                        disabled={uploading}
                        onClick={() =>
                          document.getElementById("email-logo-upload")?.click()
                        }
                      >
                        {uploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        Upload Logo
                      </Button>
                      <input
                        id="email-logo-upload"
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "email_logo")}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email_header_color">Cor do Cabeçalho</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email_header_color"
                        type="color"
                        value={branding.email_header_color || "#2563eb"}
                        onChange={(e) =>
                          setBranding({ ...branding, email_header_color: e.target.value })
                        }
                        className="h-10 w-20"
                      />
                      <Input
                        value={branding.email_header_color || "#2563eb"}
                        onChange={(e) =>
                          setBranding({ ...branding, email_header_color: e.target.value })
                        }
                        placeholder="#2563eb"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email_footer_text">Texto do Rodapé</Label>
                    <Input
                      id="email_footer_text"
                      value={branding.email_footer_text || ""}
                      onChange={(e) =>
                        setBranding({ ...branding, email_footer_text: e.target.value })
                      }
                      placeholder="© 2025 Sua Clínica. Todos os direitos reservados."
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {previewMode && (
          <div className="lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)]">
            <BrandingPreview branding={branding} />
          </div>
        )}
      </div>
    </div>
  );
}
