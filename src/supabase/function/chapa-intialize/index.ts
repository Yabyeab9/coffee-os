import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CHAPA_SECRET_KEY = Deno.env.get('CHAPA_SECRET_KEY') || 'CHASECK_TEST-demo12345';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { amount, currency, email, first_name, last_name, tx_ref, return_url, callback_url } = await req.json();

    if (!amount || !email || !tx_ref || !return_url) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Chapa API
    const chapaResponse = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency: currency || 'ETB',
        email,
        first_name: first_name || 'Customer',
        last_name: last_name || '',
        tx_ref,
        callback_url: callback_url || `https://pnptijvrqixtrxkglskw.supabase.co/functions/v1/chapa-webhook`,
        return_url,
        customization: {
          title: "Coffee OS Checkout",
          description: "Payment for your order"
        }
      })
    });

    const data = await chapaResponse.json();

    if (!chapaResponse.ok || data.status !== 'success') {
      console.error('Chapa error:', data);
      return new Response(
        JSON.stringify({ error: 'Failed to initialize payment', details: data }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ checkout_url: data.data.checkout_url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
