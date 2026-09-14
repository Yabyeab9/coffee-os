import React, { useEffect, useState, useCallback } from 'react';
import { Save, Loader2, Coffee, Clock, Link2, Image, Bell, MapPin, Mail, Phone, Globe, CalendarRange } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getCafeBySlug, getAllCafes, updateCafe, getOpeningHours, upsertOpeningHours } from '@/lib/api';
import type { Cafe, OpeningHours } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';


import { getCafeSlug } from '@/lib/cafe-config';
const CAFE_SLUG = getCafeSlug();
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function SettingsPage() {
  const { cafeId } = useAuth();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [hours, setHours] = useState<OpeningHours[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingHours, setSavingHours] = useState(false);

  // Cafe form
  const [form, setForm] = useState({
    name: '', tagline: '', description: '', phone: '', email: '',
    address: '', city: '', logo_url: '', cover_url: '',
    instagram_url: '', facebook_url: '', twitter_url: '', tiktok_url: '',
  });

  const [settingsForm, setSettingsForm] = useState({
    reservation_payment_mode: 'free_reservation',
    deposit_percentage: 0,
    cancellation_window: 24,
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cafes, cafeData] = await Promise.all([
        getAllCafes(),
        getCafeBySlug(CAFE_SLUG),
      ]);
      const c = cafeData ?? cafes[0];
      if (c) {
        setCafe(c);
        setForm({
          name: c.name ?? '',
          tagline: c.tagline ?? '',
          description: c.description ?? '',
          phone: c.phone ?? '',
          email: c.email ?? '',
          address: c.address ?? '',
          city: c.city ?? '',
          logo_url: c.logo_url ?? '',
          cover_url: c.cover_url ?? '',
          instagram_url: c.instagram_url ?? '',
          facebook_url: c.facebook_url ?? '',
          twitter_url: c.twitter_url ?? '',
          tiktok_url: c.tiktok_url ?? '',
        });
        const hoursData = await getOpeningHours(c.id);
        const filled = Array.from({ length: 7 }, (_, i) => {
          const existing = hoursData.find(h => h.day_of_week === i);
          return existing ?? { id: '', cafe_id: c.id, day_of_week: i, open_time: '07:00', close_time: '22:00', is_closed: false };
        });
        setHours(filled as OpeningHours[]);
      }
    } catch (_err) {
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  }, [cafeId]);

  useEffect(() => { load(); }, [load]);

  const handleSaveCafe = async () => {
    if (!cafe) return;
    setSaving(true);
    const { error } = await updateCafe(cafe.id, {
      name: form.name,
      tagline: form.tagline || null,
      description: form.description || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      logo_url: form.logo_url || null,
      cover_url: form.cover_url || null,
      instagram_url: form.instagram_url || null,
      facebook_url: form.facebook_url || null,
      twitter_url: form.twitter_url || null,
      tiktok_url: form.tiktok_url || null,
      settings: {
        ...(cafe.settings as any || {}),
        reservation_payment_mode: settingsForm.reservation_payment_mode,
        deposit_percentage: settingsForm.deposit_percentage,
        cancellation_window: settingsForm.cancellation_window,
      }
    });
    setSaving(false);
    if (error) { toast.error('Failed to save settings', { description: error }); return; }
    toast.success('Settings saved');
    load();
  };

  const handleSaveHours = async () => {
    if (!cafe) return;
    setSavingHours(true);
    const rows = hours.map(h => ({
      cafe_id: cafe.id,
      day_of_week: h.day_of_week,
      open_time: h.is_closed ? null : h.open_time,
      close_time: h.is_closed ? null : h.close_time,
      is_closed: h.is_closed,
    }));
    const { error } = await upsertOpeningHours(rows);
    setSavingHours(false);
    if (error) { toast.error('Failed to save hours'); return; }
    toast.success('Opening hours saved');
  };

  const updateHour = (day: number, field: keyof OpeningHours, value: unknown) => {
    setHours(prev => prev.map(h => h.day_of_week === day ? { ...h, [field]: value } : h));
  };

  if (isLoading) return <div className="p-6 flex justify-center py-20"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <h1 className="text-xl font-heading font-semibold text-foreground">Café Settings</h1>

      {/* Basic Info */}
      <section className="glass rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 mb-2">
          <Coffee className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-semibold text-foreground">Basic Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Café Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-input border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Tagline</Label>
            <Input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder="Your café's tagline" className="bg-input border-border" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">Description</Label>
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} className="bg-input border-border" placeholder="Tell your story…" />
        </div>
      </section>

      {/* Contact */}
      <section className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-semibold text-foreground">Contact & Location</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+251 91 …" className="bg-input border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-input border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Address</Label>
            <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="bg-input border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">City</Label>
            <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Addis Ababa" className="bg-input border-border" />
          </div>
        </div>
      </section>

      {/* Branding */}
      <section className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Image className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-semibold text-foreground">Branding</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Logo URL</Label>
            <Input value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} placeholder="https://…" className="bg-input border-border" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Cover / Hero Image URL</Label>
            <Input value={form.cover_url} onChange={e => setForm(f => ({ ...f, cover_url: e.target.value }))} placeholder="https://…" className="bg-input border-border" />
          </div>
        </div>
        {form.logo_url && (
          <div className="flex items-center gap-3">
            <img src={form.logo_url} alt="Logo preview" className="h-10 rounded-lg border border-border object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
            <span className="text-xs text-muted-foreground">Logo preview</span>
          </div>
        )}
      </section>

      {/* Social Links */}
      <section className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-4 h-4 text-primary" />
          <h2 className="font-heading font-semibold text-foreground">Social Links</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Instagram', key: 'instagram_url' as const, placeholder: 'https://instagram.com/…' },
            { label: 'Facebook', key: 'facebook_url' as const, placeholder: 'https://facebook.com/…' },
            { label: 'Twitter / X', key: 'twitter_url' as const, placeholder: 'https://twitter.com/…' },
            { label: 'TikTok', key: 'tiktok_url' as const, placeholder: 'https://tiktok.com/…' },
          ].map(s => (
            <div key={s.key} className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">{s.label}</Label>
              <Input value={form[s.key]} onChange={e => setForm(f => ({ ...f, [s.key]: e.target.value }))} placeholder={s.placeholder} className="bg-input border-border" />
            </div>
          ))}
        </div>
      </section>

      <Button onClick={handleSaveCafe} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
        Save Settings
      </Button>

      <Separator className="bg-border/50" />

      {/* Reservation Settings */}
      <section className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">Reservation Settings</h2>
          </div>
          <Button onClick={handleSaveCafe} disabled={saving} size="sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Policy
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Payment Policy</Label>
            <Select 
              value={settingsForm.reservation_payment_mode} 
              onValueChange={(val) => setSettingsForm(f => ({ ...f, reservation_payment_mode: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free_reservation">Free Reservation</SelectItem>
                <SelectItem value="deposit_required">Deposit Required</SelectItem>
                <SelectItem value="full_payment_required">Full Payment Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settingsForm.reservation_payment_mode === 'deposit_required' && (
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Deposit Percentage (%)</Label>
              <Input 
                type="number" 
                min={1} max={100}
                value={settingsForm.deposit_percentage} 
                onChange={e => setSettingsForm(f => ({ ...f, deposit_percentage: parseInt(e.target.value) || 0 }))} 
                className="bg-input border-border" 
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm text-muted-foreground">Cancellation Window (Hours)</Label>
            <Input 
              type="number" 
              min={0}
              value={settingsForm.cancellation_window} 
              onChange={e => setSettingsForm(f => ({ ...f, cancellation_window: parseInt(e.target.value) || 0 }))} 
              className="bg-input border-border" 
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum hours required for free cancellation.</p>
          </div>
        </div>
      </section>

      {/* Opening Hours */}
      <section className="glass rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">Opening Hours</h2>
          </div>
        </div>
        <div className="space-y-3">
          {hours.map(h => (
            <div key={h.day_of_week} className={`flex items-center gap-4 py-2 ${h.day_of_week === new Date().getDay() ? 'text-foreground' : 'text-muted-foreground'}`}>
              <span className="w-24 text-sm font-medium">{DAY_NAMES[h.day_of_week]}</span>
              <Switch checked={!h.is_closed} onCheckedChange={v => updateHour(h.day_of_week, 'is_closed', !v)} />
              {!h.is_closed ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input type="time" value={h.open_time ?? '07:00'} onChange={e => updateHour(h.day_of_week, 'open_time', e.target.value)} className="bg-input border-border text-sm w-32" />
                  <span className="text-muted-foreground text-sm">to</span>
                  <Input type="time" value={h.close_time ?? '22:00'} onChange={e => updateHour(h.day_of_week, 'close_time', e.target.value)} className="bg-input border-border text-sm w-32" />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground italic">Closed</span>
              )}
            </div>
          ))}
        </div>
        <Button onClick={handleSaveHours} disabled={savingHours} className="bg-primary text-primary-foreground hover:bg-primary/90">
          {savingHours ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Opening Hours
        </Button>
      </section>
    </div>
  );
}