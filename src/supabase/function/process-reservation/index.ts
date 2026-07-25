import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body = await req.json();
    const { cafe_id, reservation_date, reservation_time, guest_count, notes, preorder_items, guest_name, guest_email, guest_phone } = body;

    // Validate cafe and settings
    const { data: cafe } = await supabase.from('cafes').select('settings').eq('id', cafe_id).single();
    if (!cafe) throw new Error("Cafe not found");

    const settings = cafe.settings as any;
    const paymentMode = settings?.reservation_payment_mode || 'free_reservation';
    const depositPercentage = settings?.deposit_percentage || 0;

    // Calculate subtotal
    let subtotal = 0;
    if (preorder_items && preorder_items.length > 0) {
      const itemIds = preorder_items.map((item: any) => item.menu_item_id);
      const { data: menuItems } = await supabase.from('menu_items').select('id, price').in('id', itemIds);
      
      if (!menuItems) throw new Error("Invalid menu items");

      for (const item of preorder_items) {
        const menuItem = menuItems.find(mi => mi.id === item.menu_item_id);
        if (menuItem && menuItem.price) {
          subtotal += menuItem.price * item.quantity;
        }
      }
    }

    // Determine deposit / required payment
    let amountToPay = 0;
    if (paymentMode === 'full_payment_required') {
      amountToPay = subtotal; // If they must pay full
    } else if (paymentMode === 'deposit_required') {
      amountToPay = subtotal * (depositPercentage / 100);
    }

    // Always require at least some minimum deposit for reservation if configured
    if (paymentMode === 'deposit_required' && amountToPay === 0) {
      amountToPay = settings?.minimum_deposit || 100; // default 100 ETB minimum deposit
    }

    // Generate unique codes
    const reservation_code = `RES-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const qr_token = crypto.randomUUID();

    const requiresPayment = amountToPay > 0;
    const initialStatus = 'pending_verification';
    const initialPaymentStatus = 'pending';

    // Create reservation
    const { data: reservation, error: resError } = await supabase.from('reservations').insert({
      cafe_id,
      user_id: user.id,
      guest_name: guest_name || user.user_metadata?.full_name || 'Guest',
      guest_email: guest_email || user.email,
      guest_phone: guest_phone || '',
      party_size: guest_count,
      reservation_date,
      reservation_time,
      notes,
      status: initialStatus,
      payment_status: initialPaymentStatus,
      reservation_code,
      qr_token
    }).select().single();

    if (resError) throw resError;

    // Create order if preorder items exist
    let order_id = null;
    if (preorder_items && preorder_items.length > 0) {
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        cafe_id,
        user_id: user.id,
        order_number: `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        total_amount: subtotal,
        order_type: 'dine_in',
        order_status: 'pending',
        payment_status: initialPaymentStatus
      }).select().single();

      if (orderError) throw orderError;
      order_id = order.id;

      // Insert order items
      const orderItemsToInsert = preorder_items.map((item: any) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: 0, // Should be fetched properly but simplified for now
        total_price: 0 // Will need proper calculation based on fetched prices
      }));

      await supabase.from('order_items').insert(orderItemsToInsert);
    }

    // Generate Verification Code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

    const { error: verificationError } = await supabase.from('reservation_verifications').insert({
      reservation_id: reservation.id,
      code: verificationCode,
      expires_at: expiresAt.toISOString(),
      attempts: 0,
      verified: false
    });

    if (verificationError) throw verificationError;

    // Fetch user preferences
    const { data: prefs } = await supabase.from('customer_preferences').select('*').eq('user_id', user.id).single();
    const sendEmail = prefs?.email_notifications !== false;

    if (sendEmail) {
      // Send verification email
      await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'reservation_verification',
          email: reservation.guest_email || user.email,
          data: {
            customerName: reservation.guest_name,
            code: verificationCode,
            guests: reservation.party_size,
            date: reservation.reservation_date,
            time: reservation.reservation_time,
          }
        })
      });
    }

    // Create payment record (pending) so we know how much to charge later
    let payment_id = null;
    let provider_reference = `TX-${crypto.randomUUID()}`;
    if (requiresPayment) {
      const { data: payment, error: payError } = await supabase.from('payments').insert({
        reservation_id: reservation.id,
        order_id,
        provider: 'chapa',
        provider_reference,
        amount: amountToPay,
        currency: 'ETB',
        status: 'pending'
      }).select().single();

      if (payError) throw payError;
      payment_id = payment.id;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        requires_payment: requiresPayment, 
        reservation, 
        amount: amountToPay,
        tx_ref: requiresPayment ? provider_reference : null
      }),
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