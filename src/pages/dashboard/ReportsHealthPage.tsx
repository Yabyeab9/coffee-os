import React, { useState } from 'react';
import { FileText, Download, TrendingUp, BarChart2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export default function ReportsHealthPage() {
  const [activeTab, setActiveTab] = useState('health');

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-heading font-semibold text-foreground">Reports & Health</h1>
            <p className="text-muted-foreground mt-1">Business health scores, benchmarks, and AI reports</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="health" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-[400px] mb-8">
          <TabsTrigger value="health">Health Score</TabsTrigger>
          <TabsTrigger value="reports">AI Reports</TabsTrigger>
          <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 glass p-8 rounded-xl border border-primary/50 bg-primary/5 flex flex-col items-center justify-center text-center">
              <h2 className="text-xl font-semibold mb-6">Overall Business Health</h2>
              <div className="relative w-48 h-48 flex items-center justify-center mb-6">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted opacity-20" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="10" strokeDasharray="283" strokeDashoffset="50" className="text-primary" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-5xl font-bold text-primary">82</span>
                  <span className="text-sm font-semibold text-green-500 bg-green-500/10 px-2 py-1 rounded mt-2">Good</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Your business is performing well, but inventory management needs attention.</p>
            </div>

            <div className="md:col-span-2 glass p-6 rounded-xl border border-border">
              <h3 className="text-lg font-semibold mb-6">Component Scores</h3>
              <div className="space-y-4">
                {[
                  { name: 'Revenue', score: 85, color: 'bg-green-500' },
                  { name: 'Customer Growth', score: 90, color: 'bg-green-500' },
                  { name: 'Inventory', score: 65, color: 'bg-orange-500' },
                  { name: 'Efficiency', score: 80, color: 'bg-primary' },
                  { name: 'Profitability', score: 85, color: 'bg-green-500' },
                  { name: 'Retention', score: 75, color: 'bg-primary' },
                  { name: 'Operations', score: 88, color: 'bg-green-500' },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{item.name}</span>
                      <span className="font-semibold">{item.score}/100</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.score}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="glass p-6 rounded-xl border border-border">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-lg font-semibold">Generated Reports</h3>
               <Button variant="outline" onClick={() => {}}>Generate New Report</Button>
             </div>
             
             <div className="space-y-4">
               {[
                 { title: 'Weekly Operational Summary', date: 'Jul 2 - Jul 8, 2026', type: 'Weekly' },
                 { title: 'June Financial Performance', date: 'Jun 1 - Jun 30, 2026', type: 'Monthly' },
                 { title: 'Q2 Business Review', date: 'Apr 1 - Jun 30, 2026', type: 'Quarterly' }
               ].map((report, i) => (
                 <div key={i} className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border">
                   <div className="flex items-center gap-4">
                     <FileText className="w-8 h-8 text-primary" />
                     <div>
                       <h4 className="font-semibold">{report.title}</h4>
                       <p className="text-sm text-muted-foreground">{report.date} • {report.type}</p>
                     </div>
                   </div>
                   <Button variant="ghost" size="sm" className="gap-2" onClick={() => {}}>
                     <Download className="w-4 h-4" /> PDF
                   </Button>
                 </div>
               ))}
             </div>
          </div>
        </TabsContent>

        <TabsContent value="benchmarks" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="glass p-6 rounded-xl border border-border">
               <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                 <BarChart2 className="w-5 h-5 text-primary" /> Time Comparison
               </h3>
               <div className="space-y-6">
                 <div className="flex justify-between items-center pb-4 border-b border-border">
                   <div>
                     <p className="font-medium">This Week vs Last Week</p>
                     <p className="text-sm text-muted-foreground">Revenue</p>
                   </div>
                   <span className="text-lg font-bold text-green-500">+5.2%</span>
                 </div>
                 <div className="flex justify-between items-center pb-4 border-b border-border">
                   <div>
                     <p className="font-medium">This Month vs Last Month</p>
                     <p className="text-sm text-muted-foreground">Orders</p>
                   </div>
                   <span className="text-lg font-bold text-green-500">+12.0%</span>
                 </div>
                 <div className="flex justify-between items-center">
                   <div>
                     <p className="font-medium">This Year vs Last Year</p>
                     <p className="text-sm text-muted-foreground">Customers</p>
                   </div>
                   <span className="text-lg font-bold text-green-500">+25.4%</span>
                 </div>
               </div>
             </div>

             <div className="glass p-6 rounded-xl border border-border">
               <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                 <TrendingUp className="w-5 h-5 text-primary" /> Category Comparison
               </h3>
               <div className="space-y-6">
                 <div className="flex justify-between items-center pb-4 border-b border-border">
                   <div>
                     <p className="font-medium">Hot Drinks</p>
                     <p className="text-sm text-muted-foreground">Revenue Share</p>
                   </div>
                   <div className="text-right">
                     <p className="font-bold">65%</p>
                     <p className="text-xs text-green-500">+2% vs avg</p>
                   </div>
                 </div>
                 <div className="flex justify-between items-center pb-4 border-b border-border">
                   <div>
                     <p className="font-medium">Cold Drinks</p>
                     <p className="text-sm text-muted-foreground">Revenue Share</p>
                   </div>
                   <div className="text-right">
                     <p className="font-bold">20%</p>
                     <p className="text-xs text-red-500">-5% vs avg</p>
                   </div>
                 </div>
                 <div className="flex justify-between items-center">
                   <div>
                     <p className="font-medium">Pastries</p>
                     <p className="text-sm text-muted-foreground">Revenue Share</p>
                   </div>
                   <div className="text-right">
                     <p className="font-bold">15%</p>
                     <p className="text-xs text-green-500">+3% vs avg</p>
                   </div>
                 </div>
               </div>
             </div>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
