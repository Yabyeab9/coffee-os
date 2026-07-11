import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Coffee, Image, Users, BookOpen, Calendar,
  Settings, ChevronLeft, ChevronRight, Sparkles, LogOut,
  BarChart2, FileText, Megaphone, Globe, Menu, X, Bell,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Menus', href: '/dashboard/menus', icon: Coffee },
      { label: 'Gallery', href: '/dashboard/gallery', icon: Image },
      { label: 'Blog', href: '/dashboard/blog', icon: BookOpen },
      { label: 'Pages', href: '/dashboard/pages', icon: FileText },
      { label: 'Testimonials', href: '/dashboard/testimonials', icon: Users },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Reservations', href: '/dashboard/reservations', icon: Calendar },
      { label: 'Announcements', href: '/dashboard/announcements', icon: Megaphone },
      { label: 'SEO', href: '/dashboard/seo', icon: Globe },
    ],
  },
  {
    title: 'AI Studio',
    items: [
      { label: 'AI Studio', href: '/dashboard/ai-studio', icon: Sparkles, badge: 'New' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Users', href: '/dashboard/users', icon: Users },
      { label: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

function NavLink({ item, collapsed, onClick }: { item: NavItem; collapsed: boolean; onClick?: () => void }) {
  const location = useLocation();
  const isActive = location.pathname === item.href ||
    (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group ${
        isActive
          ? 'bg-primary/15 text-primary font-medium'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
      }`}
    >
      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
      {!collapsed && (
        <span className="flex-1 truncate">{item.label}</span>
      )}
      {!collapsed && item.badge && (
        <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30 shrink-0">
          {item.badge}
        </Badge>
      )}
    </Link>
  );
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-sidebar-border shrink-0">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Coffee className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-heading font-semibold text-sm text-foreground tracking-tight">Coffee OS</span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-4 px-2 space-y-4 min-h-0">
        {NAV_GROUPS.map(group => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavLink key={item.href} item={item} collapsed={collapsed} onClick={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* User */}
      <div className="px-2 pb-4 border-t border-sidebar-border pt-3 shrink-0">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${collapsed ? 'justify-center' : ''}`}>
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
              {profile?.full_name?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {profile?.full_name ?? 'User'}
              </p>
              <p className="text-[10px] text-muted-foreground capitalize">{profile?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { profile } = useAuth();
  const location = useLocation();

  // Derive page title
  const currentGroup = NAV_GROUPS.flatMap(g => g.items).find(
    i => i.href === location.pathname || (i.href !== '/dashboard' && location.pathname.startsWith(i.href))
  );
  const pageTitle = currentGroup?.label ?? 'Dashboard';

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 transition-all duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-60 bg-sidebar border-sidebar-border">
          <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 shrink-0 flex items-center justify-between px-4 md:px-6 border-b border-border/50 bg-card/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Desktop collapse toggle */}
            <button
              onClick={() => setCollapsed(c => !c)}
              className="hidden lg:flex p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Toggle sidebar"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <h1 className="font-heading font-semibold text-sm text-foreground truncate">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Preview link */}
            <Link to="/" target="_blank">
              <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-xs">
                <Globe className="w-3.5 h-3.5" />
                Preview Site
              </Button>
            </Link>
            {/* Notifications */}
            <button className="relative p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Bell className="w-4 h-4" />
            </button>
            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-semibold">
                      {profile?.full_name?.[0]?.toUpperCase() ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">
                  <div>{profile?.full_name ?? 'User'}</div>
                  <div className="text-muted-foreground font-normal capitalize">{profile?.role}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/" target="_blank">View Site</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}