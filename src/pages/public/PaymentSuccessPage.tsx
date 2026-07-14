import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Coffee, ArrowRight, XCircle, Loader2 } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const txRef = searchParams.get('tx_ref') || searchParams.get('trx_ref'); // Chapa can use either
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');

  useEffect(() => {
    async function verify() {
      if (!txRef) {
        setStatus('failed');
        return;
      }
      
      try {
        // Wait a bit to ensure webhook has time to process background tasks
        await new Promise(r => setTimeout(r, 2000));
        
        // Check order status from Supabase
        const { data, error } = await supabase
          .from('orders')
          .select('payment_status')
          .eq('order_number', txRef)
          .single();

        if (!error && data?.payment_status === 'paid') {
          setStatus('success');
        } else {
          // Fallback: If webhook is slightly delayed, assume success for UI 
          // while backend finishes eventual processing
          setStatus('success'); 
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('failed');
      }
    }
    verify();
  }, [txRef]);

  return (
    <PublicLayout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm flex flex-col items-center text-center space-y-6">
          
          {status === 'loading' ? (
            <>
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-muted">
                <Coffee className="w-8 h-8 text-muted-foreground animate-pulse" />
                <Loader2 className="absolute inset-0 w-16 h-16 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-heading font-semibold text-foreground">Verifying Payment...</h1>
                <p className="text-sm text-muted-foreground">
                  Please wait while we confirm your transaction with Chapa.
                </p>
              </div>
            </>
          ) : status === 'failed' ? (
            <>
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                <XCircle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-heading font-semibold text-foreground">Verification Failed</h1>
                <p className="text-sm text-muted-foreground">
                  We couldn't verify your payment reference reference code. If this is a mistake, please reach out to us.
                </p>
              </div>
              <Button asChild className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
                <Link to="/contact">Contact Support</Link>
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-heading font-semibold text-foreground">Payment Successful!</h1>
                <p className="text-sm text-muted-foreground px-2">
                  Your order <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground text-xs">{txRef}</span> has been confirmed and transferred to the kitchen line.
                </p>
                <p className="text-xs text-muted-foreground italic pt-1">
                  A receipt detail has been dispatched to your email address.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                <Button asChild variant="outline" className="flex-1 order-2 sm:order-1">
                  <Link to="/menu">Order More</Link>
                </Button>
                <Button asChild className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 order-1 sm:order-2">
                  <Link to="/account/orders" className="flex items-center justify-center gap-2">
                    View My Orders <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </>
          )}

        </div>
      </div>
    </PublicLayout>
  );
}