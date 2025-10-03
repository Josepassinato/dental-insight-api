import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { vertexGenerate } from "@/lib/vertexClient";
import { testVisionAPI } from "@/utils/testVisionAPI";
import { toast } from "sonner";

interface ConnectionStatus {
  auth: 'loading' | 'success' | 'error';
  vertex: 'loading' | 'success' | 'error';
  authDetails?: any;
  vertexDetails?: any;
  authError?: string;
  vertexError?: string;
}

export const GoogleConnectionTest = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    auth: 'loading',
    vertex: 'loading'
  });
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    testConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const testConnections = async () => {
    setTesting(true);
    setStatus({ auth: 'loading', vertex: 'loading' });

    // Test Cloud Vision API
    try {
      const visionTest = await testVisionAPI();
      
      setStatus(prev => ({
        ...prev,
        auth: visionTest.success ? 'success' : 'error',
        authDetails: visionTest.success ? { message: visionTest.message } : null,
        authError: visionTest.success ? undefined : visionTest.message
      }));
    } catch (error: any) {
      setStatus(prev => ({
        ...prev,
        auth: 'error',
        authError: error.message
      }));
    }

    // Test Vertex AI
    try {
      console.log('🧪 Testando Vertex AI...');
      const response = await vertexGenerate("Olá, teste de conexão com Vertex AI Gemini!");
      
      console.log('✅ Vertex AI respondeu:', response);
      
      setStatus(prev => ({
        ...prev,
        vertex: 'success',
        vertexDetails: {
          message: 'Vertex AI conectado e funcionando!',
          response: response?.candidates?.[0]?.content?.parts?.[0]?.text || 'Resposta recebida'
        }
      }));
      toast.success("✅ Todas as conexões funcionando!");
    } catch (error: any) {
      console.error('❌ Erro no teste Vertex AI:', error);
      
      setStatus(prev => ({
        ...prev,
        vertex: 'error',
        vertexError: error.message || 'Erro desconhecido'
      }));
      
      // Mostrar toast específico para erro de billing
      if (error.message?.includes('BILLING_DISABLED') || error.message?.includes('billing')) {
        toast.error("❌ Billing desabilitado no Google Cloud", {
          description: "Ative a cobrança no projeto 'dental-ia'"
        });
      } else {
        toast.error("Erro ao testar Vertex AI", {
          description: error.message
        });
      }
    }

    setTesting(false);
  };

  const getStatusIcon = (state: 'loading' | 'success' | 'error') => {
    switch (state) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (state: 'loading' | 'success' | 'error') => {
    switch (state) {
      case 'loading':
        return <Badge variant="secondary">Testando...</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-500">Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Google Cloud - Status das Conexões
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testConnections} 
          disabled={testing}
          className="w-full"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testando Conexões...
            </>
          ) : (
            'Testar Conexões'
          )}
        </Button>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.auth)}
              <span>Cloud Vision API</span>
            </div>
            {getStatusBadge(status.auth)}
          </div>

          {status.authDetails && (
            <div className="text-sm text-muted-foreground pl-6">
              {status.authDetails.message}
            </div>
          )}

          {status.authError && (
            <div className="text-sm text-red-500 pl-6">
              Erro: {status.authError}
            </div>
          )}

          <div className="flex items-center justify-between p-3 border rounded">
            <div className="flex items-center gap-2">
              {getStatusIcon(status.vertex)}
              <span>Vertex AI API (Gemini)</span>
            </div>
            {getStatusBadge(status.vertex)}
          </div>

          {status.vertexDetails && (
            <div className="text-sm text-muted-foreground pl-6">
              ✅ {status.vertexDetails.message}
              {status.vertexDetails.response && (
                <div className="mt-1 text-xs italic">
                  Resposta: "{status.vertexDetails.response.substring(0, 100)}..."
                </div>
              )}
            </div>
          )}

          {status.vertexError && (
            <div className="text-sm text-red-500 pl-6 space-y-1">
              <div className="font-semibold">❌ Erro: {status.vertexError}</div>
              {status.vertexError.includes('billing') || status.vertexError.includes('BILLING_DISABLED') ? (
                <div className="text-xs">
                  👉 Ative o billing em: <a href="https://console.cloud.google.com/billing/linkedaccount?project=dental-ia" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          ✅ Segredos configurados: GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY, GOOGLE_CLOUD_PROJECT_ID
        </div>
      </CardContent>
    </Card>
  );
};