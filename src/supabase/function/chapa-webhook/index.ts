import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

serve(async (req) => {
  const signature = req.headers.get("chapa-signature");
  
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.json();
  const txRef = body.tx_ref;
  const status = body.status;

  if (status === "success") {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Look up the payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("provider_reference", txRef)
      .single();

    if (payment) {
      // Mark payment as completed
      await supabase.from("payments").update({ status: "completed" }).eq("id", payment.id);

      // Handle Reservation Payment
      if (payment.reservation_id) {
        const { data: reservation } = await supabase.from("reservations").update({ 
          payment_status: "paid", 
          status: "confirmed",
          payment_confirmed_at: new Date().toISOString()
        })
        .eq("id", payment.reservation_id)
        .select('*, cafes(name), profiles(email, full_name)')
        .single();

        // Send confirmation email
        if (reservation) {
          const email = reservation.guest_email || reservation.profiles?.email;
          if (email) {
            await fetch(`${supabaseUrl}/functions/v1/send-email`, {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'reservation_confirmation',
                email: email,
                data: {
                  cafeName: reservation.cafes?.name || 'Coffee OS',
                  customerName: reservation.guest_name || reservation.profiles?.full_name || 'Customer',
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
      }

      // Handle Order Payment
      if (payment.order_id) {
        const { data: orderData } = await supabase
          .from("orders")
          .update({ payment_status: "paid", order_status: "preparing" })
          .eq("id", payment.order_id)
          .select('*, profiles(email, full_name)')
          .single();

        if (orderData && orderData.profiles && orderData.profiles.email) {
          // Fetch order items to send email
          const { data: items } = await supabase
            .from('order_items')
            .select('*, menus(name)')
            .eq('order_id', orderData.id);
            
          const emailItems = items?.map(item => ({
            name: item.menus?.name || 'Item',
            qty: item.quantity,
            price: item.unit_price
          })) || [];

          // Fetch cafe name
          const { data: cafe } = await supabase.from('cafes').select('name').eq('id', orderData.cafe_id).single();

          // Trigger email sending
          await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: 'order_confirmation',
              email: orderData.profiles.email,
              data: {
                cafeName: cafe?.name || 'Coffee OS',
                customerName: orderData.profiles.full_name || 'Customer',
                orderId: orderData.order_number,
                orderDate: new Date(orderData.created_at).toLocaleString(),
                paymentStatus: 'Paid',
                totalAmount: orderData.total_amount,
                items: emailItems
              }
            })
          });
        }
      }
    } else {
      // Fallback for legacy order_number matching (if any)
      const { data: orderData } = await supabase
        .from("orders")
        .update({ payment_status: "paid", order_status: "preparing" })
        .eq("order_number", txRef)
        .select('*, profiles(email, full_name)')
        .single();
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
