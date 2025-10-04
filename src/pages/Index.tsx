import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SalesContactDialog } from "@/components/SalesContactDialog";

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
  LogIn,
  Play,
  Star,
  TrendingUp,
  Eye,
  Scan,
  FileText,
  Activity,
  Award,
  Quote,
  Calendar
} from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>();

  const analysisTypes = [
    {
      icon: Scan,
      title: "Radiografia Panorâmica",
      description: "Análise completa da estrutura dentária, detecção de cáries, fraturas e anomalias ósseas"
    },
    {
      icon: Eye,
      title: "Radiografia Periapical",
      description: "Avaliação detalhada de dentes individuais, raízes e tecidos ao redor"
    },
    {
      icon: Activity,
      title: "Tomografia Computadorizada",
      description: "Imagens 3D para planejamento de implantes e avaliação de estruturas complexas"
    },
    {
      icon: FileText,
      title: "Análise de Mordida",
      description: "Avaliação oclusal e identificação de problemas de alinhamento"
    }
  ];

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
      price: "",
      period: "",
      exams: "50 exames",
      features: ["Análise de IA", "Relatórios PDF", "Suporte email"]
    },
    {
      name: "Professional",
      price: "", 
      period: "",
      exams: "200 exames",
      features: ["Análise de IA", "Relatórios PDF", "SDK Web", "API", "Suporte prioritário"]
    },
    {
      name: "Enterprise",
      price: "",
      period: "",
      exams: "Ilimitado",
      features: ["Tudo do Professional", "Integração customizada", "Suporte 24/7", "SLA dedicado"]
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-background/80 backdrop-blur-md border-b z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">EXM-AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
            <a href="#integration" className="text-muted-foreground hover:text-foreground transition-colors">Integração</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Preços</a>
          </div>
          <Button onClick={() => navigate("/auth")} size="sm">
            <LogIn className="mr-2 h-4 w-4" />
            Entrar
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-primary text-white pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"></div>
        <div className="container mx-auto px-4 text-center relative">
          <div className="max-w-4xl mx-auto">
            <Badge variant="secondary" className="mb-6 bg-white/10 text-white border-white/20">
              ✨ Tecnologia de Ponta em IA
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Diagnóstico Dentário
              <span className="block text-white/90">Inteligente</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90 max-w-3xl mx-auto leading-relaxed">
              Revolucione sua prática com análise de imagens dentárias powered by IA. 
              Detecção automática, relatórios profissionais e integração perfeita.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 shadow-xl"
                onClick={() => navigate("/auth")}
              >
                Começar Teste Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
                onClick={() => {
                  setSalesDialogOpen(true);
                }}
              >
                <Calendar className="mr-2 h-5 w-5" />
                Agendar Demo
              </Button>
            </div>
            
            
            {/* Social Proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-white/80">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">4.9/5</span>
                <span>·</span>
                <span>200+ clínicas</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                <span>95% de precisão</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analysis Types Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <Badge variant="outline" className="mb-4">Tipos de Análises</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Exames que 
              <span className="text-primary"> Atendemos</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Nossa IA está treinada para analisar diversos tipos de exames odontológicos com alta precisão
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {analysisTypes.map((type, index) => (
              <Card key={index} className="group shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 border border-border/50 bg-card">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 mx-auto group-hover:bg-primary/20 transition-colors">
                    <type.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{type.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="text-sm leading-relaxed">
                    {type.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <Badge variant="outline" className="mb-4">Recursos Avançados</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Tecnologia que 
              <span className="text-primary"> Transforma</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Cada funcionalidade foi projetada para maximizar a eficiência e precisão do seu diagnóstico
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 border-0 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* White Label Section */}
      <section className="py-24 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 bg-primary/10">🎨 White Label</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Sua Marca,
                <span className="text-primary"> Nossa Tecnologia</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Personalize completamente a plataforma com sua identidade visual e ofereça a solução como se fosse 100% sua
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <Card className="border-2 border-primary/20 shadow-lg bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Identidade Visual Completa</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span>Logotipo e cores personalizadas</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span>Domínio próprio (seu-site.com.br)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span>E-mails com sua marca</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span>Relatórios PDF personalizados</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/20 shadow-lg bg-card/80 backdrop-blur-sm">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Modelo de Negócio Flexível</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span>Revenda com sua margem de lucro</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span>Gestão multi-clínicas</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span>Dashboard administrativo completo</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span>Suporte técnico dedicado</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-xl">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-3">Pronto para Lançar sua Própria Plataforma?</h3>
                    <p className="text-muted-foreground text-lg">
                      Entre em contato e descubra como transformar nossa tecnologia em seu produto
                    </p>
                  </div>
                  <Button size="lg" className="shadow-lg whitespace-nowrap" onClick={() => navigate("/auth")}>
                    Solicitar White Label
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Integration Section */}
      <section id="integration" className="py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <Badge variant="outline" className="mb-6">SDK & API</Badge>
              <h2 className="text-4xl font-bold mb-6 leading-tight">
                Integração em 
                <span className="text-primary"> Minutos</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                Nosso SDK foi projetado para desenvolvedores. Integre a análise de IA 
                em qualquer sistema com apenas algumas linhas de código.
              </p>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">SDK JavaScript Moderno</h3>
                    <p className="text-muted-foreground">TypeScript, ES6+, totalmente tipado</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Viewer Embarcável</h3>
                    <p className="text-muted-foreground">iframe, Web Component ou React</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">API REST Completa</h3>
                    <p className="text-muted-foreground">Documentação OpenAPI, webhooks</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Segurança Enterprise</h3>
                    <p className="text-muted-foreground">API Keys, OAuth 2.0, rate limiting</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="bg-gradient-card border rounded-2xl p-8 shadow-medium">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-destructive"></div>
                    <div className="w-3 h-3 rounded-full bg-warning"></div>
                    <div className="w-3 h-3 rounded-full bg-success"></div>
                  </div>
                  <span className="text-sm text-muted-foreground ml-2">dental-sdk.js</span>
                </div>
                <pre className="text-sm overflow-x-auto text-foreground">
                  <code>{`// Initialize SDK
DentalSDK.init({
  apiKey: 'dk_live_...',
  baseUrl: 'https://api.dentalai.app'
});

// Upload and analyze
const result = await DentalSDK.uploadExam(file, {
  patientName: 'João Silva',
  dentist: 'Dr. Maria Santos',
  examType: 'panoramic'
});

// Embed viewer
DentalSDK.renderViewer({
  examId: result.examId,
  container: '#viewer',
  theme: 'modern'
});`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clinical Validation Section */}
      <section className="py-24 bg-gradient-to-br from-primary/5 via-background to-primary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 bg-primary/10">Validação Clínica</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Tecnologia
              <span className="text-primary"> Comprovada</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Nossa IA é baseada em rigorosos estudos clínicos e validada por especialistas
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
            <Card className="text-center shadow-soft bg-card">
              <CardHeader>
                <div className="text-5xl font-bold text-primary mb-2">95.8%</div>
                <CardTitle className="text-lg">Precisão de Detecção</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Taxa de acurácia em detecção de cáries e anomalias em mais de 50.000 imagens analisadas
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="text-center shadow-soft bg-card">
              <CardHeader>
                <div className="text-5xl font-bold text-primary mb-2">98.2%</div>
                <CardTitle className="text-lg">Sensibilidade</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Capacidade de identificar corretamente casos positivos validada em estudos peer-reviewed
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="text-center shadow-soft bg-card">
              <CardHeader>
                <div className="text-5xl font-bold text-primary mb-2">92.5%</div>
                <CardTitle className="text-lg">Especificidade</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Taxa de verdadeiros negativos, minimizando falsos alarmes e garantindo confiabilidade
                </CardDescription>
              </CardContent>
            </Card>
          </div>
          <Card className="max-w-4xl mx-auto border-primary/20 bg-muted/30">
            <CardContent className="p-8">
              <div className="flex items-start gap-4">
                <Award className="h-12 w-12 text-primary flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold mb-3">Compliance Regulatório</h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span>Em processo de certificação CE (Conformité Européenne) como dispositivo médico Classe IIa</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span>Compliance total com LGPD (Brasil) e preparação para HIPAA (EUA)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                      <span>Validado por odontologistas certificados e instituições acadêmicas parceiras</span>
                    </li>
                  </ul>
                  <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm text-foreground font-medium">
                      ⚠️ <strong>Disclaimer Importante:</strong> O EXM-AI é uma ferramenta de apoio ao diagnóstico. 
                      A decisão final sobre o tratamento é sempre de responsabilidade exclusiva do cirurgião-dentista. 
                      Nosso sistema auxilia na identificação de padrões, mas não substitui a avaliação clínica profissional.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Prova Social</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Confiança de
              <span className="text-primary"> Especialistas</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Veja o que profissionais e instituições dizem sobre nossa plataforma
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
            <Card className="shadow-soft bg-card">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Quote className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Dr. Carlos Mendes</CardTitle>
                    <CardDescription className="text-sm">Clínica OdontoExcel - SP</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  "A precisão do EXM-AI me impressionou. Detectou uma lesão inicial que eu poderia ter passado despercebido. 
                  Hoje é parte essencial do meu protocolo de diagnóstico."
                </p>
                <div className="flex gap-1 mt-4">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-soft bg-card">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Quote className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Dra. Ana Paula Silva</CardTitle>
                    <CardDescription className="text-sm">Radiologista - RJ</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  "Reduzi em 60% o tempo de análise de radiografias panorâmicas. Os relatórios automatizados 
                  são extremamente úteis e os pacientes adoram a transparência."
                </p>
                <div className="flex gap-1 mt-4">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-soft bg-card">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Quote className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Dr. Roberto Almeida</CardTitle>
                    <CardDescription className="text-sm">Implantodontista - MG</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  "Para planejamento de implantes, a análise 3D do EXM-AI é fantástica. 
                  Meus pacientes confiam mais no tratamento quando mostro os relatórios detalhados."
                </p>
                <div className="flex gap-1 mt-4">
                  {[1,2,3,4,5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Partner Logos */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-8 font-medium">Instituições e Parceiros de Confiança</p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-60">
              <div className="text-2xl font-bold text-muted-foreground">USP Odontologia</div>
              <div className="text-2xl font-bold text-muted-foreground">UNICAMP</div>
              <div className="text-2xl font-bold text-muted-foreground">APCD</div>
              <div className="text-2xl font-bold text-muted-foreground">CFO</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-gradient-card">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <Badge variant="outline" className="mb-4">Preços Transparentes</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Planos para Cada
              <span className="text-primary"> Necessidade</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Comece gratuitamente e escale conforme seu crescimento
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card key={index} className={`relative group transition-all duration-300 hover:-translate-y-2 ${
                index === 1 
                  ? 'border-primary shadow-medium bg-card scale-105' 
                  : 'shadow-soft bg-card/50 backdrop-blur-sm hover:shadow-medium'
              }`}>
                {index === 1 && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                    ⭐ Mais Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                  <div className="mb-4">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-lg">{plan.period}</span>
                  </div>
                  <CardDescription className="text-lg font-medium bg-muted/50 rounded-full px-4 py-2">
                    {plan.exams}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full group-hover:scale-105 transition-transform" 
                    variant={index === 1 ? "default" : "outline"}
                    size="lg"
                    onClick={() => {
                      if (index === 2) {
                        setSelectedPlan(plan.name);
                        setSalesDialogOpen(true);
                      } else {
                        navigate("/auth");
                      }
                    }}
                  >
                    {index === 2 ? "Falar com Vendas" : "Começar Agora"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80"></div>
        <div className="container mx-auto px-4 text-center relative">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Transforme seu
              <span className="block">Diagnóstico Hoje</span>
            </h2>
            <p className="text-xl md:text-2xl mb-12 text-white/90 max-w-3xl mx-auto leading-relaxed">
              Junte-se a mais de 200 clínicas que já revolucionaram seus diagnósticos 
              com precisão de 95% e relatórios automáticos.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 shadow-xl text-lg px-8 py-4"
                onClick={() => navigate("/auth")}
              >
                Começar Teste Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm text-lg px-8 py-4"
                onClick={() => {
                  setSalesDialogOpen(true);
                }}
              >
                <Calendar className="mr-2 h-5 w-5" />
                Agendar Demo
              </Button>
            </div>
            
            {/* Trust indicators */}
            <div className="mt-16 pt-8 border-t border-white/20">
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-white/80">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5" />
                  <span>LGPD Compliance</span>
                </div>
                <div className="flex items-center gap-3">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  <span>4.9/5 - 500+ reviews</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5" />
                  <span>200+ clínicas ativas</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Building2 className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">EXM-AI</span>
            </div>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Revolucionando o diagnóstico dentário com inteligência artificial de última geração. 
              Precisão, velocidade e confiabilidade em cada análise.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg"
                onClick={() => navigate("/auth")}
              >
                Começar Teste Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => {
                  setSalesDialogOpen(true);
                }}
              >
                <Calendar className="mr-2 h-5 w-5" />
                Agendar Demo
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
              <span>© 2024 EXM-AI. Todos os direitos reservados.</span>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
                <a href="#" className="hover:text-foreground transition-colors">Termos</a>
                <a href="#" className="hover:text-foreground transition-colors">Suporte</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <SalesContactDialog 
        open={salesDialogOpen} 
        onOpenChange={setSalesDialogOpen}
        planInterest={selectedPlan}
      />
    </div>
  );
};

export default Index;