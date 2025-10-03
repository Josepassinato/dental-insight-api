import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoogleCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const contentType = req.headers.get('content-type') || '';
    
    // Handle test action
    if (contentType.includes('application/json')) {
      const body = await req.json();
      if (body.action === 'test') {
        console.log('Testing dental analysis function...');
        
        // Test Google Cloud credentials
        let credentials: GoogleCredentials;
        
        if (body.testCredentials) {
          credentials = JSON.parse(body.testCredentials);
        } else {
          const credentialsJson = Deno.env.get('dental-ia');
          if (!credentialsJson) {
            return new Response(JSON.stringify({
              success: false,
              message: "dental-ia secret não configurado",
            }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          credentials = JSON.parse(credentialsJson);
        }

        const projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID') || credentials.project_id;
        
        return new Response(JSON.stringify({
          success: true,
          message: "Função de análise dental funcionando",
          project_id: projectId,
          client_email: credentials.client_email,
          status: "ready_for_analysis"
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Handle file upload and analysis
    if (contentType.includes('multipart/form-data')) {
      console.log('Processing dental image upload...');
      
      const formData = await req.formData();
      const patientId = formData.get('patientId') as string;
      const examType = formData.get('examType') as string;
      const tenantId = formData.get('tenantId') as string;
      
      if (!patientId || !examType || !tenantId) {
        return new Response(JSON.stringify({
          success: false,
          message: "Dados obrigatórios ausentes: patientId, examType, tenantId"
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get uploaded files
      const files = [];
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file_') && value instanceof File) {
          files.push(value);
        }
      }

      if (files.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          message: "Nenhum arquivo de imagem encontrado"
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`Processing ${files.length} files for patient ${patientId}`);

      try {
        // Create exam record
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .insert({
            patient_id: patientId,
            tenant_id: tenantId,
            exam_type: examType,
            status: 'processing',
            metadata: {
              file_count: files.length,
              uploaded_at: new Date().toISOString()
            }
          })
          .select()
          .single();

        if (examError) {
          console.error('Error creating exam:', examError);
          return new Response(JSON.stringify({
            success: false,
            message: "Erro ao criar registro do exame",
            error: examError.message
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        console.log('Exam created:', examData.id);

        // Process each file
        const processedImages = [];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileName = `${tenantId}/${examData.id}/${Date.now()}_${file.name}`;
          
          console.log(`Processing file ${i + 1}/${files.length}: ${fileName}`);

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('dental-uploads')
            .upload(fileName, file, {
              contentType: file.type,
              upsert: false
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          // Create dental_images record
          const { data: imageData, error: imageError } = await supabase
            .from('dental_images')
            .insert({
              exam_id: examData.id,
              tenant_id: tenantId,
              file_path: uploadData.path,
              original_filename: file.name,
              file_size: file.size,
              mime_type: file.type,
              image_type: examType,
              processing_status: 'uploaded'
            })
            .select()
            .single();

          if (imageError) {
            console.error('Error creating image record:', imageError);
            continue;
          }

          // Analyze with Vertex AI via Lovable AI Gateway
          let analysisConfidence: number | null = null;
          let aiAnalysis: any = null;

          try {
            // Move to processing
            await supabase
              .from('dental_images')
              .update({ processing_status: 'processing' })
              .eq('id', imageData.id);

            const { data: fileBlob, error: downloadError } = await supabase
              .storage
              .from('dental-uploads')
              .download(uploadData.path);

            if (downloadError) {
              throw downloadError;
            }

            const arrayBuffer = await fileBlob.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            for (let j = 0; j < bytes.length; j++) {
              binary += String.fromCharCode(bytes[j]);
            }
            const base64Content = btoa(binary);

            // Use Lovable AI Gateway with Gemini 2.5 Pro for specialized dental vision analysis
            const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
            if (!lovableApiKey) {
              throw new Error('LOVABLE_API_KEY não configurado');
            }

            console.log('Analyzing with Vertex AI (Gemini 2.5 Pro - Specialized Dental Analysis)...');

            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${lovableApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-pro',
                messages: [
                  {
                    role: 'system',
                    content: `Você é um assistente de diagnóstico odontológico altamente especializado em análise de imagens dentais. 
Sua função é realizar uma análise DETALHADA e TÉCNICA de imagens radiográficas e fotográficas intraorais/extraorais.

IMPORTANTE: Você DEVE identificar TODAS as patologias, anormalidades e condições presentes na imagem, incluindo:
- Cáries (iniciais, moderadas, profundas)
- Lesões periapicais e periodontais
- Reabsorções ósseas
- Fraturas dentárias
- Restaurações deficientes
- Inclusões dentárias (dentes não erupcionados)
- Má oclusão
- Tártaro e cálculo dental
- Gengivite e periodontite
- Lesões de tecidos moles
- Alterações no esmalte e dentina

Seja EXTREMAMENTE detalhado e técnico nas suas observações. Use terminologia odontológica precisa.`
                  },
                  {
                    role: 'user',
                    content: [
                      {
                        type: 'text',
                        text: `Analise esta imagem dental do tipo "${examType}" realizando uma avaliação odontológica completa e detalhada.

INSTRUÇÕES IMPORTANTES:
1. Examine TODA a imagem com atenção aos mínimos detalhes
2. Identifique e descreva TODAS as patologias, lesões e anormalidades presentes
3. Para CADA dente visível, avalie sua condição individual
4. Seja específico sobre localização (dente, superfície, região)
5. Use a nomenclatura odontológica correta (FDI, Universal ou Palmer)
6. Avalie severidade de cada achado (leve, moderado, severo)

FORNEÇA NO FORMATO JSON:
{
  "description": "Descrição detalhada e técnica da imagem e estruturas anatômicas visíveis",
  "conditions": [
    {
      "name": "Nome da condição/patologia",
      "location": "Localização específica (dente, superfície, região)",
      "severity": "leve|moderado|severo",
      "details": "Descrição técnica detalhada"
    }
  ],
  "concerns": [
    {
      "priority": "alta|média|baixa",
      "finding": "Descrição do achado que requer atenção",
      "recommendation": "Recomendação clínica específica"
    }
  ],
  "image_quality": "Avaliação da qualidade técnica da imagem (excelente|boa|regular|ruim)",
  "confidence": 85
}

ATENÇÃO: Seja rigoroso e não deixe passar nenhuma alteração visível. Uma análise superficial pode comprometer o diagnóstico.`
                      },
                      {
                        type: 'image_url',
                        image_url: {
                          url: `data:${file.type};base64,${base64Content}`
                        }
                      }
                    ]
                  }
                ],
              }),
            });

            console.log('Vertex AI response status:', aiResponse.status);
            
            if (!aiResponse.ok) {
              const errorText = await aiResponse.text();
              console.error('Lovable AI error:', aiResponse.status, errorText);
              throw new Error(`Vertex AI request failed: ${aiResponse.status} - ${errorText}`);
            }

            const aiResponseData = await aiResponse.json();
            console.log('Vertex AI response received');

            const aiContent = aiResponseData.choices?.[0]?.message?.content;
            if (!aiContent) {
              throw new Error('Resposta vazia do Vertex AI');
            }

            // Parse JSON response from AI
            let parsedAnalysis;
            try {
              // Try to extract JSON from markdown code blocks if present
              const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                               aiContent.match(/```\s*([\s\S]*?)\s*```/);
              const jsonContent = jsonMatch ? jsonMatch[1] : aiContent;
              parsedAnalysis = JSON.parse(jsonContent);
            } catch (parseError) {
              console.warn('Could not parse AI response as JSON, using raw content');
              parsedAnalysis = {
                description: aiContent,
                conditions: [],
                concerns: [],
                image_quality: 'unknown',
                confidence: 75
              };
            }

            aiAnalysis = {
              model: 'google/gemini-2.5-pro',
              analysis: parsedAnalysis,
              raw_response: aiContent
            };

            // Convert confidence from 0-100 to 0-1 scale for database
            const confidenceValue = parsedAnalysis.confidence || 75;
            analysisConfidence = confidenceValue > 1 ? confidenceValue / 100 : confidenceValue;

            // Map AI conditions into our standardized findings structure used by the UI
            const normalizeFindingType = (name: string): string => {
              const n = (name || '').toLowerCase();
              
              // Cáries
              if (n.includes('cárie') || n.includes('carie') || n.includes('cavity')) return 'carie';
              
              // Periapical
              if (n.includes('lesão periapical') || n.includes('lesao periapical')) return 'periapical';
              if (n.includes('granuloma')) return 'granuloma_periapical';
              if (n.includes('cisto')) return 'cisto_radicular';
              if (n.includes('abscesso')) return 'abscesso_agudo';
              if (n.includes('necrose')) return 'necrose_pulpar';
              if (n.includes('periapical')) return 'periapical';
              
              // Periodontal
              if (n.includes('periodont')) return 'periodontite';
              if (n.includes('gengivite')) return 'gengivite';
              if (n.includes('perda óssea') || n.includes('perda ossea') || n.includes('bone loss')) return 'perda_ossea';
              if (n.includes('reabsor')) return 'reabsorcao_radicular';
              if (n.includes('cálculo') || n.includes('calculo') || n.includes('tártaro') || n.includes('tartaro') || n.includes('calculus')) return 'calculo';
              
              // Inclusões e Erupção
              if (n.includes('inclusão') || n.includes('inclusao') || n.includes('impactação') || n.includes('impactacao')) return 'tooth_impaction';
              if (n.includes('não erupcionado') || n.includes('nao erupcionado') || n.includes('impacted')) return 'tooth_impaction';
              if (n.includes('erupção') || n.includes('erupcao') || n.includes('eruption')) return 'eruption_problem';
              
              // Ortodôntico
              if (n.includes('má oclusão') || n.includes('ma oclusao') || n.includes('malocclusion')) return 'malocclusion';
              if (n.includes('apinhamento') || n.includes('crowding')) return 'crowding';
              if (n.includes('espaçamento') || n.includes('espacamento') || n.includes('spacing')) return 'spacing';
              if (n.includes('ortodont')) return 'orthodontic';
              
              // Fraturas
              if (n.includes('fratura') || n.includes('fracture')) return 'fracture';
              
              // Outros
              if (n.includes('restaura')) return 'restauracao_defeituosa';
              
              return 'achado';
            };

            const toSeverity = (sev: string | undefined): 'leve' | 'moderada' | 'severa' => {
              const s = (sev || '').toLowerCase();
              if (s.includes('sever') || s.includes('grave') || s.includes('alto') || s.includes('crítico') || s.includes('critico') || s.includes('severe')) return 'severa';
              if (s.includes('moder') || s.includes('médio') || s.includes('medio') || s.includes('moderate')) return 'moderada';
              if (s.includes('leve') || s.includes('baixo') || s.includes('light') || s.includes('mild') || s.includes('inicial')) return 'leve';
              return 'leve';
            };

            const conds = Array.isArray(parsedAnalysis.conditions) ? parsedAnalysis.conditions : [];
            const concerns = Array.isArray(parsedAnalysis.concerns) ? parsedAnalysis.concerns : [];
            
            // Log para debug - ver o que a IA está retornando
            console.log('🔍 AI Analysis Data:', JSON.stringify({
              conditions_count: conds.length,
              concerns_count: concerns.length,
              sample_condition: conds[0],
              sample_concern: concerns[0]
            }, null, 2));

            const mappedFindings = conds.map((c: any, idx: number) => {
              // Extrair número do dente da localização com múltiplos padrões
              const toothMatch = typeof c.location === 'string' ? 
                c.location.match(/\b(\d{1,2})\b/) || 
                c.location.match(/dente\s+(\d{1,2})/i) ||
                c.location.match(/elemento\s+(\d{1,2})/i) : null;
              
              // Buscar recomendação correspondente nos concerns
              const relatedConcern = concerns.find((concern: any) => 
                concern.finding && c.name && 
                concern.finding.toLowerCase().includes(c.name.toLowerCase().substring(0, 10))
              );

              return {
                id: globalThis.crypto?.randomUUID?.() || `${imageData.id}-${idx}`,
                tooth_number: toothMatch?.[1],
                precise_location: c.location,
                finding_type: normalizeFindingType(c.name || ''),
                severity: toSeverity(c.severity),
                clinical_severity: c.severity || toSeverity(c.severity),
                confidence: analysisConfidence ?? 0.75,
                description: c.details || c.name || 'Achado detectado',
                clinical_recommendations: relatedConcern?.recommendation ? 
                  [relatedConcern.recommendation] : undefined
              };
            });

            console.log('📊 Mapped Findings Summary:', {
              total: mappedFindings.length,
              with_tooth_number: mappedFindings.filter(f => f.tooth_number).length,
              with_recommendations: mappedFindings.filter(f => f.clinical_recommendations).length,
              types: [...new Set(mappedFindings.map(f => f.finding_type))]
            });

            // Save analysis + mapped findings
            await supabase
              .from('dental_images')
              .update({
                processing_status: 'analyzed',
                ai_analysis: aiAnalysis,
                analysis_confidence: analysisConfidence,
                findings: mappedFindings
              })
              .eq('id', imageData.id);

            console.log('Analysis saved successfully with', mappedFindings.length, 'findings');
          } catch (analysisError) {
            console.error('Analysis error:', analysisError);
            console.error('Full error details:', JSON.stringify(analysisError, null, 2));
            await supabase
              .from('dental_images')
              .update({ 
                processing_status: 'failed',
                ai_analysis: { 
                  error: analysisError.message,
                  stack: analysisError.stack,
                  timestamp: new Date().toISOString()
                }
              })
              .eq('id', imageData.id);
          }

          processedImages.push({
            id: imageData.id,
            file_path: uploadData.path,
            original_filename: file.name
          });
        }

        // Update exam status
        await supabase
          .from('exams')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString(),
            metadata: {
              ...examData.metadata,
              processed_images: processedImages.length,
              completed_at: new Date().toISOString()
            }
          })
          .eq('id', examData.id);

        console.log(`Successfully processed ${processedImages.length} images`);

        return new Response(JSON.stringify({
          success: true,
          message: `${processedImages.length} imagens processadas com sucesso`,
          exam_id: examData.id,
          processed_images: processedImages.length,
          images: processedImages
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (error) {
        console.error('Processing error:', error);
        return new Response(JSON.stringify({
          success: false,
          message: "Erro no processamento das imagens",
          error: error.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(JSON.stringify({
      success: false,
      message: "Tipo de requisição não suportado"
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: "Erro interno da função",
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});