import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { examId } = await req.json();

    console.log('Starting AI analysis for exam:', examId);

    // Get exam and images
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*, dental_images(*)')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      throw new Error('Exam not found');
    }

    // Update exam status to processing
    await supabase
      .from('exams')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', examId);

    // Process each image
    const analysisResults = [];
    
    for (const image of exam.dental_images) {
      console.log('Analyzing image:', image.id);

      // Update image status to processing
      await supabase
        .from('dental_images')
        .update({ processing_status: 'processing' })
        .eq('id', image.id);

      try {
        // Get the image from storage
        const { data: imageData } = await supabase.storage
          .from('dental-uploads')
          .download(image.file_path);

        if (!imageData) {
          throw new Error('Failed to download image');
        }

        // Convert to base64
        const arrayBuffer = await imageData.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        const dataUrl = `data:${image.mime_type};base64,${base64}`;

        // Analyze with OpenAI
        const analysisPrompt = `
          Analise esta imagem radiográfica dental e forneça:
          1. Estruturas dentárias visíveis
          2. Possíveis alterações patológicas
          3. Qualidade da imagem
          4. Recomendações clínicas
          5. Pontuação de qualidade (1-10)
          
          Responda em formato JSON com as chaves: estruturas, alteracoes, qualidade, recomendacoes, pontuacao
        `;

        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: analysisPrompt },
                  { type: 'image_url', image_url: { url: dataUrl } }
                ]
              }
            ],
            max_tokens: 1000,
          }),
        });

        const aiResult = await openAIResponse.json();
        
        if (!openAIResponse.ok) {
          throw new Error(`OpenAI error: ${aiResult.error?.message || 'Unknown error'}`);
        }

        const analysis = JSON.parse(aiResult.choices[0].message.content);
        analysisResults.push(analysis);

        // Update image with AI analysis
        await supabase
          .from('dental_images')
          .update({ 
            ai_analysis: analysis,
            processing_status: 'completed'
          })
          .eq('id', image.id);

        console.log('Image analysis completed:', image.id);

      } catch (error) {
        console.error('Error analyzing image:', image.id, error);
        
        await supabase
          .from('dental_images')
          .update({ 
            processing_status: 'failed',
            ai_analysis: { error: error.message }
          })
          .eq('id', image.id);
      }
    }

    // Generate exam summary
    const examSummary = {
      total_images: exam.dental_images.length,
      analyzed_images: analysisResults.length,
      avg_quality: analysisResults.reduce((acc, r) => acc + (r.pontuacao || 0), 0) / analysisResults.length,
      findings: analysisResults.flatMap(r => r.alteracoes || []),
      recommendations: analysisResults.flatMap(r => r.recomendacoes || []),
      analysis_date: new Date().toISOString()
    };

    // Update exam with final results
    await supabase
      .from('exams')
      .update({ 
        status: 'completed',
        ai_analysis: examSummary,
        processed_at: new Date().toISOString(),
        processed_images: analysisResults.length
      })
      .eq('id', examId);

    console.log('Exam analysis completed:', examId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        examId,
        summary: examSummary
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in dental-image-analysis:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});