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

        // Advanced dental analysis with OpenAI GPT-4o (vision model)
        const analysisPrompt = `
          Como especialista em radiologia odontológica, analise esta imagem dental e forneça:
          
          1. DETECÇÕES ESPECÍFICAS com coordenadas precisas:
             - Cáries (localização, severidade)
             - Perda óssea periodontal
             - Restaurações defeituosas
             - Cálculos dentários
             - Gengivite/periodontite
             - Impactações
             - Fraturas
          
          2. Para cada detecção, especifique:
             - tooth_number: número do dente (1-32 ou notação FDI)
             - finding_type: tipo específico
             - severity: "leve", "moderada", "severa"
             - confidence: valor 0.0-1.0
             - bbox: coordenadas {x, y, width, height} em pixels
             - description: descrição detalhada
          
          3. OVERLAY ANNOTATIONS:
             - Cores: cáries=vermelho, perda óssea=laranja, restaurações=azul, cálculo=verde
             - Formas: retângulos para detecções, setas para áreas de atenção
          
          Responda APENAS em JSON válido:
          {
            "findings": [
              {
                "tooth_number": "16",
                "finding_type": "carie",
                "severity": "moderada",
                "confidence": 0.85,
                "bbox": {"x": 120, "y": 80, "width": 40, "height": 35},
                "description": "Cárie oclusal em molar superior direito",
                "color": "#FF0000"
              }
            ],
            "overlay_instructions": [
              {
                "type": "rectangle",
                "bbox": {"x": 120, "y": 80, "width": 40, "height": 35},
                "color": "#FF0000",
                "thickness": 3,
                "label": "Cárie M1"
              }
            ],
            "summary": {
              "total_findings": 1,
              "severity_distribution": {"leve": 0, "moderada": 1, "severa": 0},
              "recommendations": ["Tratamento endodôntico em M1", "Acompanhamento periodontal"],
              "overall_score": 7.5
            }
          }
        `;

        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-5-2025-08-07',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: analysisPrompt },
                  { type: 'image_url', image_url: { url: dataUrl } }
                ]
              }
            ],
            max_completion_tokens: 2000,
          }),
        });

        const aiResult = await openAIResponse.json();
        
        if (!openAIResponse.ok) {
          throw new Error(`OpenAI error: ${aiResult.error?.message || 'Unknown error'}`);
        }

        const analysis = JSON.parse(aiResult.choices[0].message.content);
        console.log('AI Analysis completed for image:', image.id, analysis);

        // Generate overlay PNG if we have overlay instructions
        let overlayPath = null;
        if (analysis.overlay_instructions && analysis.overlay_instructions.length > 0) {
          overlayPath = await generateOverlay(image, analysis.overlay_instructions, supabase);
        }

        // Store structured findings in dental_findings table
        if (analysis.findings && analysis.findings.length > 0) {
          for (const finding of analysis.findings) {
            await supabase
              .from('dental_findings')
              .insert({
                dental_image_id: image.id,
                tenant_id: exam.tenant_id,
                tooth_number: finding.tooth_number,
                finding_type: finding.finding_type,
                severity: finding.severity,
                confidence: finding.confidence,
                bbox_coordinates: finding.bbox,
                description: finding.description
              });
          }
        }

        // Update image with comprehensive AI analysis
        await supabase
          .from('dental_images')
          .update({ 
            ai_analysis: analysis,
            findings: analysis.findings || [],
            analysis_confidence: analysis.summary?.overall_score / 10 || 0.8,
            overlay_file_path: overlayPath,
            processed_overlay_at: overlayPath ? new Date().toISOString() : null,
            processing_status: 'completed'
          })
          .eq('id', image.id);

        analysisResults.push(analysis.summary || analysis);

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

    // Generate comprehensive exam summary
    const examSummary = {
      total_images: exam.dental_images.length,
      analyzed_images: analysisResults.length,
      avg_quality: analysisResults.reduce((acc, r) => acc + (r.overall_score || r.pontuacao || 7), 0) / analysisResults.length,
      total_findings: analysisResults.reduce((acc, r) => acc + (r.total_findings || 0), 0),
      severity_breakdown: {
        leve: analysisResults.reduce((acc, r) => acc + ((r.severity_distribution?.leve) || 0), 0),
        moderada: analysisResults.reduce((acc, r) => acc + ((r.severity_distribution?.moderada) || 0), 0),
        severa: analysisResults.reduce((acc, r) => acc + ((r.severity_distribution?.severa) || 0), 0)
      },
      recommendations: analysisResults.flatMap(r => r.recommendations || r.recomendacoes || []),
      analysis_date: new Date().toISOString()
    };

    // Update exam with final comprehensive results
    await supabase
      .from('exams')
      .update({ 
        status: 'completed',
        ai_analysis: examSummary,
        processed_at: new Date().toISOString(),
        processed_images: analysisResults.length
      })
      .eq('id', examId);

    console.log('Comprehensive exam analysis completed:', examId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        examId,
        summary: examSummary,
        message: 'Análise avançada com IA concluída - detecções específicas e overlays gerados'
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

// Function to generate overlay PNG with detections
async function generateOverlay(image: any, overlayInstructions: any[], supabase: any): Promise<string | null> {
  try {
    console.log('Generating overlay for image:', image.id);
    
    // Create canvas for overlay generation
    const canvas = new OffscreenCanvas(800, 600); // Default size, should be image dimensions
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }
    
    // Set transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw overlay annotations based on instructions
    for (const instruction of overlayInstructions) {
      ctx.strokeStyle = instruction.color || '#FF0000';
      ctx.lineWidth = instruction.thickness || 2;
      ctx.font = '14px Arial';
      ctx.fillStyle = instruction.color || '#FF0000';
      
      if (instruction.type === 'rectangle' && instruction.bbox) {
        const { x, y, width, height } = instruction.bbox;
        ctx.strokeRect(x, y, width, height);
        
        // Add label if provided
        if (instruction.label) {
          ctx.fillText(instruction.label, x, y - 5);
        }
      }
    }
    
    // Convert canvas to blob
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    
    // Generate unique filename for overlay
    const overlayFileName = `${image.exam_id}/overlays/${image.id}_overlay.png`;
    
    // Upload overlay to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dental-overlays')
      .upload(overlayFileName, blob, {
        contentType: 'image/png',
        upsert: true
      });
      
    if (uploadError) {
      console.error('Error uploading overlay:', uploadError);
      return null;
    }
    
    console.log('Overlay generated and uploaded:', overlayFileName);
    return overlayFileName;
    
  } catch (error) {
    console.error('Error generating overlay:', error);
    return null;
  }
}