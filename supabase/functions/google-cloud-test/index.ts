import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('Google Cloud Test function started');

    const { testCredentials } = await req.json();
    
    let credentials: any;
    let credentialsSource = '';

    // Try to use provided credentials first, then fall back to environment
    if (testCredentials) {
      try {
        credentials = JSON.parse(testCredentials);
        credentialsSource = 'provided_json';
        console.log('Using provided credentials for test');
      } catch (e) {
        throw new Error('Invalid JSON format in provided credentials');
      }
    } else {
      const envCredentials = Deno.env.get('GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY');
      if (!envCredentials) {
        throw new Error('No credentials found - neither in request nor in environment');
      }
      credentials = JSON.parse(envCredentials);
      credentialsSource = 'environment_secret';
      console.log('Using environment credentials for test');
    }

    console.log('Credentials source:', credentialsSource);
    console.log('Project ID:', credentials.project_id);
    console.log('Client Email:', credentials.client_email);

    // Validate required fields
    const requiredFields = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id'];
    const missingFields = requiredFields.filter(field => !credentials[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    if (credentials.type !== 'service_account') {
      throw new Error('Invalid credential type. Expected: service_account');
    }

    console.log('Basic validation passed, starting Google authentication...');

    // Create JWT for Google OAuth
    const now = Math.floor(Date.now() / 1000);
    const tokenUri = credentials.token_uri || 'https://oauth2.googleapis.com/token';
    const scope = 'https://www.googleapis.com/auth/cloud-platform.read-only';

    // Helper to base64url-encode
    const toBase64Url = (input: Uint8Array | string) => {
      const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    };

    // JWT header and payload
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: credentials.client_email,
      scope,
      aud: tokenUri,
      exp: now + 3600,
      iat: now,
    };

    console.log('JWT payload created');

    // Import private key
    const pem = credentials.private_key;
    const pemBody = pem.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace(/\s+/g, '');
    
    let pkcs8: Uint8Array;
    try {
      pkcs8 = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
    } catch (e) {
      throw new Error('Failed to decode private key: invalid base64');
    }

    let cryptoKey: CryptoKey;
    try {
      cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        pkcs8,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      );
    } catch (e) {
      throw new Error(`Failed to import private key: ${e.message}`);
    }

    console.log('Private key imported successfully');

    // Create and sign JWT
    const encodedHeader = toBase64Url(JSON.stringify(header));
    const encodedPayload = toBase64Url(JSON.stringify(payload));
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    
    let signature: ArrayBuffer;
    try {
      signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder().encode(signingInput)
      );
    } catch (e) {
      throw new Error(`Failed to sign JWT: ${e.message}`);
    }

    const encodedSignature = toBase64Url(new Uint8Array(signature));
    const assertion = `${signingInput}.${encodedSignature}`;

    console.log('JWT signed, requesting access token...');

    // Request access token from Google
    const tokenResponse = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }).toString(),
    });

    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token request failed:', errorText);
      throw new Error(`Google token request failed (${tokenResponse.status}): ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      throw new Error('No access token in response');
    }

    console.log('Access token obtained, testing project access...');

    // Test access to Google Cloud Resource Manager API
    const projectId = credentials.project_id;
    const projectResponse = await fetch(`https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    console.log('Project API response status:', projectResponse.status);

    let projectInfo: any = null;
    let projectError: string | null = null;

    if (projectResponse.ok) {
      projectInfo = await projectResponse.json();
      console.log('Project access successful');
    } else {
      projectError = await projectResponse.text();
      console.log('Project access failed:', projectError);
    }

    // Test access to Cloud Storage API (another common service)
    const storageResponse = await fetch(`https://storage.googleapis.com/storage/v1/b?project=${projectId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    console.log('Storage API response status:', storageResponse.status);

    let storageInfo: any = null;
    let storageError: string | null = null;

    if (storageResponse.ok) {
      storageInfo = await storageResponse.json();
      console.log('Storage access successful');
    } else {
      storageError = await storageResponse.text();
      console.log('Storage access failed:', storageError);
    }

    // Compile test results
    const results = {
      success: true,
      message: 'Google Cloud authentication and API tests completed',
      credentials_source: credentialsSource,
      project_id: projectId,
      client_email: credentials.client_email,
      token_obtained: true,
      token_expires_in: tokenData.expires_in,
      tests: {
        project_api: {
          success: projectResponse.ok,
          status: projectResponse.status,
          data: projectInfo,
          error: projectError
        },
        storage_api: {
          success: storageResponse.ok,
          status: storageResponse.status,
          buckets_count: storageInfo?.items?.length || 0,
          error: storageError
        }
      },
      overall_status: projectResponse.ok ? 'connected' : 'limited_access'
    };

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Google Cloud Test error:', error);
    return new Response(JSON.stringify({
      success: false,
      message: 'Test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    }, null, 2), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});