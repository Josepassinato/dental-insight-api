import { useState, useEffect } from "react";
import Joyride, { Step, CallBackProps, STATUS } from "react-joyride";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OnboardingTourProps {
  onComplete: () => void;
  autoStart?: boolean;
}

export const OnboardingTour = ({ onComplete, autoStart = true }: OnboardingTourProps) => {
  const [run, setRun] = useState(autoStart);
  const { toast } = useToast();

  const steps: Step[] = [
    {
      target: "body",
      content: "Bem-vindo ao exm-ai.com! Vamos fazer um tour rápido pelas principais funcionalidades.",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: '[data-tour="upload"]',
      content: "Aqui você pode fazer upload de imagens dentais para análise por IA.",
      placement: "bottom",
    },
    {
      target: '[data-tour="patients"]',
      content: "Gerencie seus pacientes e histórico de consultas nesta seção.",
      placement: "right",
    },
    {
      target: '[data-tour="analytics"]',
      content: "Acompanhe estatísticas e métricas do seu consultório.",
      placement: "right",
    },
    {
      target: '[data-tour="reports"]',
      content: "Gere relatórios profissionais automaticamente com base nas análises.",
      placement: "bottom",
    },
    {
      target: '[data-tour="settings"]',
      content: "Configure preferências e personalize o sistema aqui.",
      placement: "left",
    },
    {
      target: "body",
      content: "Pronto! Você agora conhece as principais funcionalidades. Aproveite seu trial de 14 dias!",
      placement: "center",
    },
  ];

  const handleJoyrideCallback = async (data: CallBackProps) => {
    const { status } = data;

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { error } = await supabase
            .from("onboarding_progress")
            .update({ 
              tour_completed: true,
              completed_steps: ['tour']
            })
            .eq("user_id", user.id);

          if (error) throw error;

          toast({
            title: "Tour concluído!",
            description: "Você completou o tour guiado.",
          });

          onComplete();
        }
      } catch (error) {
        console.error("Error updating tour progress:", error);
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--background))",
          arrowColor: "hsl(var(--background))",
          overlayColor: "rgba(0, 0, 0, 0.5)",
        },
      }}
      locale={{
        back: "Voltar",
        close: "Fechar",
        last: "Finalizar",
        next: "Próximo",
        skip: "Pular",
      }}
    />
  );
};
