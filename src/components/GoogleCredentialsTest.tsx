import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const GoogleCredentialsTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connected' | 'disconnected'>('idle');
  const [details, setDetails] = useState<any>(null);
  const { toast } = useToast();

  const testConnection = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-google-credentials', {
        body: { action: 'test' }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setStatus('connected');
        setDetails(data);
        toast({
          title: "Sucesso!",
          description: data.message,
        });
      } else {
        setStatus('disconnected');
        setDetails(data);
        toast({
          title: "Erro",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Erro ao testar conexão:', error);
      setStatus('disconnected');
      toast({
        title: "Erro",
        description: error.message || "Falha ao testar a conexão",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Teste Google Cloud
          {status === 'connected' && <Badge variant="default">Conectado</Badge>}
          {status === 'disconnected' && <Badge variant="destructive">Desconectado</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testConnection} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Testando...' : 'Testar Conexão'}
        </Button>

        {details && (
          <div className="text-sm space-y-2">
            <div>
              <strong>Status:</strong> {details.status}
            </div>
            {details.project_id && (
              <div>
                <strong>Project ID:</strong> {details.project_id}
              </div>
            )}
            {details.client_email && (
              <div>
                <strong>Client Email:</strong> {details.client_email}
              </div>
            )}
            {details.error && (
              <div className="text-destructive">
                <strong>Erro:</strong> {details.error}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};