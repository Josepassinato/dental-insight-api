import { supabase } from "@/integrations/supabase/client";

export interface VertexResponse {
  ok: boolean;
  data?: any;
  error?: string;
}

export async function vertexGenerate(prompt: string): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke('vertex-gemini-test', {
      body: { prompt }
    });

    if (error) {
      throw new Error(error.message || 'Vertex AI function error');
    }

    if (!data.ok) {
      throw new Error(data.error || 'Vertex AI error');
    }

    return data.data;
  } catch (error) {
    console.error('Vertex client error:', error);
    throw error;
  }
}