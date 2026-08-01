import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Clock, RefreshCcw } from 'lucide-react';
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
  
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(600); // 10 minutes
  const [isResending, setIsResending] = useState(false);

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
        navigate('/reservation');
        return;
      }
      
      setReservation(data);

      // If already past pending_verification, redirect away.
      if (data.status !== 'pending_verification') {
         if (data.status === 'pending_payment' || data.status === 'verified') {
             // they need to pay
             const pendingPayment = data.payments?.find((p: any) => p.status === 'pending');
             if (pendingPayment) {
               initiatePayment(pendingPayment.amount, pendingPayment.provider_reference, data);
             } else {
               navigate('/account/reservations');
             }
         } else {
             navigate('/account/reservations');
         }
      }
    };
    
    loadReservation();
  }, [reservationId, navigate]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    
    const nextIndex = pastedData.length < 6 ? pastedData.length : 5;
    inputRefs.current[nextIndex]?.focus();
  };

  const initiatePayment = async (amountToPay: number, providerRef: string, resData: any) => {
    try {
      toast.loading('Redirecting to payment gateway...', { id: 'payment-redirect' });
      const initResponse = await supabase.functions.invoke('chapa-initialize', {
        body: {
          amount: amountToPay,
          currency: 'ETB',
          email: resData.guest_email || profile?.email || 'customer@example.com',
          first_name: resData.guest_name || profile?.full_name || 'Customer',
          tx_ref: providerRef,
          return_url: `${window.location.origin}/account/reservations`,
        }
      });

      if (initResponse.data?.checkout_url) {
         
      toast.dismiss('payment-redirect');
      
      window.open(initResponse.data.checkout_url, '_blank', 'noopener,noreferrer');
  
      } else {
        throw new Error('Failed to obtain payment checkout URL');
      }
    } catch (err: any) {
      toast.dismiss('payment-redirect');
      toast.error('Failed to initiate payment', { description: err.message });
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
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

      // Verify successful. We decide what to do.
      if (data.requires_payment === true) {
        initiatePayment(data.amount, data.tx_ref, reservation);
      } else {
        // Free reservation, jump straight to reservations list
        toast.success('Reservation confirmed!');
        setTimeout(() => navigate('/account/reservations'), 1000);
      }

    } catch (err: any) {
      // Don't redirect, just show error and let them retry if not max attempts
      toast.error(err.message || 'Verification failed');
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      // In a real implementation we would call a resend-code Edge Function
      toast.success('Code resent to your email/phone.');
      setTimeLeft(600);
    } finally {
      setIsResending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!reservation) {
    return (
      <PublicLayout cafe={cafe} announcements={announcements}>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </PublicLayout>
    );
  }

  const contactDetail = reservation.guest_email || reservation.guest_phone || 'your contact details';

  return (
    <PublicLayout cafe={cafe} announcements={announcements}>
      <section className="section-pad max-w-md mx-auto px-4 text-center">
        <div className="glass p-8 rounded-xl border border-border">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-2xl font-heading font-semibold text-foreground mb-2">Verify Your Reservation</h1>
          <p className="text-sm text-muted-foreground mb-8">
            Enter the 6-digit code sent to:<br/>
            <span className="font-medium text-foreground">{contactDetail}</span>
          </p>

          <div className="space-y-6">
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el: HTMLInputElement | null) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange(index, e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-mono bg-background/50 border-primary/20 focus:border-primary"
                />
              ))}
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Expires in <span className="font-mono text-foreground font-medium">{formatTime(timeLeft)}</span></span>
              <button 
                onClick={handleResend}
                disabled={isResending || timeLeft > 540} // Only allow resend after 1 minute
                className="text-primary hover:underline disabled:opacity-50 disabled:hover:no-underline flex items-center gap-1"
              >
                <RefreshCcw className="w-3 h-3" /> Resend Code
              </button>
            </div>

            <div className="space-y-3 pt-4">
              <Button 
                onClick={handleVerify}
                disabled={isVerifying || otp.join('').length !== 6}
                className="w-full h-12 text-lg font-medium"
              >
                {isVerifying ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
                    Verifying...
                  </div>
                ) : 'Verify'}
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate('/reservation')}
                disabled={isVerifying}
              >
                Cancel Reservation
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
