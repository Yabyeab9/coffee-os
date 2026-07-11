import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Plus, Pencil, Trash2, BookOpen, Loader2, Calendar, Tag, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost } from '@/lib/api';
import type { BlogPost, ContentStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const DEMO_CAFE_ID = '00000000-0000-0000-0000-000000000001';

type PostForm = { title: string; slug: string; excerpt: string; content: string; cover_url: string; tags: string; status: ContentStatus };
const DEFAULT: PostForm = { title: '', slug: '', excerpt: '', content: '', cover_url: '', tags: '', status: 'draft' };

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

export default function BlogAdminPage() {
  const { cafeId, profile } = useAuth();
  const resolvedId = cafeId ?? DEMO_CAFE_ID;
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<PostForm>(DEFAULT);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const res = await getBlogPosts(resolvedId);
    setPosts(res.data);
    setIsLoading(false);
  }, [resolvedId]);

  useEffect(() => { load(); }, [load]);

  const filtered = statusFilter === 'all' ? posts : posts.filter(p => p.status === statusFilter);

  const openAdd = () => { setEditing(null); setForm(DEFAULT); setDialog(true); };
  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({ title: post.title, slug: post.slug, excerpt: post.excerpt ?? '', content: post.content ?? '', cover_url: post.cover_url ?? '', tags: post.tags.join(', '), status: post.status });
    setDialog(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    const slug = form.slug || slugify(form.title);
    const payload = {
      cafe_id: resolvedId,
      author_id: profile?.id ?? null,
      title: form.title,
      slug,
      excerpt: form.excerpt || null,
      content: form.content || null,
      cover_url: form.cover_url || null,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      status: form.status,
      seo_data: {},
      published_at: form.status === 'published' ? new Date().toISOString() : null,
    };
    const { error } = editing
      ? await updateBlogPost(editing.id, payload)
      : await createBlogPost(payload);
    setSaving(false);
    if (error) { toast.error('Failed to save', { description: error }); return; }
    toast.success(editing ? 'Post updated' : 'Post created');
    setDialog(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteBlogPost(id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Post deleted');
    load();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-semibold text-foreground">Blog</h1>
          <p className="text-sm text-muted-foreground">{posts.filter(p => p.status === 'published').length} published · {posts.filter(p => p.status === 'draft').length} drafts</p>
        </div>
        <Button size="sm" onClick={openAdd} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" /> New Post
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5">
        {['all', 'published', 'draft'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${statusFilter === s ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="mb-4">No posts yet.</p>
          <Button size="sm" onClick={openAdd} className="bg-primary text-primary-foreground"><Plus className="w-4 h-4 mr-1.5" /> Write First Post</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => (
            <div key={post.id} className="glass rounded-xl p-4 flex items-start gap-4">
              {post.cover_url && (
                <div className="w-16 h-16 overflow-hidden rounded-lg shrink-0 hidden md:block">
                  <img src={post.cover_url} alt={post.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  <h3 className="font-heading font-semibold text-foreground text-sm flex-1 min-w-0 truncate">{post.title}</h3>
                  <Badge className={`shrink-0 text-[10px] px-1.5 py-0 ${post.status === 'published' ? 'bg-primary/15 text-primary border-primary/30' : 'bg-secondary text-muted-foreground'}`}>
                    {post.status}
                  </Badge>
                </div>
                {post.excerpt && <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{post.excerpt}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {post.published_at && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(post.published_at).toLocaleDateString()}</span>}
                  {post.tags.length > 0 && <span className="flex items-center gap-1"><Tag className="w-3 h-3" />{post.tags.slice(0, 2).join(', ')}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(post)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                    <AlertDialogHeader><AlertDialogTitle>Delete Post</AlertDialogTitle><AlertDialogDescription>Delete "{post.title}"? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(post.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Post' : 'New Blog Post'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Title *</Label>
              <Input value={form.title} onChange={e => { setForm(f => ({ ...f, title: e.target.value, slug: f.slug || slugify(e.target.value) })); }} placeholder="Your post title" className="bg-input border-border" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Slug</Label>
                <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated-from-title" className="bg-input border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as ContentStatus }))}>
                  <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Cover Image URL</Label>
              <Input value={form.cover_url} onChange={e => setForm(f => ({ ...f, cover_url: e.target.value }))} placeholder="https://…" className="bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Excerpt</Label>
              <Textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} placeholder="Short summary for listings…" className="bg-input border-border" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Content</Label>
              <Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Write your post…" className="bg-input border-border" rows={8} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Tags (comma-separated)</Label>
              <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="culture, brewing, recipe" className="bg-input border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)} className="border-border">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
