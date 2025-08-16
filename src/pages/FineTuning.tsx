import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Brain, 
  Database, 
  Settings, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Play,
  Pause,
  BarChart3,
  Cpu,
  Layers
} from "lucide-react";

interface TrainingJob {
  jobName: string;
  status: string;
  progress: number;
  startTime: string;
  endTime?: string;
  trainingExamplesCount: number;
  config: any;
}

interface ModelInfo {
  name: string;
  displayName: string;
  createTime: string;
  updateTime: string;
  state: string;
  accuracy?: number;
}

export default function FineTuning() {
  const [trainingJob, setTrainingJob] = useState<TrainingJob | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [validatedExamsCount, setValidatedExamsCount] = useState(0);

  useEffect(() => {
    loadValidatedExamsCount();
    loadExistingModels();
  }, []);

  const loadValidatedExamsCount = async () => {
    try {
      const response = await supabase
        .from('dental_findings')
        .select('*', { count: 'exact', head: true })
        .eq('expert_validated', true)
        .gte('confidence', 0.8);

      if (response.error) throw response.error;
      setValidatedExamsCount(response.count || 0);
    } catch (error) {
      console.error('Error loading validated exams:', error);
      setValidatedExamsCount(0);
    }
  };

  const loadExistingModels = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('dental-fine-tuning', {
        body: { action: 'list_models' }
      });

      if (error) throw error;
      setModels(data.models || []);
    } catch (error) {
      console.error('Error loading models:', error);
    }
  };

  const startFineTuning = async () => {
    if (validatedExamsCount < 50) {
      toast.error("Dados insuficientes para fine-tuning. Necessário pelo menos 50 exames validados.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('dental-fine-tuning', {
        body: { action: 'start_fine_tuning' }
      });

      if (error) throw error;

      setTrainingJob({
        jobName: data.jobName,
        status: 'running',
        progress: 0,
        startTime: new Date().toISOString(),
        trainingExamplesCount: data.trainingExamplesCount,
        config: data.config
      });

      toast.success("Fine-tuning iniciado com sucesso!");
      
      // Start monitoring progress
      monitorProgress(data.jobName);
    } catch (error: any) {
      toast.error(`Erro ao iniciar fine-tuning: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const monitorProgress = async (jobName: string) => {
    const checkProgress = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('dental-fine-tuning', {
          body: { action: 'check_progress', jobName }
        });

        if (error) throw error;

        setTrainingJob(prev => prev ? {
          ...prev,
          status: data.state,
          progress: data.progress * 100,
          endTime: data.endTime
        } : null);

        if (data.state === 'PIPELINE_STATE_SUCCEEDED') {
          toast.success("Fine-tuning concluído com sucesso!");
          loadExistingModels();
          return;
        } else if (data.state === 'PIPELINE_STATE_FAILED') {
          toast.error("Fine-tuning falhou. Verifique os logs.");
          return;
        }

        // Continue monitoring if still running
        if (data.state === 'PIPELINE_STATE_RUNNING') {
          setTimeout(checkProgress, 30000); // Check every 30 seconds
        }
      } catch (error) {
        console.error('Error checking progress:', error);
      }
    };

    checkProgress();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PIPELINE_STATE_SUCCEEDED': return 'bg-green-500';
      case 'PIPELINE_STATE_FAILED': return 'bg-red-500';
      case 'PIPELINE_STATE_RUNNING': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PIPELINE_STATE_SUCCEEDED': return <CheckCircle className="h-4 w-4" />;
      case 'PIPELINE_STATE_FAILED': return <AlertCircle className="h-4 w-4" />;
      case 'PIPELINE_STATE_RUNNING': return <Clock className="h-4 w-4" />;
      default: return <Cpu className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Fine-Tuning de IA</h1>
          <p className="text-muted-foreground">
            Treine modelos personalizados para melhorar a precisão da análise dental
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="training">Treinamento</TabsTrigger>
          <TabsTrigger value="models">Modelos</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Dados Validados</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{validatedExamsCount}</div>
                <p className="text-xs text-muted-foreground">
                  {validatedExamsCount >= 50 ? "Suficiente para fine-tuning" : "Mínimo: 50 exames"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Modelos Treinados</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{models.length}</div>
                <p className="text-xs text-muted-foreground">
                  Modelos personalizados disponíveis
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Melhoria Esperada</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+15%</div>
                <p className="text-xs text-muted-foreground">
                  Aumento médio na precisão
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Como Funciona o Fine-Tuning</CardTitle>
              <CardDescription>
                Processo de personalização do modelo de IA para sua clínica
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <Database className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">1. Coleta de Dados</h3>
                  <p className="text-sm text-muted-foreground">
                    Usamos seus exames validados como dados de treinamento
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <Cpu className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">2. Treinamento</h3>
                  <p className="text-sm text-muted-foreground">
                    O modelo aprende com os padrões específicos da sua clínica
                  </p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <h3 className="font-semibold">3. Implementação</h3>
                  <p className="text-sm text-muted-foreground">
                    Modelo personalizado com maior precisão para seus casos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Iniciar Fine-Tuning</CardTitle>
              <CardDescription>
                Treine um modelo personalizado usando seus dados validados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {validatedExamsCount < 50 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Você precisa de pelo menos 50 exames com achados validados por especialistas para iniciar o fine-tuning.
                    Atualmente você tem {validatedExamsCount} exames validados.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Seus dados estão prontos para fine-tuning! O processo levará aproximadamente 2-4 horas.
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={startFineTuning}
                disabled={isLoading || validatedExamsCount < 50 || !!trainingJob}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando Treinamento...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar Fine-Tuning
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {trainingJob && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(trainingJob.status)}
                  Status do Treinamento
                </CardTitle>
                <CardDescription>
                  Job: {trainingJob.jobName}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(trainingJob.status)}>
                    {trainingJob.status.replace('PIPELINE_STATE_', '')}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(trainingJob.progress)}%
                  </span>
                </div>

                <Progress value={trainingJob.progress} className="w-full" />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Início:</span> {new Date(trainingJob.startTime).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Exemplos:</span> {trainingJob.trainingExamplesCount}
                  </div>
                  {trainingJob.endTime && (
                    <div>
                      <span className="font-medium">Fim:</span> {new Date(trainingJob.endTime).toLocaleString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Modelos Personalizados</CardTitle>
              <CardDescription>
                Gerencie seus modelos treinados personalizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {models.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhum modelo personalizado</h3>
                  <p className="text-muted-foreground">
                    Inicie um fine-tuning para criar seu primeiro modelo personalizado
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {models.map((model, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{model.displayName}</h3>
                        <Badge variant={model.state === 'MODEL_STATE_DEPLOYED' ? 'default' : 'secondary'}>
                          {model.state.replace('MODEL_STATE_', '')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                        <div>Criado: {new Date(model.createTime).toLocaleDateString()}</div>
                        <div>Atualizado: {new Date(model.updateTime).toLocaleDateString()}</div>
                      </div>
                      {model.accuracy && (
                        <div className="mt-2">
                          <span className="text-sm font-medium">Precisão: {model.accuracy}%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Fine-Tuning</CardTitle>
              <CardDescription>
                Ajuste os parâmetros do processo de treinamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Modelo Base</label>
                  <p className="text-sm text-muted-foreground">gemini-1.5-pro-vision-001</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Épocas de Treinamento</label>
                  <p className="text-sm text-muted-foreground">10</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Taxa de Aprendizado</label>
                  <p className="text-sm text-muted-foreground">0.0001</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tamanho do Batch</label>
                  <p className="text-sm text-muted-foreground">8</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-2">Critérios de Qualidade</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Achados validados por especialistas</li>
                  <li>• Confiança mínima de 80%</li>
                  <li>• Imagens com qualidade superior a 8.0</li>
                  <li>• Mínimo de 2 achados por imagem</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}