import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Calendar, Coffee, ChevronRight, X } from 'lucide-react';
import type { ReservationStatus } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ReservationsPage() {
  const { profile, cafeId } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReservations() {
      if (!profile?.id || !cafeId) return;
      const { data } = await supabase
        .from('reservations')
        .select('*')
        .eq('user_id', profile.id)
        .eq('cafe_id', cafeId)
        .order('reservation_date', { ascending: false });
      
      setReservations(data || []);
      setIsLoading(false);
    }
    fetchReservations();
  }, [profile?.id, cafeId]);

  const cancelReservation = async (id: string) => {
    await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id);
    setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
  };

  if (isLoading) {
    return <div className="p-10 flex justify-center"><Coffee className="w-6 h-6 text-primary animate-pulse" /></div>;
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">Reservations</h1>
      
      {reservations.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground glass rounded-xl">
          <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p>You have no reservations.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map(res => (
            <div key={res.id} className="glass rounded-xl p-5 border-l-4 border-l-accent/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">Table for {res.party_size}</h3>
                    <Badge variant="outline" className="capitalize text-xs py-0 h-5">{res.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {new Date(res.reservation_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at {res.reservation_time}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-border/50">
                {res.status === 'pending' && (
                  <Button variant="outline" size="sm" onClick={() => cancelReservation(res.id)} className="text-destructive hover:text-destructive border-border">
                    <X className="w-4 h-4 mr-1" /> Cancel Reservation
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}