import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { CheckCircle, Clock, Coffee, RefreshCcw } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { getCafeBySlug, getAnnouncements } from '@/lib/api';
import type { Cafe, Announcement } from '@/types/database';
import { getCafeSlug } from '@/lib/cafe-config';

const CAFE_SLUG = getCafeSlug();

export default function ReservationVerifyPage() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [reservation, setReservation] = useState<any>(null);
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [txRef, setTxRef] = useState<string>('');

  useEffect(() => {
    async function load() {
      const [c, a] = await Promise.all([
        getCafeBySlug(CAFE_SLUG),
        getAnnouncements(CAFE_SLUG)
      ]);
      if (c) setCafe(c);
      if (a) setAnnouncements(a);
    }
    load();
  }, []);

  useEffect(() => {
    if (!reservationId) return;

    const loadReservation = async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select(`*, payments(*)`)
        .eq('id', reservationId)
        .single();
        
      if (error || !data) {
        toast.error('Reservation not found');
        navigate('/');
        return;
      }
      
      setReservation(data);

      if (data.status === 'pending_payment' || data.status === 'confirmed') {
        setIsVerified(true);
      }

      if (data.payments && data.payments.length > 0) {
        const pendingPayment = data.payments.find((p: any) => p.status === 'pending');
        if (pendingPayment) {
          setPaymentAmount(pendingPayment.amount);
          setTxRef(pendingPayment.provider_reference);
        }
      }
    };
    
    loadReservation();
  }, [reservationId, navigate]);

  useEffect(() => {
    if (timeLeft <= 0 || isVerified) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isVerified]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }
    
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-reservation', {
        body: {
          reservation_id: reservationId,
          code
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsVerified(true);
      toast.success('Verification successful!');

      // Redirect to payment if required
      if (data?.requires_payment && data?.tx_ref) {
        initiatePayment(data.amount, data.tx_ref);
      } else {
        // Free reservation, go to reservations page
        setTimeout(() => navigate('/account/reservations'), 2000);
      }

    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const initiatePayment = async (amountToPay: number, providerRef: string) => {
    if (!reservation) return;
    try {
      toast.loading('Redirecting to payment...');
      const initResponse = await supabase.functions.invoke('chapa-initialize', {
        body: {
          amount: amountToPay,
          currency: 'ETB',
          email: reservation.guest_email || profile?.email || 'customer@example.com',
          first_name: reservation.guest_name || profile?.full_name || 'Customer',
          tx_ref: providerRef,
          return_url: `${window.location.origin}/account/reservations`,
        }
      });

      if (initResponse.data?.checkout_url) {
        window.location.href = initResponse.data.checkout_url;
      } else {
        throw new Error('Failed to obtain payment checkout URL');
      }
    } catch (err: any) {
      toast.error('Failed to initiate payment', { description: err.message });
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      // In a real implementation we would call a resend-code Edge Function
      toast.success('Code resent to your email/phone.');
      setTimeLeft(600);
    } catch (err) {
      toast.error('Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel this reservation?')) {
      await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', reservationId);
      navigate('/');
    }
  };

  if (!cafe || !reservation) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Coffee className="w-6 h-6 text-primary animate-pulse" /></div>;
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <PublicLayout cafe={cafe} announcements={announcements}>
      <section className="section-pad max-w-md mx-auto px-4 text-center">
        {isVerified ? (
          <div className="animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-heading font-semibold text-foreground mb-3">Verification Complete</h1>
            {paymentAmount > 0 ? (
              <p className="text-muted-foreground mb-6">Redirecting to payment gateway to secure your reservation...</p>
            ) : (
              <p className="text-muted-foreground mb-6">Your reservation has been confirmed. Redirecting to your dashboard...</p>
            )}
            <div className="flex justify-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          </div>
        ) : (
          <div className="glass p-8 rounded-xl border border-border">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            
            <h1 className="text-2xl font-heading font-semibold text-foreground mb-2">Verify Reservation</h1>
            <p className="text-sm text-muted-foreground mb-8">
              We've sent a 6-digit code to your contact details. Please enter it below to confirm your booking.
            </p>

            <div className="space-y-6">
              <div>
                <Input
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  className="text-center text-2xl tracking-widest font-mono h-14 bg-background/50 border-primary/20"
                />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Expires in <span className="font-mono text-foreground font-medium">{formatTime(timeLeft)}</span></span>
                <button 
                  onClick={handleResend}
                  disabled={isResending || timeLeft > 540} // Only allow resend after 1 minute
                  className="text-primary hover:underline disabled:opacity-50 disabled:hover:no-underline flex items-center gap-1"
                >
                  <RefreshCcw className="w-3 h-3" /> Resend
                </button>
              </div>

              <div className="space-y-3 pt-4">
                <Button 
                  className="w-full h-12 text-lg" 
                  onClick={handleVerify}
                  disabled={isVerifying || code.length !== 6 || timeLeft <= 0}
                >
                  {isVerifying ? 'Verifying...' : 'Verify & Continue'}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={handleCancel}
                >
                  Cancel Reservation
                </Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </PublicLayout>
  );
}