import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BookOpen, 
  Video, 
  MessageCircle, 
  FileQuestion,
  Upload,
  Users,
  BarChart3,
  Settings,
  Zap,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const Help = () => {
  const navigate = useNavigate();

  const tutorialVideos = [
    {
      id: 1,
      title: "Como fazer upload de exames",
      description: "Aprenda a enviar radiografias e tomografias para análise de IA",
      duration: "3:45",
      icon: Upload,
      color: "text-blue-500",
      steps: [
        "Clique no botão 'Novo Exame'",
        "Selecione o paciente",
        "Escolha o tipo de exame (panorâmica, periapical, etc.)",
        "Arraste as imagens ou clique para selecionar",
        "Aguarde a análise automática da IA"
      ]
    },
    {
      id: 2,
      title: "Gerenciar pacientes",
      description: "Como adicionar, editar e visualizar histórico de pacientes",
      duration: "4:20",
      icon: Users,
      color: "text-green-500",
      steps: [
        "Acesse a seção 'Pacientes'",
        "Clique em 'Adicionar Paciente'",
        "Preencha os dados do paciente",
        "Adicione documentos e histórico médico",
        "Visualize todos os exames do paciente"
      ]
    },
    {
      id: 3,
      title: "Interpretar relatórios de IA",
      description: "Entenda os achados e recomendações gerados pela IA",
      duration: "5:10",
      icon: Zap,
      color: "text-purple-500",
      steps: [
        "Abra um exame analisado",
        "Visualize os achados por severidade",
        "Veja as áreas marcadas na imagem",
        "Leia as recomendações clínicas",
        "Exporte ou compartilhe o relatório"
      ]
    },
    {
      id: 4,
      title: "Configurar o sistema",
      description: "Personalize relatórios, notificações e integrações",
      duration: "6:30",
      icon: Settings,
      color: "text-orange-500",
      steps: [
        "Acesse 'Configurações'",
        "Configure o white label (logo, cores)",
        "Personalize templates de relatórios",
        "Ajuste preferências de IA",
        "Configure notificações"
      ]
    },
    {
      id: 5,
      title: "Analytics e relatórios",
      description: "Visualize estatísticas e tendências dos seus exames",
      duration: "4:15",
      icon: BarChart3,
      color: "text-cyan-500",
      steps: [
        "Acesse a seção 'Analytics'",
        "Visualize gráficos de achados",
        "Filtre por período e tipo de exame",
        "Exporte dados para Excel",
        "Acompanhe métricas de qualidade"
      ]
    }
  ];

  const faqs = [
    {
      question: "Quantos exames posso fazer gratuitamente?",
      answer: "Você tem direito a 6 exames gratuitos para testar o sistema. Após isso, escolha um plano que atenda suas necessidades."
    },
    {
      question: "Quais tipos de imagens posso analisar?",
      answer: "O sistema aceita radiografias panorâmicas, periapicais, bitewing, cefalométricas e tomografias CBCT em formatos JPG, PNG e WEBP."
    },
    {
      question: "A IA substitui o diagnóstico do dentista?",
      answer: "Não. A IA é uma ferramenta de auxílio diagnóstico que identifica achados radiográficos. O diagnóstico final e plano de tratamento devem sempre ser feitos por um profissional habilitado."
    },
    {
      question: "Como funciona o white label?",
      answer: "Em planos superiores, você pode personalizar o logo, cores e domínio do sistema, oferecendo uma experiência com sua marca aos pacientes."
    },
    {
      question: "Os dados são seguros?",
      answer: "Sim! Todos os dados são criptografados e armazenados seguindo as normas LGPD e HIPAA. Realizamos backups diários automáticos."
    },
    {
      question: "Posso exportar meus dados?",
      answer: "Sim! Você pode exportar exames em PDF, dados em Excel e fazer backup completo do sistema a qualquer momento."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                Central de Ajuda
              </h1>
              <p className="text-sm text-muted-foreground">
                Aprenda a usar todas as funcionalidades do exm-ai.com
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="videos" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="videos" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Tutoriais
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <FileQuestion className="h-4 w-4" />
              FAQ
            </TabsTrigger>
          </TabsList>

          {/* Tutoriais em Vídeo */}
          <TabsContent value="videos" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tutorialVideos.map((video) => (
                <Card key={video.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-12 w-12 rounded-lg bg-muted flex items-center justify-center ${video.color}`}>
                          <video.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{video.title}</CardTitle>
                          <Badge variant="secondary" className="mt-1">
                            {video.duration}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="mt-3">{video.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-muted-foreground">
                        Passos principais:
                      </p>
                      <ol className="space-y-2">
                        {video.steps.map((step, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <span className="font-semibold text-primary min-w-[20px]">
                              {idx + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* CTA para suporte */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <MessageCircle className="h-8 w-8 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">
                      Precisa de mais ajuda?
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Nossa equipe de suporte está pronta para ajudar você com qualquer dúvida.
                    </p>
                    <div className="flex gap-3">
                      <Button variant="default">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Falar com Suporte
                      </Button>
                      <Button variant="outline">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Documentação
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="space-y-4">
            {faqs.map((faq, idx) => (
              <Card key={idx}>
                <CardHeader>
                  <CardTitle className="text-base flex items-start gap-2">
                    <FileQuestion className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    {faq.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}

            {/* CTA FAQ */}
            <Card className="bg-muted">
              <CardContent className="pt-6 text-center">
                <h3 className="font-semibold text-lg mb-2">
                  Não encontrou sua resposta?
                </h3>
                <p className="text-muted-foreground mb-4">
                  Entre em contato com nossa equipe
                </p>
                <Button>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Entrar em Contato
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Help;
