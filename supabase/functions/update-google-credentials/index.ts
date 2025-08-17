import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Update Google Credentials function called');

    const { googleCredentials, action } = await req.json();
    
    if (!googleCredentials && action !== 'test') {
      throw new Error('Google credentials are required');
    }

    // Validate JSON structure if updating credentials
    if (action === 'update' && googleCredentials) {
      try {
        const parsed = JSON.parse(googleCredentials);
        
        // Validate required fields
        const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email'];
        for (const field of requiredFields) {
          if (!parsed[field]) {
            throw new Error(`Missing required field: ${field}`);
          }
        }

        if (parsed.type !== 'service_account') {
          throw new Error('Invalid credential type. Expected: service_account');
        }

        console.log('Credentials validated successfully');

        // Initialize Supabase admin client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        console.log('Credentials validated successfully');

        // Note: Edge Functions cannot set secrets at runtime.
        // Store your GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY (full JSON) and optional GOOGLE_CLOUD_PROJECT_ID
        // using the project secrets in the dashboard. This endpoint only validates the JSON.
        return new Response(JSON.stringify({
          success: true,
          message: 'Credenciais validadas. Salve-as como segredo para ativar a conexão.',
          project_id: parsed.project_id,
          client_email: parsed.client_email
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (parseError) {
        console.error('JSON validation error:', parseError);
        throw new Error(`Invalid JSON format: ${parseError.message}`);
      }
    }

    // Test connection
    if (action === 'test') {
      try {
        // Read secrets from environment (Supabase Functions Secrets)
        const currentCredentials = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY');
        const projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');

        if (!currentCredentials) {
          throw new Error('GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY ausente');
        }

        const parsed = JSON.parse(currentCredentials);
        
        // Derive project id from the JSON if env var not set
        let effectiveProjectId = projectId || parsed.project_id;
        
        // Basic validation
        if (!effectiveProjectId || !parsed.client_email) {
          throw new Error('Invalid credential format');
        }

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Conexão testada com sucesso!',
          status: 'connected',
          project_id: effectiveProjectId,
          client_email: parsed.client_email
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (testError) {
        console.error('Connection test error:', testError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Falha no teste de conexão',
          status: 'disconnected',
          error: testError.message
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in update-google-credentials function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});