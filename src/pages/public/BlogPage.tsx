import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Coffee, ArrowRight, Tag } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getCafeBySlug, getBlogPosts, getAnnouncements } from '@/lib/api';
import type { Cafe, BlogPost, Announcement } from '@/types/database';

const CAFE_SLUG = 'origin';

export default function BlogPage() {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');

  useEffect(() => {
    async function load() {
      const c = await getCafeBySlug(CAFE_SLUG);
      if (!c) return;
      setCafe(c);
      const [blogRes, annoData] = await Promise.all([
        getBlogPosts(c.id, { status: 'published' }),
        getAnnouncements(c.id),
      ]);
      setPosts(blogRes.data);
      setAnnouncements(annoData);
    }
    load();
  }, []);

  const allTags = Array.from(new Set(posts.flatMap(p => p.tags)));
  const filtered = posts.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase());
    const matchTag = !activeTag || p.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  if (!cafe) return <div className="min-h-screen bg-background flex items-center justify-center"><Coffee className="w-6 h-6 text-primary animate-pulse" /></div>;

  return (
    <PublicLayout cafe={cafe} announcements={announcements}>
      <section className="section-pad pb-8 max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Our Journal</p>
          <h1 className="text-4xl md:text-5xl font-heading font-semibold text-foreground mb-3">The Blog</h1>
          <p className="text-muted-foreground max-w-lg">Stories from the farm, guides from the bar, and reflections on Ethiopian coffee culture.</p>
        </motion.div>
      </section>

      {/* Filters */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-md border-y border-border/40 py-3">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row gap-3">
          <div className="flex gap-1.5 overflow-x-auto whitespace-nowrap flex-1">
            <button
              onClick={() => setActiveTag('')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors shrink-0 ${!activeTag ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveTag(t => t === tag ? '' : tag)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize shrink-0 ${activeTag === tag ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="relative shrink-0 w-full md:w-56">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search posts…" className="bg-input border-border text-sm" />
          </div>
        </div>
      </div>

      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">No posts found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post, i) => (
              <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Link to={`/blog/${post.slug}`} className="block glass rounded-xl overflow-hidden card-hover group h-full">
                  {post.cover_url ? (
                    <div className="aspect-[16/9] overflow-hidden">
                      <img src={post.cover_url} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className="aspect-[16/9] bg-secondary flex items-center justify-center">
                      <Coffee className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex flex-wrap gap-1 mb-3">
                      {post.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0 capitalize">{tag}</Badge>
                      ))}
                    </div>
                    <h2 className="font-heading font-semibold text-foreground mb-2 group-hover:text-primary transition-colors leading-snug">{post.title}</h2>
                    {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.excerpt}</p>}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {post.published_at && <span>{new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                      <span className="flex items-center gap-1 text-primary">Read more <ArrowRight className="w-3 h-3" /></span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </PublicLayout>
  );
}
