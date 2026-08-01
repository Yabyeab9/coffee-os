import React, { useState } from 'react';
import { Outlet, NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Coffee, LayoutDashboard, ShoppingBag, Calendar, Heart, User, Bell, LogOut, Menu, X, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/account', icon: LayoutDashboard },
  { name: 'Orders', path: '/account/orders', icon: ShoppingBag },
  { name: 'Reservations', path: '/account/reservations', icon: Calendar },
  { name: 'Membership Card', path: '/account/membership-card', icon: User },
  { name: 'Wallet', path: '/account/wallet', icon: ShoppingBag },
  { name: 'Digital Receipts', path: '/account/receipts', icon: LayoutDashboard },
  { name: 'Loyalty & Rewards', path: '/account/loyalty', icon: Heart },
  { name: 'Achievements', path: '/account/achievements', icon: Heart },
  { name: 'Leaderboard', path: '/account/leaderboard', icon: LayoutDashboard },
  { name: 'Subscriptions', path: '/account/subscriptions', icon: Coffee },
  { name: 'AI Barista', path: '/account/ai-recommendations', icon: Coffee },
  { name: 'Referrals', path: '/account/referrals', icon: User },
  { name: 'Streaks', path: '/account/streaks', icon: Calendar },
  { name: 'Profile', path: '/account/profile', icon: User },
  { name: 'Notifications', path: '/account/notifications', icon: Bell },
  { name: 'Settings', path: '/account/settings', icon: Settings },
];

export default function AccountLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Coffee className="w-4 h-4 text-primary" />
          </div>
          <span className="font-heading font-semibold text-foreground">Coffee OS</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-muted-foreground hover:text-foreground">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-border hidden md:block">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Coffee className="w-4 h-4 text-primary" />
            </div>
            <span className="font-heading font-semibold text-foreground">Coffee OS</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="mb-6 px-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">My Account</p>
          </div>
          {NAV_ITEMS.map((item) => {
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
                end={item.path === '/account'}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            );
          })}
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground font-semibold">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile?.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto w-full min-w-0">
        <Outlet />
      </main>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </div>
  );
}