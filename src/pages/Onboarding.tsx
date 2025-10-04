import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingTour } from "@/components/OnboardingTour";
import { OnboardingVideos } from "@/components/OnboardingVideos";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Rocket, Video, MapPin, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type OnboardingStep = "welcome" | "tour" | "videos" | "complete";

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [showTour, setShowTour] = useState(false);
  const [showVideos, setShowVideos] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

  const handleStartTour = () => {
    setCurrentStep("tour");
    setShowTour(true);
  };

  const handleTourComplete = () => {
    setShowTour(false);
    setCurrentStep("videos");
    setShowVideos(true);
  };

  const handleVideosComplete = () => {
    setShowVideos(false);
    setCurrentStep("complete");
  };

  const handleSkipOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from("onboarding_progress")
          .update({ 
            skipped_onboarding: true,
            completed_at: new Date().toISOString()
          })
          .eq("user_id", user.id);

        if (error) throw error;

        toast({
          title: "Onboarding pulado",
          description: "Você pode acessar os tutoriais a qualquer momento nas configurações.",
        });

        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error skipping onboarding:", error);
      navigate("/dashboard");
    }
  };

  const handleFinishOnboarding = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error } = await supabase
          .from("onboarding_progress")
          .update({ 
            completed_at: new Date().toISOString()
          })
          .eq("user_id", user.id);

        if (error) throw error;

        toast({
          title: "Onboarding concluído! 🎉",
          description: "Você está pronto para usar o exm-ai.com.",
        });

        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error completing onboarding:", error);
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Sparkles className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl">
            {currentStep === "welcome" && "Bem-vindo ao exm-ai.com!"}
            {currentStep === "tour" && "Tour Guiado"}
            {currentStep === "videos" && "Vídeos Tutoriais"}
            {currentStep === "complete" && "Tudo Pronto!"}
          </CardTitle>
          <CardDescription>
            {currentStep === "welcome" && "Vamos começar configurando sua conta e aprendendo a usar a plataforma"}
            {currentStep === "tour" && "Conheça as principais funcionalidades"}
            {currentStep === "videos" && "Aprenda a usar cada recurso em detalhes"}
            {currentStep === "complete" && "Você completou o onboarding com sucesso!"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {currentStep === "welcome" && (
            <>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
                  <Rocket className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Trial de 14 dias grátis</h4>
                    <p className="text-sm text-muted-foreground">
                      Você tem 10 análises gratuitas durante o período de trial. Sem necessidade de cartão de crédito!
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
                  <MapPin className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Tour guiado</h4>
                    <p className="text-sm text-muted-foreground">
                      Um tour interativo pelas principais funcionalidades da plataforma
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted">
                  <Video className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-1">Vídeos tutoriais</h4>
                    <p className="text-sm text-muted-foreground">
                      5 vídeos curtos explicando como usar cada funcionalidade
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={handleStartTour} size="lg" className="w-full">
                  Começar Tour Guiado
                </Button>
                <Button onClick={handleSkipOnboarding} variant="ghost" className="w-full">
                  Pular e ir direto para o dashboard
                </Button>
              </div>
            </>
          )}

          {currentStep === "tour" && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                O tour guiado está sendo exibido. Siga as instruções na tela.
              </p>
            </div>
          )}

          {currentStep === "videos" && (
            <div className="space-y-4">
              <p className="text-center text-muted-foreground">
                Assista aos vídeos tutoriais para aprender mais sobre a plataforma.
              </p>
              <Button onClick={() => setShowVideos(true)} className="w-full">
                Assistir Vídeos Tutoriais
              </Button>
              <Button onClick={handleFinishOnboarding} variant="outline" className="w-full">
                Pular vídeos e ir para o dashboard
              </Button>
            </div>
          )}

          {currentStep === "complete" && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Parabéns!</h3>
                <p className="text-muted-foreground">
                  Você completou o onboarding e está pronto para usar todas as funcionalidades do exm-ai.com.
                </p>
              </div>
              <Button onClick={handleFinishOnboarding} size="lg" className="w-full">
                Ir para o Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showTour && <OnboardingTour onComplete={handleTourComplete} />}
      
      <OnboardingVideos 
        open={showVideos}
        onOpenChange={setShowVideos}
        onComplete={handleVideosComplete}
      />
    </div>
  );
}
