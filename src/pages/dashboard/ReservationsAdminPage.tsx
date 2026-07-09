import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Users, Phone, Mail, Clock, Filter, Loader2, MessageSquare, Check, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getReservations, updateReservationStatus } from '@/lib/api';
import type { Reservation, ReservationStatus } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const DEMO_CAFE_ID = '00000000-0000-0000-0000-000000000001';

const STATUS_STYLES: Record<ReservationStatus, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  confirmed: 'bg-primary/15 text-primary border-primary/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
  no_show: 'bg-muted text-muted-foreground border-border',
};

const STATUS_ACTIONS: Record<ReservationStatus, { label: string; next: ReservationStatus; icon: React.ElementType; color: string }[]> = {
  pending: [
    { label: 'Confirm', next: 'confirmed', icon: Check, color: 'text-primary hover:bg-primary/10' },
    { label: 'Cancel', next: 'cancelled', icon: X, color: 'text-destructive hover:bg-destructive/10' },
  ],
  confirmed: [
    { label: 'No-show', next: 'no_show', icon: AlertTriangle, color: 'text-warning hover:bg-warning/10' },
    { label: 'Cancel', next: 'cancelled', icon: X, color: 'text-destructive hover:bg-destructive/10' },
  ],
  cancelled: [],
  no_show: [],
};

export default function ReservationsAdminPage() {
  const { cafeId } = useAuth();
  const resolvedId = cafeId ?? DEMO_CAFE_ID;
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Notes dialog
  const [notesDialog, setNotesDialog] = useState(false);
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [internalNotes, setInternalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const res = await getReservations(resolvedId, { status: statusFilter !== 'all' ? statusFilter : undefined, date: dateFilter || undefined, page });
    setReservations(res.data);
    setTotal(res.total);
    setIsLoading(false);
  }, [resolvedId, statusFilter, dateFilter, page]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, status: ReservationStatus) => {
    const { error } = await updateReservationStatus(id, status);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Reservation ${status}`);
    load();
  };

  const openNotes = (r: Reservation) => {
    setSelectedRes(r);
    setInternalNotes(r.internal_notes ?? '');
    setNotesDialog(true);
  };

  const handleSaveNotes = async () => {
    if (!selectedRes) return;
    setSavingNotes(true);
    const { error } = await updateReservationStatus(selectedRes.id, selectedRes.status, internalNotes);
    setSavingNotes(false);
    if (error) { toast.error('Failed to save notes'); return; }
    toast.success('Notes saved');
    setNotesDialog(false);
    load();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-heading font-semibold text-foreground">Reservations</h1>
        <p className="text-sm text-muted-foreground">{total} total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap flex-1">
          {['all', 'pending', 'confirmed', 'cancelled', 'no_show'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }} className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors shrink-0 ${statusFilter === s ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
        <Input type="date" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1); }} className="w-full md:w-44 bg-input border-border text-sm" />
        {dateFilter && <Button variant="ghost" size="sm" onClick={() => setDateFilter('')} className="text-muted-foreground">Clear date</Button>}
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : reservations.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Calendar className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p>No reservations found.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Guest</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Date & Time</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Party</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Status</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {reservations.map(r => (
                  <tr key={r.id} className="hover:bg-secondary/30 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="font-medium text-foreground">{r.guest_name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        {r.guest_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{r.guest_email}</span>}
                        {r.guest_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{r.guest_phone}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-foreground"><Calendar className="w-3.5 h-3.5 text-primary" />{r.reservation_date}</div>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mt-0.5"><Clock className="w-3 h-3" />{r.reservation_time}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-foreground"><Users className="w-3.5 h-3.5 text-primary" />{r.party_size}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <Badge className={`text-[10px] px-2 py-0.5 capitalize ${STATUS_STYLES[r.status]}`}>{r.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {STATUS_ACTIONS[r.status]?.map(action => (
                          <button key={action.label} onClick={() => handleStatusChange(r.id, action.next)} title={action.label} className={`p-1.5 rounded-md transition-colors ${action.color}`}>
                            <action.icon className="w-3.5 h-3.5" />
                          </button>
                        ))}
                        <button onClick={() => openNotes(r)} title="Notes" className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Showing {Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} of {total}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="border-border">Previous</Button>
                <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="border-border">Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Notes Dialog */}
      <Dialog open={notesDialog} onOpenChange={setNotesDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>Internal Notes — {selectedRes?.guest_name}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-1.5">
            {selectedRes?.notes && (
              <div className="glass rounded-lg p-3 mb-3 text-sm text-muted-foreground">
                <p className="text-xs font-semibold text-primary mb-1">Guest Request</p>
                {selectedRes.notes}
              </div>
            )}
            <Label className="text-sm text-muted-foreground">Internal Notes (Staff only)</Label>
            <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Add internal notes…" className="bg-input border-border" rows={4} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog(false)} className="border-border">Cancel</Button>
            <Button onClick={handleSaveNotes} disabled={savingNotes} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {savingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Notes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
