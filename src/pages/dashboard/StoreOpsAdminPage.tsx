import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Clock, AlertOctagon, TrendingUp, DollarSign, Coffee, Activity, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function StoreOpsAdminPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [closureEnabled, setClosureEnabled] = useState(false);
  const [waitTimes, setWaitTimes] = useState({ pickup: '15', dineIn: '25' });

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('Store operations updated successfully');
    }, 1000);
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-heading font-semibold text-foreground mb-1">Store Operations</h1>
        <p className="text-muted-foreground text-sm">Manage daily analytics and emergency settings.</p>
      </div>

      {/* Quick Analytics Module */}
      <div className="space-y-4">
        <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Quick Analytics (Today)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass rounded-xl p-6 border border-border/50">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <Badge variant="outline" className="text-green-500 border-green-500/50">+12%</Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Gross Revenue</p>
            <h3 className="text-2xl font-bold">14,250 ETB</h3>
          </div>
          
          <div className="glass rounded-xl p-6 border border-border/50">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Coffee className="w-5 h-5 text-accent" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Most Popular Item</p>
            <h3 className="text-2xl font-bold">V60 Pour Over</h3>
            <p className="text-xs text-muted-foreground mt-1">42 orders today</p>
          </div>

          <div className="glass rounded-xl p-6 border border-border/50">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Activity className="w-5 h-5 text-warning" />
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Peak Traffic</p>
            <h3 className="text-2xl font-bold">08:00 - 10:30</h3>
            <p className="text-xs text-muted-foreground mt-1">Expected busy soon</p>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Wait Times & Hours */}
        <div className="glass rounded-xl p-6 border border-border/50 space-y-6">
          <div className="flex items-center gap-2 border-b border-border/50 pb-4">
            <Clock className="w-5 h-5 text-foreground" />
            <h3 className="font-semibold text-lg">Wait Times & Hours</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pickup Est. (mins)</Label>
              <Input type="number" value={waitTimes.pickup} onChange={e => setWaitTimes({ ...waitTimes, pickup: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Dine-in Est. (mins)</Label>
              <Input type="number" value={waitTimes.dineIn} onChange={e => setWaitTimes({ ...waitTimes, dineIn: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4 pt-4">
            <Label>Operating Hours (Today)</Label>
            <div className="flex gap-4">
              <Input type="time" defaultValue="07:00" />
              <span className="flex items-center text-muted-foreground">to</span>
              <Input type="time" defaultValue="20:00" />
            </div>
          </div>
        </div>

        {/* Emergency Controls */}
        <div className="glass rounded-xl p-6 border border-border/50 space-y-6">
          <div className="flex items-center gap-2 border-b border-border/50 pb-4">
            <AlertOctagon className="w-5 h-5 text-destructive" />
            <h3 className="font-semibold text-lg text-destructive">Emergency Controls</h3>
          </div>
          
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground text-base font-semibold">Global Store Closure</Label>
                <p className="text-sm text-muted-foreground mt-1">Suspend all incoming orders and reservations.</p>
              </div>
              <Switch checked={closureEnabled} onCheckedChange={setClosureEnabled} className="data-[state=checked]:bg-destructive" />
            </div>

            {closureEnabled && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 pt-2">
                <Label>Closure Reason Message (Public)</Label>
                <Input defaultValue="Temporarily closed due to emergency. We will be back soon." />
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}
