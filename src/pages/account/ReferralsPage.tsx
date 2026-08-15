import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Users, Copy, Check, Share2, Award, Clock, Loader2, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ReferralsPage() {
  const { profile } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, successful: 0, rewards: 0 });
  const [events, setEvents] = useState<any[]>([]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!profile?.id || loadedRef.current) return;
    loadedRef.current = true;

    async function load() {
      setLoading(true);
      try {
        // 1. Get permanent referral code from DB (users.referral_code), generating via Edge Function if null
        const { data: userData } = await supabase
          .from('users')
          .select('referral_code')
          .eq('id', profile!.id)
          .single();

        let code = userData?.referral_code as string | null;

        if (!code) {
          // Persist once via loyalty-engine (idempotent, race-safe)
          const { data: genData } = await supabase.functions.invoke('loyalty-engine', {
            body: { action: 'get_referral_code', payload: {} },
          });
          code = genData?.referral_code ?? null;
        }

        if (code) setReferralCode(code);

        // 2. Load stats from referral_codes table
        const { data: rc } = await supabase
          .from('referral_codes')
          .select('total_referrals, successful_referrals, total_rewards_earned')
          .eq('user_id', profile!.id)
          .maybeSingle();

        if (rc) {
          setStats({
            total: rc.total_referrals ?? 0,
            successful: rc.successful_referrals ?? 0,
            rewards: rc.total_rewards_earned ?? 0,
          });
        }

        // 3. Load referral events (real DB rows)
        const { data: eventData } = await supabase
          .from('referral_events')
          .select('*')
          .eq('referrer_id', profile!.id)
          .order('registration_date', { ascending: false });

        setEvents(eventData ?? []);
      } catch (err: any) {
        toast.error('Could not load referral data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [profile?.id]);

  const referralLink = referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : '';

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-semibold">Refer a Friend</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Share your link — you earn <strong>+5 pts</strong> when your friend completes their first order or reservation.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Users, label: 'Total Referrals', value: stats.total },
          { icon: Check, label: 'Successful', value: stats.successful },
          { icon: Award, label: 'Pts Earned', value: stats.rewards },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="glass p-5 rounded-xl border border-border text-center">
            <Icon className="w-4 h-4 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold tabular-nums">{value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Referral link card */}
      <div className="glass p-7 rounded-xl border border-border text-center space-y-5">
        <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Share2 className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Your Permanent Referral Link</h2>
          <p className="text-muted-foreground text-sm mt-1">
            This code is fixed to your account and never changes.
          </p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your code…
          </div>
        ) : (
          <div className="flex gap-2 max-w-md mx-auto">
            <Input
              readOnly
              value={referralLink || 'Generating your code…'}
              className="bg-background font-mono text-sm"
            />
            <Button onClick={handleCopy} className="shrink-0" disabled={!referralCode}>
              {copied ? <Check className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Your referral code: <code className="font-mono font-semibold text-foreground">{referralCode || '—'}</code>
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
        {[
          { step: '1', text: 'Share your unique link with a friend' },
          { step: '2', text: 'They register using your link' },
          { step: '3', text: 'They complete an order → you get +5 pts' },
        ].map(({ step, text }) => (
          <div key={step} className="glass rounded-xl p-4 border border-border/50">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mx-auto mb-2">
              {step}
            </div>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      {/* Referral history */}
      <div>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4" /> Referral History
        </h2>
        {loading ? (
          <div className="glass rounded-xl p-8 border border-border flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="glass p-8 rounded-xl border border-border text-center text-muted-foreground text-sm">
            No referrals yet. Share your link to get started!
          </div>
        ) : (
          <div className="glass rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-left font-medium whitespace-nowrap">Points Awarded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-secondary/20">
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">
                        {new Date(event.registration_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {event.reward_status === 'pending' ? (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                            <Clock className="w-3 h-3 mr-1" /> Pending
                          </Badge>
                        ) : event.reward_status === 'completed' ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                            <Check className="w-3 h-3 mr-1" /> Completed
                          </Badge>
                        ) : (
                          <Badge variant="outline">{event.reward_status}</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        {event.points_awarded ? `+${event.points_awarded} pts` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}