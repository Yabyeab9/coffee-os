import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', profile.id);
      if (error) throw error;
      toast.success('Profile updated successfully');
      await refreshProfile();
    } catch (err: any) {
      toast.error('Failed to update profile', { description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">My Profile</h1>
      
      <div className="glass p-6 rounded-xl border border-border">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={profile?.email || ''} readOnly className="bg-muted text-muted-foreground" disabled />
          </div>
          
          <div className="space-y-1.5">
            <Label>Full Name</Label>
            <Input 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              className="bg-background"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Input value={profile?.role || 'Customer'} readOnly className="bg-muted text-muted-foreground capitalize" disabled />
          </div>
          
          <Button type="submit" disabled={isSaving} className="mt-4">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </div>
    </div>
  );
}