import { useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, X, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SystemTutorialProps {
  onComplete?: () => void;
}

export function SystemTutorial({ onComplete }: SystemTutorialProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);

  const steps: Step[] = [
    {
      target: '[data-tour="upload"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg">📤 Upload de Exames</h3>
          <p>Clique aqui para fazer upload de imagens dentais (radiografias, tomografias, etc.).</p>
          <div className="bg-muted p-3 rounded text-sm">
            <strong>Dica:</strong> Você tem 6 exames gratuitos para testar o sistema!
          </div>
        </div>
      ),
      disableBeacon: true,
      placement: 'bottom',
    },
    {
      target: '[data-tour="patients"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg">👥 Gestão de Pacientes</h3>
          <p>Aqui você gerencia todos os seus pacientes: adicionar, editar, visualizar histórico médico e documentos.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="analytics"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg">📊 Analytics</h3>
          <p>Visualize estatísticas e relatórios sobre seus exames e diagnósticos ao longo do tempo.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '[data-tour="settings"]',
      content: (
        <div className="space-y-3">
          <h3 className="font-bold text-lg">⚙️ Configurações</h3>
          <p>Personalize o sistema: configure white label, templates de relatórios, notificações e preferências de IA.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: 'body',
      content: (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">✅ Tutorial Concluído!</h3>
          <p>Você está pronto para usar o exm-ai.com!</p>
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg space-y-2">
            <p className="font-semibold">Próximos passos:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Adicione seus primeiros pacientes</li>
              <li>Faça upload de uma imagem para análise</li>
              <li>Explore os relatórios de IA</li>
            </ol>
          </div>
        </div>
      ),
      placement: 'center',
    },
  ];

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status, type, index } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      
      // Marcar tutorial como completo no banco
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('onboarding_progress')
            .update({ 
              tour_completed: true,
              completed_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        }
        
        toast.success('Tutorial concluído! 🎉');
        onComplete?.();
      } catch (error) {
        console.error('Erro ao marcar tutorial como completo:', error);
      }
    }

    if (type === 'step:after') {
      setStepIndex(index + 1);
    }
  };

  const startTutorial = () => {
    setShowWelcome(false);
    setRun(true);
    setStepIndex(0);
  };

  if (showWelcome) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="max-w-2xl w-full animate-scale-in">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Bem-vindo ao exm-ai.com! 🦷</CardTitle>
            <CardDescription className="text-base mt-2">
              Sistema de análise de imagens dentais com inteligência artificial
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                O que você vai aprender:
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Como fazer upload de exames dentais</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Gerenciar pacientes e histórico médico</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Visualizar análises de IA e relatórios</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Personalizar configurações do sistema</span>
                </li>
              </ul>
            </div>

            <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
              <p className="text-sm text-center">
                ⏱️ <strong>Duração:</strong> Aproximadamente 2 minutos
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowWelcome(false);
                  onComplete?.();
                }}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Pular Tutorial
              </Button>
              <Button
                onClick={startTutorial}
                className="flex-1"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Iniciar Tutorial
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: 'hsl(var(--primary))',
            textColor: 'hsl(var(--foreground))',
            backgroundColor: 'hsl(var(--background))',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            arrowColor: 'hsl(var(--background))',
            zIndex: 10000,
          },
          tooltip: {
            borderRadius: 8,
            padding: 20,
          },
          buttonNext: {
            backgroundColor: 'hsl(var(--primary))',
            borderRadius: 6,
            padding: '8px 16px',
          },
          buttonBack: {
            marginRight: 10,
            color: 'hsl(var(--muted-foreground))',
          },
          buttonSkip: {
            color: 'hsl(var(--muted-foreground))',
          },
        }}
        locale={{
          back: 'Voltar',
          close: 'Fechar',
          last: 'Concluir',
          next: 'Próximo',
          skip: 'Pular',
        }}
      />
    </>
  );
}

export function TutorialButton() {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowTutorial(true)}
        className="flex items-center gap-2"
      >
        <BookOpen className="h-4 w-4" />
        <span className="hidden sm:inline">Tutorial</span>
      </Button>

      {showTutorial && (
        <SystemTutorial onComplete={() => setShowTutorial(false)} />
      )}
    </>
  );
}
