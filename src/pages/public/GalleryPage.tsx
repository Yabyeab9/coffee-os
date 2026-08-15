import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Coffee } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getCafeBySlug, getGallery, getAnnouncements } from '@/lib/api';
import type { Cafe, GalleryItem, Announcement } from '@/types/database';

import { getCafeSlug } from '@/lib/cafe-config';
const CAFE_SLUG = getCafeSlug();
const ALL_CATEGORIES = ['all', 'interior', 'craft', 'beans', 'space', 'menu'];

export default function GalleryPage() {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const c = await getCafeBySlug(CAFE_SLUG);
      if (!c) { setIsLoading(false); return; }
      setCafe(c);
      const [galleryData, annoData] = await Promise.all([
        getGallery(c.id),
        getAnnouncements(c.id),
      ]);
      setItems(galleryData);
      setAnnouncements(annoData);
      setIsLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const filtered = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory);
  const usedCategories = ALL_CATEGORIES.filter(c => c === 'all' || items.some(i => i.category === c));

  if (isLoading || !cafe) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Coffee className="w-6 h-6 text-primary animate-pulse" /></div>;
  }

  return (
    <PublicLayout cafe={cafe} announcements={announcements}>
      <section className="section-pad pb-8 max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Visual Story</p>
          <h1 className="text-4xl md:text-5xl font-heading font-semibold text-foreground mb-3">Gallery</h1>
          <p className="text-muted-foreground max-w-lg">A glimpse into the space, the craft, and the coffee that defines {cafe.name}.</p>
        </motion.div>
      </section>

      {/* Category Filter */}
      <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-md border-y border-border/40 py-3">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex gap-1.5 overflow-x-auto whitespace-nowrap">
          {usedCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize shrink-0 ${
                activeCategory === cat ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Masonry grid */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">No images in this category.</div>
        ) : (
          <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
            {filtered.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="break-inside-avoid cursor-pointer group"
                onClick={() => setLightbox(item)}
              >
                <div className="overflow-hidden rounded-xl glass">
                  <img
                    src={item.image_url}
                    alt={item.alt_text ?? item.caption ?? ''}
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {item.caption && (
                    <div className="px-4 py-3">
                      <p className="text-sm text-muted-foreground">{item.caption}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Lightbox */}
      {lightbox && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-3xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <img
              src={lightbox.image_url}
              alt={lightbox.alt_text ?? lightbox.caption ?? ''}
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            {lightbox.caption && (
              <p className="text-sm text-muted-foreground text-center mt-3">{lightbox.caption}</p>
            )}
          </div>
        </motion.div>
      )}
    </PublicLayout>
  );
}
