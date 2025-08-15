import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Zap, 
  Shield, 
  BarChart3, 
  ArrowRight, 
  Users, 
  Globe, 
  Code,
  CheckCircle,
  Building2,
  LogIn
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Brain,
      title: "IA Avançada",
      description: "Algoritmos de deep learning para análise precisa de imagens dentárias"
    },
    {
      icon: Zap,
      title: "Processamento Rápido", 
      description: "Resultados em segundos com alta confiabilidade"
    },
    {
      icon: Shield,
      title: "Segurança Total",
      description: "Dados protegidos com criptografia e compliance LGPD"
    },
    {
      icon: BarChart3,
      title: "Relatórios Detalhados",
      description: "PDFs profissionais com análises completas"
    },
    {
      icon: Globe,
      title: "SDK Embarcável",
      description: "Integre facilmente em seus sistemas existentes"
    },
    {
      icon: Code,
      title: "API Completa",
      description: "Acesso programático a todas as funcionalidades"
    }
  ];

  const plans = [
    {
      name: "Basic",
      price: "R$ 299",
      period: "/mês",
      exams: "50 exames",
      features: ["Análise de IA", "Relatórios PDF", "Suporte email"]
    },
    {
      name: "Professional",
      price: "R$ 599", 
      period: "/mês",
      exams: "200 exames",
      features: ["Análise de IA", "Relatórios PDF", "SDK Web", "API", "Suporte prioritário"]
    },
    {
      name: "Enterprise",
      price: "Customizado",
      period: "",
      exams: "Ilimitado",
      features: ["Tudo do Professional", "Integração customizada", "Suporte 24/7", "SLA dedicado"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-primary text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Building2 className="h-8 w-8" />
              <h1 className="text-4xl md:text-6xl font-bold">DentalAI</h1>
            </div>
            <p className="text-xl md:text-2xl mb-8 text-white/90">
              Análise inteligente de imagens dentárias com tecnologia de ponta
            </p>
            <p className="text-lg mb-10 text-white/80">
              Transforme seu diagnóstico com IA avançada. Detecte anomalias, gere relatórios profissionais 
              e integre facilmente em seus sistemas existentes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90"
                onClick={() => navigate("/auth")}
              >
                <LogIn className="mr-2 h-5 w-5" />
                Começar Agora
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white text-white hover:bg-white/10"
                onClick={() => window.open("/dental-sdk-example.html", "_blank")}
              >
                <Code className="mr-2 h-5 w-5" />
                Ver Demo SDK
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-medical-light">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Funcionalidades Principais</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Uma solução completa para análise de imagens dentárias com IA
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="shadow-soft hover:shadow-medium transition-shadow">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-primary mb-4" />
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">SDK & API</Badge>
              <h2 className="text-3xl font-bold mb-6">
                Integração Simples e Poderosa
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Nosso SDK JavaScript permite integrar a análise de imagens dentárias 
                diretamente em seu sistema existente. Interface iframe ou Web Component 
                para máxima flexibilidade.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span>SDK JavaScript completo</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span>Viewer embarcável (iframe/component)</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span>API REST completa</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span>Autenticação por API Key</span>
                </div>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-6">
              <pre className="text-sm overflow-x-auto">
                <code>{`// Initialize SDK
DentalSDK.init({
  apiKey: 'your-api-key',
  baseUrl: 'https://dentalai.app'
});

// Upload exam
const result = await DentalSDK.uploadExam(file, {
  patientName: 'João Silva',
  dentist: 'Dr. Maria'
});

// Open viewer
DentalSDK.openViewer(result.examId, {
  containerId: 'viewer-container',
  mode: 'iframe'
});`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-medical-light">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Planos e Preços</h2>
            <p className="text-xl text-muted-foreground">
              Escolha o plano ideal para sua clínica
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative ${index === 1 ? 'border-primary shadow-medium' : 'shadow-soft'}`}>
                {index === 1 && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    Mais Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <CardDescription className="text-lg">{plan.exams}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-success" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full mt-6" 
                    variant={index === 1 ? "default" : "outline"}
                    onClick={() => navigate("/auth")}
                  >
                    Começar Agora
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Pronto para Revolucionar seu Diagnóstico?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Junte-se a centenas de clínicas que já utilizam nossa tecnologia 
              para oferecer diagnósticos mais precisos e rápidos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/auth")}>
                Criar Conta Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => window.open("/dental-sdk-example.html", "_blank")}
              >
                Testar SDK
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">DentalAI</span>
          </div>
          <p className="text-muted-foreground">
            © 2024 DentalAI. Tecnologia avançada para diagnóstico dentário.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;