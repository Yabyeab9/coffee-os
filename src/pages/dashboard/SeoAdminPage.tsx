import React, { useEffect, useState, useCallback } from 'react';
import { Globe, Save, Loader2, Plus, Pencil } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { SeoRecord } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const DEMO_CAFE_ID = '00000000-0000-0000-0000-000000000001';

type SeoForm = { page_slug: string; title: string; description: string; keywords: string; og_image_url: string; canonical: string };
const DEFAULT: SeoForm = { page_slug: '', title: '', description: '', keywords: '', og_image_url: '', canonical: '' };

const COMMON_PAGES = ['/', '/menu', '/gallery', '/about', '/reservation', '/blog', '/contact'];

export default function SeoAdminPage() {
  const { cafeId } = useAuth();
  const resolvedId = cafeId ?? DEMO_CAFE_ID;
  const [records, setRecords] = useState<SeoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<SeoRecord | null>(null);
  const [form, setForm] = useState<SeoForm>(DEFAULT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase.from('seo').select('*').eq('cafe_id', resolvedId).order('page_slug');
    setRecords(Array.isArray(data) ? data : []);
    setIsLoading(false);
  }, [resolvedId]);

  useEffect(() => { load(); }, [load]);

  const openAdd = (slug = '') => { setEditing(null); setForm({ ...DEFAULT, page_slug: slug }); setDialog(true); };
  const openEdit = (r: SeoRecord) => {
    setEditing(r);
    setForm({ page_slug: r.page_slug, title: r.title ?? '', description: r.description ?? '', keywords: (r.keywords ?? []).join(', '), og_image_url: r.og_image_url ?? '', canonical: r.canonical ?? '' });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.page_slug) { toast.error('Page slug is required'); return; }
    setSaving(true);
    const payload = {
      cafe_id: resolvedId,
      page_slug: form.page_slug,
      title: form.title || null,
      description: form.description || null,
      keywords: form.keywords.split(',').map(k => k.trim()).filter(Boolean),
      og_image_url: form.og_image_url || null,
      canonical: form.canonical || null,
      structured_data: {},
    };
    const { error } = editing
      ? await supabase.from('seo').update(payload).eq('id', editing.id)
      : await supabase.from('seo').upsert(payload, { onConflict: 'cafe_id,page_slug' });
    setSaving(false);
    if (error) { toast.error('Failed to save'); return; }
    toast.success('SEO settings saved');
    setDialog(false);
    load();
  };

  const titleLength = form.title.length;
  const descLength = form.description.length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-semibold text-foreground">SEO Settings</h1>
          <p className="text-sm text-muted-foreground">Manage meta titles, descriptions, and OG tags per page</p>
        </div>
        <Button size="sm" onClick={() => openAdd()} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" /> Add Page SEO
        </Button>
      </div>

      {/* Quick page shortcuts */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Quick add SEO for common pages:</p>
        <div className="flex flex-wrap gap-2">
          {COMMON_PAGES.filter(p => !records.some(r => r.page_slug === p)).map(p => (
            <button key={p} onClick={() => openAdd(p)} className="text-xs px-2.5 py-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              + {p}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : records.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Globe className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p>No SEO records yet. Add SEO for each page.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(r => (
            <div key={r.id} className="glass rounded-xl p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded">{r.page_slug}</code>
                  {r.title && <span className="text-sm font-medium text-foreground truncate">{r.title}</span>}
                </div>
                {r.description && <p className="text-xs text-muted-foreground line-clamp-1">{r.description}</p>}
                {r.keywords && r.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.keywords.slice(0, 4).map(k => <Badge key={k} variant="secondary" className="text-[10px] px-1.5 py-0">{k}</Badge>)}
                  </div>
                )}
              </div>
              <button onClick={() => openEdit(r)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit SEO: ${editing.page_slug}` : 'Add Page SEO'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Page Slug *</Label>
              <Input value={form.page_slug} onChange={e => setForm(f => ({ ...f, page_slug: e.target.value }))} placeholder="/about" className="bg-input border-border" disabled={!!editing} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Meta Title</Label>
                <span className={`text-xs ${titleLength > 60 ? 'text-destructive' : titleLength > 50 ? 'text-warning' : 'text-muted-foreground'}`}>{titleLength}/60</span>
              </div>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Page title for search engines" className="bg-input border-border" maxLength={70} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Meta Description</Label>
                <span className={`text-xs ${descLength > 160 ? 'text-destructive' : descLength > 140 ? 'text-warning' : 'text-muted-foreground'}`}>{descLength}/160</span>
              </div>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Compelling description for search results…" className="bg-input border-border" rows={3} maxLength={180} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Keywords (comma-separated)</Label>
              <Input value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder="specialty coffee, addis ababa, ethiopian coffee" className="bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">OG Image URL</Label>
              <Input value={form.og_image_url} onChange={e => setForm(f => ({ ...f, og_image_url: e.target.value }))} placeholder="https://… (1200×630 recommended)" className="bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Canonical URL</Label>
              <Input value={form.canonical} onChange={e => setForm(f => ({ ...f, canonical: e.target.value }))} placeholder="https://your-domain.com/page" className="bg-input border-border" />
            </div>

            {/* Preview */}
            {(form.title || form.description) && (
              <div className="glass rounded-xl p-4 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Google Preview</p>
                <p className="text-sm text-info truncate">{form.canonical || 'https://origincoffee.com' + form.page_slug}</p>
                <p className="text-base font-medium text-foreground">{form.title || 'Page Title'}</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{form.description || 'Meta description will appear here.'}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)} className="border-border">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1.5" /> Save SEO</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
