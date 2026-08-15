import React, { useState } from 'react';
import { Lightbulb, Users, UserCheck, Coffee, TrendingUp, ArrowDown, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function IntelligencePage() {
  const [activeTab, setActiveTab] = useState('menu');

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <Lightbulb className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground">Intelligence Center</h1>
          <p className="text-muted-foreground mt-1">Deep analysis of your menu, customers, and staff.</p>
        </div>
      </div>

      <Tabs defaultValue="menu" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-[600px] mb-8">
          <TabsTrigger value="menu">Menu Intelligence</TabsTrigger>
          <TabsTrigger value="customer">Customer Intelligence</TabsTrigger>
          <TabsTrigger value="staff">Staff Intelligence</TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-xl border border-green-500/30 bg-green-500/5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500" /> Fastest Growing</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-background flex items-center justify-center"><Coffee className="w-4 h-4" /></div>
                    <span className="font-medium">Cold Brew</span>
                  </div>
                  <span className="font-bold text-green-500">+55%</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-background flex items-center justify-center"><Coffee className="w-4 h-4" /></div>
                    <span className="font-medium">Iced Latte</span>
                  </div>
                  <span className="font-bold text-green-500">+32%</span>
                </div>
              </div>
            </div>

            <div className="glass p-6 rounded-xl border border-red-500/30 bg-red-500/5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><ArrowDown className="w-4 h-4 text-red-500" /> Underperforming</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-background flex items-center justify-center"><Coffee className="w-4 h-4" /></div>
                    <span className="font-medium">Iced Tea</span>
                  </div>
                  <span className="font-bold text-red-500">-40%</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-background flex items-center justify-center"><Coffee className="w-4 h-4" /></div>
                    <span className="font-medium">Matcha</span>
                  </div>
                  <span className="font-bold text-red-500">-15%</span>
                </div>
              </div>
            </div>

            <div className="glass p-6 rounded-xl border border-primary/30 bg-primary/5">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Most Profitable</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-background flex items-center justify-center"><Coffee className="w-4 h-4" /></div>
                    <span className="font-medium">Flat White</span>
                  </div>
                  <span className="font-bold">65% Margin</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-background flex items-center justify-center"><Coffee className="w-4 h-4" /></div>
                    <span className="font-medium">Americano</span>
                  </div>
                  <span className="font-bold">72% Margin</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="glass p-6 rounded-xl border border-border mt-8">
            <h3 className="text-lg font-semibold mb-6">AI Optimization Recommendations</h3>
            <ul className="space-y-4">
              <li className="flex gap-4 items-start p-4 bg-background/50 rounded-lg border border-border">
                <Lightbulb className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Increase Flat White Price</h4>
                  <p className="text-sm text-muted-foreground">Demand is highly inelastic for Flat Whites. An increase of 10 ETB will barely affect volume but increase profit by 12%.</p>
                </div>
              </li>
              <li className="flex gap-4 items-start p-4 bg-background/50 rounded-lg border border-border">
                <Lightbulb className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium mb-1">Bundle Offer: Cold Brew + Croissant</h4>
                  <p className="text-sm text-muted-foreground">These items are rarely bought together, but have high individual growth. A bundle could drive up AOV by 15%.</p>
                </div>
              </li>
            </ul>
          </div>
        </TabsContent>

        <TabsContent value="customer" className="space-y-6">
           <div className="glass p-12 rounded-xl border border-border text-center text-muted-foreground">
            <UserCheck className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Customer Intelligence Component</p>
            <p className="text-sm mt-2">Shows churn risks, VIPs, and retention recommendations.</p>
          </div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-6">
           <div className="glass p-12 rounded-xl border border-border text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Staff Intelligence Component</p>
            <p className="text-sm mt-2">Shows shift planning, optimal staff count, and performance analysis.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
