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
        const effectiveProjectId = projectId || parsed.project_id;

        // Basic validation
        if (!effectiveProjectId || !parsed.client_email || !parsed.private_key) {
          throw new Error('Invalid credential format');
        }

        // Perform real Google auth: obtain an access token using service account JWT
        const tokenUri: string = parsed.token_uri || 'https://oauth2.googleapis.com/token';
        const scope = 'https://www.googleapis.com/auth/cloud-platform.read-only';

        // Helper to base64url-encode
        const toBase64Url = (input: Uint8Array | string) => {
          const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
        };

        // Import private key (PKCS8 PEM)
        const pem: string = parsed.private_key;
        const pemBody = pem.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s+/g, '');
        const pkcs8 = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
        const cryptoKey = await crypto.subtle.importKey(
          'pkcs8',
          pkcs8,
          { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
          false,
          ['sign']
        );

        const now = Math.floor(Date.now() / 1000);
        const header = { alg: 'RS256', typ: 'JWT' };
        const payload = {
          iss: parsed.client_email,
          scope,
          aud: tokenUri,
          exp: now + 3600,
          iat: now,
        };

        const encodedHeader = toBase64Url(JSON.stringify(header));
        const encodedPayload = toBase64Url(JSON.stringify(payload));
        const signingInput = `${encodedHeader}.${encodedPayload}`;
        const signature = await crypto.subtle.sign(
          'RSASSA-PKCS1-v1_5',
          cryptoKey,
          new TextEncoder().encode(signingInput)
        );
        const encodedSignature = toBase64Url(new Uint8Array(signature));
        const assertion = `${signingInput}.${encodedSignature}`;

        const tokenResp = await fetch(tokenUri, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion,
          }).toString(),
        });

        if (!tokenResp.ok) {
          const errText = await tokenResp.text();
          throw new Error(`Google token error (${tokenResp.status}): ${errText}`);
        }

        const tokenData = await tokenResp.json();
        const accessToken: string = tokenData.access_token;

        // Optional: Try to access the project metadata to verify permissions
        const projResp = await fetch(`https://cloudresourcemanager.googleapis.com/v1/projects/${effectiveProjectId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!projResp.ok) {
          const errText = await projResp.text();
          return new Response(JSON.stringify({
            success: false,
            message: 'Token obtido, mas falhou ao acessar o projeto (verifique permissões/IAM).',
            status: 'disconnected',
            project_id: effectiveProjectId,
            client_email: parsed.client_email,
            google_status: projResp.status,
            google_error: errText,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const projectInfo = await projResp.json();

        return new Response(JSON.stringify({
          success: true,
          message: 'Conectado ao Google Cloud e projeto acessível.',
          status: 'connected',
          project_id: effectiveProjectId,
          client_email: parsed.client_email,
          token_expires_in: tokenData.expires_in,
          project_name: projectInfo?.projectId || effectiveProjectId,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      } catch (testError) {
        console.error('Connection test error:', testError);
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Falha no teste de conexão',
          status: 'disconnected',
          error: testError?.message || String(testError),
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