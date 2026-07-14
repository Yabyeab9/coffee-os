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

    // 1. Update Payment Status securely from the backend
    await supabase.from("payments").update({ status: "completed" }).eq("provider_ref", txRef);

    // 2. Update Order Status
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .update({ payment_status: "paid", order_status: "preparing" })
      .eq("order_number", txRef)
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

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
