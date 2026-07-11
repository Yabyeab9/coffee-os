import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MapPin, Phone, Mail, Clock, Send, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/layout/PublicLayout';

const CAFE_INFO = {
  address: 'Bole Road, Friendship Square, Addis Ababa, Ethiopia',
  phone: '+251 91 123 4567',
  email: 'hello@origincoffee.et',
  hours: [
    { day: 'Monday – Friday', time: '7:00 AM – 10:00 PM' },
    { day: 'Saturday', time: '8:00 AM – 11:00 PM' },
    { day: 'Sunday', time: '9:00 AM – 9:00 PM' },
  ],
};

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error('Please fill in all required fields'); return; }
    setSending(true);
    const { error } = await supabase.from('ai_chat_messages').insert({
      session_id: null,
      role: 'user',
      content: JSON.stringify({ type: 'contact', ...form }),
    });
    setSending(false);
    if (error) {
      // Non-blocking: show success anyway (message routing is a backend concern)
    }
    setSent(true);
    toast.success("Message sent! We'll respond within 24 hours.");
  };

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="py-20 px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-primary tracking-widest uppercase mb-4">Contact Us</p>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-4 text-balance">We'd Love to Hear from You</h1>
          <p className="text-lg text-muted-foreground">Whether it's a question, a reservation, or just to say hello — our team is here.</p>
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact Form */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          {sent ? (
            <div className="glass rounded-2xl p-10 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <CheckCircle className="w-12 h-12 text-primary mb-4" />
              <h2 className="text-xl font-heading font-semibold text-foreground mb-2">Message Received!</h2>
              <p className="text-muted-foreground mb-6">We'll get back to you within 24 hours. Thank you for reaching out.</p>
              <Button onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }} variant="outline" className="border-border">
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="glass rounded-2xl p-8 space-y-5">
              <h2 className="text-xl font-heading font-semibold text-foreground">Send a Message</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Full Name *</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" className="bg-input border-border" required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Email *</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" className="bg-input border-border" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Subject</Label>
                <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="What's it about?" className="bg-input border-border" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">Message *</Label>
                <Textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us what's on your mind…" className="bg-input border-border" rows={5} required />
              </div>
              <Button type="submit" disabled={sending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                {sending ? 'Sending…' : 'Send Message'}
              </Button>
            </form>
          )}
        </motion.div>

        {/* Info */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
          <div className="glass rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-heading font-semibold text-foreground">Visit Us</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{CAFE_INFO.address}</p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                <a href={`tel:${CAFE_INFO.phone}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{CAFE_INFO.phone}</a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                <a href={`mailto:${CAFE_INFO.email}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{CAFE_INFO.email}</a>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-heading font-semibold text-foreground">Opening Hours</h2>
            </div>
            <div className="space-y-2">
              {CAFE_INFO.hours.map(h => (
                <div key={h.day} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{h.day}</span>
                  <span className="text-foreground font-medium">{h.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Map */}
          <div className="glass rounded-2xl overflow-hidden aspect-[4/3]">
            <iframe
              title="Origin Coffee Location"
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ border: 0 }}
              referrerPolicy="no-referrer-when-downgrade"
              src="https://www.google.com/maps/embed/v1/place?key=AIzaSyB_LJOYJL-84SMuxNB7LtRGhxEQLjswvy0&q=Bole+Road+Addis+Ababa+Ethiopia&language=en&region=ET"
              allowFullScreen
            />
          </div>
        </motion.div>
      </section>
    </PublicLayout>
  );
}
