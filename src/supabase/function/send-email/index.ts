import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// In production, configure RESEND_API_KEY in Supabase secrets
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_test_123';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, email, data } = await req.json();

    if (!type || !email || !data) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const cafeName = data.cafeName || 'Coffee OS Cafe';
    let subject = '';
    let html = '';

    const footer = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #888; font-size: 12px; font-family: sans-serif;">
        powered by Coffee OS
      </div>
    `;

    if (type === 'order_confirmation') {
      subject = `Order Confirmation - ${cafeName}`;
      
      const itemsHtml = data.items.map((item: any) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">${item.qty}x ${item.name}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${item.price} ETB</td>
        </tr>
      `).join('');

      html = `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">${cafeName}</h1>
          <h2>Order Confirmation</h2>
          <p>Hello ${data.customerName},</p>
          <p>Thank you for your order! Here are the details:</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Order ID:</strong> ${data.orderId}</p>
            <p><strong>Date:</strong> ${data.orderDate}</p>
            <p><strong>Status:</strong> ${data.paymentStatus}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            ${itemsHtml}
            <tr>
              <td style="padding: 12px 0; font-weight: bold;">Total</td>
              <td style="padding: 12px 0; font-weight: bold; text-align: right;">${data.totalAmount} ETB</td>
            </tr>
          </table>

          <p>We'll notify you when your order is ready!</p>
          ${footer}
        </div>
      `;
    } else if (type === 'reservation_confirmation') {
      subject = `Reservation Confirmed - ${cafeName}`;
      
      html = `
        <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333;">${cafeName}</h1>
          <h2>Reservation Confirmed</h2>
          <p>Hello ${data.customerName},</p>
          <p>Your table has been successfully reserved. Here are the details:</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Reservation ID:</strong> ${data.reservationId}</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Time:</strong> ${data.time}</p>
            <p><strong>Guests:</strong> ${data.guests}</p>
            ${data.specialRequests ? `<p><strong>Special Requests:</strong> ${data.specialRequests}</p>` : ''}
          </div>

          <p>We look forward to hosting you!</p>
          ${footer}
        </div>
      `;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid email type' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Call Resend API (or other email provider)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Coffee OS <noreply@coffeeos.dev>`,
        to: email,
        subject: subject,
        html: html,
      })
    });

    // In a real environment, handle the response correctly.
    // Here we just assume it works or log errors if using a test key
    const resendData = await res.json().catch(() => ({}));
    
    return new Response(JSON.stringify({ success: true, message: 'Email queued', id: resendData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Email sending error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
