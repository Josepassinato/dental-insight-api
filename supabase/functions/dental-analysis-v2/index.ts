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
          const credentialsJson = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY');
          if (!credentialsJson) {
            return new Response(JSON.stringify({
              success: false,
              message: "GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY não configurado",
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