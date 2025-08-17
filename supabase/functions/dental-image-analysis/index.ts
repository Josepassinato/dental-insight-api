import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as b64encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Cloud credentials
const gcpProjectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');
const serviceAccountKey = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY');
const gcpLocation = 'us-central1'; // Região padrão para Vertex AI

// Function to generate JWT token for Vertex AI authentication
async function generateAccessToken(): Promise<string> {
  console.log('🔑 [AUTH-1] Iniciando geração de token de acesso...');
  
  if (!serviceAccountKey) {
    console.error('❌ [AUTH-ERROR] GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY não encontrada');
    throw new Error('Missing GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY');
  }

  try {
    console.log('🔑 [AUTH-2] Processando service account key...');
    
    // Handle both base64 encoded and direct JSON formats
    let serviceAccountJson = serviceAccountKey;
    
    // Check if it's base64 encoded
    try {
      if (!serviceAccountKey.startsWith('{')) {
        console.log('🔑 [AUTH-3] Decodificando base64...');
        serviceAccountJson = atob(serviceAccountKey);
      } else {
        console.log('🔑 [AUTH-3] Usando JSON direto...');
      }
    } catch (e) {
      console.log('🔑 [AUTH-3] Falha no base64, usando como JSON string...');
      // If atob fails, assume it's already a JSON string
    }
    
    console.log('🔑 [AUTH-4] Parseando service account JSON...');
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Validar campos obrigatórios
    const requiredFields = ['client_email', 'private_key', 'project_id'];
    for (const field of requiredFields) {
      if (!serviceAccount[field]) {
        console.error(`❌ [AUTH-ERROR] Campo obrigatório ausente: ${field}`);
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    console.log('🔑 [AUTH-5] Service account válido. Email:', serviceAccount.client_email);
    console.log('🔑 [AUTH-6] Project ID:', serviceAccount.project_id);
    
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    console.log('🔑 [AUTH-7] Criando JWT header e payload...');
    
    // Create JWT header
    const header = {
      alg: 'RS256',
      typ: 'JWT',
    };

    // Base64 encode header and payload
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    console.log('🔑 [AUTH-8] Importando private key...');
    
    // Import private key
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      new Uint8Array(atob(serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|\n|-----END PRIVATE KEY-----/g, '')).split('').map(c => c.charCodeAt(0))),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    console.log('🔑 [AUTH-9] Assinando JWT...');
    
    // Sign the JWT
    const signatureData = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, signatureData);
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
    
    console.log('🔑 [AUTH-10] Trocando JWT por access token...');

    // Exchange JWT for access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [AUTH-ERROR] Token exchange failed: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const tokenData = await response.json();
    console.log('✅ [AUTH-SUCCESS] Access token gerado com sucesso!');
    
    return tokenData.access_token;
  } catch (error) {
    console.error('❌ [AUTH-FATAL] Erro na geração do access token:', error);
    throw error;
  }
}

// Fallback: analisar UMA imagem com OpenAI
async function analyzeImageWithOpenAI(image: any, exam: any, supabase: any, base64: string, mime: string) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const dataUrl = `data:${mime};base64,${base64}`;
  const prompt = `Analise radiografia dental e retorne APENAS JSON válido com o seguinte formato:\n{ \"findings\": [...], \"overall_analysis\": { \"total_findings\": number, \"risk_level\": string, \"summary\": string } }`;

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } }
          ]
        }
      ],
      max_tokens: 3000,
      temperature: 0.1
    })
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${t}`);
  }

  const ai = await resp.json();
  const content = ai.choices?.[0]?.message?.content || '';
  const jsonMatch = String(content).match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('OpenAI did not return valid JSON');
  }
  const parsed = JSON.parse(jsonMatch[0]);

  const findings = parsed.findings || [];
  const overallConfidence = findings.length > 0
    ? findings.reduce((sum: number, f: any) => sum + (f.confidence || 0), 0) / findings.length
    : 0.6;

  await supabase
    .from('dental_images')
    .update({
      processing_status: 'completed',
      findings,
      analysis_confidence: overallConfidence,
      ai_analysis: {
        provider: 'openai',
        model: 'gpt-4o',
        timestamp: new Date().toISOString(),
        raw_response: parsed
      }
    })
    .eq('id', image.id);

  if (findings.length > 0) {
    for (const f of findings) {
      try {
        await supabase.from('dental_findings').insert({
          dental_image_id: image.id,
          tenant_id: exam.tenant_id,
          tooth_number: f.tooth_number,
          finding_type: f.finding_type,
          severity: f.clinical_severity || 'leve',
          confidence: f.confidence || overallConfidence,
          bbox_coordinates: f.bbox,
          description: f.description
        });
      } catch (_) {}
    }
  }

  return parsed;
}

// Função auxiliar para processar com OpenAI quando Google Cloud não está disponível
async function processWithOpenAI(examId: string, supabase: any) {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new Error('Neither Google Cloud nor OpenAI credentials are configured');
    }

    console.log('Starting OpenAI analysis for exam:', examId);

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

    // Process each image with OpenAI
    for (const image of exam.dental_images) {
      console.log('Analyzing image with OpenAI:', image.id);

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
        const base64 = b64encode(new Uint8Array(arrayBuffer));
        
        let mime = image?.mime_type || 'image/jpeg';
        if (!mime.startsWith('image/')) {
          mime = 'image/jpeg';
        }

        const dataUrl = `data:${mime};base64,${base64}`;

        // Simplificado prompt para OpenAI
        const analysisPrompt = `
          Analise esta radiografia dental e identifique possíveis problemas dentários.
          
          Procure por:
          - Cáries (áreas escuras nos dentes)
          - Problemas periodontais (perda óssea)
          - Lesões periapicais (áreas escuras na raiz)
          - Fraturas
          - Problemas ortodônticos
          - Implantes e seu estado
          
          Responda APENAS em formato JSON válido:
          {
            "findings": [
              {
                "tooth_number": "16",
                "finding_type": "carie_oclusal",
                "clinical_severity": "leve",
                "confidence": 0.87,
                "bbox": {"x": 245, "y": 156, "width": 32, "height": 28},
                "precise_location": "face oclusal",
                "description": "Cárie inicial em esmalte, dente 16 (primeiro molar superior direito)",
                "clinical_recommendations": ["Restauração preventiva", "Controle em 3 meses"],
                "urgency": "baixa",
                "prognosis": "excelente",
                "treatment_complexity": "simples",
                "evidence_strength": "clara"
              }
            ],
            "overall_analysis": {
              "total_findings": 1,
              "risk_level": "baixo",
              "summary": "Cárie inicial detectada em dente 16"
            }
          }
        `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: analysisPrompt
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: dataUrl,
                      detail: 'high'
                    }
                  }
                ]
              }
            ],
            max_tokens: 4000,
            temperature: 0.1
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const aiResponse = await response.json();
        const content = aiResponse.choices[0]?.message?.content;

        if (!content) {
          throw new Error('Empty response from OpenAI');
        }

        // Parse AI response
        let analysisResult;
        try {
          // Clean the response to extract JSON
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (!jsonMatch) {
            throw new Error('No valid JSON found in AI response');
          }
          analysisResult = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error('Failed to parse AI response:', content);
          throw new Error('Invalid JSON response from AI');
        }

        const findings = analysisResult.findings || [];
        const overallConfidence = findings.length > 0 
          ? findings.reduce((sum: number, f: any) => sum + (f.confidence || 0), 0) / findings.length 
          : 0.5;

        // Update image with analysis results
        await supabase
          .from('dental_images')
          .update({
            processing_status: 'completed',
            findings: findings,
            analysis_confidence: overallConfidence,
            ai_analysis: {
              provider: 'openai',
              model: 'gpt-4o',
              timestamp: new Date().toISOString(),
              raw_response: analysisResult
            }
          })
          .eq('id', image.id);

        console.log(`Successfully analyzed image ${image.id} with ${findings.length} findings`);

      } catch (error) {
        console.error(`Error processing image ${image.id}:`, error);
        
        await supabase
          .from('dental_images')
          .update({
            processing_status: 'failed',
            ai_analysis: {
              error: error.message,
              timestamp: new Date().toISOString(),
              provider: 'openai'
            }
          })
          .eq('id', image.id);
      }
    }

    // Update exam status to completed
    await supabase
      .from('exams')
      .update({ 
        status: 'completed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', examId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Analysis completed successfully',
        provider: 'openai'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in OpenAI processing:', error);

    // Mark exam as failed
    try {
      await supabase
        .from('exams')
        .update({ 
          status: 'failed', 
          updated_at: new Date().toISOString() 
        })
        .eq('id', examId);
        
      await supabase
        .from('dental_images')
        .update({ 
          processing_status: 'failed',
          ai_analysis: {
            error: error.message,
            timestamp: new Date().toISOString(),
            provider: 'openai'
          }
        })
        .eq('exam_id', examId);
    } catch (markError) {
      console.error('Failed to mark exam as failed:', markError);
    }

    throw error;
  }
}

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

    // Verificar se as credenciais Google Cloud estão disponíveis
    console.log('🔍 [INIT-1] Verificando configuração Google Cloud...');
    console.log('🔍 [INIT-2] Project ID:', gcpProjectId ? '✅ Configurado' : '❌ Ausente');
    console.log('🔍 [INIT-3] Service Account Key:', serviceAccountKey ? '✅ Configurado' : '❌ Ausente');
    
    if (!gcpProjectId || !serviceAccountKey) {
      console.log('⚠️ [FALLBACK] Google Cloud não configurado, usando OpenAI...');
      
      if (!examId) {
        throw new Error('Missing examId');
      }

      // Usar OpenAI como fallback
      return await processWithOpenAI(examId, supabase);
    }

    console.log('✅ [INIT-SUCCESS] Google Cloud configurado! Prosseguindo com Vertex AI...');

    if (!examId) {
      throw new Error('Missing examId');
    }

    console.log('📊 [EXAM-1] Iniciando análise AI para exame:', examId);

    // Get exam and images
    console.log('📊 [EXAM-2] Buscando dados do exame...');
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*, dental_images(*)')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      console.error('❌ [EXAM-ERROR] Exame não encontrado:', examError);
      throw new Error('Exam not found');
    }

    console.log(`📊 [EXAM-3] Exame encontrado com ${exam.dental_images.length} imagens`);

    // Update exam status to processing
    console.log('📊 [EXAM-4] Atualizando status do exame para "processing"...');
    await supabase
      .from('exams')
      .update({ 
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', examId);

    // Process each image
    console.log('🖼️ [PROCESSING] Iniciando processamento das imagens...');
    const analysisResults = [];
    
    for (const image of exam.dental_images) {
      console.log(`🖼️ [IMG-${image.id.substring(0,8)}] Analisando imagem:`, image.original_filename);

      // Update image status to processing
      console.log(`🖼️ [IMG-${image.id.substring(0,8)}] Atualizando status para "processing"...`);
      await supabase
        .from('dental_images')
        .update({ processing_status: 'processing' })
        .eq('id', image.id);

      try {
        // Get the image from storage
        console.log(`🖼️ [IMG-${image.id.substring(0,8)}] Baixando imagem do storage...`);
        const { data: imageData } = await supabase.storage
          .from('dental-uploads')
          .download(image.file_path);

        if (!imageData) {
          throw new Error('Failed to download image');
        }
        
        console.log(`🖼️ [IMG-${image.id.substring(0,8)}] Imagem baixada com sucesso (${imageData.size} bytes)`);

        // Convert to base64 and ensure valid image MIME
        console.log(`🖼️ [IMG-${image.id.substring(0,8)}] Convertendo para base64...`);
        const arrayBuffer = await imageData.arrayBuffer();
        const base64 = b64encode(new Uint8Array(arrayBuffer));

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
        console.log(`🖼️ [IMG-${image.id.substring(0,8)}] MIME detectado:`, mime);
        console.log(`🖼️ [IMG-${image.id.substring(0,8)}] Tamanho base64:`, base64.length, 'caracteres');

        const dataUrl = `data:${mime};base64,${base64}`;

        // FASE 2: Análise Hexa-Modal Avançada - 6 Especialidades Completas
        console.log(`🤖 [AI-${image.id.substring(0,8)}] Preparando prompt para Vertex AI...`);
        const analysisPrompt = `
          ESPECIALISTA EM RADIOLOGIA ODONTOLÓGICA HEXA-MODAL
          Análise integrada com precisão Google Medical AI para 6 especialidades:
          🦷 CÁRIES | 🦴 PERIODONTAL | 🔴 PERIAPICAL | 🔩 IMPLANTES | ⚡ FRATURAS | 📐 ORTODONTIA

          PROTOCOLO TRI-MODAL ULTRA-PRECISO:
          
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
             
             ETAPA 3 - DETECÇÃO DIFERENCIAL TRI-MODAL:
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
          
          3. MODALIDADE 1 - ANÁLISE DE CÁRIES:
             CÁRIES - Critérios rigorosos:
             • Inicial: descontinuidade do esmalte, radiolucência localizada
             • Dentina: radiolucência estendida, forma cônica característica  
             • Pulpar: comunicação visível com câmara pulpar
             • Secundária: radiolucência marginal em restaurações
             • Cervical: lesões na junção esmalte-cemento
             • Recorrente: ao redor de restaurações existentes
             
          4. MODALIDADE 2 - ANÁLISE PERIODONTAL:
             DOENÇA PERIODONTAL - Evidências claras:
             • Perda óssea horizontal: redução uniforme da crista alveolar
             • Perda óssea vertical: defeitos angulares >30°
             • Alargamento do espaço periodontal uniforme ou localizado
             • Lâmina dura interrompida ou ausente
             • Cálculo supra/subgengival radioopaco
             • Reabsorção óssea inter-radicular em molares
             • Migração dental patológica
             • Envolvimento de furca (classes I, II, III)
             
          5. MODALIDADE 3 - LESÕES PERIAPICAIS:
             PATOLOGIA PERIAPICAL - Sinais patognomônicos:
             • Granuloma periapical: radiolucência bem definida >2mm
             • Cisto radicular: radiolucência circular com halo esclerótico
             • Abscesso agudo: radiolucência difusa sem delimitação
             • Osteomielite: áreas mistas radio-lúcidas/opacas
             • Reabsorção radicular externa progressiva
             • Reabsorção radicular interna (ballooning)
             • Necrose pulpar: escurecimento da câmara pulpar
             • Obliteração do canal radicular
             
           6. MODALIDADE 4 - ANÁLISE DE IMPLANTES:
              AVALIAÇÃO DE IMPLANTES - Critérios especializados:
              • Posicionamento: angulação adequada, proximidade com estruturas
              • Osseointegração: interface osso-implante, ausência de radiolucência
              • Densidade óssea: adequada (>1000 HU), parcial (500-1000 HU), inadequada (<500 HU)
              • Complicações: peri-implantite, mobilidade, fratura do implante
              • Proximidade neural: distância canal mandibular, forame mentoniano
              • Seio maxilar: perfuração, proximidade, elevação sinusal
              • Coroa protética: adaptação, excesso de cimento, desadaptação
              
           7. MODALIDADE 5 - ANÁLISE DE FRATURAS:
              DETECÇÃO DE FRATURAS - Sinais radiográficos:
              • Fratura coronária: linha radiolúcida no esmalte/dentina
              • Fratura radicular vertical: linha radiolúcida longitudinal
              • Fratura radicular horizontal: linha radiolúcida transversal
              • Fratura alveolar: descontinuidade do osso alveolar
              • Trincas do esmalte: linhas finas superficiais
              • Dente fissurado: extensão da fratura em dentina
              • Dente separado: fratura completa com mobilidade
              
           8. MODALIDADE 6 - ANÁLISE ORTODÔNTICA:
              AVALIAÇÃO ORTODÔNTICA - Parâmetros específicos:
              • Má oclusão: Classe I, II, III de Angle
              • Apinhamento: sobreposição dental, falta de espaço
              • Diastemas: espaços excessivos entre dentes
              • Sobremordida: sobreposição vertical excessiva
              • Mordida cruzada: inversão da relação cúspide-fossa
              • Mordida aberta: ausência de contato oclusal
              • Rotações dentais: eixo longitudinal alterado
              • Impactações: dentes retidos, mal posicionados
              • Problemas de erupção: atraso, ectopia, anquilose
              • Desvio da linha média: assimetria facial
              • Análise de braquetes: posicionamento, qualidade
              • Reabsorção radicular ortodôntica: encurtamento apical

           9. CORES DIAGNÓSTICAS HEXA-MODAIS:
              🦷 MODALIDADE CÁRIES:
              • Cárie inicial: #FF6B6B (vermelho claro)
              • Cárie extensa: #FF0000 (vermelho intenso)
              • Cárie recorrente: #DC143C (crimson)
              
              🦴 MODALIDADE PERIODONTAL:
              • Perda óssea horizontal: #FF8C00 (laranja)
              • Perda óssea vertical: #FF4500 (laranja escuro)
              • Cálculo: #32CD32 (verde)
              • Envolvimento furca: #FFA500 (laranja)
              
              🔴 MODALIDADE PERIAPICAL:
              • Granuloma: #8A2BE2 (roxo)
              • Cisto: #9932CC (roxo escuro)
              • Abscesso: #FF1493 (rosa intenso)
              • Reabsorção: #B22222 (vermelho tijolo)
              
              🔩 MODALIDADE IMPLANTES:
              • Implante bem posicionado: #00CED1 (turquesa)
              • Implante mal posicionado: #FF4500 (laranja avermelhado)
              • Peri-implantite: #DC143C (crimson)
              • Proximidade neural: #FFD700 (amarelo)
              
              ⚡ MODALIDADE FRATURAS:
              • Fratura coronária: #FF69B4 (rosa choque)
              • Fratura radicular: #CD853F (marrom)
              • Fratura alveolar: #8B4513 (marrom saddle)
              • Trinca: #DDA0DD (ameixa)
              
              📐 MODALIDADE ORTODÔNTICA:
              • Má oclusão: #4169E1 (azul royal)
              • Apinhamento: #9370DB (violeta médio)
              • Impactação: #20B2AA (verde mar)
              • Rotação: #FF6347 (tomate)
              
              📋 GERAL:
              • Restauração: #1E90FF (azul)
              • Suspeita: #FFD700 (amarelo)
              • Normal: #228B22 (verde floresta)
          
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

        // Use Vertex AI with OAuth authentication
        let analysis: any;
        
        console.log(`🤖 [AI-${image.id.substring(0,8)}] Iniciando chamada para Vertex AI...`);
        
        try {
          console.log(`🤖 [AI-${image.id.substring(0,8)}] Gerando access token...`);
          const accessToken = await generateAccessToken();
          
          console.log(`🤖 [AI-${image.id.substring(0,8)}] Access token gerado! Fazendo chamada para Gemini...`);
          const vertexAIUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/us-central1/publishers/google/models/gemini-1.5-pro-vision-001:generateContent`;
          console.log(`🤖 [AI-${image.id.substring(0,8)}] URL: ${vertexAIUrl}`);
          
          // Real Google Vertex AI call using OAuth token
          const geminiResponse = await fetch(vertexAIUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [
                  { text: `Sistema de IA médica ultra-preciso para análise radiográfica dental. Sua precisão diagnóstica deve rivalizar com especialistas em radiologia odontológica. JAMAIS gere falsos positivos. Use confiança mínima de 0.85 para diagnósticos principais.\n\n${analysisPrompt}` },
                  { 
                    inline_data: {
                      mime_type: mime,
                      data: base64
                    }
                  }
                ]
              }],
              generation_config: {
                max_output_tokens: 3000,
                temperature: 0.1,
                top_p: 0.95,
                top_k: 20
              }
            }),
          }
        );

        console.log(`🤖 [AI-${image.id.substring(0,8)}] Vertex AI respondeu com status:`, geminiResponse.status);

        const aiResult = await geminiResponse.json();
        if (!geminiResponse.ok) {
          console.error(`❌ [AI-ERROR] Vertex AI falhou:`, {
            status: geminiResponse.status,
            statusText: geminiResponse.statusText,
            error: aiResult
          });
          throw new Error(`Vertex AI error: ${aiResult.error?.message || 'Unknown error'}`);
        }

        console.log(`🤖 [AI-${image.id.substring(0,8)}] Vertex AI sucesso! Processando resposta...`);

        // Parse Vertex AI response
        const rawContent = String(aiResult?.candidates?.[0]?.content?.parts?.[0]?.text ?? '');
        console.log(`🤖 [AI-${image.id.substring(0,8)}] Conteúdo bruto recebido:`, rawContent.substring(0, 200) + '...');
        
        const cleaned = rawContent.replace(/```json|```/g, '').trim();
        try {
          analysis = JSON.parse(cleaned);
          console.log(`✅ [AI-${image.id.substring(0,8)}] JSON parseado com sucesso!`);
        } catch (e) {
          console.error(`❌ [AI-PARSE-ERROR] Falha ao parsear JSON:`, e);
          console.error(`❌ [AI-PARSE-ERROR] Conteúdo que falhou:`, cleaned.substring(0, 500));
          throw new Error('AI não retornou JSON válido para análise');
        }
          
        } catch (error) {
          console.error(`❌ [VERTEX-FAILED] Vertex AI falhou para imagem ${image.id}:`, error);
          
          // Instead of using mock data, throw error to indicate real failure
          throw new Error(`Falha na análise de IA: ${error.message}. Configuração do Google Cloud pode estar incorreta.`);
        }

        console.log(`📊 [ANALYSIS-${image.id.substring(0,8)}] Análise Google Cloud concluída!`);
        console.log(`📊 [ANALYSIS-${image.id.substring(0,8)}] Qualidade:`, analysis.image_quality_analysis?.overall_quality);
        console.log(`📊 [ANALYSIS-${image.id.substring(0,8)}] Achados:`, analysis.findings?.length || 0);
        console.log(`📊 [ANALYSIS-${image.id.substring(0,8)}] Confiança média:`, analysis.clinical_summary?.diagnostic_confidence);
          
          // REMOVED: Mock analysis that was causing identical results
          /* analysis = {
            image_quality_analysis: {
              resolution_score: 8.5,
              contrast_score: 8.2,
              artifact_level: "mínimos",
              positioning_score: 8.8,
              overall_quality: 8.5,
              diagnostic_adequacy: "muito boa",
              limitations: []
            },
            anatomical_validation: {
              image_type: "panoramic",
              visible_teeth: ["11", "12", "13", "14", "15", "16", "17", "18"],
              anatomical_landmarks: ["seio_maxilar", "canal_mandibular"],
              positioning_accuracy: "correto",
              coverage_completeness: 90
            },
            findings: [
              {
                tooth_number: "16",
                finding_type: "carie_oclusal",
                clinical_severity: "leve",
                confidence: 0.87,
                evidence_strength: "clara",
                bbox: {"x": 245, "y": 156, "width": 32, "height": 28},
                precise_location: "face oclusal",
                description: "Cárie inicial em esmalte, dente 16 (primeiro molar superior direito)",
                clinical_recommendations: [
                  "Restauração preventiva",
                  "Controle em 3 meses"
                ],
                urgency: "baixa",
                treatment_complexity: "simples",
                prognosis: "excelente"
              }
            ],
            overlay_instructions: [
              {
                type: "rectangle",
                bbox: {"x": 245, "y": 156, "width": 32, "height": 28},
                color: "#FF6B6B",
                thickness: 2,
                label: "Cárie 16",
                opacity: 0.8
              }
            ],
            clinical_summary: {
              total_findings: 1,
              validated_findings: 1,
              suspected_findings: 0,
              rejected_findings: 0,
              severity_distribution: {"leve": 1, "moderada": 0, "severa": 0, "critica": 0},
              primary_diagnosis: "Cárie dental inicial",
              treatment_priority: "baixa",
              treatment_urgency: "eletiva",
              estimated_treatment_sessions: 1,
              total_treatment_time: "30min",
              radiographic_quality: 8.5,
              diagnostic_confidence: 0.87,
              diagnostic_accuracy_estimate: 0.90,
              requires_additional_exams: false,
              clinical_recommendations: [
                "Restauração preventiva em dente 16",
                "Orientação de higiene oral",
                "Controle em 3 meses"
              ]
            }
          }; */
        if (analysis.image_quality_analysis?.overall_quality < 6) {
          throw new Error('Qualidade de imagem inadequada para análise precisa');
        }
        
        // Filter high-confidence findings only
        if (analysis.findings) {
          analysis.findings = analysis.findings.filter(f => f.confidence >= 0.75);
        }
        
        console.log('Google Vertex AI Analysis completed for image:', image.id, 
          `Quality: ${analysis.image_quality_analysis?.overall_quality}/10, 
           Findings: ${analysis.findings?.length || 0}, 
           Avg Confidence: ${analysis.clinical_summary?.diagnostic_confidence}`);
        
        // Generate overlay PNG if we have overlay instructions
        console.log(`🎨 [OVERLAY-${image.id.substring(0,8)}] Verificando se precisa gerar overlay...`);
        let overlayPath = null;
        if (analysis.overlay_instructions && analysis.overlay_instructions.length > 0) {
          console.log(`🎨 [OVERLAY-${image.id.substring(0,8)}] Gerando overlay com ${analysis.overlay_instructions.length} instruções...`);
          overlayPath = await generateOverlay(image, analysis.overlay_instructions, supabase);
          console.log(`🎨 [OVERLAY-${image.id.substring(0,8)}] Overlay gerado:`, overlayPath);
        } else {
          console.log(`🎨 [OVERLAY-${image.id.substring(0,8)}] Nenhuma instrução de overlay encontrada`);
        }

        // Store structured findings in dental_findings table
        console.log(`💾 [DB-${image.id.substring(0,8)}] Salvando achados estruturados...`);
        if (analysis.findings && analysis.findings.length > 0) {
          console.log(`💾 [DB-${image.id.substring(0,8)}] Salvando ${analysis.findings.length} achados...`);
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
                description: finding.description
              });
          }
        }

        // Update image with comprehensive clinical AI analysis
        console.log(`💾 [DB-${image.id.substring(0,8)}] Atualizando registro da imagem...`);
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

        console.log(`✅ [SUCCESS-${image.id.substring(0,8)}] Análise da imagem concluída com sucesso!`);

      } catch (error) {
        console.error(`❌ [ERROR-${image.id.substring(0,8)}] Erro na análise da imagem:`, error);
        
        // Tentar fallback com OpenAI para esta imagem
        console.log(`🔄 [FALLBACK-${image.id.substring(0,8)}] Tentando fallback com OpenAI...`);
        try {
          await analyzeImageWithOpenAI(image, exam, supabase, base64, mime);
          console.log(`✅ [FALLBACK-SUCCESS-${image.id.substring(0,8)}] Fallback OpenAI bem-sucedido!`);
        } catch (fallbackError) {
          console.error(`❌ [FALLBACK-FAILED-${image.id.substring(0,8)}] OpenAI fallback também falhou:`, fallbackError);
          await supabase
            .from('dental_images')
            .update({ 
              processing_status: 'failed',
              ai_analysis: { error: String((fallbackError as any)?.message || fallbackError) }
            })
            .eq('id', image.id);
        }
      }
    }

    console.log('📈 [SUMMARY] Gerando resumo clínico do exame...');
    // Generate comprehensive clinical exam summary (safe against 0 images)
    const count = analysisResults.length;
    const sum = (sel: (r: any) => number, def = 0) => analysisResults.reduce((acc, r) => acc + (sel(r) || 0), 0);
    const avg = (sel: (r: any) => number, def: number | null = null) => count > 0 ? sum(sel) / count : def;
    console.log(`📈 [SUMMARY] ${count} análises processadas de ${exam.dental_images.length} imagens totais`);
    
    const examSummary = {
      total_images: exam.dental_images.length,
      analyzed_images: count,
      radiographic_quality: avg(r => r.radiographic_quality || 8, null),
      diagnostic_confidence: avg(r => r.diagnostic_confidence || 0.8, null),
      total_findings: sum(r => r.total_findings || 0),
      severity_breakdown: {
        leve: sum(r => (r.severity_distribution?.leve) || 0),
        moderada: sum(r => (r.severity_distribution?.moderada) || 0),
        severa: sum(r => (r.severity_distribution?.severa) || 0),
        critica: sum(r => (r.severity_distribution?.critica) || 0)
      },
      primary_diagnoses: [...new Set(analysisResults.map(r => r.primary_diagnosis).filter(Boolean))],
      treatment_priorities: analysisResults.map(r => r.treatment_priority).filter(Boolean),
      estimated_sessions: sum(r => r.estimated_treatment_sessions || 0),
      clinical_recommendations: [...new Set(analysisResults.flatMap(r => r.clinical_recommendations || []))],
      requires_additional_exams: analysisResults.some(r => r.requires_additional_exams),
      analysis_date: new Date().toISOString(),
      medical_summary: count > 0
        ? `Análise radiográfica completa com ${count} imagens processadas. Qualidade diagnóstica média: ${avg(r => r.radiographic_quality || 8, 0)?.toFixed(1)}/10`
        : 'Nenhuma imagem foi analisada com sucesso.'
    };

    console.log('📈 [SUMMARY] Resumo gerado:', {
      total_images: examSummary.total_images,
      analyzed_images: examSummary.analyzed_images,
      total_findings: examSummary.total_findings
    });

    // Mark exam as completed and save summary
    console.log('💾 [EXAM-FINAL] Finalizando exame...');
    await supabase
      .from('exams')
      .update({
        status: 'completed',
        ai_analysis: examSummary,
        processed_at: new Date().toISOString(),
        processed_images: analysisResults.length
      })
      .eq('id', examId);

    console.log('🎉 [SUCCESS] Análise do exame concluída com sucesso!');

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
    console.error('💥 [FATAL-ERROR] Erro crítico na análise do exame:', error);
    
    // Mark exam as failed with detailed error
    if (examIdGlobal) {
      console.log('💾 [CLEANUP] Marcando exame como failed...');
      try {
        await supabase
          .from('exams')
          .update({ 
            status: 'failed', 
            ai_analysis: { 
              error: String((error as any)?.message || error),
              timestamp: new Date().toISOString()
            }
          })
          .eq('id', examIdGlobal);
          
        await supabase
          .from('dental_images')
          .update({ processing_status: 'failed', ai_analysis: { error: String((error as any)?.message || error) } })
          .eq('exam_id', examIdGlobal);
      } catch (markErr) {
        console.error('💥 [CLEANUP-ERROR] Falha ao marcar exame como failed:', markErr);
      }
    } else {
      console.error('💥 [CLEANUP-ERROR] examIdGlobal não disponível para cleanup');
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

// Function to get API key for Google Vertex AI
async function getGoogleAPIKey(): Promise<string> {
  try {
    const apiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');
    
    if (!apiKey) {
      console.error('GOOGLE_CLOUD_API_KEY not configured');
      return 'mock_token'; // Fallback to mock for demonstration
    }

    return apiKey;
  } catch (error) {
    console.error('Error getting Google API key:', error);
    return 'mock_token'; // Fallback to mock for demonstration
  }
}

// Function to generate overlay PNG with detections
async function generateOverlay(image: any, overlayInstructions: any[], supabase: any): Promise<string | null> {
  try {
    console.log('Generating overlay for image:', image.id);
    
    // Check canvas support in Supabase Edge runtime
    if (typeof (globalThis as any).OffscreenCanvas === 'undefined') {
      console.warn('Overlay generation skipped: OffscreenCanvas not supported in this environment');
      return null;
    }
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
