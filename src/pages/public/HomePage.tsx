import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Star, BookOpen, Leaf, Flame, Coffee, Clock } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getCafeBySlug, getMenuItems, getGallery, getTestimonials, getBlogPosts, getAnnouncements } from '@/lib/api';
import type { Cafe, MenuItem, GalleryItem, Testimonial, BlogPost, Announcement } from '@/types/database';

const CAFE_SLUG = 'origin';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < rating ? 'text-warning fill-warning' : 'text-border'}`} />
      ))}
    </div>
  );
}

export default function HomePage() {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const c = await getCafeBySlug(CAFE_SLUG);
      if (!c) { setIsLoading(false); return; }
      setCafe(c);

      const [menuRes, galleryData, testiData, blogRes, annoData] = await Promise.all([
        getMenuItems(c.id, { featured: true }),
        getGallery(c.id),
        getTestimonials(c.id),
        getBlogPosts(c.id, { status: 'published', page: 1 }),
        getAnnouncements(c.id),
      ]);
      setFeaturedItems(menuRes.data);
      setGallery(galleryData.slice(0, 6));
      setTestimonials(testiData);
      setPosts(blogRes.data.slice(0, 3));
      setAnnouncements(annoData);
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Coffee className="w-5 h-5 animate-pulse text-primary" />
          <span className="text-sm">Brewing your experience…</span>
        </div>
      </div>
    );
  }

  if (!cafe) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Café not found.</p>
      </div>
    );
  }

  return (
    <PublicLayout cafe={cafe} announcements={announcements}>
      {/* HERO */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Background image */}
        {cafe.cover_url && (
          <div className="absolute inset-0">
            <img
              src={cafe.cover_url}
              alt={cafe.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-hero" />
            <div className="absolute inset-0 bg-background/50" />
          </div>
        )}
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="max-w-2xl"
          >
            <Badge className="mb-6 bg-primary/15 text-primary border-primary/30 font-medium">
              Specialty Coffee · Addis Ababa
            </Badge>
            <h1 className="text-5xl md:text-7xl font-heading font-semibold text-foreground leading-none tracking-tight mb-6">
              {cafe.name?.split(' ')[0]}<br />
              <span className="gradient-text">{cafe.name?.split(' ').slice(1).join(' ')}</span>
            </h1>
            {cafe.tagline && (
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8 max-w-lg">
                {cafe.tagline}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Link to="/reservation">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
                  <Calendar className="w-4 h-4 mr-2" />
                  Reserve a Table
                </Button>
              </Link>
              <Link to="/menu">
                <Button size="lg" variant="outline" className="border-border text-primary hover:bg-secondary">
                  Explore Menu
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FEATURES BENTO */}
      <section className="section-pad max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground mb-3">
            Crafted with Intent
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Every element of Origin Coffee is designed around one thing: the perfect cup.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: Leaf, title: 'Single-Origin Sourcing', desc: 'Direct from Ethiopian highland farms. Every lot traceable to its cooperative.', color: 'text-primary' },
            { icon: Flame, title: 'Artisan Roasting', desc: 'Small-batch roasted to highlight each bean\'s unique terroir and character.', color: 'text-accent' },
            { icon: Coffee, title: 'Expert Brewing', desc: 'V60, AeroPress, espresso — every method executed with obsessive precision.', color: 'text-info' },
            { icon: Clock, title: 'Ethiopian Ceremony', desc: 'Authentic Buna ceremony experience. A cultural journey in every session.', color: 'text-warning' },
            { icon: Star, title: 'Award-Winning Space', desc: 'A destination for coffee lovers. Designed for comfort, community, and craft.', color: 'text-primary' },
            { icon: BookOpen, title: 'Coffee Education', desc: 'Monthly cupping sessions and brewing workshops for enthusiasts.', color: 'text-accent' },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="glass rounded-xl p-6 card-hover"
            >
              <div className={`w-10 h-10 rounded-lg bg-card flex items-center justify-center mb-4 border border-border/50`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FEATURED MENU */}
      {featuredItems.length > 0 && (
        <section className="section-pad bg-card/30">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Our Menu</p>
                <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground">
                  Featured Selections
                </h2>
              </div>
              <Link to="/menu" className="hidden md:flex">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-1.5">
                  View Full Menu <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredItems.slice(0, 6).map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="glass rounded-xl overflow-hidden group card-hover"
                >
                  {item.image_url ? (
                    <div className="aspect-[4/3] w-full overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] w-full bg-secondary flex items-center justify-center">
                      <Coffee className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-heading font-semibold text-foreground">{item.name}</h3>
                      {item.price && (
                        <span className="text-primary font-semibold text-sm shrink-0">
                          {item.price} {item.currency}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{item.description}</p>
                    )}
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {item.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 text-center md:hidden">
              <Link to="/menu">
                <Button variant="outline" className="border-border text-primary">
                  View Full Menu <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* GALLERY PREVIEW */}
      {gallery.length > 0 && (
        <section className="section-pad max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Gallery</p>
              <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground">
                See the Space
              </h2>
            </div>
            <Link to="/gallery" className="hidden md:flex">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-1.5">
                View All <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {gallery.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
                className={`overflow-hidden rounded-xl ${i === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
              >
                <div className={`w-full overflow-hidden group ${i === 0 ? 'aspect-square md:aspect-auto md:h-full min-h-[200px]' : 'aspect-square'}`}>
                  <img
                    src={item.image_url}
                    alt={item.alt_text ?? item.caption ?? ''}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    style={i === 0 ? { minHeight: '300px' } : undefined}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {testimonials.length > 0 && (
        <section className="section-pad bg-card/30">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Reviews</p>
              <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground mb-3">
                What People Say
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.07 }}
                  className="glass rounded-xl p-5"
                >
                  {t.rating && <StarRating rating={t.rating} />}
                  <p className="text-sm text-muted-foreground leading-relaxed mt-3 mb-4 line-clamp-4">
                    "{t.content}"
                  </p>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.author_name}</p>
                    {t.author_title && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t.author_title}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* BLOG PREVIEW */}
      {posts.length > 0 && (
        <section className="section-pad max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Blog</p>
              <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground">
                From the Journal
              </h2>
            </div>
            <Link to="/blog" className="hidden md:flex">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground gap-1.5">
                All Posts <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Link to={`/blog/${post.slug}`} className="group block glass rounded-xl overflow-hidden card-hover h-full">
                  {post.cover_url && (
                    <div className="aspect-[16/9] w-full overflow-hidden">
                      <img
                        src={post.cover_url}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex flex-wrap gap-1 mb-3">
                      {post.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-2 py-0 capitalize">{tag}</Badge>
                      ))}
                    </div>
                    <h3 className="font-heading font-semibold text-foreground leading-snug group-hover:text-primary transition-colors mb-2">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{post.excerpt}</p>
                    )}
                    {post.published_at && (
                      <p className="text-[11px] text-muted-foreground mt-3">
                        {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="section-pad max-w-7xl mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative rounded-2xl overflow-hidden bg-primary/10 border border-primary/20 p-10 md:p-16 text-center"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/5 pointer-events-none" />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground mb-3">
              Ready for your next cup?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Reserve your table and experience Ethiopian specialty coffee at its finest.
            </p>
            <Link to="/reservation">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
                <Calendar className="w-4 h-4 mr-2" />
                Reserve a Table
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </PublicLayout>
  );
}
