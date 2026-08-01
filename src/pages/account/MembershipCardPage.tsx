import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import QRCode from 'qrcode';
import { CreditCard, Star, CalendarDays, Coffee, Sparkles } from 'lucide-react';

export default function MembershipCardPage() {
  const { profile } = useAuth();
  const userId = profile?.id;
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const { data: membership } = useQuery({
    queryKey: ['membership', userId],
    queryFn: async () => {
      const { data: mem } = await supabase.from('memberships').select('*').eq('user_id', userId).single();
      const { data: points } = await supabase.from('loyalty_points').select('*, loyalty_tiers(*)').eq('user_id', userId).single();
      return { mem, points };
    },
    enabled: !!userId
  });

  useEffect(() => {
    if (membership?.mem?.qr_code) {
      QRCode.toDataURL(membership.mem.qr_code, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(setQrCodeUrl);
    } else if (userId) {
      // Create a fallback QR based on user ID for MVP
      QRCode.toDataURL(`MEMBER:${userId}`, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      }).then(setQrCodeUrl);
    }
  }, [membership, userId]);

  const tier = membership?.points?.loyalty_tiers;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-2">
        <CreditCard className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-heading font-semibold">Membership Card</h1>
      </div>
      <p className="text-muted-foreground">Your digital coffee pass. Scan to check in, pay, and earn points.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-2xl p-8 border border-border flex flex-col items-center justify-center text-center relative overflow-hidden bg-gradient-to-br from-background to-secondary/20 shadow-xl">
          <div className="absolute top-0 right-0 p-4 opacity-50">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-6">
            <Coffee className="w-10 h-10 text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold text-foreground mb-1">{profile?.full_name || 'Coffee Lover'}</h2>
          <p className="text-sm font-mono text-muted-foreground mb-8">{membership?.mem?.membership_number || `MEMBER-${userId?.slice(0,8).toUpperCase()}`}</p>
          
          <div className="bg-white p-4 rounded-xl shadow-inner mb-6">
            {qrCodeUrl ? (
              <img src={qrCodeUrl} alt="Membership QR" className="w-48 h-48" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded-lg">
                <span className="text-gray-400">Loading QR...</span>
              </div>
            )}
          </div>
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 border border-border shadow-sm">
            <Star className="w-4 h-4 text-primary" />
            <span className="font-semibold text-sm">{tier?.tier_name || 'Member'} Tier</span>
          </div>
        </motion.div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold mb-4">Membership Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-background/50 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-1">Available Points</p>
                <p className="text-2xl font-bold">{membership?.points?.points_balance || 0}</p>
              </div>
              <div className="p-4 bg-background/50 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-1">Lifetime Spending</p>
                <p className="text-2xl font-bold">{membership?.mem?.lifetime_spending || 0} <span className="text-sm font-normal text-muted-foreground">ETB</span></p>
              </div>
              <div className="p-4 bg-background/50 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground mb-1">Total Visits</p>
                <p className="text-2xl font-bold flex items-center gap-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  {membership?.mem?.visit_count || 0}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
