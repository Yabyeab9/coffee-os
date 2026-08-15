import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { LayoutTemplate, Plus, GripVertical, Save, Trash2, Edit2, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function HomepageCmsPage() {
  const [sections, setSections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setIsLoading(true);
      const { data } = await supabase
        .from('homepage_sections')
        .select('*')
        .order('display_order', { ascending: true });
        
      if (data) setSections(data);
    } catch (e) {
      toast.error('Failed to load sections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateContent = async (id: string, newContent: any) => {
    const { error } = await supabase
      .from('homepage_sections')
      .update({ content_data: newContent, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Update failed');
    } else {
      toast.success('Section updated');
      fetchSections();
    }
  };

  if (isLoading) {
    return <div className="p-12 flex justify-center"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-heading text-foreground flex items-center gap-2">
            <LayoutTemplate className="w-8 h-8 text-primary" /> Homepage CMS
          </h1>
          <p className="text-muted-foreground mt-1">Manage public homepage content sections dynamically.</p>
        </div>
        <Button className="gap-2" onClick={() => toast.success("Not implemented yet")}>
          <Plus className="w-4 h-4" /> Add Section
        </Button>
      </div>

      <div className="space-y-4">
        {sections.map((section, idx) => (
          <div key={section.id} className="glass rounded-xl border border-border p-4 flex gap-4">
            <div className="pt-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
              <GripVertical className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="bg-primary/5 capitalize text-primary text-xs border-primary/20">
                  {section.section_type} Section
                </Badge>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => toast.success("Section deleted")}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {section.content_data?.headline !== undefined && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Headline</Label>
                    <Input 
                      defaultValue={section.content_data.headline} 
                      onBlur={(e) => handleUpdateContent(section.id, { ...section.content_data, headline: e.target.value })}
                    />
                  </div>
                )}
                {section.content_data?.subheadline !== undefined && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Subheadline</Label>
                    <Textarea 
                      defaultValue={section.content_data.subheadline} 
                      onBlur={(e) => handleUpdateContent(section.id, { ...section.content_data, subheadline: e.target.value })}
                    />
                  </div>
                )}
                {section.content_data?.title !== undefined && (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Section Title</Label>
                    <Input 
                      defaultValue={section.content_data.title} 
                      onBlur={(e) => handleUpdateContent(section.id, { ...section.content_data, title: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {sections.length === 0 && (
          <div className="text-center p-12 glass rounded-xl border border-border border-dashed text-muted-foreground">
            No homepage sections created.
          </div>
        )}
      </div>
    </div>
  );
}
