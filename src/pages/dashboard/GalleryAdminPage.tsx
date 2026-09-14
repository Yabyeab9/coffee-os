import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Plus, Pencil, Trash2, Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getGallery, createGalleryItem, updateGalleryItem, deleteGalleryItem } from '@/lib/api';
import type { GalleryItem } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';



type ItemForm = { image_url: string; caption: string; alt_text: string; category: string; sort_order: number };
const DEFAULT: ItemForm = { image_url: '', caption: '', alt_text: '', category: '', sort_order: 0 };

const GALLERY_CATEGORIES = ['all', 'interior', 'craft', 'beans', 'space', 'menu', 'team'];

export default function GalleryAdminPage() {
  const { cafeId } = useAuth();
  const resolvedId = cafeId!;
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<GalleryItem | null>(null);
  const [form, setForm] = useState<ItemForm>(DEFAULT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getGallery(resolvedId);
      setItems(data);
    } catch (_err) {
      toast.error('Failed to load gallery');
    } finally {
      setIsLoading(false);
    }
  }, [resolvedId]);

  useEffect(() => { load(); }, [load]);

  const filtered = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory);

  const openAdd = () => { setEditing(null); setForm(DEFAULT); setDialog(true); };
  const openEdit = (item: GalleryItem) => {
    setEditing(item);
    setForm({ image_url: item.image_url, caption: item.caption ?? '', alt_text: item.alt_text ?? '', category: item.category ?? '', sort_order: item.sort_order });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.image_url.trim()) { toast.error('Image URL is required'); return; }
    setSaving(true);
    try {
      const payload = {
        cafe_id: resolvedId,
        image_url: form.image_url,
        caption: form.caption || null,
        alt_text: form.alt_text || null,
        category: form.category || null,
        sort_order: form.sort_order,
      };
      const { error } = editing
        ? await updateGalleryItem(editing.id, payload)
        : await createGalleryItem(payload);
      if (error) throw new Error(error);
      toast.success(editing ? 'Image updated' : 'Image added');
      setDialog(false);
      load();
    } catch (err: any) {
      toast.error('Failed to save', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteGalleryItem(id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Image removed');
    load();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-semibold text-foreground">Gallery</h1>
          <p className="text-sm text-muted-foreground">{items.length} images</p>
        </div>
        <Button size="sm" onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" /> Add Image
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap">
        {GALLERY_CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize shrink-0 ${activeCategory === cat ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <ImageIcon className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="mb-4">No images yet.</p>
          <Button size="sm" onClick={openAdd} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1.5" /> Add Image</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(item => (
            <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group relative overflow-hidden rounded-xl glass">
              <div className="aspect-square overflow-hidden">
                <img src={item.image_url} alt={item.alt_text ?? ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => openEdit(item)} className="p-2 rounded-lg bg-secondary text-foreground hover:bg-card transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-2 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                    <AlertDialogHeader><AlertDialogTitle>Remove Image</AlertDialogTitle><AlertDialogDescription>Remove this image from the gallery?</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(item.id)} className="bg-destructive text-destructive-foreground">Remove</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {item.caption && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{item.caption}</div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Image' : 'Add Image'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {form.image_url && (
              <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border">
                <img src={form.image_url} alt="Preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = 'none')} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Image URL *</Label>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://…" className="bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Alt Text</Label>
              <Input value={form.alt_text} onChange={e => setForm(f => ({ ...f, alt_text: e.target.value }))} placeholder="Describe the image" className="bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Caption</Label>
              <Input value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))} placeholder="Optional caption" className="bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Category</Label>
              <Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="interior / craft / beans …" className="bg-input border-border" />
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