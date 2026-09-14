import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Clock, RefreshCcw, ExternalLink, Loader2 } from 'lucide-react';
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
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [isResending, setIsResending] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  // Keep a ref to the Chapa browser tab so we navigate an already-open window
  // rather than creating a new one from an async callback (popup blocker safe).
  const paymentWindowRef = useRef<Window | null>(null);
  const paymentWindowNavigatedRef = useRef<boolean>(false);
  const paymentInitStartedRef = useRef<boolean>(false);
  const pendingTxRef = useRef<string | null>(null);

  // Track seconds since last resend so the cooldown is independent of the
  // 10-minute expiry timer (timeLeft). A user may resend at any point after 60s.
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  useEffect(() => {
    async function load() {
      try {
        const [c, a] = await Promise.all([
          getCafeBySlug(CAFE_SLUG),
          getAnnouncements(CAFE_SLUG),
        ]);
        if (c) setCafe(c);
        if (a) setAnnouncements(a);
      } catch {
        // non-fatal
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!reservationId) return;

    const loadReservation = async () => {
      const { data, error } = await supabase
        .from('reservations')
        .select('*, payments(*)')
        .eq('id', reservationId)
        .single();

      if (error || !data) {
        toast.error('Reservation not found');
        navigate('/reservation');
        return;
      }

      setReservation(data);

      // If already past pending_verification, either resume payment or redirect.
      if (data.status !== 'pending_verification') {
        if (data.status === 'pending_payment' || data.status === 'verified') {
          const pendingPayment = data.payments?.find(
            (p: any) => p.status === 'pending'
          );
          if (pendingPayment) {
            initiatePayment(
              pendingPayment.amount,
              pendingPayment.provider_ref,
              data
            );
          } else {
            navigate('/account/reservations');
          }
        } else {
          navigate('/account/reservations');
        }
      }
    };

    loadReservation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

 // ── Payment confirmation: check database every 2 seconds ─────────────────────
const paymentConfirmedRef = useRef(false);
const paymentPollingRef =
  useRef<ReturnType<typeof setInterval> | null>(null);

const checkPaymentStatus = React.useCallback(async () => {
  if (!reservationId || paymentConfirmedRef.current) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('id, status, payment_status')
      .eq('id', reservationId)
      .maybeSingle();

    if (error) {
      console.error(
        '[RESERVATION PAYMENT] Status check failed:',
        error
      );
      return;
    }

    if (!data) {
      console.warn(
        '[RESERVATION PAYMENT] Reservation not found:',
        reservationId
      );
      return;
    }

    console.log(
      '[RESERVATION PAYMENT] Checked:',
      {
        id: data.id,
        status: data.status,
        payment_status: data.payment_status,
      }
    );

    // The webhook is the source of truth.
    // Once the reservation is paid, finish immediately.
    if (data.payment_status === 'paid') {
      paymentConfirmedRef.current = true;

      setPaymentPending(false);
      setCheckoutUrl(null);
      pendingTxRef.current = null;
      paymentInitStartedRef.current = false;

      if (paymentPollingRef.current) {
        clearInterval(paymentPollingRef.current);
        paymentPollingRef.current = null;
      }

      setReservation((prev: any) =>
        prev
          ? {
              ...prev,
              status: data.status,
              payment_status: data.payment_status,
            }
          : prev
      );

      toast.success(
        'Payment confirmed! Your reservation is confirmed.'
      );

      navigate('/account/reservations', {
        replace: true,
      });
    }
  } catch (error) {
    console.error(
      '[RESERVATION PAYMENT] Unexpected error:',
      error
    );
  }
}, [reservationId, navigate]);

useEffect(() => {
  if (!paymentPending || !reservationId) {
    return;
  }

  let disposed = false;

  paymentConfirmedRef.current = false;

  console.log(
    '[RESERVATION PAYMENT] Starting 2-second payment checker:',
    reservationId
  );

  // Check immediately
  checkPaymentStatus();

  // Then check every 2 seconds
  paymentPollingRef.current = setInterval(() => {
    if (
      !disposed &&
      !paymentConfirmedRef.current
    ) {
      checkPaymentStatus();
    }
  }, 2000);

  // Check immediately when coming back from Chapa
  const handleVisibilityChange = () => {
    if (
      document.visibilityState === 'visible' &&
      !disposed &&
      !paymentConfirmedRef.current
    ) {
      console.log(
        '[RESERVATION PAYMENT] Tab visible - checking now'
      );

      checkPaymentStatus();
    }
  };

  document.addEventListener(
    'visibilitychange',
    handleVisibilityChange
  );

  return () => {
    disposed = true;

    document.removeEventListener(
      'visibilitychange',
      handleVisibilityChange
    );

    if (paymentPollingRef.current) {
      clearInterval(paymentPollingRef.current);
      paymentPollingRef.current = null;
    }
  };
}, [
  paymentPending,
  reservationId,
  checkPaymentStatus,
]);
  // Code expiry countdown.
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Resend 60-second cooldown countdown (independent of expiry timer).
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Clean up any un-navigated blank payment window on unmount.
  useEffect(() => {
    return () => {
      const win = paymentWindowRef.current;
      if (win && !win.closed && !paymentWindowNavigatedRef.current) {
        try { win.close(); } catch { /* ignore */ }
      }
    };
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
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
    const pastedData = e.clipboardData
      .getData('text/plain')
      .replace(/\D/g, '')
      .slice(0, 6);
    if (!pastedData) return;
    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) newOtp[i] = pastedData[i];
    setOtp(newOtp);
    const nextIndex = pastedData.length < 6 ? pastedData.length : 5;
    inputRefs.current[nextIndex]?.focus();
  };

  // Prepare a blank browser window BEFORE the async call so the browser
  // considers the window.open() part of the user's click gesture.
  const preparePaymentWindow = () => {
    if (paymentWindowRef.current && !paymentWindowRef.current.closed) return;
    try {
      const win = window.open('about:blank', '_blank');
      if (win) {
        paymentWindowRef.current = win;
        paymentWindowNavigatedRef.current = false;
      }
    } catch {
      paymentWindowRef.current = null;
    }
  };

  const closeUnusedPaymentWindow = () => {
    const win = paymentWindowRef.current;
    if (!win || win.closed || paymentWindowNavigatedRef.current) return;
    try { win.close(); } catch { /* ignore */ }
    paymentWindowRef.current = null;
  };

  const initiatePayment = async (
    amountToPay: number,
    providerRef: string,
    resData: any
  ) => {
    if (paymentInitStartedRef.current) return;
    paymentInitStartedRef.current = true;

    try {
      toast.loading('Opening payment gateway…', { id: 'payment-redirect' });

      const initResponse = await supabase.functions.invoke('chapa-initialize', {
        body: {
          amount: amountToPay,
          currency: 'ETB',
          email: resData.guest_email || profile?.email || 'customer@example.com',
          first_name: resData.guest_name || profile?.full_name || 'Customer',
          tx_ref: providerRef,
          // No return_url — we don't want Chapa to redirect the payment tab to
          // /account/reservations. This page polls and navigates itself.
        },
      });

      if (initResponse.data?.checkout_url) {
        const url = initResponse.data.checkout_url;
        setCheckoutUrl(url);
        pendingTxRef.current = providerRef;

        // Prefer the pre-opened blank tab; fall back to a direct window.open.
        const existingWin = paymentWindowRef.current;
        if (existingWin && !existingWin.closed) {
          try {
            existingWin.location.href = url;
            paymentWindowNavigatedRef.current = true;
          } catch {
            // Fall through — button fallback is visible on screen.
          }
        } else {
          try {
            const win = window.open(url, '_blank');
            if (win) {
              paymentWindowRef.current = win;
              paymentWindowNavigatedRef.current = true;
            }
          } catch { /* popup blocked — button fallback shown */ }
        }

        setPaymentPending(true);
        toast.dismiss('payment-redirect');
      } else {
        throw new Error('Failed to obtain payment checkout URL');
      }
    } catch (err: any) {
      toast.dismiss('payment-redirect');
      closeUnusedPaymentWindow();
      paymentInitStartedRef.current = false;
      toast.error('Failed to initiate payment', { description: err.message });
    }
  };

  // Translate raw edge-function / network errors into clean user-facing strings.
  const sanitizeError = (err: any): string => {
    const msg: string = err?.message || String(err);
    if (msg.includes('Edge Function') || msg.includes('non-2xx') || msg.includes('FunctionsHttp')) {
      return 'Verification service unavailable. Please try again.';
    }
    if (msg.match(/PGRST|postgres|pg_|42[0-9]{3}|syntax error/i)) {
      return 'Something went wrong. Please try again.';
    }
    if (msg.match(/fetch|network|ERR_|Failed to fetch|NetworkError/i)) {
      return 'Network error. Check your connection and try again.';
    }
    // Pass through known business messages from the edge function verbatim.
    return msg;
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter all 6 digits.');
      return;
    }

    // Pre-open the payment window BEFORE the async call so browsers allow it.
    preparePaymentWindow();
    setIsVerifying(true);

    try {
      const { data, error } = await supabase.functions.invoke('verify-reservation', {
        body: { reservation_id: reservationId, code },
      });

      // supabase.functions.invoke: on 4xx the JSON body lands in `data`,
      // and `error` is a FunctionsHttpError. Check data.error first.
      if (data?.error) throw new Error(data.error);
      if (error) throw error;

      if (data?.requires_payment && data?.tx_ref) {
        await initiatePayment(data.amount, data.tx_ref, reservation);
      } else {
        closeUnusedPaymentWindow();
        toast.success('Reservation confirmed!');
        setTimeout(() => navigate('/account/reservations'), 1000);
      }
    } catch (err: any) {
      closeUnusedPaymentWindow();
      toast.error(sanitizeError(err));
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'resend-reservation-code',
        { body: { reservation_id: reservationId } }
      );

      if (data?.error) throw new Error(data.error);
      if (error) throw error;

      toast.success('A new code has been sent to your email.');
      setTimeLeft(600);
      setResendCooldown(60); // start 60-second cooldown independently
    } catch (err: any) {
      toast.error(sanitizeError(err));
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
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </PublicLayout>
    );
  }

  const contactDetail =
    reservation.guest_email ||
    reservation.guest_phone ||
    'your contact details';

  if (paymentPending) {
    return (
      <PublicLayout cafe={cafe} announcements={announcements}>
        <section className="section-pad max-w-md mx-auto px-4 text-center">
          <div className="glass p-8 rounded-xl border border-border">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-heading font-semibold text-foreground mb-3">
              Complete Payment
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
              A secure payment window has opened in a new tab. Please complete
              your payment there — this page will update automatically.
            </p>
            {checkoutUrl && (
              <Button asChild variant="outline" className="mb-6 w-full">
                <a href={checkoutUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Payment Window
                </a>
              </Button>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for payment confirmation…
            </div>
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout cafe={cafe} announcements={announcements}>
      <section className="section-pad max-w-md mx-auto px-4 text-center">
        <div className="glass p-8 rounded-xl border border-border">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-primary" />
          </div>

          <h1 className="text-2xl font-heading font-semibold text-foreground mb-2">
            Verify Your Reservation
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Enter the 6-digit code sent to:<br />
            <span className="font-medium text-foreground">{contactDetail}</span>
          </p>

          <div className="space-y-6">
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el: HTMLInputElement | null) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleChange(index, e.target.value)
                  }
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                    handleKeyDown(index, e)
                  }
                  className="w-12 h-14 text-center text-2xl font-mono bg-background/50 border-primary/20 focus:border-primary"
                />
              ))}
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Expires in{' '}
                <span className="font-mono text-foreground font-medium">
                  {formatTime(timeLeft)}
                </span>
              </span>
              <button
                onClick={handleResend}
                disabled={isResending || resendCooldown > 0}
                className="text-primary hover:underline disabled:opacity-50 disabled:hover:no-underline flex items-center gap-1"
              >
                {isResending ? (
                  <><Loader2 className="w-3 h-3 animate-spin" /> Sending…</>
                ) : resendCooldown > 0 ? (
                  <><RefreshCcw className="w-3 h-3" /> Resend in {resendCooldown}s</>
                ) : (
                  <><RefreshCcw className="w-3 h-3" /> Resend Code</>
                )}
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
                    Verifying…
                  </div>
                ) : (
                  'Verify'
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/account/reservations')}
                disabled={isVerifying}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}