import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, Eye, FileText, Coffee } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { getCafeBySlug } from '@/lib/api';
import { getCafeSlug } from '@/lib/cafe-config';
import type { Cafe } from '@/types/database';

export default function PrivacyPage() {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const c = await getCafeBySlug(getCafeSlug());
      setCafe(c || null);
      setIsLoading(false);
    }
    load();
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Coffee className="w-6 h-6 text-primary animate-pulse" /></div>;
  }

  if (!cafe) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Café not found.</p></div>;
  }

  const SECTIONS = [
    {
      title: '1. Information We Collect',
      content: `We collect information you provide directly to us, such as when you make a reservation, subscribe to our newsletter, or contact us. This includes your name, email address, phone number, and reservation details. We also collect information automatically when you visit our website, including your IP address, browser type, and browsing patterns through cookies and similar technologies.`,
    },
    {
      title: '2. How We Use Your Information',
      content: `We use the information we collect to: process and confirm your reservations; send you transactional emails and important updates; respond to your comments and questions; send promotional communications (with your consent); analyze usage to improve our services; and comply with legal obligations.`,
    },
    {
      title: '3. Data Security & Storage',
      content: `We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Payment transactions are processed through secure, PCI-compliant third-party gateways (e.g., Chapa) and we do not store your full credit card information on our servers.`,
    },
    {
      title: '4. Sharing Your Information',
      content: `We do not sell, trade, or rent your personal information to third parties. We may share your information with trusted service providers who assist us in operating our website and conducting our business, so long as those parties agree to keep this information confidential. We may also release information when appropriate to comply with the law or protect ours or others' rights.`,
    },
    {
      title: '5. Your Rights & Choices',
      content: `You have the right to access, update, or delete your personal information at any time through your account settings or by contacting us. You may also opt out of promotional emails by following the instructions in those emails. Please note that even if you opt out of promotional emails, we may still send you non-promotional communications regarding your reservations or account.`,
    },
    {
      title: '6. Contact Us',
      content: `If you have any questions about this Privacy Policy, please contact us at: ${cafe.email || 'hello@cafe.com'} | ${cafe.name}, ${cafe.address}, ${cafe.city}, ${cafe.country} | ${cafe.phone}`,
    },
  ];

  return (
    <PublicLayout cafe={cafe}>
      {/* Header */}
      <section className="bg-background py-16 md:py-24 border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-card border border-border/50 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl md:text-5xl font-heading font-semibold text-foreground mb-4">Privacy Policy</h1>
          <p className="text-muted-foreground text-lg">
            At {cafe.name}, we are committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal information.
          </p>
          <p className="text-sm text-muted-foreground mt-6">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 md:py-24 max-w-4xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="glass rounded-xl p-6 text-center">
            <Lock className="w-6 h-6 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">Secure Data</h3>
            <p className="text-sm text-muted-foreground">Encrypted transactions & secure storage.</p>
          </div>
          <div className="glass rounded-xl p-6 text-center">
            <Eye className="w-6 h-6 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">No Selling</h3>
            <p className="text-sm text-muted-foreground">Your data is never sold to third parties.</p>
          </div>
          <div className="glass rounded-xl p-6 text-center">
            <FileText className="w-6 h-6 text-primary mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">Full Control</h3>
            <p className="text-sm text-muted-foreground">Access or delete your data anytime.</p>
          </div>
        </div>

        <div className="space-y-12">
          {SECTIONS.map((section, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
            >
              <h2 className="text-2xl font-heading font-semibold text-foreground mb-4">{section.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{section.content}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </PublicLayout>
  );
}
