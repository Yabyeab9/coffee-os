import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Search, CheckCircle, XCircle, Clock, Coffee, QrCode } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function ReservationScannerPage() {
  const { cafeId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [reservation, setReservation] = useState<any | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setReservation(null);

    // Search by reservation code or QR token
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        orders(
          id, total_amount, payment_status,
          order_items(quantity, menus(name))
        )
      `)
      .eq('cafe_id', cafeId)
      .or(`reservation_code.eq.${searchQuery},qr_token.eq.${searchQuery}`)
      .maybeSingle();

    setIsSearching(false);

    if (error) {
      toast.error('Search failed', { description: error.message });
      return;
    }

    if (!data) {
      toast.error('Reservation not found');
      return;
    }

    setReservation(data);
  };

  const updateStatus = async (status: string) => {
    if (!reservation) return;
    const { error } = await supabase
      .from('reservations')
      .update({ 
        status, 
        ...(status === 'checked_in' ? { check_in_at: new Date().toISOString() } : {}),
        ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {})
      })
      .eq('id', reservation.id);

    if (error) {
      toast.error('Failed to update status', { description: error.message });
    } else {
      toast.success(`Reservation marked as ${status.replace('_', ' ')}`);
      setReservation({ ...reservation, status });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-foreground">Reservation Scanner</h1>
          <p className="text-muted-foreground text-sm">Scan QR code or enter reservation code</p>
        </div>
      </div>

      <div className="glass rounded-xl p-6">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter reservation code (e.g. RES-XYZ123) or QR token"
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching}>
            {isSearching ? <Clock className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
            Lookup
          </Button>
        </form>
      </div>

      {reservation && (
        <div className="glass rounded-xl p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-wrap justify-between items-start gap-4 border-b border-border/50 pb-6">
            <div>
              <h2 className="text-xl font-heading font-semibold text-foreground">{reservation.guest_name}</h2>
              <p className="text-muted-foreground text-sm">Code: <span className="font-mono bg-muted px-1 py-0.5 rounded">{reservation.reservation_code}</span></p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className={`capitalize ${
                (reservation.status === 'confirmed' || reservation.status === 'paid') ? 'bg-green-500/10 text-green-600 border-green-500/20' : 
                reservation.status === 'checked_in' ? 'bg-primary/10 text-primary border-primary/20' :
                reservation.status === 'completed' ? 'bg-muted text-muted-foreground' :
                reservation.status === 'cancelled' ? 'bg-destructive/10 text-destructive border-destructive/20' : 
                'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
              }`}>{reservation.status.replace('_', ' ')}</Badge>
              {reservation.payment_status === 'completed' && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Paid</Badge>
              )}
              {reservation.payment_status === 'pending' && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Payment Pending</Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-6 border-b border-border/50">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Date</p>
              <p className="font-medium">{new Date(reservation.reservation_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Time</p>
              <p className="font-medium">{reservation.reservation_time.substring(0, 5)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Party Size</p>
              <p className="font-medium">{reservation.party_size} Guests</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Contact</p>
              <p className="font-medium">{reservation.guest_phone || reservation.guest_email || 'N/A'}</p>
            </div>
          </div>

          {reservation.notes && (
            <div className="pb-6 border-b border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Special Notes</p>
              <p className="text-sm bg-muted/50 p-3 rounded-md">{reservation.notes}</p>
            </div>
          )}

          {reservation.orders && reservation.orders[0] && (
            <div className="pb-6 border-b border-border/50">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1"><Coffee className="w-3 h-3" /> Preorder Summary</p>
              <div className="bg-background/50 rounded-md p-4">
                <ul className="text-sm space-y-1 mb-3">
                  {reservation.orders[0].order_items?.map((item: any, i: number) => (
                    <li key={i} className="flex justify-between">
                      <span>{item.quantity}x {item.menus?.name}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between items-center border-t border-border/50 pt-3">
                  <span className="font-medium text-sm">Total Value</span>
                  <span className="font-medium text-sm">{reservation.orders[0].total_amount} ETB</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            {(reservation.status === 'confirmed' || reservation.status === 'paid' || reservation.status === 'pending_payment') && (
              <Button onClick={() => updateStatus('checked_in')} className="flex-1 sm:flex-none">
                <CheckCircle className="w-4 h-4 mr-2" /> Check In
              </Button>
            )}
            {reservation.status === 'checked_in' && (
              <Button onClick={() => updateStatus('completed')} className="flex-1 sm:flex-none">
                <CheckCircle className="w-4 h-4 mr-2" /> Mark Completed
              </Button>
            )}
            {reservation.status !== 'cancelled' && reservation.status !== 'completed' && (
              <Button variant="outline" onClick={() => updateStatus('cancelled')} className="flex-1 sm:flex-none text-destructive hover:text-destructive">
                <XCircle className="w-4 h-4 mr-2" /> Cancel
              </Button>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
