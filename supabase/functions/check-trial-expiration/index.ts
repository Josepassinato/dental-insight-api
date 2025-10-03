import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('🔍 Checking for expired trials...');

    // Find tenant_plans with expired trials
    const { data: expiredTrials, error: fetchError } = await supabaseClient
      .from('tenant_plans')
      .select('id, tenant_id, trial_ends_at')
      .eq('is_trial', true)
      .lt('trial_ends_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired trials:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${expiredTrials?.length || 0} expired trials`);

    if (!expiredTrials || expiredTrials.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No expired trials found',
          count: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Update expired trials
    const updates = expiredTrials.map(async (trial) => {
      const { error: updateError } = await supabaseClient
        .from('tenant_plans')
        .update({
          is_trial: false,
          monthly_exam_limit: 0,
          is_active: false
        })
        .eq('id', trial.id);

      if (updateError) {
        console.error(`Error updating trial ${trial.id}:`, updateError);
        return { success: false, tenant_id: trial.tenant_id, error: updateError };
      }

      console.log(`✅ Deactivated expired trial for tenant ${trial.tenant_id}`);
      return { success: true, tenant_id: trial.tenant_id };
    });

    const results = await Promise.all(updates);
    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${successCount} expired trials`,
        count: successCount,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in check-trial-expiration:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
