import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Zap, TrendingUp, Package, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const mockSalesData = [
  { time: '08:00', actual: 1200, predicted: 1300 },
  { time: '10:00', actual: 3500, predicted: 3400 },
  { time: '12:00', actual: 4800, predicted: 5000 },
  { time: '14:00', actual: null, predicted: 2800 },
  { time: '16:00', actual: null, predicted: 4200 },
  { time: '18:00', actual: null, predicted: 3900 },
  { time: '20:00', actual: null, predicted: 1500 },
];

export default function ForecastsPage() {
  const [activeTab, setActiveTab] = useState('sales');

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <LineChart className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-heading font-semibold text-foreground">Forecasting</h1>
            <p className="text-muted-foreground mt-1">Predictive analytics for sales and inventory</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="sales" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="sales">Sales Forecast</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Forecast</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sales" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass p-6 rounded-xl border border-primary/20 flex flex-col items-center justify-center text-center">
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Today's Prediction</h3>
              <p className="text-4xl font-bold text-primary">16,500 <span className="text-lg text-muted-foreground">ETB</span></p>
              <div className="flex items-center gap-1 mt-2 text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                <TrendingUp className="w-3 h-3" /> +10% vs avg Thursday
              </div>
            </div>
            
            <div className="glass p-6 rounded-xl border border-border flex flex-col items-center justify-center text-center">
              <h3 className="text-sm font-semibold text-muted-foreground mb-1">Tomorrow's Prediction</h3>
              <p className="text-3xl font-bold text-foreground">18,200 <span className="text-lg text-muted-foreground">ETB</span></p>
              <p className="text-xs text-muted-foreground mt-2">Sunny weather expected (+5%)</p>
            </div>
            
            <div className="glass p-6 rounded-xl border border-border flex flex-col justify-center">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Confidence Score
              </h3>
              <div className="flex items-end gap-2 mb-2">
                <span className="text-3xl font-bold text-foreground">85%</span>
                <span className="text-sm text-muted-foreground mb-1">High</span>
              </div>
              <p className="text-xs text-muted-foreground">Based on 6 months of historical data, local weather, and holiday calendar.</p>
            </div>
          </div>

          <div className="glass p-6 rounded-xl border border-border">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">Today's Demand Curve</h3>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary/20 border border-primary"></div> Actual</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary"></div> Predicted</div>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockSalesData}>
                  <defs>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area type="monotone" dataKey="predicted" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorPredicted)" />
                  <Area type="monotone" dataKey="actual" stroke="hsl(var(--foreground))" strokeWidth={2} fill="none" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="inventory" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass p-4 rounded-xl border border-destructive/30 bg-destructive/5 relative overflow-hidden">
              <div className="w-1 bg-destructive absolute left-0 top-0 bottom-0"></div>
              <h4 className="font-medium">Whole Milk</h4>
              <p className="text-2xl font-bold mt-1 text-destructive">2 Days</p>
              <p className="text-xs text-muted-foreground mt-1">Remaining stock</p>
            </div>
            <div className="glass p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 relative overflow-hidden">
              <div className="w-1 bg-orange-500 absolute left-0 top-0 bottom-0"></div>
              <h4 className="font-medium">Vanilla Syrup</h4>
              <p className="text-2xl font-bold mt-1 text-orange-500">4 Days</p>
              <p className="text-xs text-muted-foreground mt-1">Remaining stock</p>
            </div>
            <div className="glass p-4 rounded-xl border border-border relative overflow-hidden">
              <div className="w-1 bg-green-500 absolute left-0 top-0 bottom-0"></div>
              <h4 className="font-medium">House Blend Beans</h4>
              <p className="text-2xl font-bold mt-1">12 Days</p>
              <p className="text-xs text-muted-foreground mt-1">Remaining stock</p>
            </div>
            <div className="glass p-4 rounded-xl border border-border relative overflow-hidden">
              <div className="w-1 bg-green-500 absolute left-0 top-0 bottom-0"></div>
              <h4 className="font-medium">Paper Cups (8oz)</h4>
              <p className="text-2xl font-bold mt-1">15 Days</p>
              <p className="text-xs text-muted-foreground mt-1">Remaining stock</p>
            </div>
          </div>
          
          <h3 className="text-xl font-semibold mt-8 mb-4">Automatic Reorder Suggestions</h3>
          <div className="space-y-4">
            {[
              { item: 'Whole Milk', qty: '50 Liters', supplier: 'Addis Dairy', urgency: 'Critical', cost: '2,500 ETB' },
              { item: 'Vanilla Syrup', qty: '12 Bottles', supplier: 'Global Imports', urgency: 'High', cost: '3,600 ETB' },
              { item: 'Croissants', qty: '40 Pieces', supplier: 'French Bakery', urgency: 'Daily', cost: '1,200 ETB' }
            ].map((order, i) => (
              <div key={i} className="glass p-4 rounded-xl border border-border flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{order.item}</h4>
                    <p className="text-sm text-muted-foreground">Supplier: {order.supplier}</p>
                  </div>
                </div>
                <div className="min-w-[100px]">
                  <p className="text-sm text-muted-foreground">Suggested Qty</p>
                  <p className="font-semibold">{order.qty}</p>
                </div>
                <div className="min-w-[100px]">
                  <p className="text-sm text-muted-foreground">Est. Cost</p>
                  <p className="font-semibold">{order.cost}</p>
                </div>
                <Button onClick={() => {}}>Approve Order <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
