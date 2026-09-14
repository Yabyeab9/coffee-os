import React, { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom';
import {
  Coffee, LayoutDashboard, ShoppingBag, Calendar, Heart, User,
  Bell, LogOut, Menu, X, Settings, Flame, Trophy, Radio,
  Sparkles, CreditCard, Wallet, BookOpen, Leaf, Star,
  GitBranch, FlaskConical, MessageCircle, Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ── Nav groups ─────────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'My Activity',
    items: [
      { name: 'Dashboard',       path: '/account',                     icon: LayoutDashboard, exact: true },
      { name: 'Orders',          path: '/account/orders',              icon: ShoppingBag },
      { name: 'Reservations',    path: '/account/reservations',        icon: Calendar },
      { name: 'Loyalty',         path: '/account/loyalty',             icon: Heart },
      { name: 'Wallet',          path: '/account/wallet',              icon: Wallet },
      { name: 'Receipts',        path: '/account/receipts',            icon: BookOpen },
    ],
  },
  {
    label: 'Coffee World',
    items: [
      { name: 'AI Barista',      path: '/account/ai-recommendations',  icon: Sparkles },
      { name: 'Mood Pulse',      path: '/account/mood-pulse',          icon: Radio },
      { name: 'Coffee Journey',  path: '/account/coffee-journey',      icon: Flame },
      { name: 'Coffee Passport', path: '/account/coffee-passport',     icon: GitBranch },
      { name: 'Bean Explorer',   path: '/account/bean-explorer',       icon: Leaf },
      { name: 'Seasonal',        path: '/account/seasonal-discoveries',icon: FlaskConical },
      { name: 'Try Something New', path: '/account/try-something-new', icon: Star },
      { name: 'Challenges',      path: '/account/coffee-challenges',   icon: Trophy },
    ],
  },
  {
    label: 'Community',
    items: [
      { name: 'Achievements',    path: '/account/achievements',        icon: Trophy },
      { name: 'Leaderboard',     path: '/account/leaderboard',         icon: Users },
      { name: 'Referrals',       path: '/account/referrals',           icon: MessageCircle },
      { name: 'Streaks',         path: '/account/streaks',             icon: Flame },
    ],
  },
  {
    label: 'Account',
    items: [
      { name: 'Membership Card', path: '/account/membership-card',     icon: CreditCard },
      { name: 'Subscriptions',   path: '/account/subscriptions',       icon: Coffee },
      { name: 'Profile',         path: '/account/profile',             icon: User },
      { name: 'Notifications',   path: '/account/notifications',       icon: Bell },
      { name: 'Settings',        path: '/account/settings',            icon: Settings },
    ],
  },
];

export default function AccountLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* ── Mobile header ───────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-30">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Coffee className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-heading font-semibold text-foreground text-sm">Coffee OS</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-muted-foreground hover:text-foreground">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-sidebar border-r border-sidebar-border flex flex-col
        transition-transform duration-300
        md:relative md:translate-x-0 md:z-auto
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo — desktop only */}
        <div className="p-5 border-b border-sidebar-border hidden md:block shrink-0">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Coffee className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-heading font-semibold text-sidebar-foreground text-sm">Coffee OS</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4">
          {NAV_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-2 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.exact}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.name}</span>
                    {/* Live indicator on Mood Pulse */}
                    {item.name === 'Mood Pulse' && (
                      <span className="ml-auto flex items-center">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                        </span>
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Profile footer */}
        <div className="p-4 border-t border-sidebar-border shrink-0">
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold text-sm shrink-0">
              {profile?.full_name?.charAt(0) ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{profile?.full_name ?? 'My Account'}</p>
              <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  );
}