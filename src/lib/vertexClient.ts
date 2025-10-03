import { supabase } from "@/integrations/supabase/client";

export interface VertexResponse {
  ok: boolean;
  data?: any;
  error?: string;
}

export async function vertexGenerate(prompt: string): Promise<any> {
  try {
    console.log('🔵 Iniciando chamada para vertex-gemini-test...');
    
    const { data, error } = await supabase.functions.invoke('vertex-gemini-test', {
      body: { prompt }
    });

    console.log('📥 Resposta recebida:', { data, error });

    if (error) {
      console.error('❌ Erro na função:', error);
      throw new Error(`Erro na função: ${error.message || JSON.stringify(error)}`);
    }

    if (!data) {
      throw new Error('Sem dados na resposta');
    }

    if (!data.ok) {
      const errorMsg = data.error || 'Erro desconhecido na Vertex AI';
      console.error('❌ Vertex AI retornou erro:', errorMsg);
      
      // Verificar se é erro de billing
      if (errorMsg.includes('BILLING_DISABLED') || errorMsg.includes('403')) {
        throw new Error('❌ Billing desabilitado no projeto Google Cloud "dental-ia". Ative a cobrança em: https://console.cloud.google.com/billing');
      }
      
      throw new Error(errorMsg);
    }

    console.log('✅ Vertex AI respondeu com sucesso!');
    return data.data;
  } catch (error) {
    console.error('🔴 Erro no cliente Vertex:', error);
    throw error;
  }
}