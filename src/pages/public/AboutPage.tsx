import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Coffee, Leaf, Heart, Award } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { getCafeBySlug, getAnnouncements } from '@/lib/api';
import type { Cafe, Announcement } from '@/types/database';

const CAFE_SLUG = 'origin';

const VALUES = [
  { icon: Leaf, title: 'Traceability', desc: 'Every bean is traceable to its farm, cooperative, and altitude. We share full supply chain information with our customers.' },
  { icon: Heart, title: 'Community First', desc: 'We pay premium prices directly to Ethiopian farmers, investing in communities that have sustained coffee culture for centuries.' },
  { icon: Award, title: 'Relentless Quality', desc: 'Every lot is cupped and scored before purchase. If it does not meet our standard, we do not serve it.' },
  { icon: Coffee, title: 'Education', desc: 'We believe every customer deserves to understand what is in their cup — from origin to extraction.' },
];

const TEAM = [
  { name: 'Selam Abebe', role: 'Head Roaster & Co-founder', bio: 'Selam trained in specialty roasting in Oslo before returning to Ethiopia with a mission to showcase indigenous varieties to the world.' },
  { name: 'Dawit Haile', role: 'Head Barista & Co-founder', bio: 'A World Barista Championship competitor, Dawit brings a technical precision to every extraction that has earned Origin its reputation.' },
  { name: 'Tigist Worku', role: 'Green Coffee Buyer', bio: 'Tigist travels to farms across Yirgacheffe, Sidama, and Harrar three times a year to source lots that tell a story.' },
];

export default function AboutPage() {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    async function load() {
      const c = await getCafeBySlug(CAFE_SLUG);
      if (!c) return;
      setCafe(c);
      const annoData = await getAnnouncements(c.id);
      setAnnouncements(annoData);
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
          <h1 className="text-4xl md:text-5xl font-heading font-semibold text-foreground mb-4">About Origin Coffee</h1>
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
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              Ethiopia is the birthplace of coffee. The wild heirloom arabica varieties growing in its southwestern highlands represent the widest genetic diversity of coffea arabica on the planet. Yet for too long, this extraordinary heritage has been obscured by commodity trading systems that prioritise volume over quality.
            </p>
            <p>
              Origin Coffee was founded in 2019 by Selam Abebe and Dawit Haile with a singular purpose: to build a direct bridge between the incredible farmers and cooperatives of Ethiopia and the specialty coffee drinkers of Addis Ababa and beyond.
            </p>
            <p>
              We are not just a café. We are a platform for Ethiopian coffee culture — rooted in the belief that transparency, quality, and community can coexist in every cup.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Values */}
      <section className="section-pad bg-card/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground mb-2">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {VALUES.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass rounded-xl p-6"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center mb-4">
                  <v.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-heading font-semibold text-foreground mb-2">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="section-pad max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-heading font-semibold text-foreground mb-2">The Team</h2>
          <p className="text-muted-foreground">Passionate people behind every cup.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TEAM.map((member, i) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass rounded-xl p-6 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-heading font-bold text-primary">{member.name[0]}</span>
              </div>
              <h3 className="font-heading font-semibold text-foreground mb-1">{member.name}</h3>
              <p className="text-xs text-primary mb-3">{member.role}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{member.bio}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
