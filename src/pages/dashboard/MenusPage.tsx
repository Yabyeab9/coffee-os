import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Pencil, Trash2, GripVertical, Image as ImageIcon, 
  Loader2, Filter, Upload, Download, Sparkles, Box, Archive, 
  Settings, Copy, Eye, BarChart2, CheckCircle2, XCircle, 
  Clock, AlertTriangle, TrendingUp, Tags, Layers, Tag, Coffee
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { MenuItem, MenuCategory } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';


function ItemForm({ item, categories, onSave, onCancel }: { item: MenuItem | null, categories: MenuCategory[], onSave: (data: any) => void, onCancel: () => void }) {
  const [formData, setFormData] = useState<Partial<MenuItem>>(
    item || {
      name: '', description: '', price: 0, category_id: categories[0]?.id || '',
      preparation_time: 5, ingredients: [], allergens: [], tags: [], images: [],
      inventory_tracking: false, stock_quantity: 0, low_stock_threshold: 10,
      seasonal: false, is_featured: false, visibility: 'public', status: 'active',
      sku: ''
    }
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b border-border pb-2">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={formData.category_id || ''} onValueChange={v => setFormData({...formData, category_id: v})}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label>Description *</Label>
          <Textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Price ($) *</Label>
            <Input type="number" min="0" step="0.01" value={formData.price || ''} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <Label>Prep Time (min)</Label>
            <Input type="number" min="0" value={formData.preparation_time || ''} onChange={e => setFormData({...formData, preparation_time: parseInt(e.target.value)})} />
          </div>
          <div className="space-y-2">
            <Label>SKU</Label>
            <Input value={formData.sku || ''} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="Auto-generated" />
          </div>
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={formData.visibility || 'public'} onValueChange={v => setFormData({...formData, visibility: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="members_only">Members Only</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Inventory & Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold border-b border-border pb-2">Inventory & Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary/20 p-4 rounded-xl border border-border">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="flex flex-col gap-1">
                <span>Inventory Tracking</span>
                <span className="text-xs text-muted-foreground font-normal">Track stock levels and out-of-stock</span>
              </Label>
              <Switch checked={formData.inventory_tracking} onCheckedChange={c => setFormData({...formData, inventory_tracking: c})} />
            </div>
            {formData.inventory_tracking && (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label>Current Stock</Label>
                  <Input type="number" min="0" value={formData.stock_quantity || 0} onChange={e => setFormData({...formData, stock_quantity: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Low Stock Alert</Label>
                  <Input type="number" min="0" value={formData.low_stock_threshold || 0} onChange={e => setFormData({...formData, low_stock_threshold: parseInt(e.target.value)})} />
                </div>
              </div>
            )}
          </div>
          <div className="space-y-4 border-t md:border-t-0 md:border-l border-border md:pl-6 pt-4 md:pt-0">
            <div className="flex items-center justify-between">
              <Label>Featured Item</Label>
              <Switch checked={formData.is_featured} onCheckedChange={c => setFormData({...formData, is_featured: c})} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Seasonal Item</Label>
              <Switch checked={formData.seasonal} onCheckedChange={c => setFormData({...formData, seasonal: c})} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active Status</Label>
              <Select value={formData.status || 'active'} onValueChange={v => setFormData({...formData, status: v})}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="fixed bottom-0 right-0 w-full sm:w-[672px] bg-background/80 backdrop-blur-md border-t border-border p-4 flex justify-end gap-2 z-50">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(formData)} className="min-w-[120px]">Save Item</Button>
      </div>
    </div>
  );
}


function CategoriesManager({ categories, onSave, onCancel, cafeId }: { categories: MenuCategory[], onSave: () => void, onCancel: () => void, cafeId: string | null }) {
  const [cats, setCats] = useState<MenuCategory[]>(categories);
  const [newCatName, setNewCatName] = useState('');
  
  const handleAdd = async () => {
    if (!newCatName) return;
    try {
      const { data, error } = await supabase.from('menu_categories').insert({
        cafe_id: cafeId,
        name: newCatName,
        visibility: 'visible',
        sort_order: cats.length
      }).select().single();
      if (error) throw error;
      setCats([...cats, data]);
      setNewCatName('');
      toast.success('Category added');
    } catch(e) {
      toast.error('Failed to add category');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('menu_categories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      setCats(cats.filter(c => c.id !== id));
      toast.success('Category deleted');
    } catch(e) {
      toast.error('Failed to delete category');
    }
  };

  const handleUpdate = async (id: string, updates: any) => {
    try {
      await supabase.from('menu_categories').update(updates).eq('id', id);
      setCats(cats.map(c => c.id === id ? { ...c, ...updates } : c));
    } catch(e) {
      toast.error('Failed to update category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Input placeholder="New Category Name" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
        <Button onClick={handleAdd}>Add</Button>
      </div>
      <div className="space-y-3">
        {cats.map(c => (
          <div key={c.id} className="flex items-center gap-3 bg-secondary/30 p-3 rounded-lg border border-border">
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
            <Input 
              value={c.name} 
              onChange={e => setCats(cats.map(cat => cat.id === c.id ? { ...cat, name: e.target.value } : cat))}
              onBlur={() => handleUpdate(c.id, { name: c.name })}
              className="flex-1 bg-transparent border-transparent hover:border-border"
            />
            <Select value={c.visibility || 'visible'} onValueChange={v => handleUpdate(c.id, { visibility: v })}>
              <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visible">Visible</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="h-8 w-8 text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="pt-4 border-t border-border flex justify-end">
        <Button onClick={() => { onSave(); onCancel(); }}>Done</Button>
      </div>
    </div>
  );
}

export default function MenusPage() {
  const { profile } = useAuth();
  const importInputRef = useRef<HTMLInputElement>(null);
  
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selection & Bulk
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sheet/Dialog states
  const [isItemSheetOpen, setIsItemSheetOpen] = useState(false);
  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<MenuItem | null>(null);
  const [analyticsItem, setAnalyticsItem] = useState<MenuItem | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [aiOptimizeItem, setAiOptimizeItem] = useState<MenuItem | null>(null);
  const [aiOptimizeData, setAiOptimizeData] = useState<any>(null);
  const [aiOptimizeLoading, setAiOptimizeLoading] = useState(false);
  const [bulkEditStatus, setBulkEditStatus] = useState<string>('');
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  
  const [activeItem, setActiveItem] = useState<MenuItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterInventory, setFilterInventory] = useState('all');

  const fetchData = useCallback(async () => {
    if (!profile?.cafe_id) return;
    try {
      setIsLoading(true);
      const [catsRes, itemsRes] = await Promise.all([
        supabase.from('menu_categories').select('*').eq('cafe_id', profile.cafe_id).order('sort_order'),
        supabase.from('menus').select('*, category:menu_categories(*)').eq('cafe_id', profile.cafe_id).is('deleted_at', null).order('sort_order')
      ]);
      if (catsRes.error) throw catsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      setCategories(catsRes.data || []);
      setItems(itemsRes.data || []);
    } catch (err: any) {
      toast.error('Failed to load menu data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.cafe_id]);

  useEffect(() => {
    if (profile?.cafe_id) fetchData();
  }, [fetchData, profile?.cafe_id]);

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? new Set(items.map(i => i.id)) : new Set());
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedItems(next);
  };

  const toggleStatus = async (item: MenuItem) => {
    const newStatus = item.status === 'active' ? 'inactive' : 'active';
    try {
      await supabase.from('menus').update({ status: newStatus }).eq('id', item.id);
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
      toast.success(`Item ${newStatus === 'active' ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await supabase.from('menus').update({ deleted_at: new Date().toISOString(), status: 'archived' }).eq('id', itemToDelete);
      setItems(prev => prev.filter(i => i.id !== itemToDelete));
      toast.success('Item archived successfully');
    } catch {
      toast.error('Failed to archive item');
    } finally {
      setIsDeleteOpen(false);
      setItemToDelete(null);
    }
  };

  const openEdit = (item: MenuItem) => { setActiveItem(item); setIsItemSheetOpen(true); };
  const openCreate = () => { setActiveItem(null); setIsItemSheetOpen(true); };

  const handleBulkArchive = async () => {
    if (selectedItems.size === 0) return;
    const ids = Array.from(selectedItems);
    try {
      await supabase.from('menus').update({ deleted_at: new Date().toISOString(), status: 'archived' }).in('id', ids);
      setItems(prev => prev.filter(i => !selectedItems.has(i.id)));
      setSelectedItems(new Set());
      toast.success(`${ids.length} items archived successfully`);
    } catch {
      toast.error('Bulk archive failed');
    }
  };

  const handleBulkEditStatus = async () => {
    if (selectedItems.size === 0 || !bulkEditStatus) return;
    const ids = Array.from(selectedItems);
    try {
      await supabase.from('menus').update({ status: bulkEditStatus }).in('id', ids);
      setItems(prev => prev.map(i => selectedItems.has(i.id) ? { ...i, status: bulkEditStatus } : i));
      setSelectedItems(new Set());
      setIsBulkEditOpen(false);
      setBulkEditStatus('');
      toast.success(`${ids.length} items updated to "${bulkEditStatus}"`);
    } catch {
      toast.error('Bulk edit failed');
    }
  };

  const handleDuplicate = async (item: MenuItem) => {
    try {
      const { id, created_at, updated_at, category, ...rest } = item as any;
      const { data, error } = await supabase.from('menus').insert({
        ...rest,
        name: `${rest.name} (Copy)`,
        status: 'draft',
        sku: rest.sku ? `${rest.sku}-COPY` : null,
      }).select('*, category:menu_categories(*)').single();
      if (error) throw error;
      setItems(prev => [data, ...prev]);
      toast.success('Item duplicated as Draft');
    } catch {
      toast.error('Failed to duplicate item');
    }
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filteredItems.map(item => ({
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      currency: item.currency,
      category: categories.find(c => c.id === item.category_id)?.name ?? '',
      status: item.status,
      sku: item.sku ?? '',
      is_featured: item.is_featured ? 'yes' : 'no',
      seasonal: item.seasonal ? 'yes' : 'no',
      inventory_tracking: item.inventory_tracking ? 'yes' : 'no',
      stock_quantity: item.stock_quantity ?? '',
      low_stock_threshold: item.low_stock_threshold ?? '',
      preparation_time: item.preparation_time ?? '',
      visibility: item.visibility,
      tags: (item.tags ?? []).join(';'),
      allergens: (item.allergens ?? []).join(';'),
    }));
    const headers = Object.keys(rows[0] ?? {}).join(',');
    const csvRows = rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu-items-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} items`);
  };

  // ── Import CSV ─────────────────────────────────────────────────────────────
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.cafe_id) return;
    const text = await file.text();
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { toast.error('CSV has no data rows.'); return; }
    const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
    const nameIdx = headers.indexOf('name');
    const priceIdx = headers.indexOf('price');
    if (nameIdx === -1 || priceIdx === -1) { toast.error('CSV must have "name" and "price" columns.'); return; }

    const parse = (row: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of row) {
        if (char === '"') { inQuotes = !inQuotes; }
        else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
        else { current += char; }
      }
      result.push(current.trim());
      return result;
    };

    const toInsert = lines.slice(1).map(line => {
      const cols = parse(line);
      const get = (col: string) => cols[headers.indexOf(col)] ?? '';
      const catName = get('category');
      const catId = categories.find(c => c.name.toLowerCase() === catName.toLowerCase())?.id ?? categories[0]?.id ?? null;
      return {
        cafe_id: profile.cafe_id,
        name: get('name') || 'Imported Item',
        description: get('description') || null,
        price: parseFloat(get('price')) || 0,
        currency: get('currency') || 'ETB',
        category_id: catId,
        status: (['active', 'draft', 'inactive'].includes(get('status')) ? get('status') : 'draft') as string,
        sku: get('sku') || null,
        is_featured: get('is_featured') === 'yes',
        seasonal: get('seasonal') === 'yes',
        inventory_tracking: get('inventory_tracking') === 'yes',
        stock_quantity: get('stock_quantity') ? parseInt(get('stock_quantity')) : 0,
        low_stock_threshold: get('low_stock_threshold') ? parseInt(get('low_stock_threshold')) : 10,
        preparation_time: get('preparation_time') ? parseInt(get('preparation_time')) : 5,
        visibility: get('visibility') || 'public',
        tags: get('tags') ? get('tags').split(';').filter(Boolean) : [],
        allergens: get('allergens') ? get('allergens').split(';').filter(Boolean) : [],
        is_available: true,
        ingredients: [],
        images: [],
        sort_order: 0,
      };
    }).filter(r => r.name);

    if (toInsert.length === 0) { toast.error('No valid rows found in CSV.'); return; }
    const { error } = await supabase.from('menus').insert(toInsert);
    if (error) { toast.error('Import failed: ' + error.message); return; }
    toast.success(`Imported ${toInsert.length} items successfully`);
    fetchData();
    if (importInputRef.current) importInputRef.current.value = '';
  };

  // ── Item Analytics ─────────────────────────────────────────────────────────
  const openAnalytics = async (item: MenuItem) => {
    setAnalyticsItem(item);
    setAnalyticsData(null);
    setAnalyticsLoading(true);
    const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('quantity, unit_price, orders(created_at, total_amount)')
      .eq('menu_item_id', item.id)
      .gte('orders.created_at', thirtyAgo)
      .limit(500);

    const rows = (orderItems ?? []).filter((oi: any) => oi.orders != null);
    const totalQty = rows.reduce((s: number, r: any) => s + (r.quantity ?? 1), 0);
    const totalRevenue = rows.reduce((s: number, r: any) => s + ((r.quantity ?? 1) * (r.unit_price ?? item.price)), 0);

    // Daily trend
    const daily: Record<string, number> = {};
    rows.forEach((r: any) => {
      const day = (r.orders?.created_at ?? '').split('T')[0];
      if (day) daily[day] = (daily[day] ?? 0) + (r.quantity ?? 1);
    });

    setAnalyticsData({
      total_orders: rows.length,
      total_qty: totalQty,
      total_revenue: totalRevenue,
      avg_revenue_per_day: totalRevenue > 0 ? (totalRevenue / 30).toFixed(0) : '0',
      daily,
    });
    setAnalyticsLoading(false);
  };

  // ── AI Optimize ────────────────────────────────────────────────────────────
  const openAiOptimize = async (item: MenuItem) => {
    setAiOptimizeItem(item);
    setAiOptimizeData(null);
    setIsAiPanelOpen(true);
    setAiOptimizeLoading(true);

    // Load real data: order frequency, pairings, revenue
    const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const [orderItemsRes, allCatItemsRes] = await Promise.all([
      supabase.from('order_items').select('quantity, unit_price, order_id').eq('menu_item_id', item.id).gte('created_at', thirtyAgo).limit(200),
      supabase.from('menus').select('id, name, price').eq('cafe_id', profile!.cafe_id!).is('deleted_at', null).eq('status', 'active').eq('category_id', item.category_id ?? '').neq('id', item.id).limit(10),
    ]);

    const orderCount = orderItemsRes.data?.length ?? 0;
    const totalQty = orderItemsRes.data?.reduce((s: number, r: any) => s + (r.quantity ?? 1), 0) ?? 0;
    const itemPrice = item.price ?? 0;
    const totalRevenue = orderItemsRes.data?.reduce((s: number, r: any) => s + ((r.quantity ?? 1) * (r.unit_price ?? itemPrice)), 0) ?? 0;
    const categoryItems = allCatItemsRes.data ?? [];
    const avgCatPrice = categoryItems.length > 0 ? categoryItems.reduce((s: number, c: any) => s + (c.price ?? 0), 0) / categoryItems.length : null;

    const suggestedPrice = avgCatPrice
      ? Math.max(itemPrice, avgCatPrice * 0.95).toFixed(0)
      : (itemPrice * 1.08).toFixed(0);

    const descSuggestion = item.description && item.description.length > 20
      ? `Elevate your experience with ${item.name} — ${item.description.slice(0, 60).toLowerCase()}. Crafted with care for every visit.`
      : `Discover the flavor of ${item.name}. Expertly prepared, served fresh, made to delight.`;

    setAiOptimizeData({
      current_price: item.price,
      suggested_price: parseFloat(suggestedPrice),
      price_basis: avgCatPrice ? `Category average: ${avgCatPrice.toFixed(0)} ETB` : 'Based on estimated margin improvement',
      orders_30d: orderCount,
      qty_30d: totalQty,
      revenue_30d: totalRevenue,
      desc_suggestion: descSuggestion,
      popularity: orderCount > 20 ? 'High' : orderCount > 5 ? 'Medium' : 'Low',
    });
    setAiOptimizeLoading(false);
  };

  const applyAiPrice = async () => {
    if (!aiOptimizeItem || !aiOptimizeData) return;
    const { error } = await supabase.from('menus').update({ price: aiOptimizeData.suggested_price }).eq('id', aiOptimizeItem.id);
    if (error) { toast.error('Failed to update price'); return; }
    setItems(prev => prev.map(i => i.id === aiOptimizeItem.id ? { ...i, price: aiOptimizeData.suggested_price } : i));
    toast.success(`Price updated to ${aiOptimizeData.suggested_price} ETB`);
  };

  const applyAiDesc = async () => {
    if (!aiOptimizeItem || !aiOptimizeData) return;
    const { error } = await supabase.from('menus').update({ description: aiOptimizeData.desc_suggestion }).eq('id', aiOptimizeItem.id);
    if (error) { toast.error('Failed to update description'); return; }
    setItems(prev => prev.map(i => i.id === aiOptimizeItem.id ? { ...i, description: aiOptimizeData.desc_suggestion } : i));
    toast.success('Description updated');
  };

  // Filtering
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = filterCategory === 'all' || item.category_id === filterCategory;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    let matchesInv = true;
    if (filterInventory === 'in_stock') matchesInv = !item.inventory_tracking || (item.stock_quantity! > (item.low_stock_threshold || 0));
    if (filterInventory === 'low_stock') matchesInv = !!item.inventory_tracking && item.stock_quantity! <= (item.low_stock_threshold || 0) && item.stock_quantity! > 0;
    if (filterInventory === 'out_of_stock') matchesInv = !!item.inventory_tracking && item.stock_quantity! === 0;
    return matchesSearch && matchesCat && matchesStatus && matchesInv;
  });

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 flex flex-col h-[calc(100vh-4rem)]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-3">
            Menu Catalog
          </h1>
          <p className="text-muted-foreground mt-1">Manage your professional catalog, inventory, and operations.</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Hidden file input for CSV import */}
          <input
            ref={importInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportFile}
          />
          <Button variant="outline" className="gap-2 bg-background shadow-sm h-9" onClick={() => importInputRef.current?.click()}>
            <Upload className="w-4 h-4" /> Import
          </Button>
          <Button variant="outline" className="gap-2 bg-background shadow-sm h-9" onClick={handleExport} disabled={filteredItems.length === 0}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button variant="outline" className="gap-2 bg-primary/10 text-primary border-primary/20 shadow-sm h-9" onClick={() => { if (items.length > 0) openAiOptimize(items[0]); else toast.error('Add menu items first.'); }}>
            <Sparkles className="w-4 h-4" /> AI Optimize
          </Button>
          <Button onClick={() => setIsCategorySheetOpen(true)} variant="outline" className="gap-2 bg-background shadow-sm h-9">
            <Layers className="w-4 h-4" /> Categories
          </Button>
          <Button onClick={openCreate} className="gap-2 shadow-sm h-9">
            <Plus className="w-4 h-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 bg-background/50 p-3 rounded-lg border border-border">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search by name, SKU, tag..." 
            className="pl-9 h-9 bg-background"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[150px] h-9 bg-background">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[130px] h-9 bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterInventory} onValueChange={setFilterInventory}>
          <SelectTrigger className="w-full sm:w-[140px] h-9 bg-background">
            <SelectValue placeholder="Inventory" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Inventory</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
        
        {selectedItems.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground mr-2">{selectedItems.size} selected</span>
            <Button variant="secondary" size="sm" className="h-8" onClick={() => setIsBulkEditOpen(true)}>Bulk Edit</Button>
            <Button variant="destructive" size="sm" onClick={handleBulkArchive} className="h-8 bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 border">Archive Selected</Button>
          </div>
        )}
      </div>

      {/* Main Table Area */}
      <div className="flex-1 min-h-0 bg-card rounded-xl border border-border shadow-sm flex flex-col overflow-hidden relative">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Box className="w-12 h-12 mb-3 opacity-20" />
            <p>No menu items found. Create one or adjust filters.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto w-full">
            <table className="w-full text-sm text-left border-collapse min-w-[1200px]">
              <thead className="sticky top-0 bg-secondary/80 backdrop-blur-md z-10 shadow-sm border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 w-[40px]">
                    <input 
                      type="checkbox" 
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                      checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold text-center">Stock</th>
                  <th className="px-4 py-3 font-semibold text-center">30D Rev</th>
                  <th className="px-4 py-3 font-semibold text-center">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map(item => {
                  const isSelected = selectedItems.has(item.id);
                  const isLowStock = item.inventory_tracking && item.stock_quantity! <= (item.low_stock_threshold || 10);
                  const isOutOfStock = item.inventory_tracking && item.stock_quantity === 0;
                  
                  return (
                    <tr key={item.id} className={`hover:bg-secondary/20 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}>
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.id)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-md bg-secondary flex items-center justify-center shrink-0 overflow-hidden border border-border">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {item.name}
                              {item.is_featured && <Sparkles className="w-3 h-3 text-primary" />}
                              {item.seasonal && <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-warning text-warning">Seasonal</Badge>}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono">{item.sku || `SKU-${item.id.substring(0,6).toUpperCase()}`}</span>
                              {item.preparation_time && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-0.5"><Clock className="w-3 h-3"/> {item.preparation_time}m</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="bg-background">
                          {item.category?.name || 'Uncategorized'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {item.sale_price ? (
                          <div className="flex flex-col">
                            <span className="text-foreground">${item.sale_price.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground line-through">${item.price?.toFixed(2)}</span>
                          </div>
                        ) : (
                          <span className="text-foreground">${item.price?.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!item.inventory_tracking ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : isOutOfStock ? (
                          <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>
                        ) : isLowStock ? (
                          <Badge variant="outline" className="border-warning text-warning text-[10px] bg-warning/10">{item.stock_quantity} Left</Badge>
                        ) : (
                          <span className="text-sm font-medium">{item.stock_quantity}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5 text-muted-foreground">
                          <span className="font-semibold text-sm">$0.00</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                         <div className="flex items-center justify-center">
                           <Switch 
                             checked={item.status === 'active'} 
                             onCheckedChange={() => toggleStatus(item)}
                             className="data-[state=checked]:bg-primary"
                           />
                         </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Settings className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEdit(item)}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit Item
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicate(item)}>
                              <Copy className="w-4 h-4 mr-2" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPreviewItem(item)}>
                              <Eye className="w-4 h-4 mr-2" /> Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAnalytics(item)}>
                              <BarChart2 className="w-4 h-4 mr-2" /> Analytics
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openAiOptimize(item)} className="text-primary focus:text-primary focus:bg-primary/10">
                              <Sparkles className="w-4 h-4 mr-2" /> AI Menu Consultant
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              setItemToDelete(item.id);
                              setIsDeleteOpen(true);
                            }} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                              <Archive className="w-4 h-4 mr-2" /> Archive Item
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Menu Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this item? It will be hidden from the customer menu but retained in the database for analytics.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Archive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create/Edit Sheet placeholder (we will expand this later) */}
      <Sheet open={isItemSheetOpen} onOpenChange={setIsItemSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <div className="p-6">
            <SheetHeader className="mb-6">
              <SheetTitle>{activeItem ? 'Edit Menu Item' : 'Add Menu Item'}</SheetTitle>
            </SheetHeader>
            {isItemSheetOpen && (
              <ItemForm 
                item={activeItem} 
                categories={categories} 
                onSave={async (data) => {
                  try {
                    const payload = {
                      ...data,
                      cafe_id: profile!.cafe_id,
                      name: data.name || 'Unnamed Item',
                      price: data.price || 0,
                      category_id: data.category_id || categories[0]?.id,
                      currency: 'USD',
                      is_available: data.status === 'active'
                    };
                    
                    if (data.id) {
                      await supabase.from('menus').update(payload).eq('id', data.id);
                      toast.success('Item updated successfully');
                    } else {
                      await supabase.from('menus').insert(payload);
                      toast.success('Item created successfully');
                    }
                    setIsItemSheetOpen(false);
                    fetchData();
                  } catch (e) {
                    toast.error('Failed to save item');
                  }
                }} 
                onCancel={() => setIsItemSheetOpen(false)} 
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Categories Management</SheetTitle>
          </SheetHeader>
          {isCategorySheetOpen && (
             <CategoriesManager 
               categories={categories} 
               cafeId={profile!.cafe_id}
               onSave={fetchData} 
               onCancel={() => setIsCategorySheetOpen(false)} 
             />
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isAiPanelOpen} onOpenChange={(open) => { setIsAiPanelOpen(open); if (!open) { setAiOptimizeItem(null); setAiOptimizeData(null); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary text-xl">
              <Sparkles className="w-6 h-6" /> AI Menu Consultant
            </DialogTitle>
            <DialogDescription>
              Real-time analysis for <strong>{aiOptimizeItem?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          {aiOptimizeLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing database performance…</p>
            </div>
          ) : aiOptimizeData ? (
            <div className="space-y-6 mt-4">
              {/* Popularity & Revenue Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Orders (30d)', value: aiOptimizeData.orders_30d > 0 ? aiOptimizeData.orders_30d : '—' },
                  { label: 'Qty Sold (30d)', value: aiOptimizeData.qty_30d > 0 ? aiOptimizeData.qty_30d : '—' },
                  { label: 'Revenue (30d)', value: aiOptimizeData.revenue_30d > 0 ? `${aiOptimizeData.revenue_30d.toFixed(0)} ETB` : '—' },
                  { label: 'Popularity', value: aiOptimizeData.popularity, colored: true },
                ].map(m => (
                  <div key={m.label} className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
                    <p className={`text-lg font-bold ${m.colored ? (m.value === 'High' ? 'text-emerald-500' : m.value === 'Medium' ? 'text-yellow-500' : 'text-muted-foreground') : ''}`}>{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Price Recommendation */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 mb-2 text-primary font-semibold">
                  <Tag className="w-4 h-4" /> Price Optimization
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed mb-1">
                  Current price: <span className="font-bold">{aiOptimizeData.current_price} ETB</span>
                </p>
                <p className="text-sm text-foreground/90 leading-relaxed mb-1">
                  Suggested price: <span className="font-bold text-primary">{aiOptimizeData.suggested_price} ETB</span>
                </p>
                <p className="text-xs text-muted-foreground mb-4">{aiOptimizeData.price_basis}</p>
                {aiOptimizeData.suggested_price !== aiOptimizeData.current_price && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={applyAiPrice}>Apply {aiOptimizeData.suggested_price} ETB</Button>
                    <Button size="sm" variant="outline" onClick={() => setIsAiPanelOpen(false)}>Keep Current</Button>
                  </div>
                )}
              </div>

              {/* Description Suggestion */}
              <div className="p-4 rounded-xl border border-border bg-secondary/10">
                <div className="flex items-center gap-2 mb-2 font-semibold">
                  <Pencil className="w-4 h-4" /> Description Suggestion
                </div>
                {aiOptimizeItem?.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-through line-clamp-1">{aiOptimizeItem.description}</p>
                )}
                <p className="text-sm text-foreground/90 leading-relaxed mb-3 italic">"{aiOptimizeData.desc_suggestion}"</p>
                <Button size="sm" onClick={applyAiDesc}>Apply Description</Button>
              </div>

              {aiOptimizeData.orders_30d === 0 && (
                <div className="p-4 rounded-xl border border-border bg-secondary/20 text-sm text-muted-foreground">
                  <p className="font-medium mb-1">No sales data yet</p>
                  <p>Once customers order this item, Coffee OS will generate deeper performance insights.</p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Preview Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!previewItem} onOpenChange={(open) => { if (!open) setPreviewItem(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Preview</DialogTitle>
            <DialogDescription>How this item appears to customers</DialogDescription>
          </DialogHeader>
          {previewItem && (
            <div className="space-y-4">
              {previewItem.image_url ? (
                <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-secondary">
                  <img src={previewItem.image_url} alt={previewItem.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-[4/3] w-full bg-secondary flex items-center justify-center rounded-xl">
                  <Coffee className="w-12 h-12 text-muted-foreground/30" />
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-heading font-semibold text-lg text-foreground">{previewItem.name}</h3>
                <span className="text-primary font-bold shrink-0">{previewItem.price} {previewItem.currency}</span>
              </div>
              {previewItem.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{previewItem.description}</p>
              )}
              <div className="flex flex-wrap gap-2">
                {previewItem.status !== 'active' && (
                  <Badge variant="destructive" className="text-xs">Unavailable</Badge>
                )}
                {previewItem.is_featured && (
                  <Badge className="text-xs bg-amber-500/10 text-amber-700 border-amber-300">Featured</Badge>
                )}
                {previewItem.seasonal && (
                  <Badge variant="outline" className="text-xs">Seasonal</Badge>
                )}
                {(previewItem.tags ?? []).slice(0, 4).map(t => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
              {previewItem.preparation_time && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> ~{previewItem.preparation_time} min preparation
                </p>
              )}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Category: {categories.find(c => c.id === previewItem.category_id)?.name ?? 'Uncategorized'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Analytics Dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!analyticsItem} onOpenChange={(open) => { if (!open) { setAnalyticsItem(null); setAnalyticsData(null); } }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" /> Item Analytics
            </DialogTitle>
            <DialogDescription>{analyticsItem?.name} — last 30 days</DialogDescription>
          </DialogHeader>
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading order data…</span>
            </div>
          ) : analyticsData ? (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Orders', value: analyticsData.total_orders > 0 ? analyticsData.total_orders : 'No data' },
                  { label: 'Units Sold', value: analyticsData.total_qty > 0 ? analyticsData.total_qty : 'No data' },
                  { label: 'Revenue', value: analyticsData.total_revenue > 0 ? `${Number(analyticsData.total_revenue).toFixed(0)} ETB` : 'No data' },
                  { label: 'Avg/Day', value: analyticsData.total_revenue > 0 ? `${analyticsData.avg_revenue_per_day} ETB` : 'No data' },
                ].map(m => (
                  <div key={m.label} className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="text-base font-bold">{m.value}</p>
                  </div>
                ))}
              </div>
              {analyticsData.total_orders === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  No order data yet for this item. Once customers order it, sales metrics will appear here.
                </div>
              )}
              {Object.keys(analyticsData.daily).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Daily Units Sold (last 30 days)</p>
                  <div className="flex items-end gap-0.5 h-16 w-full">
                    {Object.entries(analyticsData.daily)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([day, qty]) => {
                        const max = Math.max(...Object.values(analyticsData.daily) as number[], 1);
                        const height = Math.max(4, Math.round(((qty as number) / max) * 64));
                        return (
                          <div key={day} title={`${day}: ${qty}`} style={{ height }} className="flex-1 bg-primary/60 rounded-t hover:bg-primary transition-colors" />
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ── Bulk Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={isBulkEditOpen} onOpenChange={(open) => { setIsBulkEditOpen(open); if (!open) setBulkEditStatus(''); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bulk Edit {selectedItems.size} Items</DialogTitle>
            <DialogDescription>Apply a status change to all selected menu items.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">New Status</label>
              <Select value={bulkEditStatus} onValueChange={setBulkEditStatus}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select status…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active — visible to customers</SelectItem>
                  <SelectItem value="inactive">Inactive — hidden from customers</SelectItem>
                  <SelectItem value="draft">Draft — admin only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsBulkEditOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkEditStatus} disabled={!bulkEditStatus}>
              Apply to {selectedItems.size} items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}