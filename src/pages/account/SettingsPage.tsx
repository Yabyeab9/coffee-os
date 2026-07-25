import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { profile } = useAuth();
  const [prefs, setPrefs] = useState({ 
    email_notifications: true, 
    sms_notifications: false,
    reservation_notifications: true,
    order_notifications: true,
    marketing_notifications: false
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPreferences() {
      if (!profile?.id) return;
      try {
        const { data, error } = await supabase
          .from('customer_preferences')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();
          
        if (error) throw error;
        
        if (data) {
          setPrefs({
            email_notifications: data.email_notifications ?? true,
            sms_notifications: data.sms_notifications ?? false,
            reservation_notifications: data.reservation_notifications ?? true,
            order_notifications: data.order_notifications ?? true,
            marketing_notifications: data.marketing_notifications ?? false
          });
        }
      } catch (err: any) {
        console.error('Error loading preferences:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPreferences();
  }, [profile?.id]);

  const handleSave = async () => {
    if (!profile?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('customer_preferences')
        .upsert({
          user_id: profile.id,
          ...prefs,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
        
      if (error) throw error;
      toast.success('Settings saved successfully');
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-heading font-semibold text-foreground">Settings</h1>
        <div className="glass p-6 rounded-xl border border-border h-48 flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

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
                <p className="text-sm text-muted-foreground">Receive updates and receipts via email.</p>
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
                <p className="text-sm text-muted-foreground">Get text messages for important updates.</p>
              </div>
              <input 
                type="checkbox" 
                checked={prefs.sms_notifications} 
                onChange={e => setPrefs(p => ({...p, sms_notifications: e.target.checked}))}
                className="w-5 h-5 accent-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Reservation Notifications</Label>
                <p className="text-sm text-muted-foreground">Reminders and updates for your table reservations.</p>
              </div>
              <input 
                type="checkbox" 
                checked={prefs.reservation_notifications} 
                onChange={e => setPrefs(p => ({...p, reservation_notifications: e.target.checked}))}
                className="w-5 h-5 accent-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Order Notifications</Label>
                <p className="text-sm text-muted-foreground">Status updates for your coffee and food orders.</p>
              </div>
              <input 
                type="checkbox" 
                checked={prefs.order_notifications} 
                onChange={e => setPrefs(p => ({...p, order_notifications: e.target.checked}))}
                className="w-5 h-5 accent-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Marketing & Promotions</Label>
                <p className="text-sm text-muted-foreground">Special offers, new menu items, and event invitations.</p>
              </div>
              <input 
                type="checkbox" 
                checked={prefs.marketing_notifications} 
                onChange={e => setPrefs(p => ({...p, marketing_notifications: e.target.checked}))}
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
