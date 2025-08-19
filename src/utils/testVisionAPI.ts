import { supabase } from "@/integrations/supabase/client";

export async function testVisionAPI(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Testando Cloud Vision API...');
    
    const { data, error } = await supabase.functions.invoke('dental-analysis-v2', {
      body: { action: 'test' }
    });

    if (error) {
      console.error('Erro na função:', error);
      return {
        success: false,
        message: `Erro na função: ${error.message}`
      };
    }

    if (data?.success) {
      console.log('✅ Cloud Vision API está funcionando!', data);
      return {
        success: true,
        message: `Cloud Vision API ativa - Projeto: ${data.project_id}`
      };
    } else {
      console.error('❌ Cloud Vision API com problemas:', data);
      return {
        success: false,
        message: data?.message || 'Erro desconhecido na API'
      };
    }
  } catch (error) {
    console.error('Erro no teste:', error);
    return {
      success: false,
      message: `Erro: ${error.message}`
    };
  }
}