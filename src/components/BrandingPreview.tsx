import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Mail, FileText, Globe } from "lucide-react";

interface BrandingSettings {
  clinic_name?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_cta_text?: string;
  email_header_color?: string;
  email_logo_url?: string;
  email_footer_text?: string;
}

interface BrandingPreviewProps {
  branding: BrandingSettings;
}

export function BrandingPreview({ branding }: BrandingPreviewProps) {
  const primaryColor = branding.primary_color || "#2563eb";
  const secondaryColor = branding.secondary_color || "#64748b";
  const accentColor = branding.accent_color || "#f59e0b";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Preview do Branding
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="landing">Landing</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <div className="rounded-lg border bg-card overflow-hidden">
              {/* Header Preview */}
              <div
                className="p-4 text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="flex items-center gap-3">
                  {branding.logo_url ? (
                    <img
                      src={branding.logo_url}
                      alt="Logo"
                      className="h-8 w-auto object-contain bg-white/10 rounded px-2 py-1"
                    />
                  ) : (
                    <div className="h-8 w-24 bg-white/20 rounded animate-pulse" />
                  )}
                  <span className="font-semibold">
                    {branding.clinic_name || "Sua Clínica"}
                  </span>
                </div>
              </div>

              {/* Content Preview */}
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <Button size="sm" style={{ backgroundColor: primaryColor, color: "white" }}>
                    Botão Primário
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    style={{ borderColor: secondaryColor, color: secondaryColor }}
                  >
                    Botão Secundário
                  </Button>
                  <Button
                    size="sm"
                    style={{ backgroundColor: accentColor, color: "white" }}
                  >
                    Botão Destaque
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-full animate-pulse" />
                  <div className="h-4 bg-muted rounded w-5/6 animate-pulse" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div
                    className="p-4 rounded-lg text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <div className="text-2xl font-bold">150</div>
                    <div className="text-sm opacity-90">Total Exames</div>
                  </div>
                  <div
                    className="p-4 rounded-lg text-white"
                    style={{ backgroundColor: accentColor }}
                  >
                    <div className="text-2xl font-bold">28</div>
                    <div className="text-sm opacity-90">Este Mês</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="landing" className="space-y-4">
            <div className="rounded-lg border bg-card overflow-hidden">
              {/* Hero Section Preview */}
              <div
                className="p-8 text-white text-center"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                }}
              >
                {branding.logo_url && (
                  <img
                    src={branding.logo_url}
                    alt="Logo"
                    className="h-12 w-auto mx-auto mb-4 object-contain"
                  />
                )}
                <h1 className="text-3xl font-bold mb-3">
                  {branding.hero_title || "Diagnóstico Dentário Inteligente"}
                </h1>
                <p className="text-lg opacity-90 mb-6">
                  {branding.hero_subtitle ||
                    "Revolucione sua prática com IA"}
                </p>
                <Button size="lg" style={{ backgroundColor: "white", color: primaryColor }}>
                  {branding.hero_cta_text || "Começar Agora"}
                </Button>
              </div>

              {/* Features Preview */}
              <div className="p-6 grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {i}
                    </div>
                    <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                    <div className="h-2 bg-muted rounded w-full animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="rounded-lg border bg-white overflow-hidden">
              {/* Email Header */}
              <div
                className="p-6 text-white"
                style={{ backgroundColor: branding.email_header_color || primaryColor }}
              >
                {branding.email_logo_url ? (
                  <img
                    src={branding.email_logo_url}
                    alt="Email Logo"
                    className="h-10 w-auto object-contain"
                  />
                ) : branding.logo_url ? (
                  <img
                    src={branding.logo_url}
                    alt="Logo"
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <div className="h-10 w-32 bg-white/20 rounded animate-pulse" />
                )}
              </div>

              {/* Email Body */}
              <div className="p-6 space-y-4 text-gray-800">
                <p className="font-semibold">Olá [Nome do Paciente],</p>
                <p>Seu exame foi processado com sucesso!</p>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-5/6" />
                  <div className="h-3 bg-gray-200 rounded w-4/5" />
                </div>
                <Button
                  size="sm"
                  style={{ backgroundColor: primaryColor, color: "white" }}
                >
                  Ver Resultado
                </Button>
              </div>

              {/* Email Footer */}
              <div className="p-6 bg-gray-100 border-t text-center text-sm text-gray-600">
                <p>
                  {branding.email_footer_text ||
                    `© 2025 ${branding.clinic_name || "Sua Clínica"}. Todos os direitos reservados.`}
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground text-center">
            Este é um preview das suas configurações de branding. As mudanças serão aplicadas após salvar.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
