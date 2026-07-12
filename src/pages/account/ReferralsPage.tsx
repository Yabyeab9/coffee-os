import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Users, Copy, Check, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function ReferralsPage() {
  const { profile, cafeId } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ total: 0, rewards: 0 });

  useEffect(() => {
    async function load() {
      if (!profile?.id || !cafeId) return;
      const { data } = await supabase.from('referrals').select('referral_code').eq('inviter_id', profile.id).eq('cafe_id', cafeId).maybeSingle();
      if (data) {
        setReferralCode(data.referral_code);
      } else {
        const baseName = profile.full_name || profile.email || 'USER';
        const newCode = baseName.substring(0, 3).toUpperCase() + Math.floor(1000 + Math.random() * 9000);
        await supabase.from('referrals').insert({ cafe_id: cafeId, inviter_id: profile.id, referral_code: newCode });
        setReferralCode(newCode);
      }
      const { count } = await supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('inviter_id', profile.id).eq('cafe_id', cafeId).not('invited_id', 'is', null);
      setStats({ total: count || 0, rewards: (count || 0) * 100 }); // mock 100pts per ref
    }
    load();
  }, [profile?.id, cafeId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://origin.coffeeos.app/register?ref=${referralCode}`);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground mb-2">Refer a Friend</h1>
        <p className="text-muted-foreground">Invite friends to Origin Coffee and both of you get rewards!</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Share2 className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-heading font-semibold text-lg text-foreground">Share your link</h3>
          <div className="flex w-full max-w-sm gap-2">
            <Input value={`https://origin.coffeeos.app/register?ref=${referralCode}`} readOnly className="bg-background border-border text-xs" />
            <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0 border-border text-primary hover:bg-secondary">
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="glass rounded-xl p-8 space-y-6">
          <h3 className="font-heading font-semibold text-lg text-foreground mb-4">Your Impact</h3>
          <div className="flex items-center justify-between border-b border-border/50 pb-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <span className="text-foreground">Friends Invited</span>
            </div>
            <span className="font-semibold text-xl">{stats.total}</span>
          </div>
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">P</div>
              <span className="text-foreground">Points Earned</span>
            </div>
            <span className="font-semibold text-xl text-primary">{stats.rewards}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
