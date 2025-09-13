import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TestTube, CheckCircle, XCircle, FileImage } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TestResult {
  success: boolean;
  message: string;
  examId?: string;
  patientId?: string;
  processed_images?: number;
  analysis_results?: any;
}

export const TestDentalAnalysis = () => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const createTestPatient = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) {
        throw new Error('Perfil de usuário não encontrado');
      }

      // Criar paciente fictício para teste
      const { data: patient, error } = await supabase
        .from('patients')
        .insert([{
          tenant_id: profile.tenant_id,
          patient_ref: `TEST_${Date.now()}`,
          age: 35,
          cpf: '000.000.000-00',
          phone: '(11) 99999-9999',
          address: 'Rua Teste, 123',
          city: 'São Paulo',
          state: 'SP',
          gender: 'masculino',
          notes: 'Paciente criado automaticamente para teste de análise'
        }])
        .select()
        .single();

      if (error) throw error;
      
      return patient;
    } catch (error) {
      console.error('Erro ao criar paciente de teste:', error);
      throw error;
    }
  };

  const testAnalysisWithSampleImage = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      // 1. Criar paciente fictício
      toast.info('Criando paciente de teste...');
      const patient = await createTestPatient();
      
      // 2. Obter dados do usuário
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('Perfil não encontrado');

      // 3. Simular imagem fictícia usando uma imagem sample que existe no public
      toast.info('Preparando imagem de teste...');
      
      // Buscar a imagem sample que existe no projeto
      const response = await fetch('/sample-dental-image.jpg');
      if (!response.ok) {
        throw new Error('Imagem de amostra não encontrada');
      }
      
      const blob = await response.blob();
      const file = new File([blob], 'test-dental-image.jpg', { type: 'image/jpeg' });

      // 4. Preparar FormData para análise
      const formData = new FormData();
      formData.append('file_0', file, 'test-dental-image.jpg');
      formData.append('patientId', patient.id);
      formData.append('examType', 'panoramic');
      formData.append('tenantId', profile.tenant_id);

      // 5. Fazer upload e análise
      toast.info('Enviando para análise de IA...');
      const { data: { session } } = await supabase.auth.getSession();
      
      const analysisResponse = await fetch(
        `https://blwnzwkkykaobmclsvxg.supabase.co/functions/v1/dental-analysis-v2`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: formData,
        }
      );

      const result = await analysisResponse.json();

      if (!analysisResponse.ok || !result.success) {
        throw new Error(result.error || result.message || 'Erro na análise');
      }

      // 6. Buscar resultados da análise
      let analysisData = null;
      if (result.exam_id) {
        const { data: examData } = await supabase
          .from('exams')
          .select(`
            *,
            dental_images (
              id,
              ai_analysis,
              analysis_confidence,
              processing_status,
              findings
            )
          `)
          .eq('id', result.exam_id)
          .single();
        
        analysisData = examData;
      }

      setTestResult({
        success: true,
        message: 'Teste de análise concluído com sucesso!',
        examId: result.exam_id,
        patientId: patient.id,
        processed_images: result.processed_images || 1,
        analysis_results: analysisData
      });

      toast.success('Análise de teste concluída com sucesso!');

    } catch (error: any) {
      console.error('Erro no teste de análise:', error);
      setTestResult({
        success: false,
        message: `Erro no teste: ${error.message}`
      });
      toast.error(`Falha no teste: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Teste de Análise Dental com IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Este teste criará um paciente fictício e analisará uma imagem de amostra para verificar 
          se a API de análise dental está funcionando corretamente.
        </p>
        
        <Button 
          onClick={testAnalysisWithSampleImage} 
          disabled={testing}
          className="w-full"
          size="lg"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executando Teste...
            </>
          ) : (
            <>
              <FileImage className="mr-2 h-4 w-4" />
              Executar Teste de Análise Completa
            </>
          )}
        </Button>

        {testResult && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <Badge variant="default" className="bg-green-500">Sucesso</Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <Badge variant="destructive">Falha</Badge>
                </>
              )}
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="font-medium mb-2">Resultado do Teste:</p>
              <p className="text-sm">{testResult.message}</p>
              
              {testResult.success && testResult.examId && (
                <div className="mt-3 space-y-2 text-sm">
                  <p><strong>ID do Exame:</strong> {testResult.examId}</p>
                  <p><strong>ID do Paciente:</strong> {testResult.patientId}</p>
                  <p><strong>Imagens Processadas:</strong> {testResult.processed_images}</p>
                  
                  {testResult.analysis_results && (
                    <div className="mt-3">
                      <p className="font-medium">Detalhes da Análise:</p>
                      <pre className="text-xs bg-background p-2 rounded mt-2 overflow-auto max-h-40">
                        {JSON.stringify(testResult.analysis_results, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          ℹ️ O teste utiliza a imagem de amostra disponível em /sample-dental-image.jpg
        </div>
      </CardContent>
    </Card>
  );
};