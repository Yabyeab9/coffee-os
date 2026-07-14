import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Sparkles, ShoppingBag } from 'lucide-react';
import type { AiRecommendation } from '@/types/database';
import { Button } from '@/components/ui/button';

export default function AiRecommendationsPage() {
  const { profile } = useAuth();
  const [recs, setRecs] = useState<AiRecommendation[]>([]);

  useEffect(() => {
    async function load() {
      if (!profile?.id) return;
      const { data } = await supabase.from('ai_recommendations').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
      setRecs(data || []);
    }
    load();
  }, [profile?.id]);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground mb-2 flex items-center gap-3">
          AI Personal Barista <Sparkles className="w-6 h-6 text-primary" />
        </h1>
        <p className="text-muted-foreground">Smart recommendations curated just for you based on your taste profile.</p>
      </div>

      {recs.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center text-muted-foreground">
          <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p>No AI recommendations generated yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recs.map(rec => (
            <div key={rec.id} className="glass rounded-xl p-6 relative overflow-hidden border border-primary/20">
              <div className="absolute top-0 right-0 p-3">
                <div className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full font-medium">
                  {rec.result.discount || 'Recommended'}
                </div>
              </div>
              <h3 className="text-xl font-heading font-bold text-foreground mb-2 pr-20">{rec.result.title}</h3>
              <p className="text-sm text-muted-foreground mb-6 line-clamp-2">{rec.result.description}</p>
              <div className="flex gap-3">
                <Button onClick={() => {}} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  <ShoppingBag className="w-4 h-4 mr-2" /> Add to Order
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
