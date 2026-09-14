import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2, Megaphone, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAnnouncements } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Announcement, AnnouncementType } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';



const TYPE_STYLES: Record<AnnouncementType, string> = {
  info: 'bg-info/15 text-info border-info/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  success: 'bg-primary/15 text-primary border-primary/30',
  promo: 'bg-accent/15 text-accent border-accent/30',
};

type Form = { title: string; content: string; type: AnnouncementType; is_active: boolean; starts_at: string; ends_at: string };
const DEFAULT: Form = { title: '', content: '', type: 'info', is_active: true, starts_at: '', ends_at: '' };

export default function AnnouncementsPage() {
  const { cafeId } = useAuth();
  const resolvedId = cafeId!;
  const [items, setItems] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [form, setForm] = useState<Form>(DEFAULT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAnnouncements(resolvedId, false);
      setItems(data);
    } catch (_err) {
      toast.error('Failed to load announcements');
    } finally {
      setIsLoading(false);
    }
  }, [resolvedId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setForm(DEFAULT); setDialog(true); };
  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({ title: a.title, content: a.content ?? '', type: a.type, is_active: a.is_active, starts_at: a.starts_at?.slice(0, 10) ?? '', ends_at: a.ends_at?.slice(0, 10) ?? '' });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.title) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const payload = { cafe_id: resolvedId, title: form.title, content: form.content || null, type: form.type, is_active: form.is_active, starts_at: form.starts_at || null, ends_at: form.ends_at || null };
      const { error } = editing
        ? await supabase.from('announcements').update(payload).eq('id', editing.id)
        : await supabase.from('announcements').insert(payload);
      if (error) throw error;
      toast.success(editing ? 'Updated' : 'Created');
      setDialog(false);
      load();
    } catch (err: any) {
      toast.error('Failed to save', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Deleted');
    load();
  };

  const toggleActive = async (a: Announcement) => {
    await supabase.from('announcements').update({ is_active: !a.is_active }).eq('id', a.id);
    load();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-semibold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground">{items.filter(i => i.is_active).length} active</p>
        </div>
        <Button size="sm" onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" /> New Announcement
        </Button>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Megaphone className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="mb-4">No announcements yet.</p>
          <Button size="sm" onClick={openAdd} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1.5" /> Create One</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <div key={a.id} className={`glass rounded-xl p-4 flex items-start gap-4 border-l-2 ${a.is_active ? 'border-primary/60' : 'border-border/40 opacity-60'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-foreground text-sm">{a.title}</h3>
                  <Badge className={`text-[10px] px-1.5 py-0 capitalize ${TYPE_STYLES[a.type]}`}>{a.type}</Badge>
                  {!a.is_active && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Inactive</Badge>}
                </div>
                {a.content && <p className="text-xs text-muted-foreground line-clamp-1">{a.content}</p>}
                {(a.starts_at || a.ends_at) && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {a.starts_at && `From ${new Date(a.starts_at).toLocaleDateString()}`}
                    {a.starts_at && a.ends_at && ' · '}
                    {a.ends_at && `Until ${new Date(a.ends_at).toLocaleDateString()}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={a.is_active} onCheckedChange={() => toggleActive(a)} />
                <button onClick={() => openEdit(a)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Pencil className="w-4 h-4" /></button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                    <AlertDialogHeader><AlertDialogTitle>Delete Announcement</AlertDialogTitle><AlertDialogDescription>Delete "{a.title}"?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(a.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Announcement' : 'New Announcement'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Holiday Hours Update" className="bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as AnnouncementType }))}>
                <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="promo">Promo</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Message</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Additional details…" className="bg-input border-border" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Start Date</Label>
                <Input type="date" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} className="bg-input border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">End Date</Label>
                <Input type="date" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} className="bg-input border-border" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">Active Now</Label>
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)} className="border-border">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}