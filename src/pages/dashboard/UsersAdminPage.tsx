import React, { useEffect, useState, useCallback } from 'react';
import { Users, UserPlus, Shield, Mail, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { User, UserRole } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

const ROLE_STYLES: Record<UserRole, string> = {
  admin: 'bg-destructive/15 text-destructive border-destructive/30',
  owner: 'bg-primary/15 text-primary border-primary/30',
  manager: 'bg-accent/15 text-accent border-accent/30',
  editor: 'bg-secondary text-muted-foreground border-border',
  customer: 'bg-muted text-muted-foreground border-border',
};

export default function UsersAdminPage() {
  const { profile, isAdmin } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('editor');
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('users').select('*').order('created_at', { ascending: false });
      if (!isAdmin && profile?.cafe_id) {
        query = query.eq('cafe_id', profile.cafe_id);
      }
      const { data, error } = await query.limit(50);
      if (error) throw error;
      setUsers(Array.isArray(data) ? data : []);
    } catch (_err) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, profile]);

  useEffect(() => { load(); }, [load]);

  const handleToggleActive = async (user: User) => {
    const { error } = await supabase.from('users').update({ is_active: !user.is_active }).eq('id', user.id);
    if (error) { toast.error('Failed to update user'); return; }
    toast.success(user.is_active ? 'User deactivated' : 'User activated');
    load();
  };

  const handleChangeRole = async (userId: string, role: UserRole) => {
    const { error } = await supabase.from('users').update({ role }).eq('id', userId);
    if (error) { toast.error('Failed to update role'); return; }
    toast.success('Role updated');
    load();
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    // In a real deployment, this would trigger a Supabase invite email
    // For now we create the user record
    const { error } = await supabase.from('users').insert({
      email: inviteEmail,
      role: inviteRole,
      cafe_id: profile?.cafe_id ?? null,
      is_active: true,
    });
    setInviting(false);
    if (error) { toast.error('Failed to invite user', { description: error.message }); return; }
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteDialog(false);
    setInviteEmail('');
    load();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-semibold text-foreground">Team Members</h1>
          <p className="text-sm text-muted-foreground">{users.filter(u => u.is_active).length} active members</p>
        </div>
        <Button size="sm" onClick={() => setInviteDialog(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <UserPlus className="w-4 h-4 mr-1.5" /> Invite Member
        </Button>
      </div>

      {/* Role legend */}
      <div className="glass rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {[
          { role: 'admin', desc: 'Full platform access' },
          { role: 'owner', desc: 'Café owner, all features' },
          { role: 'manager', desc: 'Operations, no billing' },
          { role: 'editor', desc: 'Content only' },
        ].map(r => (
          <div key={r.role} className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-primary shrink-0" />
            <div>
              <Badge className={`text-[10px] px-1.5 py-0 capitalize mb-0.5 ${ROLE_STYLES[r.role as UserRole]}`}>{r.role}</Badge>
              <p className="text-muted-foreground text-[10px]">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <div key={user.id} className={`glass rounded-xl p-4 flex items-center gap-4 ${!user.is_active ? 'opacity-50' : ''}`}>
              <Avatar className="w-9 h-9 shrink-0">
                <AvatarFallback className="bg-primary/15 text-primary text-sm font-semibold">
                  {(user.full_name?.[0] ?? user.email[0]).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{user.full_name ?? '—'}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {user.id !== profile?.id ? (
                  <Select value={user.role} onValueChange={v => handleChangeRole(user.id, v as UserRole)}>
                    <SelectTrigger className="h-7 text-xs w-28 bg-input border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                      {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={`text-[10px] px-2 py-0.5 capitalize ${ROLE_STYLES[user.role]}`}>{user.role}</Badge>
                )}
                {user.id !== profile?.id && (
                  <button
                    onClick={() => handleToggleActive(user)}
                    className={`text-xs px-2 py-1 rounded-md transition-colors ${user.is_active ? 'text-warning hover:bg-warning/10' : 'text-primary hover:bg-primary/10'}`}
                    title={user.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {user.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={inviteDialog} onOpenChange={setInviteDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Email Address *</Label>
              <Input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@example.com" className="bg-input border-border" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-muted-foreground">Role</Label>
              <Select value={inviteRole} onValueChange={v => setInviteRole(v as UserRole)}>
                <SelectTrigger className="bg-input border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor — Content only</SelectItem>
                  <SelectItem value="manager">Manager — Operations</SelectItem>
                  <SelectItem value="owner">Owner — Full access</SelectItem>
                  {isAdmin && <SelectItem value="admin">Admin — Platform</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteDialog(false)} className="border-border">Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4 mr-1.5" />Send Invite</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}