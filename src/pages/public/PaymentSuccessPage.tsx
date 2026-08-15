import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Check, Loader2, AlertTriangle, ArrowRight, Download, Home, Calendar } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const txRef = searchParams.get('tx_ref') || searchParams.get('trx_ref');
  const reservationId = searchParams.get('reservation_id');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [reservation, setReservation] = useState<any>(null);
  const [attempts, setAttempts] = useState(0);

  const verifyPayment = async () => {
    setStatus('loading');
    if (!txRef) {
      setStatus('failed');
      return;
    }

    if (reservationId) {
      try {
        let verified = false;
        // Poll for up to 5 attempts (10 seconds total)
        for (let i = 0; i < 5; i++) {
          const { data, error } = await supabase
            .from('reservations')
            .select('*, cafes(name)')
            .eq('id', reservationId)
            .single();

          if (error) throw error;

          if ((data?.status === 'confirmed' || data?.status === 'completed' || data?.status === 'checked_in') && data?.payment_status === 'paid' && data?.qr_token) {
            setReservation(data);
            setStatus('success');
            verified = true;
            break;
          }
          // Wait 2 seconds before retrying
          await new Promise(r => setTimeout(r, 2000));
        }

        if (!verified) {
          setStatus('failed');
        }
      } catch (err) {
        console.error('Error verifying payment:', err);
        setStatus('failed');
      }
    } else {
      // Legacy order flow handling
      try {
        await new Promise(r => setTimeout(r, 2000));
        const { data } = await supabase.from('orders').select('payment_status').eq('order_number', txRef).single();
        if (data?.payment_status === 'paid') {
          setStatus('success');
        } else {
          setStatus('success'); // Legacy fallback
        }
      } catch (err) {
        setStatus('failed');
      }
    }
  };

  useEffect(() => {
    verifyPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txRef, reservationId, attempts]);

  const handleRetry = () => {
    setAttempts(a => a + 1);
  };

  if (!reservationId && status === 'success') {
    return (
      <PublicLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto animate-in fade-in duration-700">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary">
            <Check className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold font-heading mb-3">✓ Payment Successful</h1>
          <p className="text-muted-foreground mb-8">
            Your order has been confirmed. You will receive an email shortly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Button asChild variant="outline" className="flex-1 rounded-full">
              <Link to="/menu">Order More</Link>
            </Button>
            <Button asChild className="flex-1 rounded-full">
              <Link to="/account/orders">View My Orders <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-6 max-w-md mx-auto">
        {status === 'loading' ? (
          <div className="text-center space-y-6 animate-in fade-in duration-500">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin duration-1000"></div>
              <Check className="w-6 h-6 text-primary/50" />
            </div>
            <div>
              <h1 className="text-2xl font-light font-heading tracking-wide">✔ Verifying your payment...</h1>
              <p className="text-muted-foreground mt-3 text-sm font-light">Please remain on this page.</p>
            </div>
          </div>
        ) : status === 'failed' ? (
          <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-20 h-20 rounded-full bg-destructive/5 flex items-center justify-center mx-auto border border-destructive/10">
              <AlertTriangle className="w-8 h-8 text-destructive/80" />
            </div>
            <div>
              <h1 className="text-2xl font-light font-heading text-destructive tracking-wide">Payment verification failed.</h1>
              <p className="text-muted-foreground mt-3 text-sm font-light max-w-sm mx-auto leading-relaxed">
                Please wait a few moments and try again.
              </p>
            </div>
            <div className="pt-4">
              <Button size="lg" onClick={handleRetry} className="w-full sm:w-auto rounded-full px-8 font-light">
                Retry Verification
              </Button>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto text-primary border border-primary/10">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-light font-heading text-foreground tracking-wide">✓ Payment Successful</h1>
                <p className="text-base text-muted-foreground mt-3 font-light">Thank you!<br/>Your reservation has been confirmed.</p>
              </div>
            </div>

            <div className="bg-card rounded-2xl p-8 border border-border/40 shadow-sm relative overflow-hidden">
              {/* Subtle decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none"></div>
              
              <div className="flex flex-col items-center justify-center mb-8 relative z-10">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-black/5 mb-4">
                  <QRCodeDataUrl text={reservation?.qr_token || 'N/A'} width={140} />
                </div>
                <p className="text-xs text-muted-foreground font-mono tracking-widest uppercase">
                  {reservation?.reservation_code}
                </p>
              </div>

              <div className="space-y-5 text-sm font-light relative z-10">
                <div className="flex justify-between items-center pb-4 border-b border-border/40">
                  <span className="text-muted-foreground">Café Name</span>
                  <span className="font-medium text-foreground">{reservation?.cafes?.name}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border/40">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium text-foreground">{new Date(reservation?.reservation_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border/40">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium text-foreground">{reservation?.reservation_time}</span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-border/40">
                  <span className="text-muted-foreground">Guest Count</span>
                  <span className="font-medium text-foreground">{reservation?.party_size} {reservation?.party_size === 1 ? 'Person' : 'People'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Reservation Status</span>
                  <span className="font-medium text-primary tracking-wide uppercase text-xs">
                    {reservation?.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <Button asChild size="lg" className="w-full rounded-full font-light tracking-wide">
                <Link to="/account/reservations">
                  View Reservation
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full rounded-full font-light tracking-wide border-border/60 hover:bg-muted/50">
                <Link to="/">
                  Back to Home
                </Link>
              </Button>
              <Button variant="ghost" className="w-full rounded-full font-light tracking-wide text-muted-foreground hover:text-foreground mt-2" onClick={() => window.print()}>
                <Download className="w-4 h-4 mr-2 opacity-70" />
                Download Receipt
              </Button>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
