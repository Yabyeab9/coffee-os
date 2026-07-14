import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Calendar, Coffee, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function ReservationsPage() {
  const { profile } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReservations() {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('reservations')
        .select('*, cafes(name)')
        .eq('user_id', profile.id)
        .order('reservation_date', { ascending: false });
      
      setReservations(data || []);
      setIsLoading(false);
    }
    fetchReservations();
  }, [profile?.id]);

  const cancelReservation = async (id: string) => {
    const { error } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id);
    if (!error) {
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status: 'cancelled' } : r));
    }
  };

  if (isLoading) {
    return <div className="p-10 flex justify-center min-h-[400px] items-center"><Coffee className="w-8 h-8 text-primary animate-pulse" /></div>;
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
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">Table for {res.party_size} {res.cafes?.name ? `at ${res.cafes.name}` : ''}</h3>
                    <Badge variant="outline" className={`capitalize text-xs py-0 h-5 ${
                      res.status === 'confirmed' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                      res.status === 'cancelled' ? 'bg-destructive/10 text-destructive border-destructive/20' : ''
                    }`}>{res.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Date: {new Date(res.reservation_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Time: {res.reservation_time.substring(0, 5)}
                  </p>
                  {res.notes && (
                    <p className="text-sm text-muted-foreground mt-2 bg-background/50 p-2 rounded-md">
                      <span className="font-medium text-foreground">Notes:</span> {res.notes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    Created on {new Date(res.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-border/50">
                {(res.status === 'pending' || res.status === 'confirmed') && (
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