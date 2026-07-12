import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Tag, Plus, Calendar, Megaphone } from 'lucide-react';
import type { Promotion } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function PromotionsAdminPage() {
  const { profile, cafeId } = useAuth();
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    async function load() {
      if (!cafeId) return;
      const { data } = await supabase.from('promotions').select('*').eq('cafe_id', cafeId).order('created_at', { ascending: false });
      setPromotions(data || []);
    }
    load();
  }, [cafeId]);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground mb-2">Smart Promotions</h1>
          <p className="text-muted-foreground">Manage campaigns to increase retention and sales.</p>
        </div>
        <Button onClick={() => {}} className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-2" /> New Campaign
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {promotions.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground glass rounded-xl border border-border border-dashed">
            <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No active promotions.</p>
            <Button variant="outline" onClick={() => {}} className="mt-4 border-border text-primary hover:bg-secondary">
              Create Your First Campaign
            </Button>
          </div>
        ) : (
          promotions.map(promo => (
            <div key={promo.id} className="glass rounded-xl p-6 border border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-heading font-bold text-lg text-foreground">{promo.title}</h3>
                  <Badge variant="outline" className={`text-xs py-0 h-5 ${promo.active ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted text-muted-foreground'}`}>
                    {promo.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{promo.description}</p>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {promo.trigger_type}</span>
                  {promo.ends_at && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Ends: {new Date(promo.ends_at).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="shrink-0">
                <Button variant="outline" size="sm" onClick={() => {}} className="border-border text-primary hover:bg-secondary">
                  Manage
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
