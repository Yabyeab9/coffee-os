import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Coffee } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { supabase } from '@/lib/supabase';
import { getCafeBySlug, getAnnouncements } from '@/lib/api';
import type { Cafe, Announcement } from '@/types/database';

import { getCafeSlug } from '@/lib/cafe-config';
const CAFE_SLUG = getCafeSlug();

export default function AboutPage() {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [aboutContent, setAboutContent] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const c = await getCafeBySlug(CAFE_SLUG);
      if (!c) return;
      setCafe(c);
      const annoData = await getAnnouncements(c.id);
      setAnnouncements(annoData);
      
      const { data } = await supabase.from('pages').select('meta_description').eq('cafe_id', c.id).eq('slug','abat').maybeSingle();
      if (data) {
        setAboutContent(data.meta_description);
      }
    }
    load();
  }, []);

  if (!cafe) return <div className="min-h-screen bg-background flex items-center justify-center"><Coffee className="w-6 h-6 text-primary animate-pulse" /></div>;

  return (
    <PublicLayout cafe={cafe} announcements={announcements}>
      {/* Hero */}
      <section className="section-pad pb-8 max-w-7xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Our Story</p>
          <h1 className="text-4xl md:text-5xl font-heading font-semibold text-foreground mb-4">About {cafe.name}</h1>
          <p className="text-muted-foreground text-lg max-w-xl leading-relaxed">{cafe.description}</p>
        </motion.div>
      </section>

      {/* Cover */}
      {cafe.cover_url && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 mb-16">
          <div className="aspect-[21/9] w-full overflow-hidden rounded-2xl">
            <img src={cafe.cover_url} alt={cafe.name} className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Story */}
      <section className="max-w-3xl mx-auto px-4 md:px-8 mb-20">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="text-2xl md:text-3xl font-heading font-semibold text-foreground mb-6">Why We Exist</h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {aboutContent || "No about information available at the moment."}
          </div>
        </motion.div>
      </section>
    </PublicLayout>
  );
}
