import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Trophy, Target, Star, Gift, ShoppingBag, Calendar,
  Sparkles, CheckCircle2, AlertCircle, Info, Flame,
  CheckCheck, Loader2, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  read_at: string | null;
  priority: string;
  action_url: string | null;
  metadata: any;
  created_at: string;
}

function getIcon(type: string) {
  const map: Record<string, React.ReactNode> = {
    challenge_completed: <Trophy className="w-4 h-4 text-yellow-500" />,
    challenge_progress: <Target className="w-4 h-4 text-blue-500" />,
    challenge_started: <Flame className="w-4 h-4 text-orange-500" />,
    achievement_unlocked: <Star className="w-4 h-4 text-primary" />,
    reward_redeemed: <Gift className="w-4 h-4 text-emerald-500" />,
    reward_earned: <Gift className="w-4 h-4 text-emerald-500" />,
    loyalty_points_earned: <Sparkles className="w-4 h-4 text-primary" />,
    loyalty_milestone: <Star className="w-4 h-4 text-yellow-500" />,
    order_confirmed: <ShoppingBag className="w-4 h-4 text-blue-500" />,
    order_ready: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
    reservation_confirmed: <Calendar className="w-4 h-4 text-indigo-500" />,
    reservation_reminder: <AlertCircle className="w-4 h-4 text-warning" />,
  };
  return map[type] ?? <Info className="w-4 h-4 text-muted-foreground" />;
}

function priorityBorder(p: string) {
  if (p === 'critical') return 'border-l-4 border-l-destructive';
  if (p === 'high') return 'border-l-4 border-l-primary';
  if (p === 'normal') return 'border-l-4 border-l-border';
  return 'border-l-4 border-l-transparent';
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(60);
      setNotifications(data ?? []);
    } catch (_err) {
      // non-critical — list stays empty; user can pull-to-refresh
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel('notifications_realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        const n = payload.new as Notification;
        setNotifications(prev => [n, ...prev]);
        if (n.priority === 'high' || n.priority === 'critical') {
          toast(n.title, {
            description: n.message,
            action: n.action_url ? { label: 'View', onClick: () => navigate(n.action_url!) } : undefined,
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.id, navigate]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true, read_at: new Date().toISOString() } : n));
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      const unread = notifications.filter(n => !n.read).map(n => n.id);
      if (unread.length > 0) {
        const { error } = await supabase
          .from('notifications')
          .update({ read: true, read_at: new Date().toISOString() })
          .in('id', unread);
        if (error) throw error;
        setNotifications(prev => prev.map(n => ({ ...n, read: true, read_at: new Date().toISOString() })));
        toast.success('All notifications marked as read');
      }
    } catch (_err) {
      toast.error('Failed to mark notifications as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const displayed = tab === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-heading font-semibold">Notifications</h1>
            <p className="text-sm text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} disabled={markingAll} className="text-xs gap-1.5">
            {markingAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
            Mark all read
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'unread')}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="all">All {notifications.length > 0 && <Badge variant="secondary" className="ml-1.5 h-4 text-[10px] px-1">{notifications.length}</Badge>}</TabsTrigger>
          <TabsTrigger value="unread">Unread {unreadCount > 0 && <Badge className="ml-1.5 h-4 text-[10px] px-1">{unreadCount}</Badge>}</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : displayed.length === 0 ? (
        <div className="glass rounded-xl p-12 text-center text-muted-foreground border border-border">
          <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">{tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
          <p className="text-sm mt-1 opacity-60">Activity from orders, challenges, and rewards will appear here.</p>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          <div className="space-y-2">
            {displayed.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`glass rounded-xl p-4 border border-border ${priorityBorder(n.priority)} ${n.read ? 'opacity-60' : 'bg-card shadow-sm'} cursor-pointer transition-all hover:opacity-100`}
                onClick={() => { if (!n.read) markRead(n.id); }}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.read ? 'bg-secondary' : 'bg-primary/10'}`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`font-medium text-sm leading-snug ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>{n.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary" />}
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                    {n.action_url && (
                      <Button variant="link" size="sm" className="h-6 px-0 text-xs text-primary mt-1 gap-1"
                        onClick={(e) => { e.stopPropagation(); navigate(n.action_url!); }}>
                        View <ArrowRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}