import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Tag, Clock } from 'lucide-react';
import { getBlogPostBySlug } from '@/lib/api';
import { useCafe } from '@/hooks/queries';
import type { BlogPost } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PublicLayout } from '@/components/layout/PublicLayout';

export default function BlogPostDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isFetchingPost, setIsFetchingPost] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { data: cafeData, isLoading: cafeLoading } = useCafe();

  useEffect(() => {
    if (!slug || !cafeData) return;
    async function load() {
      setIsFetchingPost(true);
      const data = await getBlogPostBySlug(cafeData!.id, slug!);
      if (!data) setNotFound(true);
      else setPost(data);
      setIsFetchingPost(false);
    }
    load();
  }, [slug, cafeData]);

  const isLoading = cafeLoading || isFetchingPost;

  if (isLoading) {
    return (
      <PublicLayout cafe={cafeData}>
        <article className="max-w-3xl mx-auto px-4 py-16 space-y-6">
          <Skeleton className="h-8 w-2/3 bg-muted" />
          <Skeleton className="aspect-[16/9] w-full rounded-2xl bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-full bg-muted" />)}
          </div>
        </article>
      </PublicLayout>
    );
  }

  if (notFound || !post) {
    return (
      <PublicLayout cafe={cafeData}>
        <div className="max-w-3xl mx-auto px-4 py-24 text-center text-muted-foreground">
          <p className="text-2xl font-heading font-semibold mb-4">Post Not Found</p>
          <p className="mb-8">The article you're looking for doesn't exist or has been removed.</p>
          <Link to="/blog" className="inline-flex items-center gap-2 text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const readTime = post.content ? Math.ceil(post.content.split(' ').length / 200) : 3;

  return (
    <PublicLayout cafe={cafeData}>
      <article className="max-w-3xl mx-auto px-4 py-16">
        {/* Back */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Blog
          </Link>
        </motion.div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 mb-4">
            {post.tags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs px-2.5 py-0.5 text-primary bg-primary/10 border-primary/20">{tag}</Badge>
            ))}
          </motion.div>
        )}

        {/* Title */}
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-3xl md:text-4xl font-heading font-bold text-foreground leading-tight mb-4 text-balance">
          {post.title}
        </motion.h1>

        {/* Meta */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
          {post.published_at && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {readTime} min read
          </span>
        </motion.div>

        {/* Cover */}
        {post.cover_url && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.12 }} className="aspect-[16/9] md:aspect-[2/1] w-full overflow-hidden rounded-2xl mb-10 border border-border/30">
            <img src={post.cover_url} alt={post.title} className="w-full h-full object-cover" />
          </motion.div>
        )}

        {/* Excerpt */}
        {post.excerpt && (
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-lg text-muted-foreground leading-relaxed mb-8 border-l-2 border-primary/50 pl-4 italic">
            {post.excerpt}
          </motion.p>
        )}

        {/* Content */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="prose prose-invert max-w-none">
          {post.content ? (
            <div className="space-y-4">
              {post.content.split('\n\n').map((paragraph, i) => (
                <p key={i} className="text-foreground/85 leading-relaxed">{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">No content has been added to this post yet.</p>
          )}
        </motion.div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-border/50">
          <Link to="/blog" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
        </div>
      </article>
    </PublicLayout>
  );
}