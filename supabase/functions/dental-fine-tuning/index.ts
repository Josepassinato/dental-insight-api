import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Cloud credentials
const gcpProjectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');
const serviceAccountKey = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY');
const gcpLocation = 'us-central1';

// Fine-tuning configuration
const FINE_TUNING_CONFIG = {
  baseModel: "gemini-1.5-pro-vision-001",
  customModelName: "dental-analysis-fine-tuned",
  trainingDataBucket: "dental-training-data",
  validationSplit: 0.2,
  epochs: 10,
  learningRate: 0.0001,
  batchSize: 8
};

async function generateAccessToken(): Promise<string> {
  if (!serviceAccountKey) {
    throw new Error('Missing GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const header = { alg: 'RS256', typ: 'JWT' };
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      new Uint8Array(atob(serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|\n|-----END PRIVATE KEY-----/g, '')).split('').map(c => c.charCodeAt(0))),
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureData = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, signatureData);
    const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
    }

    const tokenData = await response.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error generating access token:', error);
    throw error;
  }
}

interface TrainingExample {
  imageUrl: string;
  findings: any[];
  expertValidated: boolean;
  confidence: number;
  metadata: {
    imageType: string;
    quality: number;
    anatomicalRegion: string;
  };
}

async function prepareTrainingData(supabase: any): Promise<TrainingExample[]> {
  console.log('Preparing training data from validated exams...');
  
  // Buscar exames com alta confiança e validação de especialista
  const { data: validatedExams, error } = await supabase
    .from('exams')
    .select(`
      id,
      tenant_id,
      ai_summary,
      dental_images (
        id,
        file_path,
        ai_analysis,
        processing_status,
        overlay_image_url
      ),
      dental_findings (
        tooth_number,
        finding_type,
        severity,
        confidence,
        coordinates,
        description,
        expert_validated
      )
    `)
    .eq('status', 'completed')
    .gte('ai_summary->confidence_score', 0.85)
    .not('dental_findings', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch training data: ${error.message}`);
  }

  const trainingExamples: TrainingExample[] = [];

  for (const exam of validatedExams) {
    for (const image of exam.dental_images) {
      if (image.processing_status === 'completed' && image.ai_analysis) {
        // Filtrar apenas achados validados por especialistas
        const validatedFindings = exam.dental_findings.filter(
          (finding: any) => finding.expert_validated === true && finding.confidence >= 0.8
        );

        if (validatedFindings.length > 0) {
          const { data: imageUrl } = await supabase.storage
            .from('dental-uploads')
            .createSignedUrl(image.file_path, 3600);

          trainingExamples.push({
            imageUrl: imageUrl?.signedUrl || '',
            findings: validatedFindings,
            expertValidated: true,
            confidence: image.ai_analysis.confidence_score || 0.85,
            metadata: {
              imageType: image.ai_analysis.image_type || 'periapical',
              quality: image.ai_analysis.image_quality?.overall_quality || 8.0,
              anatomicalRegion: image.ai_analysis.anatomical_region || 'general'
            }
          });
        }
      }
    }
  }

  console.log(`Prepared ${trainingExamples.length} training examples`);
  return trainingExamples;
}

async function createFineTuningDataset(trainingExamples: TrainingExample[], accessToken: string): Promise<string> {
  console.log('Creating fine-tuning dataset...');

  // Converter para formato JSONL para Vertex AI
  const jsonlData = trainingExamples.map(example => ({
    input_text: `Analyze this dental X-ray image for: ${example.findings.map(f => f.finding_type).join(', ')}`,
    output_text: JSON.stringify({
      findings: example.findings,
      confidence: example.confidence,
      metadata: example.metadata
    }),
    image_url: example.imageUrl
  }));

  // Upload dataset para Google Cloud Storage
  const datasetBlob = jsonlData.map(data => JSON.stringify(data)).join('\n');
  
  // Criar dataset no Vertex AI
  const datasetResponse = await fetch(
    `https://us-central1-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/datasets`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: `dental-analysis-dataset-${Date.now()}`,
        metadata_schema_uri: 'gs://google-cloud-aiplatform/schema/dataset/metadata/image_1.0.0.yaml',
        metadata: {
          inputConfig: {
            gcsSource: {
              uris: [`gs://${FINE_TUNING_CONFIG.trainingDataBucket}/training-data.jsonl`]
            }
          }
        }
      })
    }
  );

  if (!datasetResponse.ok) {
    const error = await datasetResponse.json();
    throw new Error(`Failed to create dataset: ${JSON.stringify(error)}`);
  }

  const dataset = await datasetResponse.json();
  console.log('Dataset created:', dataset.name);
  return dataset.name;
}

async function startFineTuningJob(datasetName: string, accessToken: string): Promise<string> {
  console.log('Starting fine-tuning job...');

  const trainingJobResponse = await fetch(
    `https://us-central1-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/trainingPipelines`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: `dental-fine-tuning-${Date.now()}`,
        training_task_definition: 'gs://google-cloud-aiplatform/schema/trainingjob/definition/custom_task_1.0.0.yaml',
        training_task_inputs: {
          baseModel: FINE_TUNING_CONFIG.baseModel,
          datasetName: datasetName,
          trainingConfig: {
            epochs: FINE_TUNING_CONFIG.epochs,
            learningRate: FINE_TUNING_CONFIG.learningRate,
            batchSize: FINE_TUNING_CONFIG.batchSize,
            validationSplit: FINE_TUNING_CONFIG.validationSplit
          },
          modelDisplayName: FINE_TUNING_CONFIG.customModelName
        },
        model_to_upload: {
          display_name: FINE_TUNING_CONFIG.customModelName,
          description: "Fine-tuned model for dental X-ray analysis with improved accuracy"
        }
      })
    }
  );

  if (!trainingJobResponse.ok) {
    const error = await trainingJobResponse.json();
    throw new Error(`Failed to start training job: ${JSON.stringify(error)}`);
  }

  const trainingJob = await trainingJobResponse.json();
  console.log('Training job started:', trainingJob.name);
  return trainingJob.name;
}

async function monitorTrainingProgress(jobName: string, accessToken: string): Promise<any> {
  console.log('Monitoring training progress...');

  const progressResponse = await fetch(
    `https://us-central1-aiplatform.googleapis.com/v1/${jobName}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    }
  );

  if (!progressResponse.ok) {
    throw new Error('Failed to get training progress');
  }

  const progress = await progressResponse.json();
  return {
    state: progress.state,
    progress: progress.trainingTaskProgress || 0,
    startTime: progress.startTime,
    endTime: progress.endTime,
    error: progress.error
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, jobName } = await req.json();

    if (!gcpProjectId) {
      return new Response(
        JSON.stringify({ error: 'GOOGLE_CLOUD_PROJECT_ID not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await generateAccessToken();

    let result;

    switch (action) {
      case 'get_validated_count':
        // Get count of validated findings
        const { data: findingsData, error: findingsError } = await supabase
          .from('dental_findings')
          .select('id')
          .eq('expert_validated', true)
          .gte('confidence', 0.8);
        
        if (findingsError) throw findingsError;
        
        result = {
          count: findingsData?.length || 0
        };
        break;

      case 'start_fine_tuning':
        console.log('Starting fine-tuning process...');
        
        // 1. Preparar dados de treinamento
        const trainingExamples = await prepareTrainingData(supabase);
        
        if (trainingExamples.length < 50) {
          throw new Error(`Insufficient training data. Need at least 50 validated examples, got ${trainingExamples.length}`);
        }

        // 2. Criar dataset
        const datasetName = await createFineTuningDataset(trainingExamples, accessToken);

        // 3. Iniciar job de fine-tuning
        const jobName = await startFineTuningJob(datasetName, accessToken);

        result = {
          status: 'started',
          jobName,
          datasetName,
          trainingExamplesCount: trainingExamples.length,
          estimatedDuration: '2-4 hours',
          config: FINE_TUNING_CONFIG
        };
        break;

      case 'check_progress':
        if (!jobName) {
          throw new Error('jobName is required for checking progress');
        }
        
        result = await monitorTrainingProgress(jobName, accessToken);
        break;

      case 'list_models':
        const modelsResponse = await fetch(
          `https://us-central1-aiplatform.googleapis.com/v1/projects/${gcpProjectId}/locations/${gcpLocation}/models?filter=display_name:dental-analysis*`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            }
          }
        );

        if (!modelsResponse.ok) {
          throw new Error('Failed to list models');
        }

        const models = await modelsResponse.json();
        result = {
          models: models.models || [],
          count: models.models?.length || 0
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Fine-tuning error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check the function logs for more information'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});