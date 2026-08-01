import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Calendar, Coffee, X, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';

export default function ReservationsPage() {
  const { profile } = useAuth();
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchReservations() {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('reservations')
        .select(`
          *, 
          cafes(name),
          orders(
            total_amount, 
            payment_status,
            order_items(
              quantity,
              menus(name)
            )
          )
        `)
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
          {reservations.map(res => {
            const order = res.orders?.[0]; // Get the first order associated with this reservation
            
            return (
            <div key={res.id} className="glass rounded-xl p-5 border-l-4 border-l-accent/50">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-semibold text-foreground truncate">Table for {res.party_size} {res.cafes?.name ? `at ${res.cafes.name}` : ''}</h3>
                    <Badge variant="outline" className={`capitalize text-xs py-0 h-5 ${
                      (res.status === 'confirmed' || res.status === 'paid') ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                      res.status === 'cancelled' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                      res.status === 'pending_payment' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : ''
                    }`}>{res.status.replace('_', ' ')}</Badge>
                  </div>
                  
                  {res.reservation_code && (
                    <div className="inline-block bg-muted/50 rounded-md px-2 py-1 text-xs font-mono mb-2">
                      Code: {res.reservation_code}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Date:</span> {new Date(res.reservation_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    <span className="font-medium text-foreground">Time:</span> {res.reservation_time.substring(0, 5)}
                  </p>

                  {order && (
                    <div className="mt-3 mb-2 bg-background/50 rounded-md p-3">
                      <p className="text-sm font-medium text-foreground mb-1">Preorder Summary:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside ml-4 mb-2">
                        {order.order_items?.map((item: any, i: number) => (
                          <li key={i}>{item.quantity}x {item.menus?.name}</li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Total: {order.total_amount} ETB</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{order.payment_status}</Badge>
                      </div>
                    </div>
                  )}

                  {res.notes && (
                    <p className="text-sm text-muted-foreground mt-2 bg-background/50 p-2 rounded-md">
                      <span className="font-medium text-foreground">Notes:</span> {res.notes}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-3">
                    Created on {new Date(res.created_at).toLocaleDateString()}
                  </p>

                  {res.status === 'pending_verification' && (
                    <div className="mt-4">
                      <Button variant="outline" size="sm" asChild className="border-primary text-primary hover:bg-primary/10">
                        <Link to={`/reservation/verify/${res.id}`}>Verify Reservation Now</Link>
                      </Button>
                    </div>
                  )}
                  {(res.status === 'pending_payment' || (res.status === 'verified' && res.payment_status !== 'paid')) && (
                    <div className="mt-4">
                      <Button variant="outline" size="sm" asChild className="border-primary text-primary hover:bg-primary/10">
                        <Link to={`/reservation/verify/${res.id}`}>Complete Payment</Link>
                      </Button>
                    </div>
                  )}
                </div>

                {/* QR Code Section */}
                {res.qr_token && (res.status === 'confirmed' || res.status === 'paid' || res.status === 'checked_in') && (
                  <div className="shrink-0 bg-white p-2 rounded-lg flex flex-col items-center">
                    <QRCodeDataUrl text={res.qr_token} width={100} />
                    <span className="text-[10px] text-muted-foreground mt-1 text-center w-full block">Scan at café</span>
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap gap-3 pt-4 border-t border-border/50">
                {(res.status === 'pending' || res.status === 'pending_payment' || res.status === 'confirmed') && (
                  <Button variant="outline" size="sm" onClick={() => cancelReservation(res.id)} className="text-destructive hover:text-destructive border-border">
                    <X className="w-4 h-4 mr-1" /> Cancel Reservation
                  </Button>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}