import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { vertexGenerate } from "@/lib/vertexClient";
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

    // Test Google Auth
    try {
      const { data, error } = await supabase.functions.invoke('google-auth-test', {
        body: { action: 'test' }
      });

      if (error) throw error;

      setStatus(prev => ({
        ...prev,
        auth: data.success ? 'success' : 'error',
        authDetails: data,
        authError: data.success ? undefined : data.message
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
      const response = await vertexGenerate("Test connection");
      setStatus(prev => ({
        ...prev,
        vertex: 'success',
        vertexDetails: response
      }));
      toast.success("Conexões testadas com sucesso!");
    } catch (error: any) {
      setStatus(prev => ({
        ...prev,
        vertex: 'error',
        vertexError: error.message
      }));
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
              <span>Google Cloud Auth</span>
            </div>
            {getStatusBadge(status.auth)}
          </div>

          {status.authDetails && (
            <div className="text-sm text-muted-foreground pl-6">
              Project ID: {status.authDetails.project_id}<br />
              Client: {status.authDetails.client_email}
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
              <span>Vertex AI API</span>
            </div>
            {getStatusBadge(status.vertex)}
          </div>

          {status.vertexError && (
            <div className="text-sm text-red-500 pl-6">
              Erro: {status.vertexError}
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