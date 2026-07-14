import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [prefs, setPrefs] = useState({ email_notifications: true, sms_notifications: false });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // A mock fetch or a real fetch if there's a preferences table.
    // For now we'll just show local state since preferences table might not exist
  }, [profile?.id]);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate save
    await new Promise(r => setTimeout(r, 600));
    toast.success('Settings saved successfully');
    setIsSaving(false);
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-semibold text-foreground">Settings</h1>
      
      <div className="glass p-6 rounded-xl border border-border space-y-6">
        <div>
          <h2 className="text-lg font-medium mb-4">Notifications</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive order updates and receipts via email.</p>
              </div>
              <input 
                type="checkbox" 
                checked={prefs.email_notifications} 
                onChange={e => setPrefs(p => ({...p, email_notifications: e.target.checked}))}
                className="w-5 h-5 accent-primary"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Get text messages when your order is ready.</p>
              </div>
              <input 
                type="checkbox" 
                checked={prefs.sms_notifications} 
                onChange={e => setPrefs(p => ({...p, sms_notifications: e.target.checked}))}
                className="w-5 h-5 accent-primary"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
