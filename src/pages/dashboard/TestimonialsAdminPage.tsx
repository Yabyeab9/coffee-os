import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Plus, Pencil, Trash2, Star, Loader2, Check, X, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTestimonials, updateTestimonialStatus } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { Testimonial, TestimonialStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const DEMO_CAFE_ID = '00000000-0000-0000-0000-000000000001';

const STATUS_STYLES: Record<TestimonialStatus, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  approved: 'bg-primary/15 text-primary border-primary/30',
  rejected: 'bg-destructive/15 text-destructive border-destructive/30',
};

type TestiForm = { author_name: string; author_title: string; content: string; rating: string; image_url: string };
const DEFAULT: TestiForm = { author_name: '', author_title: '', content: '', rating: '5', image_url: '' };

export default function TestimonialsAdminPage() {
  const { cafeId } = useAuth();
  const resolvedId = cafeId ?? DEMO_CAFE_ID;
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);
  const [form, setForm] = useState<TestiForm>(DEFAULT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const data = await getTestimonials(resolvedId, false);
    setTestimonials(data);
    setIsLoading(false);
  }, [resolvedId]);

  useEffect(() => { load(); }, [load]);

  const filtered = statusFilter === 'all' ? testimonials : testimonials.filter(t => t.status === statusFilter);

  const openAdd = () => { setEditing(null); setForm(DEFAULT); setDialog(true); };
  const openEdit = (t: Testimonial) => {
    setEditing(t);
    setForm({ author_name: t.author_name, author_title: t.author_title ?? '', content: t.content, rating: t.rating?.toString() ?? '5', image_url: t.image_url ?? '' });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.author_name || !form.content) { toast.error('Name and content are required'); return; }
    setSaving(true);
    const payload = {
      cafe_id: resolvedId,
      author_name: form.author_name,
      author_title: form.author_title || null,
      content: form.content,
      rating: parseInt(form.rating) || null,
      image_url: form.image_url || null,
      status: 'pending' as TestimonialStatus,
    };
    const { error } = editing
      ? await supabase.from('testimonials').update(payload).eq('id', editing.id)
      : await supabase.from('testimonials').insert(payload);
    setSaving(false);
    if (error) { toast.error('Failed to save'); return; }
    toast.success(editing ? 'Testimonial updated' : 'Testimonial created');
    setDialog(false);
    load();
  };

  const handleStatus = async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    const { error } = await updateTestimonialStatus(id, status);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success(`Testimonial ${status}`);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('testimonials').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Testimonial deleted');
    load();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-semibold text-foreground">Testimonials</h1>
          <p className="text-sm text-muted-foreground">{testimonials.filter(t => t.status === 'pending').length} pending approval</p>
        </div>
        <Button size="sm" onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" /> Add Testimonial
        </Button>
      </div>

      <div className="flex gap-1.5">
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${statusFilter === s ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
            {s} {s === 'all' ? `(${testimonials.length})` : `(${testimonials.filter(t => t.status === s).length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">No testimonials found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <div key={t.id} className="glass rounded-xl p-4 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                {t.author_name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground text-sm">{t.author_name}</span>
                  {t.author_title && <span className="text-xs text-muted-foreground">· {t.author_title}</span>}
                  <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_STYLES[t.status]}`}>{t.status}</Badge>
                </div>
                {t.rating && (
                  <div className="flex gap-0.5 mb-1">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < t.rating! ? 'text-warning fill-warning' : 'text-border'}`} />)}
                  </div>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2">"{t.content}"</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {t.status === 'pending' && (
                  <>
                    <button onClick={() => handleStatus(t.id, 'approved')} className="p-1.5 rounded-md text-primary hover:bg-primary/10 transition-colors" title="Approve"><Check className="w-4 h-4" /></button>
                    <button onClick={() => handleStatus(t.id, 'rejected')} className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors" title="Reject"><X className="w-4 h-4" /></button>
                  </>
                )}
                {t.status !== 'pending' && (
                  <button onClick={() => handleStatus(t.id, 'pending')} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" title="Reset to pending"><Clock className="w-4 h-4" /></button>
                )}
                <button onClick={() => openEdit(t)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"><Pencil className="w-4 h-4" /></button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                    <AlertDialogHeader><AlertDialogTitle>Delete Testimonial</AlertDialogTitle><AlertDialogDescription>Remove testimonial from {t.author_name}?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(t.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
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
          <DialogHeader><DialogTitle>{editing ? 'Edit Testimonial' : 'Add Testimonial'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Author Name *</Label>
                <Input value={form.author_name} onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))} placeholder="Jane Doe" className="bg-input border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Title / Role</Label>
                <Input value={form.author_title} onChange={e => setForm(f => ({ ...f, author_title: e.target.value }))} placeholder="Coffee Enthusiast" className="bg-input border-border" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Rating (1–5)</Label>
              <Input type="number" min="1" max="5" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: e.target.value }))} className="bg-input border-border w-24" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Review *</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="The coffee was extraordinary…" className="bg-input border-border" rows={4} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Photo URL</Label>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://…" className="bg-input border-border" />
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
