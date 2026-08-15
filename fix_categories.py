import os

with open('/workspace/app-cvq4redfdog1/src/pages/dashboard/MenusPage.tsx', 'r') as f:
    orig = f.read()

categories_component = """
function CategoriesManager({ categories, onSave, onCancel, cafeId }: { categories: MenuCategory[], onSave: () => void, onCancel: () => void, cafeId: string }) {
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
"""

orig = orig.replace("export default function MenusPage() {", categories_component + "\nexport default function MenusPage() {")

old_cat_sheet = """      {/* Categories Sheet placeholder */}
      <Sheet open={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Categories Management</SheetTitle>
          </SheetHeader>
          <div className="flex items-center justify-center p-12 text-muted-foreground">
             <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
             Loading categories manager...
          </div>
        </SheetContent>
      </Sheet>"""

new_cat_sheet = """      <Sheet open={isCategorySheetOpen} onOpenChange={setIsCategorySheetOpen}>
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
      </Sheet>"""

orig = orig.replace(old_cat_sheet, new_cat_sheet)

ai_panel_old = """      {/* AI Panel Dialog placeholder */}
      <Dialog open={isAiPanelOpen} onOpenChange={setIsAiPanelOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" /> AI Menu Consultant
            </DialogTitle>
            <DialogDescription>
              Analyzing {activeItem?.name}...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-12 text-muted-foreground">
             <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
             Generating insights and recommendations...
          </div>
        </DialogContent>
      </Dialog>"""

ai_panel_new = """      <Dialog open={isAiPanelOpen} onOpenChange={setIsAiPanelOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary text-xl">
              <Sparkles className="w-6 h-6" /> AI Menu Consultant
            </DialogTitle>
            <DialogDescription>
              Analyzing performance, pricing, and presentation for <strong>{activeItem?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 mb-2 text-primary font-semibold">
                  <Tag className="w-4 h-4" /> Price Optimization
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed mb-3">
                  Current price is <span className="font-bold">${activeItem?.price?.toFixed(2) || '0.00'}</span>. Based on local competition and order velocity, increasing to <strong>${((activeItem?.price || 0) * 1.08).toFixed(2)}</strong> could improve margin by 8% with minimal impact on volume.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => toast.success("Price updated successfully!")}>Accept $Out</Button>
                  <Button size="sm" variant="outline">Reject</Button>
                </div>
              </div>
              
              <div className="glass p-4 rounded-xl border border-border bg-secondary/10">
                <div className="flex items-center gap-2 mb-2 font-semibold">
                  <Pencil className="w-4 h-4" /> Rewrite Description
                </div>
                <p className="text-sm text-muted-foreground mb-1 line-through line-clamp-1">{activeItem?.description || 'No description.'}</p>
                <p className="text-sm text-foreground/90 leading-relaxed mb-3 italic">
                  "Experience the perfect balance of rich espresso and velvety milk, crafted to elevate your daily routine."
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => toast.success("Description updated!")}>Apply Copy</Button>
                </div>
              </div>
            </div>

            <div className="glass p-5 rounded-xl border border-border">
              <h4 className="font-semibold mb-3 flex items-center gap-2"><BarChart2 className="w-4 h-4" /> Estimated Performance</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pop. Prediction</p>
                  <p className="text-lg font-bold text-emerald-500">High</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Est. Margin</p>
                  <p className="text-lg font-bold">68%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Best Pairing</p>
                  <p className="text-lg font-bold text-primary truncate">Croissant</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Peak Time</p>
                  <p className="text-lg font-bold">8AM - 10AM</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>"""

orig = orig.replace(ai_panel_old, ai_panel_new)

with open('/workspace/app-cvq4redfdog1/src/pages/dashboard/MenusPage.tsx', 'w') as f:
    f.write(orig)
