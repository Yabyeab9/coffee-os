import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Phone, Mail, Clock, Send, Loader2, CheckCircle, Coffee } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { getCafeBySlug } from '@/lib/api';
import { getCafeSlug } from '@/lib/cafe-config';
import type { Cafe } from '@/types/database';

const DEFAULT_HOURS = [
  { day: 'Monday – Friday', time: '7:00 AM – 10:00 PM' },
  { day: 'Saturday', time: '8:00 AM – 11:00 PM' },
  { day: 'Sunday', time: '9:00 AM – 9:00 PM' },
];

export default function ContactPage() {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const c = await getCafeBySlug(getCafeSlug());
      setCafe(c || null);
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error('Please fill in all required fields'); return; }
    setSending(true);
    try {
      await supabase.from('ai_chat_messages').insert({
        session_id: null,
        role: 'user',
        content: JSON.stringify({ type: 'contact', ...form }),
      });
      setSent(true);
    } catch (_err) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Coffee className="w-6 h-6 text-primary animate-pulse" /></div>;
  }

  if (!cafe) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Café not found.</p></div>;
  }

  return (
    <PublicLayout cafe={cafe}>
      {/* HEADER */}
      <section className="bg-background py-16 md:py-24 border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-heading font-semibold text-foreground mb-4">Get in Touch</h1>
            <p className="text-muted-foreground text-lg">We'd love to hear from you. Reach out for reservations, event inquiries, or simply to talk coffee.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24">
          
          {/* INFO SIDE */}
          <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <div className="space-y-10">
              
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-card border border-border/50 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground mb-1">Visit Us</h3>
                  <p className="text-muted-foreground">{cafe.address || 'Address pending'}, {cafe.city || ''}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-card border border-border/50 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground mb-1">Call Us</h3>
                  <p className="text-muted-foreground">{cafe.phone || 'Phone pending'}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-card border border-border/50 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-foreground mb-1">Email Us</h3>
                  <p className="text-muted-foreground">{cafe.email || 'Email pending'}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-border/40">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="w-5 h-5 text-primary" />
                  <h3 className="font-heading font-semibold text-foreground">Opening Hours</h3>
                </div>
                <div className="space-y-3">
                  {DEFAULT_HOURS.map((h) => (
                    <div key={h.day} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{h.day}</span>
                      <span className="font-medium text-foreground">{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>

          {/* FORM SIDE */}
          <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            {sent ? (
              <div className="glass rounded-2xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                <CheckCircle className="w-12 h-12 text-primary mb-4" />
                <h2 className="text-xl font-heading font-semibold text-foreground mb-2">Message Received!</h2>
                <p className="text-muted-foreground mb-6">We'll get back to you within 24 hours. Thank you for reaching out.</p>
                <Button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }} variant="outline" className="border-border hover:bg-secondary">
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Full Name *</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" className="bg-background/50 border-border/50" required />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Email *</Label>
                    <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" className="bg-background/50 border-border/50" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Subject</Label>
                  <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="What's it about?" className="bg-background/50 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Message *</Label>
                  <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us what's on your mind…" className="bg-background/50 border-border/50" rows={5} required />
                </div>
                <Button type="submit" disabled={sending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {sending ? 'Sending…' : 'Send Message'}
                </Button>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      {/* MAP */}
      <section className="h-[400px] w-full bg-secondary">
        <iframe
          src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyB_LJOYJL-84SMuxNB7LtRGhxEQLjswvy0&q=${encodeURIComponent(cafe.name + ' ' + cafe.city)}`}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`${cafe.name || 'Cafe'} Location`}
        ></iframe>
      </section>
    </PublicLayout>
  );
}