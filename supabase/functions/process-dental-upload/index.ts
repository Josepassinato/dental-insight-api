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
        // Validate file gently: allow unknown types/ext; warn only
        if (!file) {
          throw new Error('No file provided');
        }
        const nameLower = (file.name || '').toLowerCase();
        const ext = nameLower.split('.').pop() || '';
        const heicLike = ['heic','heif','heics'].includes(ext);
        const isImageType = !!file?.type && file.type.startsWith('image/');
        const isAllowedExt = ['jpg','jpeg','png','webp','tif','tiff','bmp','dcm','dicom'].includes(ext) || heicLike;
        if (!isImageType && !isAllowedExt) {
          console.warn('Proceeding with unknown file type/ext:', { name: file.name, type: file.type });
        }

        const rawExt = (file.name?.split('.').pop() || '').toLowerCase();
        const typeToExt = (t: string | undefined | null): string => {
          if (!t) return '';
          if (t.includes('jpeg')) return 'jpg';
          if (t.includes('png')) return 'png';
          if (t.includes('webp')) return 'webp';
          if (t.includes('tiff')) return 'tif';
          if (t.includes('bmp')) return 'bmp';
          if (t.includes('gif')) return 'gif';
          if (t.includes('heic')) return 'heic';
          if (t.includes('heif')) return 'heif';
          if (t.includes('dicom') || t.includes('dcm')) return 'dcm';
          return '';
        };
        let safeExt = rawExt || typeToExt(file.type) || '';

        // Sniff magic bytes to detect real mime
        let detectedMime: string | null = null;
        try {
          const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
          const ascii = (bytes: number[]) => String.fromCharCode(...bytes);
          const startsWith = (sig: number[]) => sig.every((b, i) => head[i] === b);
          const textAt = (pos: number, txt: string) => ascii(Array.from(head.slice(pos, pos + txt.length))) === txt;

          if (startsWith([0xFF, 0xD8, 0xFF])) detectedMime = 'image/jpeg';
          else if (startsWith([0x89, 0x50, 0x4E, 0x47])) detectedMime = 'image/png';
          else if (textAt(0, 'GIF87a') || textAt(0, 'GIF89a')) detectedMime = 'image/gif';
          else if (textAt(0, 'BM')) detectedMime = 'image/bmp';
          else if (textAt(0, 'II*\x00') || textAt(0, 'MM\x00*')) detectedMime = 'image/tiff';
          else if (textAt(0, 'RIFF') && textAt(8, 'WEBP')) detectedMime = 'image/webp';
          else if (textAt(128, 'DICM')) detectedMime = 'application/dicom';
        } catch (_) { /* ignore */ }

        // Guess content type priority: sniff > provided type > ext
        let guessedType = detectedMime || (file.type && file.type.length > 0 ? file.type : null);
        if (!guessedType) {
          const extToType = (ext: string): string | null => {
            if (ext === 'dcm' || ext === 'dicom') return 'application/dicom';
            if (ext === 'tif' || ext === 'tiff') return 'image/tiff';
            if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
            if (ext === 'png') return 'image/png';
            if (ext === 'webp') return 'image/webp';
            if (ext === 'bmp') return 'image/bmp';
            if (ext === 'gif') return 'image/gif';
            if (ext === 'heic') return 'image/heic';
            if (ext === 'heif') return 'image/heif';
            return null;
          };
          guessedType = extToType(safeExt) || null;
        }
        if (!guessedType) {
          guessedType = 'application/octet-stream';
        }
        if (!safeExt) {
          // Derive extension from detected/guessed mime
          const mimeToExt: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif',
            'image/tiff': 'tif',
            'image/bmp': 'bmp',
            'application/dicom': 'dcm',
          };
          safeExt = mimeToExt[guessedType] || 'bin';
        }

        const fileName = `${examId}/${crypto.randomUUID()}.${safeExt}`;
        
        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('dental-uploads')
          .upload(fileName, file, {
            contentType: guessedType,
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        console.log('Uploaded file:', fileName);

        // Decide if AI can process this mime
        const supportedForAI = ['image/jpeg','image/png','image/webp','image/gif'];
        const canAnalyze = supportedForAI.includes((file.type || guessedType));

        // Create image record with appropriate status
        const { data: imageRecord, error: imageError } = await supabase
          .from('dental_images')
          .insert({
            exam_id: examId,
            tenant_id: tenantId,
            original_filename: file.name || `unnamed_file_${i + 1}.${safeExt}`,
            file_path: fileName,
            file_size: file.size || 0,
            mime_type: file.type || guessedType,
            image_type: examType,
            processing_status: canAnalyze ? 'pending' : 'failed',
            ai_analysis: canAnalyze ? {} : { error: 'Formato não suportado para análise. Envie JPG/PNG/WEBP.' }
          })
          .select()
          .single();

        if (imageError) {
          console.error('Failed to create image record:', imageError);
          // Clean up uploaded file
          await supabase.storage.from('dental-uploads').remove([fileName]);
          throw new Error('Failed to create image record');
        }

        if (canAnalyze) {
          uploadedImages.push(imageRecord);
        }
        console.log('Created image record:', imageRecord.id, 'canAnalyze:', canAnalyze);

      } catch (error) {
        const fname = (file && (file as any).name) ? (file as any).name : 'unknown';
        console.error(`Error processing file ${fname}:`, error);
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
      try {
        EdgeRuntime.waitUntil(
          (async () => {
            const { data, error } = await supabase.functions.invoke('dental-image-analysis', {
              body: { examId },
              headers: { 'Authorization': `Bearer ${supabaseServiceKey}` },
            });
            if (error) {
              console.error('AI analysis invoke error:', error);
            } else {
              console.log('AI analysis started:', data);
            }
          })()
        );
      } catch (err) {
        console.error('Failed to start AI analysis:', err);
      }
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