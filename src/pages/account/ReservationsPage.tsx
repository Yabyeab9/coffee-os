import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Calendar, Coffee, X, QrCode, Plus, Heart, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import QRCodeDataUrl from '@/components/ui/qrcodedataurl';
import { toast } from 'sonner';

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
      toast.success('Reservation cancelled');
    }
  };

  const handleRebook = () => {
    toast.success('Reservation details copied. Redirecting to booking...');
  };

  if (isLoading) {
    return <div className="p-10 flex justify-center min-h-[400px] items-center"><Coffee className="w-8 h-8 text-primary animate-pulse" /></div>;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingStatuses = ['pending', 'pending_payment', 'pending_verification', 'confirmed', 'paid'];
  const upcomingReservations = reservations.filter(r => {
    const resDate = new Date(r.reservation_date);
    return resDate >= today && upcomingStatuses.includes(r.status);
  });
  
  const historyReservations = reservations.filter(r => {
    const resDate = new Date(r.reservation_date);
    return resDate < today || !upcomingStatuses.includes(r.status);
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Calendar className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-heading font-semibold text-foreground">Reservations</h1>
        </div>
        <Button asChild className="shrink-0 gap-2 font-medium shadow-md">
          <Link to="/reservations">
            <Plus className="w-4 h-4" /> New Reservation
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-8 p-1">
          <TabsTrigger value="upcoming" className="font-medium">Upcoming ({upcomingReservations.length})</TabsTrigger>
          <TabsTrigger value="history" className="font-medium">History</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4 outline-none">
          {upcomingReservations.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground glass rounded-xl border border-border">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No upcoming reservations</h3>
              <p className="mb-6 max-w-md mx-auto">You don't have any table bookings coming up. Secure your spot at our café.</p>
              <Button asChild variant="outline">
                <Link to="/reservations">Book a Table</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {upcomingReservations.map(res => {
                const order = res.orders?.[0];
                return (
                  <div key={res.id} className="glass rounded-xl p-6 border-l-4 border-l-primary shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg text-foreground truncate">Table for {res.party_size} {res.cafes?.name ? `at ${res.cafes.name}` : ''}</h3>
                          <Badge variant="outline" className={`capitalize px-3 py-1 font-semibold ${
                            (res.status === 'confirmed' || res.status === 'paid') ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                            res.status === 'pending_payment' ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' : ''
                          }`}>{res.status.replace('_', ' ')}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-4">
                          <div className="bg-background/50 p-3 rounded-lg border border-border">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Date</p>
                            <p className="font-medium text-sm">{new Date(res.reservation_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                          </div>
                          <div className="bg-background/50 p-3 rounded-lg border border-border">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Time</p>
                            <p className="font-medium text-sm">{res.reservation_time.substring(0, 5)}</p>
                          </div>
                          <div className="bg-background/50 p-3 rounded-lg border border-border">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Guests</p>
                            <p className="font-medium text-sm">{res.party_size} People</p>
                          </div>
                          <div className="bg-background/50 p-3 rounded-lg border border-border">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Status</p>
                            <p className="font-medium text-sm">{res.qr_token ? 'Ready' : 'Pending'}</p>
                          </div>
                        </div>

                        {order && (
                          <div className="mt-4 bg-background/50 rounded-lg p-4 border border-border">
                            <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2">Preorder Included</p>
                            <p className="text-sm text-muted-foreground mb-2">
                              {order.order_items?.map((item: any) => `${item.quantity}x ${item.menus?.name}`).join(', ')}
                            </p>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-bold text-primary">{order.total_amount} ETB</span>
                              <Badge variant="outline" className={`text-[10px] capitalize ${order.payment_status === 'paid' ? 'text-green-600 border-green-200' : ''}`}>{order.payment_status}</Badge>
                            </div>
                          </div>
                        )}

                        {res.status === 'pending_verification' && (
                          <div className="mt-4">
                            <Button variant="default" size="sm" asChild>
                              <Link to={`/reservation/verify/${res.id}`}>Verify Reservation Now</Link>
                            </Button>
                          </div>
                        )}
                        {(res.status === 'pending_payment' || (res.status === 'verified' && res.payment_status !== 'paid')) && (
                          <div className="mt-4">
                            <Button variant="default" size="sm" asChild>
                              <Link to={`/reservation/verify/${res.id}`}>Complete Payment</Link>
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* QR Code Section */}
                      {res.qr_token && (res.status === 'confirmed' || res.status === 'paid' || res.status === 'checked_in') && (
                        <div className="shrink-0 bg-white p-3 rounded-xl shadow-sm border border-border flex flex-col items-center ml-0 md:ml-4 mt-4 md:mt-0">
                          <QRCodeDataUrl text={res.qr_token} width={120} />
                          <span className="text-[10px] uppercase font-bold text-muted-foreground mt-2 tracking-wider text-center block">Scan to check in</span>
                          <span className="text-[10px] text-muted-foreground mt-1 font-mono text-center block">{res.reservation_code}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border mt-4">
                      {(res.status === 'pending' || res.status === 'pending_payment' || res.status === 'confirmed' || res.status === 'paid') && (
                        <Button variant="outline" size="sm" onClick={() => cancelReservation(res.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10 border-border">
                          Cancel Reservation
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="text-muted-foreground ml-auto" onClick={() => toast.success('Redirecting to modify...')}>
                        Modify
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 outline-none">
          {historyReservations.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground glass rounded-xl border border-border">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Your reservation history is empty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {historyReservations.map((res, idx) => (
                <div key={res.id} className="glass rounded-xl p-5 border border-border hover:border-primary/30 transition-colors flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {new Date(res.reservation_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </h3>
                      <p className="text-xs text-muted-foreground">{res.reservation_time.substring(0, 5)} • {res.party_size} Guests</p>
                    </div>
                    <Badge variant="secondary" className="capitalize text-[10px]">{res.status.replace(/_/g, ' ')}</Badge>
                  </div>
                  
                  <div className="flex-1 mt-2 mb-4">
                    <p className="text-sm text-muted-foreground">
                      {res.cafes?.name || 'Coffee OS Cafe'}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-3 border-t border-border">
                    <Button asChild variant="outline" size="sm" className="flex-1 gap-2 h-9" onClick={handleRebook}>
                      <Link to="/reservations"><RotateCcw className="w-3.5 h-3.5" /> Rebook</Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-50" onClick={() => toast.success('Added to favorites')}>
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}