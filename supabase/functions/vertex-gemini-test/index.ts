import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

async function generateJWT(credentials: GoogleCredentials): Promise<string> {
  const header = {
    alg: "RS256",
    typ: "JWT"
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  // Import the private key
  const privateKey = credentials.private_key.replace(/\\n/g, '\n');
  
  // Convert PEM to DER format
  const pemData = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  
  const keyData = await crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(pemData), c => c.charCodeAt(0)),
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: { name: "SHA-256" },
    },
    false,
    ["sign"]
  );

  // Sign the token
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyData,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${unsignedToken}.${encodedSignature}`;
}

async function getAccessToken(credentials: GoogleCredentials): Promise<string> {
  const jwt = await generateJWT(credentials);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function callVertexAI(accessToken: string, projectId: string, prompt: string) {
  const region = "us-central1";
  const model = "gemini-1.5-flash";
  
  const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:generateContent`;

  const requestBody = {
    contents: [{
      role: "user",
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 1024
    }
  };

  console.log(`Calling Vertex AI: ${url}`);
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Vertex AI error: ${response.status} - ${error}`);
    throw new Error(`Vertex AI API error: ${response.status} - ${error}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let prompt = "Hello, this is a test message for Vertex AI Gemini!";
    try {
      const body = await req.json();
      if (body && typeof body.prompt === 'string') {
        prompt = body.prompt;
      }
    } catch (_) {
      // no body provided
    }

    // Robust credentials parsing: supports JSON and base64-encoded JSON
    const rawCreds = Deno.env.get('dental-ia')?.trim();
    let projectId = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID')?.trim() || '';
    
    console.log('Project ID from env:', projectId);

    if (!rawCreds) {
      throw new Error('dental-ia secret not found in environment');
    }

    console.log('Parsing credentials...');
    let credentials: GoogleCredentials | null = null;

    // Try JSON parse directly, then try base64-decode
    try {
      credentials = JSON.parse(rawCreds);
    } catch (_) {
      try {
        const decoded = atob(rawCreds);
        credentials = JSON.parse(decoded);
      } catch (_) {
        if (rawCreds.includes('-----BEGIN PRIVATE KEY-----')) {
          throw new Error('dental-ia must be the FULL service account JSON, not only the private_key PEM. Paste the entire JSON from Google Cloud.');
        }
        throw new Error('Invalid dental-ia format. Provide JSON or base64-encoded JSON of the service account.');
      }
    }

    if (!credentials || !credentials.client_email || !credentials.private_key) {
      throw new Error('Missing required fields in Google credentials (client_email/private_key).');
    }

    // Normalize private key newlines
    if (credentials.private_key.includes('\\n')) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    // Fallback to project_id from credentials when secret not set
    if (!projectId) {
      projectId = credentials.project_id;
      console.log('Using project ID from credentials:', projectId);
    }
    if (!projectId) {
      throw new Error('GOOGLE_CLOUD_PROJECT_ID not found (neither secret nor inside credentials.project_id).');
    }
    
    console.log('Final project ID to use:', projectId);

    console.log('Getting access token...');
    const accessToken = await getAccessToken(credentials);

    console.log('Calling Vertex AI...');
    const vertexResponse = await callVertexAI(accessToken, projectId, prompt);

    console.log('Vertex AI response received');

    return new Response(JSON.stringify({
      ok: true,
      data: vertexResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in vertex-gemini-test function:', error);
    return new Response(JSON.stringify({
      ok: false,
      error: (error as Error).message
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
