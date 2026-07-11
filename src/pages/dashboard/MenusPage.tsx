import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Plus, Pencil, Trash2, GripVertical, Coffee, ChevronDown, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getMenuCategories, getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, createMenuCategory, updateMenuCategory, deleteMenuCategory } from '@/lib/api';
import type { MenuItem, MenuCategory } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const DEMO_CAFE_ID = '00000000-0000-0000-0000-000000000001';

type ItemForm = {
  name: string; description: string; price: string; currency: string;
  category_id: string; image_url: string; tags: string;
  is_available: boolean; is_featured: boolean; sort_order: number;
};

const DEFAULT_ITEM_FORM: ItemForm = {
  name: '', description: '', price: '', currency: 'ETB',
  category_id: '', image_url: '', tags: '',
  is_available: true, is_featured: false, sort_order: 0,
};

export default function MenusPage() {
  const { cafeId } = useAuth();
  const resolvedId = cafeId ?? DEMO_CAFE_ID;
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Item dialog
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState<ItemForm>(DEFAULT_ITEM_FORM);
  const [savingItem, setSavingItem] = useState(false);

  // Category dialog
  const [catDialog, setCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<MenuCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [cats, menuRes] = await Promise.all([
      getMenuCategories(resolvedId),
      getMenuItems(resolvedId),
    ]);
    setCategories(cats);
    setItems(menuRes.data);
    setIsLoading(false);
  }, [resolvedId]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(item => {
    const matchCat = activeCategory === 'all' || item.category_id === activeCategory;
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openAddItem = () => { setEditingItem(null); setItemForm({ ...DEFAULT_ITEM_FORM, category_id: activeCategory !== 'all' ? activeCategory : '' }); setItemDialog(true); };
  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name, description: item.description ?? '',
      price: item.price?.toString() ?? '', currency: item.currency,
      category_id: item.category_id ?? '', image_url: item.image_url ?? '',
      tags: item.tags.join(', '), is_available: item.is_available,
      is_featured: item.is_featured, sort_order: item.sort_order,
    });
    setItemDialog(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.name.trim()) { toast.error('Item name is required'); return; }
    setSavingItem(true);
    const payload = {
      cafe_id: resolvedId,
      name: itemForm.name.trim(),
      description: itemForm.description || null,
      price: itemForm.price ? parseFloat(itemForm.price) : null,
      currency: itemForm.currency,
      category_id: itemForm.category_id || null,
      image_url: itemForm.image_url || null,
      tags: itemForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      dietary: {},
      is_available: itemForm.is_available,
      is_featured: itemForm.is_featured,
      sort_order: itemForm.sort_order,
    };
    const { error } = editingItem
      ? await updateMenuItem(editingItem.id, payload)
      : await createMenuItem(payload);
    setSavingItem(false);
    if (error) { toast.error('Failed to save item', { description: error }); return; }
    toast.success(editingItem ? 'Item updated' : 'Item created');
    setItemDialog(false);
    load();
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await deleteMenuItem(id);
    if (error) { toast.error('Failed to delete item'); return; }
    toast.success('Item deleted');
    load();
  };

  const handleSaveCat = async () => {
    if (!catName.trim()) return;
    setSavingCat(true);
    const payload = { cafe_id: resolvedId, name: catName.trim(), description: null, image_url: null, sort_order: categories.length };
    const { error } = editingCat
      ? await updateMenuCategory(editingCat.id, { name: catName.trim() })
      : await createMenuCategory(payload);
    setSavingCat(false);
    if (error) { toast.error('Failed to save category'); return; }
    toast.success(editingCat ? 'Category updated' : 'Category created');
    setCatDialog(false);
    load();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-semibold text-foreground">Menu Management</h1>
          <p className="text-sm text-muted-foreground">{items.length} items across {categories.length} categories</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setEditingCat(null); setCatName(''); setCatDialog(true); }} className="border-border">
            <Plus className="w-4 h-4 mr-1.5" /> Category
          </Button>
          <Button size="sm" onClick={openAddItem} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1.5" /> Add Item
          </Button>
        </div>
      </div>

      {/* Category Tabs + Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap flex-1">
          <button onClick={() => setActiveCategory('all')} className={`px-3 py-1.5 text-sm rounded-lg transition-colors shrink-0 ${activeCategory === 'all' ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>All ({items.length})</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${activeCategory === cat.id ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
              {cat.name}
              <span className="text-xs opacity-60">({items.filter(i => i.category_id === cat.id).length})</span>
              <button onClick={e => { e.stopPropagation(); setEditingCat(cat); setCatName(cat.name); setCatDialog(true); }} className="hover:text-foreground ml-0.5">
                <Pencil className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
        <div className="relative shrink-0 w-full md:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items…" className="pl-9 bg-input border-border text-sm" />
        </div>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <Coffee className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="mb-4">No items found.</p>
          <Button size="sm" onClick={openAddItem} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1.5" /> Add your first item</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="glass rounded-xl overflow-hidden group">
              {item.image_url ? (
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[4/3] w-full bg-secondary flex items-center justify-center">
                  <Coffee className="w-8 h-8 text-muted-foreground/30" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-heading font-semibold text-foreground text-sm">{item.name}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEditItem(item)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                        <AlertDialogHeader><AlertDialogTitle>Delete Item</AlertDialogTitle><AlertDialogDescription>Delete "{item.name}"? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteItem(item.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {item.price != null && <span className="text-sm font-semibold text-primary">{item.price} {item.currency}</span>}
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${item.is_available ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}>{item.is_available ? 'Available' : 'Unavailable'}</Badge>
                  {item.is_featured && <Badge className="text-[10px] px-1.5 py-0 bg-warning/15 text-warning border-warning/30">Featured</Badge>}
                </div>
                {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingItem ? 'Edit Item' : 'New Menu Item'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-sm text-muted-foreground">Name *</Label>
                <Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder="Ethiopian Ceremony Coffee" className="bg-input border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Price</Label>
                <Input type="number" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} placeholder="120" className="bg-input border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Currency</Label>
                <Select value={itemForm.currency} onValueChange={v => setItemForm(f => ({ ...f, currency: v }))}>
                  <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ETB">ETB</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-sm text-muted-foreground">Category</Label>
                <Select value={itemForm.category_id || 'none'} onValueChange={v => setItemForm(f => ({ ...f, category_id: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="bg-input border-border"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-sm text-muted-foreground">Description</Label>
                <Textarea value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the item…" className="bg-input border-border" rows={3} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-sm text-muted-foreground">Image URL</Label>
                <Input value={itemForm.image_url} onChange={e => setItemForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://…" className="bg-input border-border" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-sm text-muted-foreground">Tags (comma-separated)</Label>
                <Input value={itemForm.tags} onChange={e => setItemForm(f => ({ ...f, tags: e.target.value }))} placeholder="single-origin, arabica, light roast" className="bg-input border-border" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Available</Label>
                <Switch checked={itemForm.is_available} onCheckedChange={v => setItemForm(f => ({ ...f, is_available: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Featured</Label>
                <Switch checked={itemForm.is_featured} onCheckedChange={v => setItemForm(f => ({ ...f, is_featured: v }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setItemDialog(false)} className="border-border">Cancel</Button>
            <Button onClick={handleSaveItem} disabled={savingItem} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {savingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>{editingCat ? 'Edit Category' : 'New Category'}</DialogTitle></DialogHeader>
          <div className="py-2 space-y-1.5">
            <Label className="text-sm text-muted-foreground">Name *</Label>
            <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="Espresso Bar" className="bg-input border-border" />
          </div>
          <DialogFooter>
            {editingCat && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-destructive/50 text-destructive mr-auto">Delete</Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                  <AlertDialogHeader><AlertDialogTitle>Delete Category</AlertDialogTitle><AlertDialogDescription>Delete "{editingCat.name}"? Items in this category won't be deleted.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={async () => { await deleteMenuCategory(editingCat.id); setCatDialog(false); load(); toast.success('Category deleted'); }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button variant="outline" onClick={() => setCatDialog(false)} className="border-border">Cancel</Button>
            <Button onClick={handleSaveCat} disabled={savingCat} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {savingCat ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
