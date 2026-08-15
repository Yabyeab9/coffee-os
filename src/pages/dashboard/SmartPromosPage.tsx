import React from 'react';
import { Zap, CloudRain, Clock, CalendarHeart, Gift, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SmartPromosPage() {
  const promos = [
    {
      title: "Happy Hour Automation",
      icon: Clock,
      description: "Automatically triggers a 20% discount when store traffic drops below 30% capacity between 2 PM and 4 PM.",
      impact: "+3,000 ETB / week",
      active: true
    },
    {
      title: "Rainy Day Boost",
      icon: CloudRain,
      description: "Offers a 15% discount on hot drinks when the local weather forecast predicts rain.",
      impact: "+2,000 ETB / rainy day",
      active: false
    },
    {
      title: "Weekend Combo",
      icon: CalendarHeart,
      description: "Buy 2 get 1 free on Saturdays to attract larger groups.",
      impact: "+5,000 ETB / weekend",
      active: false
    },
    {
      title: "VIP Reactivation",
      icon: Gift,
      description: "Sends a free drink coupon to VIPs who haven't visited in 30 days.",
      impact: "15% Reactivation Rate",
      active: true
    }
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground">Smart Promotions</h1>
          <p className="text-muted-foreground mt-1">AI-driven promotions that automatically activate based on rules.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {promos.map((promo, idx) => (
          <div key={idx} className={`glass p-6 rounded-xl border ${promo.active ? 'border-primary/50 bg-primary/5' : 'border-border'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-lg ${promo.active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <promo.icon className="w-6 h-6" />
              </div>
              <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${promo.active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {promo.active ? 'Active' : 'Inactive'}
              </div>
            </div>
            <h3 className="text-xl font-bold mb-2">{promo.title}</h3>
            <p className="text-sm text-muted-foreground mb-4 h-10">{promo.description}</p>
            
            <div className="bg-background/50 p-3 rounded border border-border mb-6">
              <span className="text-xs text-muted-foreground block mb-1">Expected Impact</span>
              <span className="font-semibold text-green-500">{promo.impact}</span>
            </div>

            <Button variant={promo.active ? "outline" : "default"} className="w-full" onClick={() => {}}>
              {promo.active ? 'Deactivate' : 'Activate Promotion'}
            </Button>
          </div>
        ))}
      </div>
      
      <div className="mt-12 glass p-8 rounded-xl border border-primary/30 flex items-center gap-6">
         <div className="p-4 rounded-full bg-primary/20 text-primary shrink-0"><Power className="w-8 h-8" /></div>
         <div>
           <h3 className="text-xl font-bold mb-1">Autopilot Mode</h3>
           <p className="text-muted-foreground">Let AI automatically turn on and off promotions based on profitability margins and real-time demand.</p>
         </div>
         <div className="ml-auto">
           <Button size="lg" onClick={() => {}}>Enable Autopilot</Button>
         </div>
      </div>
    </div>
  );
}
