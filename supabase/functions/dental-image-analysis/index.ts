import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey =
  Deno.env.get('OPENAI_API_KEY') ||
  Deno.env.get('OPENAI_PROJECT_KEY') ||
  Deno.env.get('Dental ai') ||
  Deno.env.get('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');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let examIdGlobal: string | null = null;

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse body safely
    let body: any = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }
    const examId = body?.examId as string | undefined;
    examIdGlobal = examId || null;

    if (!openAIApiKey) {
      console.error('Missing OpenAI API key. Please set OPENAI_API_KEY (or "Dental ai") in Supabase Edge Function secrets.');
      if (examId) {
        try {
          await supabase
            .from('exams')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', examId);
          await supabase
            .from('dental_images')
            .update({ processing_status: 'failed', ai_analysis: { error: 'Missing OPENAI_API_KEY' } })
            .eq('exam_id', examId);
        } catch (markErr) {
          console.error('Failed to mark exam/images as failed due to missing key:', markErr);
        }
      }
      return new Response(
        JSON.stringify({ error: 'OPENAI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!examId) {
      throw new Error('Missing examId');
    }

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

        // Convert to base64 and ensure valid image MIME
        const arrayBuffer = await imageData.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        const inferMimeFromPath = (path: string | undefined | null): string | null => {
          const lower = (path || '').toLowerCase();
          if (lower.endsWith('.png')) return 'image/png';
          if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
          if (lower.endsWith('.webp')) return 'image/webp';
          if (lower.endsWith('.gif')) return 'image/gif';
          if (lower.endsWith('.bmp')) return 'image/bmp';
          if (lower.endsWith('.tif') || lower.endsWith('.tiff')) return 'image/tiff';
          if (lower.endsWith('.dcm') || lower.endsWith('.dicom')) return 'application/dicom';
          return null;
        };

        let mime = (image?.mime_type as string) || (imageData as Blob)?.type || inferMimeFromPath(image?.file_path) || 'image/jpeg';
        if (!mime.startsWith('image/')) {
          // If it's DICOM or unknown, default to jpeg for analysis
          mime = mime === 'application/dicom' ? 'image/jpeg' : (inferMimeFromPath(image?.file_path) || 'image/jpeg');
        }
        console.log('Preparing image for AI:', { id: image.id, path: image.file_path, dbMime: image?.mime_type, blobMime: (imageData as Blob)?.type, usedMime: mime, size: (arrayBuffer?.byteLength || 0) });

        const dataUrl = `data:${mime};base64,${base64}`;

        // Ultra-High Precision Dental AI Analysis - Medical Grade
        const analysisPrompt = `
          ESPECIALISTA EM RADIOLOGIA ODONTOLÓGICA AVANÇADA
          Análise com precisão de nível Google Medical AI - máxima acurácia diagnóstica

          PROTOCOLO DE ANÁLISE ULTRA-PRECISA:
          
          1. ANÁLISE MULTI-ETAPAS OBRIGATÓRIA:
             ETAPA 1 - QUALIDADE DA IMAGEM:
             • Resolução: adequada (>300 DPI), adequada parcial (200-300 DPI), inadequada (<200 DPI)
             • Contraste: ótimo (estruturas nítidas), bom (detalhes visíveis), ruim (low contrast)
             • Artefatos: ausentes, mínimos (não interferem), significativos (limitam diagnóstico)
             • Posicionamento: correto, aceitável, inadequado
             • Qualidade geral: 1-10 (rejeitar se <6)
             
             ETAPA 2 - VALIDAÇÃO ANATÔMICA:
             • Identifique TODOS os dentes visíveis com FDI
             • Marque estruturas anatômicas: seio maxilar, canal mandibular, forame mentoniano
             • Confirme se é radiografia periapical, bite-wing, panorâmica ou foto intraoral
             • Verifique sobreposições que limitam diagnóstico
             
             ETAPA 3 - DETECÇÃO DIFERENCIAL:
             • Compare com variações anatômicas normais
             • Diferencie patologias de artefatos de imagem
             • Confirme achados com múltiplas evidências radiográficas
             • Cross-reference com padrões epidemiológicos
          
          2. CRITÉRIOS DE PRECISÃO MÁXIMA:
             • Confidence mínimo 0.85 para diagnósticos principais
             • Confidence mínimo 0.75 para achados secundários  
             • Marque APENAS achados com evidência radiográfica inequívoca
             • Use "suspeita de" para achados borderline (confidence 0.6-0.74)
             • Rejeite false positives comuns: sobreposições, burn-out, anatomia normal
          
          3. DIAGNÓSTICOS ESPECÍFICOS VALIDADOS:
             CÁRIES - Critérios rigorosos:
             • Inicial: descontinuidade do esmalte, radiolucência localizada
             • Dentina: radiolucência estendida, forma cônica característica  
             • Pulpar: comunicação visível com câmara pulpar
             • Secundária: radiolucência marginal em restaurações
             
             PERIODONTAL - Evidências claras:
             • Perda óssea: medição em mm, horizontal vs vertical
             • Alargamento do espaço periodontal
             • Lâmina dura interrompida
             
             ENDODONTIA - Sinais patognomônicos:
             • Radiolucência periapical >2mm
             • Perda da lâmina dura apical
             • Reabsorção radicular externa/interna
             
             RESTAURAÇÕES - Avaliação técnica:
             • Adaptação marginal inadequada
             • Excesso/déficit de material
             • Recidiva de cárie (radiolucência marginal)
          
          4. SISTEMA FDI RIGOROSO:
             • Adultos: 11-18, 21-28, 31-38, 41-48
             • Decíduos: 51-55, 61-65, 71-75, 81-85
             • Verificação cruzada com anatomia e idade estimada
          
          5. COORDENADAS ULTRA-PRECISAS:
             • Bbox ajustado às dimensões exatas da lesão
             • Margem de 2-3 pixels para visualização
             • Múltiplos pontos para lesões extensas
          
          6. CORES DIAGNÓSTICAS VALIDADAS:
             • Cárie inicial: #FF6B6B (vermelho claro)
             • Cárie extensa: #FF0000 (vermelho intenso)
             • Periodontal: #FF8C00 (laranja)
             • Endodontia: #8A2BE2 (roxo)
             • Restauração: #1E90FF (azul)
             • Cálculo: #32CD32 (verde)
             • Patologia: #FF1493 (rosa)
             • Suspeita: #FFD700 (amarelo)
          
          RESPOSTA EM JSON MÉDICO ULTRA-ESTRUTURADO:
          {
            "image_quality_analysis": {
              "resolution_score": 9.2,
              "contrast_score": 8.8,
              "artifact_level": "mínimos",
              "positioning_score": 9.0,
              "overall_quality": 8.8,
              "diagnostic_adequacy": "excelente",
              "limitations": []
            },
            "anatomical_validation": {
              "image_type": "periapical",
              "visible_teeth": ["16", "15", "14"],
              "anatomical_landmarks": ["seio_maxilar", "crista_alveolar"],
              "positioning_accuracy": "correto",
              "coverage_completeness": 95
            },
            "findings": [
              {
                "tooth_number": "16",
                "finding_type": "carie_oclusal_profunda",
                "clinical_severity": "moderada",
                "confidence": 0.92,
                "evidence_strength": "inequívoca",
                "bbox": {"x": 245, "y": 156, "width": 34, "height": 30},
                "precise_location": "face oclusal, região mesio-oclusal",
                "depth_assessment": "dentina média a profunda",
                "radiographic_signs": [
                  "radiolucência oclusal bem definida",
                  "extensão em dentina com forma cônica",
                  "esmalte íntegro nas margens"
                ],
                "differential_diagnosis": ["cárie ativa", "cavitação estabelecida"],
                "description": "Cárie oclusal bem estabelecida em primeiro molar superior direito (16), com cavitação evidente atingindo dentina média a profunda. Radiografia mostra radiolucência típica com bordas bem definidas.",
                "clinical_recommendations": [
                  "Restauração direta com resina composta",
                  "Teste de vitalidade pulpar pré-operatório", 
                  "Isolamento absoluto durante procedimento",
                  "Proteção pulpar se necessário"
                ],
                "urgency": "moderada",
                "treatment_complexity": "baixa",
                "prognosis": "excelente",
                "icd_code": "K02.1",
                "follow_up_needed": true,
                "estimated_appointment_time": "45min"
              }
            ],
            "overlay_instructions": [
              {
                "type": "rectangle",
                "bbox": {"x": 245, "y": 156, "width": 34, "height": 30},
                "color": "#FF0000",
                "thickness": 3,
                "label": "Cárie 16",
                "opacity": 0.85,
                "annotation_details": {
                  "severity_indicator": "●●○○",
                  "confidence_display": "92%",
                  "urgency_color": "#FF8C00"
                }
              }
            ],
            "precision_metrics": {
              "analysis_method": "multi_stage_validation",
              "false_positive_checks": "passed",
              "cross_reference_validation": "confirmed",
              "peer_review_simulation": "approved",
              "diagnostic_certainty": 0.92,
              "margin_of_error": 0.05
            },
            "clinical_summary": {
              "total_findings": 1,
              "validated_findings": 1,
              "suspected_findings": 0,
              "rejected_findings": 0,
              "severity_distribution": {"leve": 0, "moderada": 1, "severa": 0, "critica": 0},
              "primary_diagnosis": "Cárie dental oclusal estabelecida",
              "secondary_diagnoses": [],
              "treatment_priority": "moderada",
              "treatment_urgency": "eletiva_prioritária",
              "estimated_treatment_sessions": 1,
              "total_treatment_time": "45min",
              "clinical_recommendations": [
                "Procedimento restaurador direto em dente 16",
                "Avaliação completa de higiene oral",
                "Orientações de prevenção",
                "Controle em 6 meses"
              ],
              "radiographic_quality": 8.8,
              "diagnostic_confidence": 0.92,
              "diagnostic_accuracy_estimate": 0.95,
              "requires_additional_exams": false,
              "contraindications": [],
              "risk_factors": ["higiene inadequada", "dieta cariogênica"],
              "prevention_recommendations": [
                "Escovação com pasta fluoretada",
                "Uso de fio dental diário",
                "Redução de açúcares"
              ]
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
                role: 'system',
                content: 'Você é um sistema de IA médica ultra-preciso para análise radiográfica dental. Sua precisão diagnóstica deve rivalizar com especialistas em radiologia odontológica. JAMAIS gere falsos positivos. Use confiança mínima de 0.85 para diagnósticos principais.'
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: analysisPrompt },
                  { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
                ]
              }
            ],
            max_completion_tokens: 3000,
          }),
        });

        const aiResult = await openAIResponse.json();
        
        if (!openAIResponse.ok) {
          throw new Error(`OpenAI error: ${aiResult.error?.message || 'Unknown error'}`);
        }

        const analysis = JSON.parse(aiResult.choices[0].message.content);
        
        // Validation & Quality Control
        if (analysis.image_quality_analysis?.overall_quality < 6) {
          throw new Error('Qualidade de imagem inadequada para análise precisa');
        }
        
        // Filter high-confidence findings only
        if (analysis.findings) {
          analysis.findings = analysis.findings.filter(f => f.confidence >= 0.75);
        }
        
        console.log('Ultra-precise AI Analysis completed for image:', image.id, 
          `Quality: ${analysis.image_quality_analysis?.overall_quality}/10, 
           Findings: ${analysis.findings?.length || 0}, 
           Avg Confidence: ${analysis.clinical_summary?.diagnostic_confidence}`);
        

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
                severity: finding.clinical_severity || finding.severity,
                confidence: finding.confidence,
                bbox_coordinates: finding.bbox,
                description: finding.description,
                clinical_recommendations: finding.clinical_recommendations || [],
                urgency: finding.urgency || 'normal',
                icd_code: finding.icd_code,
                evidence_strength: finding.evidence_strength || 'moderate',
                radiographic_signs: finding.radiographic_signs || [],
                treatment_complexity: finding.treatment_complexity,
                prognosis: finding.prognosis,
                estimated_treatment_time: finding.estimated_appointment_time
              });
          }
        }

        // Update image with comprehensive clinical AI analysis
        await supabase
          .from('dental_images')
          .update({ 
            ai_analysis: analysis,
            findings: analysis.findings || [],
            analysis_confidence: analysis.clinical_summary?.diagnostic_confidence || 0.8,
            overlay_file_path: overlayPath,
            processed_overlay_at: overlayPath ? new Date().toISOString() : null,
            processing_status: 'completed'
          })
          .eq('id', image.id);

        analysisResults.push(analysis.clinical_summary || analysis.summary || analysis);

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

    // Generate comprehensive clinical exam summary
    const examSummary = {
      total_images: exam.dental_images.length,
      analyzed_images: analysisResults.length,
      radiographic_quality: analysisResults.reduce((acc, r) => acc + (r.radiographic_quality || 8), 0) / analysisResults.length,
      diagnostic_confidence: analysisResults.reduce((acc, r) => acc + (r.diagnostic_confidence || 0.8), 0) / analysisResults.length,
      total_findings: analysisResults.reduce((acc, r) => acc + (r.total_findings || 0), 0),
      severity_breakdown: {
        leve: analysisResults.reduce((acc, r) => acc + ((r.severity_distribution?.leve) || 0), 0),
        moderada: analysisResults.reduce((acc, r) => acc + ((r.severity_distribution?.moderada) || 0), 0),
        severa: analysisResults.reduce((acc, r) => acc + ((r.severity_distribution?.severa) || 0), 0),
        critica: analysisResults.reduce((acc, r) => acc + ((r.severity_distribution?.critica) || 0), 0)
      },
      primary_diagnoses: [...new Set(analysisResults.map(r => r.primary_diagnosis).filter(Boolean))],
      treatment_priorities: analysisResults.map(r => r.treatment_priority).filter(Boolean),
      estimated_sessions: analysisResults.reduce((acc, r) => acc + (r.estimated_treatment_sessions || 0), 0),
      clinical_recommendations: [...new Set(analysisResults.flatMap(r => r.clinical_recommendations || []))],
      requires_additional_exams: analysisResults.some(r => r.requires_additional_exams),
      analysis_date: new Date().toISOString(),
      medical_summary: `Análise radiográfica completa com ${analysisResults.length} imagens processadas. Qualidade diagnóstica média: ${(analysisResults.reduce((acc, r) => acc + (r.radiographic_quality || 8), 0) / analysisResults.length).toFixed(1)}/10`
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

    // Try to mark exam/images as failed so UI doesn't stay in "pending"
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      if (examIdGlobal) {
        await supabase
          .from('exams')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', examIdGlobal);
        await supabase
          .from('dental_images')
          .update({ processing_status: 'failed', ai_analysis: { error: String((error as any)?.message || error) } })
          .eq('exam_id', examIdGlobal);
      }
    } catch (markErr) {
      console.error('Also failed to mark exam/images as failed:', markErr);
    }
    
    return new Response(
      JSON.stringify({ 
        error: (error as any)?.message || 'Internal server error'
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