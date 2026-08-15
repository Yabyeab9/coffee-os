import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Missing authorization header");

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error("Unauthorized");

    const { reservation_id, code } = await req.json();

    // 1. Fetch latest verification record
    const { data: verifications, error: fetchError } = await supabase
      .from('reservation_verifications')
      .select('*')
      .eq('reservation_id', reservation_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError || !verifications || verifications.length === 0) {
      throw new Error('Verification code not found.');
    }

    const verification = verifications[0];

    // 2. Validate
    if (verification.attempts >= 5) {
      throw new Error('Too many failed attempts. Please request a new code.');
    }

    if (new Date(verification.expires_at) < new Date()) {
      throw new Error('Verification code expired.');
    }

    if (verification.code !== code) {
      await supabase.from('reservation_verifications').update({ attempts: verification.attempts + 1 }).eq('id', verification.id);
      throw new Error('Invalid verification code.');
    }

    // 3. Mark verified
    await supabase.from('reservation_verifications').update({ verified: true }).eq('id', verification.id);

    // 4. Update reservation
    const { data: reservation, error: resError } = await supabase
      .from('reservations')
      .select('*, cafes(name)')
      .eq('id', reservation_id)
      .single();

    if (resError) throw resError;

    const { data: payments } = await supabase.from('payments').select('amount, provider_reference').eq('reservation_id', reservation_id).eq('status', 'pending');
    const payment = payments && payments.length > 0 ? payments[0] : null;

    const newStatus = payment ? 'pending_payment' : 'confirmed';
    
    await supabase.from('reservations').update({ 
      status: newStatus, 
      verification_confirmed_at: new Date().toISOString() 
    }).eq('id', reservation_id);

    // 5. Send confirmation email if NO payment required
    if (!payment) {
      const { data: prefs } = await supabase.from('customer_preferences').select('*').eq('user_id', user.id).single();
      if (prefs?.email_notifications !== false) {
        await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'reservation_confirmation',
            email: reservation.guest_email || user.email,
            data: {
              cafeName: reservation.cafes?.name || 'Coffee OS',
              customerName: reservation.guest_name,
              reservationId: reservation.reservation_code,
              date: reservation.reservation_date,
              time: reservation.reservation_time,
              guests: reservation.party_size,
              specialRequests: reservation.notes,
              qrToken: reservation.qr_token
            }
          })
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      requires_payment: !!payment,
      amount: payment?.amount,
      tx_ref: payment?.provider_reference
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});