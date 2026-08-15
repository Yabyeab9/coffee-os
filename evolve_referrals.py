import re

with open('/workspace/app-cvq4redfdog1/src/pages/account/ReferralsPage.tsx', 'r') as f:
    content = f.read()

new_content = """import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Users, Copy, Check, Share2, Award, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ReferralsPage() {
  const { profile } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ total: 0, successful: 0, rewards: 0 });
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      if (!profile?.id) return;
      
      // Load or Create Referral Code
      let { data: codeData } = await supabase.from('referral_codes').select('*').eq('user_id', profile.id).maybeSingle();
      
      if (!codeData) {
        // Generate new permanent code
        const baseName = (profile.full_name || profile.email || 'USER').substring(0, 3).toUpperCase();
        const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
        const newCode = `${baseName}${randStr}`;
        
        const { data: newCodeData } = await supabase.from('referral_codes').insert({
          user_id: profile.id,
          referral_code: newCode
        }).select().single();
        
        codeData = newCodeData;
      }
      
      if (codeData) {
        setReferralCode(codeData.referral_code);
        setStats({ 
          total: codeData.total_referrals || 0, 
          successful: codeData.successful_referrals || 0,
          rewards: codeData.total_rewards_earned || 0 
        });
      }
      
      // Load Referral Events
      const { data: eventData } = await supabase.from('referral_events')
        .select('*')
        .eq('referrer_id', profile.id)
        .order('registration_date', { ascending: false });
        
      if (eventData) {
        setEvents(eventData);
      }
    }
    load();
  }, [profile?.id]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`${window.location.origin}/login?ref=${referralCode}`);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Refer a Friend</h1>
        <p className="text-muted-foreground mt-1">Share Coffee OS and earn rewards when they order.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass p-6 rounded-xl border border-border">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Users className="w-5 h-5" />
            <h3 className="font-medium">Total Referrals</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="glass p-6 rounded-xl border border-border">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Check className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Successful</h3>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.successful}</p>
        </div>
        <div className="glass p-6 rounded-xl border border-border">
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Rewards Earned</h3>
          </div>
          <p className="text-3xl font-bold text-primary">${stats.rewards.toFixed(2)}</p>
        </div>
      </div>

      <div className="glass p-8 rounded-xl border border-border max-w-2xl mx-auto text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Share2 className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Your Permanent Referral Link</h2>
        <p className="text-muted-foreground mb-6 text-sm">
          Give friends 10% off their first order. You'll get 10% of their first order value credited to your account!
        </p>
        <div className="flex gap-2 max-w-md mx-auto">
          <Input readOnly value={referralCode ? `${window.location.origin}/login?ref=${referralCode}` : 'Loading...'} className="bg-background text-foreground" />
          <Button onClick={handleCopy} className="shrink-0 w-24">
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold text-foreground mb-4">Referral History</h2>
        {events.length === 0 ? (
          <div className="glass p-8 rounded-xl border border-border text-center text-muted-foreground">
            No referrals yet. Share your link to get started!
          </div>
        ) : (
          <div className="glass rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-secondary/50 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Reward</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-secondary/20">
                      <td className="px-4 py-3 text-foreground">
                        {new Date(event.registration_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {event.reward_status === 'pending' ? (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20"><Clock className="w-3 h-3 mr-1" /> Pending Order</Badge>
                        ) : event.reward_status === 'fraud_flagged' ? (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Review Pending</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20"><Check className="w-3 h-3 mr-1" /> Completed</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium">
                        {event.reward_amount ? `$${event.reward_amount}` : '-'}
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
"""

with open('/workspace/app-cvq4redfdog1/src/pages/account/ReferralsPage.tsx', 'w') as f:
    f.write(new_content)

