import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const formData = await req.formData();
    
    const files = formData.getAll('files') as File[];
    const patientId = formData.get('patientId') as string;
    const examType = formData.get('examType') as string || 'radiografia';
    const tenantId = formData.get('tenantId') as string;

    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    if (!patientId || !tenantId) {
      throw new Error('Patient ID and Tenant ID are required');
    }

    console.log(`Processing ${files.length} files for patient ${patientId}`);

    // Create exam record
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        tenant_id: tenantId,
        patient_id: patientId,
        exam_type: examType,
        total_images: files.length,
        status: 'pending'
      })
      .select()
      .single();

    if (examError || !exam) {
      throw new Error('Failed to create exam record');
    }

    console.log('Created exam:', exam.id);

    // Process each file
    const uploadedImages = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Validate file
        if (!file.type.startsWith('image/')) {
          throw new Error(`File ${file.name} is not an image`);
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${exam.id}/${crypto.randomUUID()}.${fileExt}`;
        
        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('dental-uploads')
          .upload(fileName, file, {
            contentType: file.type,
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        console.log('Uploaded file:', fileName);

        // Create image record
        const { data: imageRecord, error: imageError } = await supabase
          .from('dental_images')
          .insert({
            exam_id: exam.id,
            tenant_id: tenantId,
            original_filename: file.name,
            file_path: fileName,
            file_size: file.size,
            mime_type: file.type,
            image_type: examType,
            processing_status: 'pending'
          })
          .select()
          .single();

        if (imageError) {
          console.error('Failed to create image record:', imageError);
          // Clean up uploaded file
          await supabase.storage.from('dental-uploads').remove([fileName]);
          throw new Error('Failed to create image record');
        }

        uploadedImages.push(imageRecord);
        console.log('Created image record:', imageRecord.id);

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        // Continue with other files
      }
    }

    // Update exam with actual uploaded count
    await supabase
      .from('exams')
      .update({ 
        total_images: uploadedImages.length,
        status: uploadedImages.length > 0 ? 'pending' : 'failed'
      })
      .eq('id', exam.id);

    // Start AI analysis in background if we have images
    if (uploadedImages.length > 0) {
      EdgeRuntime.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/dental-image-analysis`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ examId: exam.id }),
        }).catch(error => {
          console.error('Background AI analysis failed:', error);
        })
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        examId: exam.id,
        uploadedImages: uploadedImages.length,
        totalFiles: files.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in process-dental-upload:', error);
    
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