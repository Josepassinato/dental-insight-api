import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft,
  Webhook,
  Key,
  Code,
  ExternalLink,
  Copy,
  Trash2,
  Plus,
  CheckCircle,
  AlertTriangle,
  Globe
} from "lucide-react";
import { toast } from "sonner";

interface WebhookConfig {
  id: string;
  tenant_id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string;
  created_at: string;
  updated_at: string;
}

const Integrations = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[]
  });
  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const navigate = useNavigate();

  const availableEvents = [
    { id: 'exam.completed', label: 'Exame Concluído' },
    { id: 'exam.failed', label: 'Exame Falhou' },
    { id: 'patient.created', label: 'Paciente Criado' },
    { id: 'report.generated', label: 'Relatório Gerado' }
  ];

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setSession(session);
      setUser(session.user);
      await loadWebhooks();
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

  const loadWebhooks = async () => {
    try {
      setWebhooksLoading(true);
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading webhooks:', error);
        toast.error("Erro ao carregar webhooks");
        return;
      }

      setWebhooks(data || []);
    } catch (error) {
      console.error('Error loading webhooks:', error);
      toast.error("Erro ao carregar webhooks");
    } finally {
      setWebhooksLoading(false);
    }
  };

  const generateSecret = () => {
    return `whsec_${crypto.randomUUID().replace(/-/g, '')}`;
  };

  const createWebhook = async () => {
    if (!newWebhook.name || !newWebhook.url) {
      toast.error("Nome e URL são obrigatórios");
      return;
    }

    if (newWebhook.events.length === 0) {
      toast.error("Selecione pelo menos um evento");
      return;
    }

    try {
      setWebhooksLoading(true);
      
      const webhookData = {
        name: newWebhook.name,
        url: newWebhook.url,
        events: newWebhook.events,
        is_active: true,
        secret: generateSecret()
      };

      const { data, error } = await supabase
        .from('webhooks')
        .insert([webhookData])
        .select()
        .single();

      if (error) {
        console.error('Error creating webhook:', error);
        toast.error("Erro ao criar webhook");
        return;
      }

      setWebhooks([data, ...webhooks]);
      setNewWebhook({ name: '', url: '', events: [] });
      setShowNewWebhook(false);
      toast.success("Webhook criado com sucesso!");
    } catch (error) {
      console.error('Error creating webhook:', error);
      toast.error("Erro ao criar webhook");
    } finally {
      setWebhooksLoading(false);
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      setWebhooksLoading(true);
      
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting webhook:', error);
        toast.error("Erro ao remover webhook");
        return;
      }

      setWebhooks(webhooks.filter(w => w.id !== id));
      toast.success("Webhook removido com sucesso!");
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error("Erro ao remover webhook");
    } finally {
      setWebhooksLoading(false);
    }
  };

  const toggleWebhook = async (id: string) => {
    try {
      const webhook = webhooks.find(w => w.id === id);
      if (!webhook) return;

      const { error } = await supabase
        .from('webhooks')
        .update({ is_active: !webhook.is_active })
        .eq('id', id);

      if (error) {
        console.error('Error updating webhook:', error);
        toast.error("Erro ao atualizar webhook");
        return;
      }

      setWebhooks(webhooks.map(w => 
        w.id === id ? { ...w, is_active: !w.is_active } : w
      ));
      
      toast.success(`Webhook ${!webhook.is_active ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Error updating webhook:', error);
      toast.error("Erro ao atualizar webhook");
    }
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success("Secret copiado!");
  };

  const toggleEvent = (eventId: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando integrações...</p>
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
              <Globe className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-primary">Integrações</h1>
                <p className="text-sm text-muted-foreground">
                  APIs, webhooks e documentação para integração
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="webhooks" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="api-docs">API Docs</TabsTrigger>
            <TabsTrigger value="sdk">SDK</TabsTrigger>
          </TabsList>

          {/* Webhooks */}
          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Configuração de Webhooks
                  </CardTitle>
                  <Button 
                    onClick={() => setShowNewWebhook(true)}
                    disabled={webhooksLoading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Webhook
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {webhooksLoading && (
                  <div className="text-center py-4">
                    <div className="h-6 w-6 animate-spin border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Carregando webhooks...</p>
                  </div>
                )}

                {!webhooksLoading && webhooks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum webhook configurado</p>
                    <p className="text-sm">Configure webhooks para receber notificações em tempo real</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {webhooks.map((webhook) => (
                      <div key={webhook.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{webhook.name}</h4>
                            <p className="text-sm text-muted-foreground">{webhook.url}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={webhook.is_active}
                              onCheckedChange={() => toggleWebhook(webhook.id)}
                              disabled={webhooksLoading}
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteWebhook(webhook.id)}
                              disabled={webhooksLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={webhook.is_active ? "default" : "secondary"}>
                            {webhook.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant="outline">
                            {webhook.events.length} eventos
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm mb-2">
                          <span className="text-muted-foreground">Eventos:</span>
                          <div className="flex flex-wrap gap-1">
                            {webhook.events.map((event) => {
                              const eventLabel = availableEvents.find(e => e.id === event)?.label || event;
                              return (
                                <Badge key={event} variant="outline" className="text-xs">
                                  {eventLabel}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">Secret:</span>
                          <code className="bg-muted px-2 py-1 rounded text-xs">
                            {webhook.secret.substring(0, 20)}...
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copySecret(webhook.secret)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* New Webhook Form */}
                {showNewWebhook && (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <h4 className="font-medium mb-4">Criar Novo Webhook</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input
                          value={newWebhook.name}
                          onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Ex: Sistema Integrado"
                          disabled={webhooksLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL do Endpoint</Label>
                        <Input
                          value={newWebhook.url}
                          onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                          placeholder="https://seu-sistema.com/webhook"
                          disabled={webhooksLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Eventos</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {availableEvents.map((event) => (
                            <div key={event.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={event.id}
                                checked={newWebhook.events.includes(event.id)}
                                onChange={() => toggleEvent(event.id)}
                                className="rounded"
                                disabled={webhooksLoading}
                              />
                              <Label htmlFor={event.id} className="text-sm">
                                {event.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={createWebhook}
                          disabled={webhooksLoading}
                        >
                          {webhooksLoading ? "Criando..." : "Criar Webhook"}
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowNewWebhook(false)}
                          disabled={webhooksLoading}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Documentation */}
          <TabsContent value="api-docs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Documentação da API
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Upload de Exames</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Badge variant="secondary">POST</Badge>
                        <code className="block bg-muted p-2 rounded text-sm">
                          /api/upload-exam
                        </code>
                        <p className="text-sm text-muted-foreground">
                          Faz upload de imagens radiográficas para análise
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Obter Resultados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Badge variant="secondary">GET</Badge>
                        <code className="block bg-muted p-2 rounded text-sm">
                          /api/exams/{`{id}`}
                        </code>
                        <p className="text-sm text-muted-foreground">
                          Retorna os resultados da análise de um exame
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Listar Pacientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Badge variant="secondary">GET</Badge>
                        <code className="block bg-muted p-2 rounded text-sm">
                          /api/patients
                        </code>
                        <p className="text-sm text-muted-foreground">
                          Lista todos os pacientes da clínica
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Gerar Relatório</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Badge variant="secondary">POST</Badge>
                        <code className="block bg-muted p-2 rounded text-sm">
                          /api/reports/generate
                        </code>
                        <p className="text-sm text-muted-foreground">
                          Gera relatório PDF de um exame específico
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Exemplo de Requisição</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
{`curl -X POST https://api.dentalai.com/upload-exam \\
  -H "Authorization: Bearer sk_your_api_key" \\
  -H "Content-Type: multipart/form-data" \\
  -F "patient_id=12345" \\
  -F "image=@radiografia.jpg"`}
                    </pre>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Exemplo de Resposta</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
{`{
  "exam_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "estimated_completion": "2024-01-15T10:30:00Z",
  "webhook_url": "https://api.dentalai.com/webhooks/exam-completed"
}`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SDK */}
          <TabsContent value="sdk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  SDK e Bibliotecas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">JavaScript SDK</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="bg-muted p-3 rounded">
                          <code className="text-sm">npm install @dentalai/sdk</code>
                        </div>
                        <Button variant="outline" className="w-full">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver no GitHub
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Python SDK</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="bg-muted p-3 rounded">
                          <code className="text-sm">pip install dentalai-sdk</code>
                        </div>
                        <Button variant="outline" className="w-full">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Ver no PyPI
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Exemplo de Uso - JavaScript</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
{`import { DentalAI } from '@dentalai/sdk';

const client = new DentalAI({
  apiKey: 'sk_your_api_key'
});

// Upload e análise de exame
const exam = await client.uploadExam({
  patientId: '12345',
  imageFile: file,
  examType: 'radiografia'
});

console.log('Exam ID:', exam.id);`}
                    </pre>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Exemplo de Uso - Python</h3>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-x-auto">
{`from dentalai import DentalAI

client = DentalAI(api_key='sk_your_api_key')

# Upload e análise de exame
with open('radiografia.jpg', 'rb') as f:
    exam = client.upload_exam(
        patient_id='12345',
        image_file=f,
        exam_type='radiografia'
    )

print(f'Exam ID: {exam.id}')`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Integrations;
