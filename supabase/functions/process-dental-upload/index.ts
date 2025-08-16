import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Normalize possible frontend exam types (pt-BR) to DB enum values
function mapExamType(input: string): 'panoramic' | 'periapical' | 'bitewing' | 'cephalometric' | 'cbct' {
  const v = (input || '').toLowerCase().trim();
  switch (v) {
    case 'panoramica':
    case 'panorâmica':
    case 'radiografia':
    case 'panoramic':
      return 'panoramic';
    case 'periapical':
      return 'periapical';
    case 'bitewing':
    case 'mordida':
      return 'bitewing';
    case 'cefalometrica':
    case 'cefalométrica':
    case 'cephalometric':
      return 'cephalometric';
    case 'scan':
    case 'cbct':
    case 'tomografia':
    case 'tomografia computadorizada':
      return 'cbct';
    case 'fotografia':
    case 'photo':
      // Fallback reasonable mapping for photos
      return 'periapical';
    default:
      return 'panoramic';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const formData = await req.formData();
    
    const files = formData.getAll('files') as File[];
    const patientId = formData.get('patientId') as string;
    const originalExamType = (formData.get('examType') as string) || '';
    const examType = mapExamType(originalExamType);
    console.log('Exam type mapping:', originalExamType, '->', examType);
    const tenantId = formData.get('tenantId') as string;

    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    if (!patientId || !tenantId) {
      throw new Error('Patient ID and Tenant ID are required');
    }

    console.log(`Processing ${files.length} files for patient ${patientId}`);

    // Verify patient exists in the tenant
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .eq('tenant_id', tenantId)
      .single();

    if (patientError || !patient) {
      console.error('Patient validation error:', patientError);
      throw new Error(`Patient not found or does not belong to tenant: ${patientError?.message || 'Unknown error'}`);
    }

    // Create exam record (avoid RETURNING to bypass schema cache issues)
    const examId = crypto.randomUUID();
    const { error: examError } = await supabase
      .from('exams')
      .insert({
        id: examId,
        tenant_id: tenantId,
        patient_id: patientId,
        exam_type: examType,
        status: 'pending'
      });

    if (examError) {
      console.error('Exam creation error:', examError);
      throw new Error(`Failed to create exam record: ${examError?.message || 'Unknown error'}`);
    }

    console.log('Created exam:', examId);

    // Process each file
    const uploadedImages = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Validate file
        if (!file || !file.type || !file.type.startsWith('image/')) {
          throw new Error(`File ${file.name} is not a valid image`);
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${examId}/${crypto.randomUUID()}.${fileExt}`;
        
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
            exam_id: examId,
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
        status: uploadedImages.length > 0 ? 'pending' : 'failed'
      })
      .eq('id', examId);

    // Start AI analysis in background if we have images
    if (uploadedImages.length > 0) {
      EdgeRuntime.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/dental-image-analysis`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ examId }),
        }).catch(error => {
          console.error('Background AI analysis failed:', error);
        })
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        examId,
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