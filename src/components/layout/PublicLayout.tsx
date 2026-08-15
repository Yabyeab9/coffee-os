import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X, Coffee, Instagram, Facebook, MapPin, Phone, Mail, Clock, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getRedirectPathByRole } from '@/lib/auth-helpers';
import type { Cafe, Announcement } from '@/types/database';

interface PublicLayoutProps {
  cafe?: Cafe | null;
  announcements?: Announcement[];
  children: React.ReactNode;
}

const NAV_LINKS = [
  { label: 'Menu', href: '/menu' },
  { label: 'Gallery', href: '/gallery' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '/contact' },
];


const FALLBACK_CAFE = null;

export function PublicLayout({ cafe: cafeProp, announcements = [], children }: PublicLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { session, profile, role } = useAuth();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  if (!cafeProp) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Coffee className="w-8 h-8 text-primary animate-pulse" />
      </div>
    );
  }
  
  const cafe = cafeProp as Cafe;
  const activeAnnouncement = announcements.find(a => a.is_active);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Announcement Banner */}
      {activeAnnouncement && (
        <div className={`py-2 px-4 text-center text-sm font-medium ${
          activeAnnouncement.type === 'promo' ? 'bg-primary/20 text-primary border-b border-primary/20' :
          'bg-info/10 text-info border-b border-info/20'
        }`}>
          <span className="mr-2">{activeAnnouncement.title}</span>
          {activeAnnouncement.content && (
            <span className="text-muted-foreground hidden md:inline">{activeAnnouncement.content}</span>
          )}
        </div>
      )}

      {/* Navigation */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'glass-nav shadow-card' : 'bg-transparent'}`}>
        <nav className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            {cafe.logo_url ? (
              <img src={cafe.logo_url} alt={cafe.name} className="h-8 w-auto" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Coffee className="w-4 h-4 text-primary" />
              </div>
            )}
            <span className="font-heading font-semibold text-foreground tracking-tight">{cafe.name}</span>
          </Link>

          {/* Desktop Nav */}
          <ul className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    location.pathname === link.href
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* CTA + Mobile toggle */}
          <div className="flex items-center gap-2">
            {session ? (
              <Link to={getRedirectPathByRole(role)} className="hidden md:flex items-center gap-2 text-sm text-foreground hover:bg-secondary px-3 py-2 rounded-md transition-colors">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                  {profile?.full_name?.charAt(0).toUpperCase() || <UserIcon className="w-3 h-3" />}
                </div>
                <span className="max-w-[100px] truncate">{profile?.full_name || 'My Account'}</span>
              </Link>
            ) : (
              <Link to="/login" className="hidden md:block">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-secondary mr-2">
                  Log in
                </Button>
              </Link>
            )}
            <Link to="/reservation" className="hidden md:block">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
                Reserve a Table
              </Button>
            </Link>
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden glass-nav border-t border-border/40"
            >
              <div className="px-4 py-4 flex flex-col gap-1">
                {NAV_LINKS.map(link => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className={`px-3 py-3 text-sm rounded-md transition-colors ${
                      location.pathname === link.href
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                
                {session ? (
                  <Link to={getRedirectPathByRole(role)} className="px-3 py-3 text-sm text-foreground hover:bg-secondary rounded-md transition-colors flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-primary" />
                    My Account
                  </Link>
                ) : (
                  <Link to="/login" className="px-3 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors">
                    Log in
                  </Link>
                )}
                
                <Link to="/reservation" className="mt-2">
                  <Button className="w-full bg-primary text-primary-foreground">Reserve a Table</Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Coffee className="w-4 h-4 text-primary" />
                </div>
                <span className="font-heading font-semibold text-foreground">{cafe.name}</span>
              </div>
              {cafe.tagline && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{cafe.tagline}</p>
              )}
              <div className="flex gap-3">
                {cafe.instagram_url && (
                  <a href={cafe.instagram_url} target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors" aria-label="Instagram">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {cafe.facebook_url && (
                  <a href={cafe.facebook_url} target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors" aria-label="Facebook">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Nav Links */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Explore</p>
              <ul className="space-y-2">
                {NAV_LINKS.map(link => (
                  <li key={link.href}>
                    <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Contact</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                {cafe.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary/60" />
                    <span>{cafe.address}{cafe.city ? `, ${cafe.city}` : ''}</span>
                  </div>
                )}
                {cafe.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 shrink-0 text-primary/60" />
                    <a href={`tel:${cafe.phone}`} className="hover:text-foreground transition-colors">{cafe.phone}</a>
                  </div>
                )}
                {cafe.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 shrink-0 text-primary/60" />
                    <a href={`mailto:${cafe.email}`} className="hover:text-foreground transition-colors">{cafe.email}</a>
                  </div>
                )}
              </div>
            </div>

            {/* Hours placeholder */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Hours</span>
              </p>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between gap-4">
                  <span>Mon – Fri</span><span>7:00 AM – 10:00 PM</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Sat</span><span>7:00 AM – 11:00 PM</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Sun</span><span>8:00 AM – 10:00 PM</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} {cafe.name}. All rights reserved.</span>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <span className="text-border">·</span>
              <span>Powered by <span className="text-primary">Coffee OS</span></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
