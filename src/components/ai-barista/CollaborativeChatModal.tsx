import React, { useEffect, useState } from 'react';
import {
  Users, Link2, Check, Loader2, Copy, LogIn, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  createCollaboration,
  joinCollaboration,
  listCollaborations,
  type CollaborationRow,
} from '@/lib/ai-barista-client';

interface Props {
  open: boolean;
  onClose: () => void;
  cafeId: string | null;
  /** Called once a collaboration is joined/created → opens the shared room. */
  onOpenRoom: (collaboration: CollaborationRow, myRole: 'host' | 'guest') => void;
}

/**
 * Friend invitations for shared barista chats.
 * Create a room → share the code/link → your friend joins
 * with the code → both land in the same live conversation.
 */
export default function CollaborativeChatModal({
  open,
  onClose,
  cafeId,
  onOpenRoom,
}: Props) {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'invite' | 'join'>('invite');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [myRooms, setMyRooms] = useState<CollaborationRow[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const refreshRooms = async () => {
    if (!profile?.id) return;
    setRoomsLoading(true);
    try {
      setMyRooms(await listCollaborations(profile.id));
    } catch {
      // list is a convenience — failing silently is acceptable
    } finally {
      setRoomsLoading(false);
    }
  };

  useEffect(() => {
    if (open) void refreshRooms();
  }, [open, profile?.id]);

  const handleCreate = async () => {
    if (!profile?.id) return;
    setCreating(true);
    try {
      const room = await createCollaboration(cafeId, profile.id);
      if (room) {
        setActiveCode(room.session_code);
        toast.success('Tasting room created — share the code with your friend.');
        await refreshRooms();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!profile?.id || !joinCode.trim()) return;
    setJoining(true);
    try {
      const room = await joinCollaboration(joinCode, profile.id);
      if (room) {
        onOpenRoom(room, room.host_id === profile.id ? 'host' : 'guest');
        onClose();
      }
    } finally {
      setJoining(false);
    }
  };

  const inviteLink = activeCode
    ? `${window.location.origin}/account/ai-recommendations?collab=${activeCode}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <DialogTitle className="text-base font-semibold">
              Tasting Room
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Invite a friend into a shared chat with your AI Barista — compare
            palates, plan a table order, or settle a roast together.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1.5 p-1 rounded-lg bg-muted/40 border border-border/40">
          {(['invite', 'join'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                tab === t
                  ? 'bg-card border border-border shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'invite' ? 'Invite a friend' : 'Join with code'}
            </button>
          ))}
        </div>

        {tab === 'invite' ? (
          <div className="space-y-3">
            {!activeCode ? (
              <>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Create a tasting room and share the 6-character code with your
                  friend. The room stays open for 24 hours.
                </p>
                <Button
                  className="w-full h-9 text-xs gap-1.5"
                  onClick={() => void handleCreate()}
                  disabled={creating}
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Users className="w-3.5 h-3.5" />}
                  Create tasting room
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col items-center gap-2 py-2">
                  <Check className="w-6 h-6 text-primary" />
                  <p className="text-xs text-muted-foreground">Room code — share it with your friend</p>
                  <p className="text-3xl font-mono font-bold tracking-[0.3em] text-foreground">
                    {activeCode}
                  </p>
                  {inviteLink && (
                    <button
                      onClick={() => {
                        void navigator.clipboard.writeText(inviteLink).then(
                          () => toast.success('Invite link copied'),
                          () => toast.error('Could not copy link'),
                        );
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:border-foreground/30 transition-colors"
                    >
                      <Link2 className="w-3.5 h-3.5" /> Copy invite link
                    </button>
                  )}
                  <p className="text-[10px] text-muted-foreground">Expires in 24 hours</p>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setActiveCode(null)}>
                  Create another room
                </Button>
              </div>
            )}
          </div>
        ) : (
          <form
            className="space-y-3"
            onSubmit={e => {
              e.preventDefault();
              void handleJoin();
            }}
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              Your friend shares a 6-character code with you — enter it to join
              their tasting room.
            </p>
            <div className="flex gap-2">
              <Input
                value={joinCode}
                onChange={e =>
                  setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                }
                placeholder="e.g. K7M2XP"
                maxLength={6}
                className="font-mono tracking-widest text-center text-sm h-11"
              />
              <Button type="submit" disabled={joining || !joinCode.trim()} className="h-11 px-4 text-xs gap-1.5">
                {joining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogIn className="w-3.5 h-3.5" />}
                Join
              </Button>
            </div>
          </form>
        )}

        {/* Existing rooms */}
        {myRooms.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Your tasting rooms
            </p>
            {myRooms.map(room => (
              <button
                key={room.id}
                onClick={() => {
                  if (!profile?.id) return;
                  onOpenRoom(room, room.host_id === profile.id ? 'host' : 'guest');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border/60 hover:border-foreground/25 hover:bg-muted/20 transition-colors"
              >
                <span className="text-left min-w-0">
                  <span className="block text-xs font-medium text-foreground">
                    Room {room.session_code}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {room.status === 'active' ? 'Guest joined' : 'Waiting for guest'} ·{' '}
                    {new Date(room.expires_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </span>
                {room.status === 'active' ? (
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
