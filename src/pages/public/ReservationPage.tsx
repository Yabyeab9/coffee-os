import React, { useState, useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, Clock, Users, ChevronRight, ChevronLeft, CheckCircle, Coffee, Loader2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getCafeBySlug, getAnnouncements, createReservation, getMenuCategories, getMenuItems } from '@/lib/api';
import type { Cafe, Announcement, MenuCategory, MenuItem } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

import { getCafeSlug } from '@/lib/cafe-config';
const CAFE_SLUG = getCafeSlug();
const TIME_SLOTS = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30'];
const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8];

export default function ReservationPage() {
  const { session, profile, isLoading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Menu data for pre-ordering
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Pre-order state
  const [wantsPreorder, setWantsPreorder] = useState<boolean | null>(null);
  const [cart, setCart] = useState<{item: MenuItem, qty: number}[]>([]);

  useEffect(() => {
    async function load() {
      const c = await getCafeBySlug(CAFE_SLUG);
      if (!c) return;
      setCafe(c);
      const annoData = await getAnnouncements(c.id);
      setAnnouncements(annoData);

      const [cats, itemData] = await Promise.all([
        getMenuCategories(c.id),
        getMenuItems(c.id) // Removed availableOnly for now
      ]);
      setCategories(cats);
      setMenuItems(itemData.data);
      if (cats.length > 0) {
        setSelectedCategoryId(cats[0].id);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (profile) {
      if (!name) setName(profile.full_name || '');
      if (!email) setEmail(profile.email || '');
    }
  }, [profile, name, email]);

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Coffee className="w-6 h-6 text-primary animate-pulse" /></div>;
  }

  if (!session) {
    return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname)}`} replace />;
  }

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(p => p.item.id === item.id);
      if (existing) return prev.map(p => p.item.id === item.id ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { item, qty: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev.find(p => p.item.id === itemId);
      if (existing && existing.qty > 1) {
        return prev.map(p => p.item.id === itemId ? { ...p, qty: p.qty - 1 } : p);
      }
      return prev.filter(p => p.item.id !== itemId);
    });
  };

  const cartTotal = cart.reduce((sum, { item, qty }) => sum + ((item.price || 0) * qty), 0);

  const handleSubmit = async () => {
  if (!profile) {
    toast.error('Please sign in to make a reservation.');
    navigate(`/login?returnTo=/reservation`);
    return;
  }

  if (!cafe) return;

  setIsSubmitting(true);

  try {
    const { data, error } = await supabase.functions.invoke(
      'process-reservation',
        {
    body: {
      cafe_id: cafe.id,
      reservation_date: date,
      reservation_time: time,
      guest_count: partySize,
      guest_name: name,
      guest_email: email || null,
      guest_phone: phone || null,
      notes: notes || null,
      preorder_items:
        wantsPreorder && cart.length > 0
          ? cart.map((c) => ({
              menu_item_id: c.item.id,
              quantity: c.qty,
            }))
          : [],
    },
  }
);

    console.log('process-reservation response:', data);
    console.log('process-reservation error:', error);

    if (error) {
      throw new Error(error.message || 'Failed to create reservation.');
    }

    if (!data) {
      throw new Error('No response received from reservation service.');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    // IMPORTANT: verify the reservation exists before navigating
    if (!data.reservation_id) {
      console.error('Unexpected reservation response:', data);

      throw new Error(
        'Reservation was created, but the reservation ID was not returned.'
      );
    }

    const reservationId = data.reservation_id;

    console.log('Reservation created:', reservationId);

    toast.success('Reservation created!', {
      description: 'Check your email for the verification code.',
    });

    navigate(`/reservation/verify/${reservationId}`);
  } catch (error: any) {
    console.error('Reservation submission failed:', error);

    toast.error('Reservation failed', {
      description:
        error?.message ||
        'Something went wrong while creating your reservation.',
    });
  } finally {
    setIsSubmitting(false);
  }
};
  if (!cafe) return <div className="min-h-screen bg-background flex items-center justify-center"><Coffee className="w-6 h-6 text-primary animate-pulse" /></div>;

  return (
    <PublicLayout cafe={cafe} announcements={announcements}>
      <section className="section-pad max-w-2xl mx-auto px-4 md:px-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Book Your Visit</p>
          <h1 className="text-4xl font-heading font-semibold text-foreground mb-2">Reserve a Table</h1>
          <p className="text-muted-foreground mb-8">Plan your experience at {cafe.name}. Walk-ins are also welcome.</p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map(s => (
              <React.Fragment key={s}>
                <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                }`}>
                  {s}
                </div>
                {s < 4 && <div className={`w-12 h-px shrink-0 transition-all ${step > s ? 'bg-primary' : 'bg-border'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1 — Date / Time / Party */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Date</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} min={minDateStr} className="bg-input border-border" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-1.5"><Clock className="w-4 h-4" /> Time</Label>
                <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setTime(slot)}
                      className={`px-2 py-2 text-xs rounded-lg border transition-all ${
                        time === slot ? 'border-primary bg-primary/15 text-primary font-medium' : 'border-border text-muted-foreground hover:border-border hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground flex items-center gap-1.5"><Users className="w-4 h-4" /> Party Size</Label>
                <div className="flex flex-wrap gap-2">
                  {PARTY_SIZES.map(size => (
                    <button
                      key={size}
                      onClick={() => setPartySize(size)}
                      className={`w-12 h-12 rounded-lg border text-sm font-medium transition-all ${
                        partySize === size ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:border-border hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!date || !time}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Continue <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}

          {/* Step 2 — Pre-order selection */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="text-center space-y-4 py-8">
                <h2 className="text-2xl font-heading font-semibold text-foreground">Would you like to pre-order?</h2>
                <p className="text-muted-foreground">Skip the wait and have your drinks ready shortly after you arrive.</p>
                <div className="flex justify-center gap-4 mt-6">
                  <Button variant="outline" onClick={() => { setWantsPreorder(false); setStep(3); }} className="w-32 border-border">No, thanks</Button>
                  <Button onClick={() => setWantsPreorder(true)} className="w-32 bg-primary text-primary-foreground hover:bg-primary/90">Yes, please</Button>
                </div>
              </div>

              {wantsPreorder === true && (
                <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`px-4 py-2 shrink-0 rounded-full text-sm font-medium transition-colors ${
                          selectedCategoryId === cat.id ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4">
                    {menuItems.filter(item => item.category_id === selectedCategoryId).map(item => {
                      const qty = cart.find(c => c.item.id === item.id)?.qty || 0;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-4 glass rounded-xl border-border">
                          <div>
                            <h4 className="font-medium text-foreground">{item.name}</h4>
                            <p className="text-sm text-primary font-semibold">ETB {item.price}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {qty > 0 && (
                              <>
                                <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground">
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-4 text-center font-medium text-foreground">{qty}</span>
                              </>
                            )}
                            <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {cart.length > 0 && (
                    <div className="p-4 bg-secondary/50 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2 text-foreground font-medium">
                        <ShoppingBag className="w-4 h-4 text-primary" />
                        <span>{cart.length} items</span>
                      </div>
                      <span className="font-semibold text-primary">ETB {cartTotal}</span>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t border-border/50">
                    <Button variant="outline" onClick={() => setStep(1)} className="border-border"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
                    <Button onClick={() => setStep(3)} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                      Continue <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3 — Contact */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <div className="glass rounded-xl p-4 text-sm text-muted-foreground flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>{partySize} guests</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm text-muted-foreground">Full Name *</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Abebe Girma" className="bg-input border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm text-muted-foreground">Email Address</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="bg-input border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm text-muted-foreground">Phone Number</Label>
                <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+251 91 …" className="bg-input border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm text-muted-foreground">Special Requests</Label>
                <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Dietary needs, special occasions, etc." className="bg-input border-border" rows={3} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="border-border"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
                <Button onClick={() => setStep(4)} disabled={!name} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  Review <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4 — Review */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="glass rounded-xl p-6 space-y-3 text-sm">
                <h3 className="font-heading font-semibold text-foreground mb-4">Reservation Summary</h3>
                {[
                  ['Date', new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })],
                  ['Time', time],
                  ['Party Size', `${partySize} guest${partySize > 1 ? 's' : ''}`],
                  ['Name', name],
                  ['Email', email || '—'],
                  ['Phone', phone || '—'],
                  ['Notes', notes || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground text-right">{value}</span>
                  </div>
                ))}
              </div>

              {wantsPreorder && cart.length > 0 && (
                <div className="glass rounded-xl p-6 space-y-3 text-sm">
                  <h3 className="font-heading font-semibold text-foreground mb-4">Pre-Order Summary</h3>
                  {cart.map(c => (
                    <div key={c.item.id} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{c.qty}x {c.item.name}</span>
                      <span className="text-foreground text-right">ETB {(c.item.price || 0) * c.qty}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-border/50 flex justify-between gap-4 font-medium mt-3">
                    <span className="text-foreground">Subtotal</span>
                    <span className="text-primary text-right">ETB {cartTotal}</span>
                  </div>
                  <div className="flex justify-between gap-4 text-muted-foreground">
                    <span>Tax (15%)</span>
                    <span>ETB {(cartTotal * 0.15).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-4 font-bold text-foreground text-base mt-2 pt-2 border-t border-border/50">
                    <span>Total Estimate</span>
                    <span className="text-primary text-right">ETB {(cartTotal * 1.15).toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(3)} className="border-border"><ChevronLeft className="w-4 h-4 mr-1" /> Back</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Booking…</> : 'Confirm Reservation'}
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </section>
    </PublicLayout>
  );
}
