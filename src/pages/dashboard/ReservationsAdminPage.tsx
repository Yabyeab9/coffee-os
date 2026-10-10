import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReservationsList } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { updateReservationStatus } from '@/lib/api';
import { 
  Calendar, Search, Loader2, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  pending_verification: 'bg-warning/15 text-warning border-warning/30',
  verified: 'bg-info/15 text-info border-info/30',
  pending_payment: 'bg-warning/15 text-warning border-warning/30',
  confirmed: 'bg-primary/15 text-primary border-primary/30',
  checked_in: 'bg-info/15 text-info border-info/30',
  completed: 'bg-primary/15 text-primary border-primary/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
  no_show: 'bg-muted text-muted-foreground border-border',
};

export default function ReservationsAdminPage() {
  const { cafeId } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [updatingReservationId, setUpdatingReservationId] = useState<string | null>(null);

  const { data: resData, isLoading, isError, error, refetch } = useReservationsList(cafeId || undefined);

  useEffect(() => {
    if (!cafeId) return;
    const sub = supabase.channel('reservations_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations', filter: `cafe_id=eq.${cafeId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['reservations', cafeId] });
      })
      .subscribe();
      
    return () => { supabase.removeChannel(sub); };
  }, [cafeId, queryClient]);

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingReservationId(id);
    try {
      const result = await updateReservationStatus(id, status as any);
      if (result.error) throw new Error(result.error);
      queryClient.invalidateQueries({ queryKey: ['reservations', cafeId] });
      toast.success(`Reservation marked as ${status.replace('_', ' ')}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update reservation');
    } finally {
      setUpdatingReservationId(null);
    }
  };

  const reservations = resData?.data || [];
  const filtered = reservations.filter(r => 
    r.guest_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.guest_email || '').toLowerCase().includes(search.toLowerCase()) ||
    r.status.includes(search.toLowerCase())
  );

  if (!cafeId) {
    return <div className="p-6">No cafe selected.</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground">Reservations</h1>
          <p className="text-muted-foreground">Manage your upcoming table bookings.</p>
        </div>
      </div>

      <div className="glass rounded-xl p-6 border border-border/50">
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search guests or status..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              className="pl-9 bg-background/50 border-border/50" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {isError && (
            <div role="alert" className="mb-4 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              <span>{error instanceof Error ? error.message : 'Failed to load reservations.'}</span>
              <Button variant="outline" size="sm" onClick={() => void refetch()} className="ml-auto shrink-0">
                Retry
              </Button>
            </div>
          )}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({length: 5}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : isError && !resData ? null : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-border/50 rounded-lg">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No reservations found.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground text-sm">
                  <th className="pb-3 font-medium">Guest & Code</th>
                  <th className="pb-3 font-medium">Date & Time</th>
                  <th className="pb-3 font-medium">Party Size</th>
                  <th className="pb-3 font-medium">Status & Payment</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="py-4">
                      <div className="font-medium text-foreground">{r.guest_name}</div>
                      <div className="text-muted-foreground text-xs">{r.guest_email || r.guest_phone || 'No contact info'}</div>
                      <div className="text-xs font-mono bg-muted/50 inline-block px-1 rounded mt-1">{r.reservation_code}</div>
                      {r.notes && <div className="text-xs text-info mt-1 flex items-center gap-1"><FileText className="w-3 h-3"/> Note attached</div>}
                    </td>
                    <td className="py-4">
                      <div className="text-foreground">{new Date(r.reservation_date).toLocaleDateString()}</div>
                      <div className="text-muted-foreground">{r.reservation_time.slice(0, 5)}</div>
                    </td>
                    <td className="py-4 text-foreground">{r.party_size} guests</td>
                    <td className="py-4 space-y-1">
                      <div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold uppercase border ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </div>
                      {r.payment_status === 'paid' || r.payment_status === 'completed' ? (
                        <div className="text-xs text-green-500 font-medium">Paid</div>
                      ) : r.payment_status === 'pending' ? (
                        <div className="text-xs text-yellow-500 font-medium">Unpaid</div>
                      ) : null}
                    </td>
                    <td className="py-4">
                      <div className="flex gap-2">
                        {r.status === 'pending_verification' && (
                          <div className="text-xs text-muted-foreground border border-border px-2 py-1 rounded">Awaiting Verification</div>
                        )}
                        {(r.status === 'pending' || r.status === 'confirmed' || r.status === 'verified' || r.status === 'pending_payment' || r.status === 'paid') && (
                          <Button size="sm" disabled={updatingReservationId === r.id} onClick={() => handleUpdateStatus(r.id, 'checked_in')} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {updatingReservationId === r.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            Check In
                          </Button>
                        )}
                        {r.status === 'checked_in' && (
                          <Button size="sm" disabled={updatingReservationId === r.id} onClick={() => handleUpdateStatus(r.id, 'completed')} className="bg-info text-info-foreground hover:bg-info/90">
                            {updatingReservationId === r.id && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                            Complete
                          </Button>
                        )}
                        {(r.status === 'pending' || r.status === 'confirmed' || r.status === 'verified' || r.status === 'pending_payment' || r.status === 'pending_verification') && (
                          <Button size="sm" variant="outline" disabled={updatingReservationId === r.id} onClick={() => handleUpdateStatus(r.id, 'cancelled')} className="border-destructive text-destructive hover:bg-destructive/10">Cancel</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
