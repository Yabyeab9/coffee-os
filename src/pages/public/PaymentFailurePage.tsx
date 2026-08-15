import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { XCircle, ArrowRight } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';

export default function PaymentFailurePage() {
  const [searchParams] = useSearchParams();
  const txRef = searchParams.get('tx_ref') || searchParams.get('trx_ref');

  return (
    <PublicLayout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8 shadow-sm flex flex-col items-center text-center space-y-6">
          
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
            <XCircle className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-heading font-semibold text-foreground">Payment Failed</h1>
            <p className="text-sm text-muted-foreground px-2">
              Unfortunately, your transaction could not be completed. 
              {txRef && (
                <span className="block mt-2 text-xs">
                  Reference: <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{txRef}</span>
                </span>
              )}
            </p>
            <p className="text-sm text-muted-foreground pt-1">
              Please double-check your balance or try a different payment wallet (Telebirr / CBE Birr).
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
            <Button asChild variant="outline" className="flex-1 order-2 sm:order-1">
              <Link to="/contact">Contact Support</Link>
            </Button>
            <Button asChild className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 order-1 sm:order-2">
              <Link to="/menu" className="flex items-center justify-center gap-2">
                Try Again <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>

        </div>
      </div>
    </PublicLayout>
  );
}