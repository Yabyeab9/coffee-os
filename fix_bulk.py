import re

with open('/workspace/app-cvq4redfdog1/src/pages/dashboard/MenusPage.tsx', 'r') as f:
    orig = f.read()

bulk_archive_func = """
  const handleBulkArchive = async () => {
    if (selectedItems.size === 0) return;
    try {
      const ids = Array.from(selectedItems);
      await supabase.from('menus').update({ deleted_at: new Date().toISOString(), status: 'archived' }).in('id', ids);
      setItems(prev => prev.filter(i => !selectedItems.has(i.id)));
      setSelectedItems(new Set());
      toast.success(`${ids.length} items archived successfully`);
    } catch (e) {
      toast.error('Bulk archive failed');
    }
  };
"""

orig = orig.replace("const handleDuplicate = async", bulk_archive_func + "\n  const handleDuplicate = async")

bulk_ui_old = """<Button variant="destructive" size="sm" className="h-8 bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 border">Archive Selected</Button>"""
bulk_ui_new = """<Button variant="destructive" size="sm" onClick={handleBulkArchive} className="h-8 bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 border">Archive Selected</Button>"""

orig = orig.replace(bulk_ui_old, bulk_ui_new)

with open('/workspace/app-cvq4redfdog1/src/pages/dashboard/MenusPage.tsx', 'w') as f:
    f.write(orig)
