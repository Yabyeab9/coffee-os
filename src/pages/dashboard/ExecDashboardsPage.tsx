import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, DollarSign, Activity, PieChart, BarChart } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function ExecDashboardsPage() {
  const [activeTab, setActiveTab] = useState('owner');

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-heading font-semibold text-foreground">Executive Dashboards</h1>
            <p className="text-muted-foreground mt-1">High-level insights for different roles</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="owner" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 max-w-2xl mb-8">
          <TabsTrigger value="owner">Owner</TabsTrigger>
          <TabsTrigger value="manager">Manager</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="ai">AI System</TabsTrigger>
        </TabsList>

        <TabsContent value="owner" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass p-6 rounded-xl border border-border">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary/10 text-primary rounded-lg"><DollarSign className="w-5 h-5" /></div>
                <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">+12%</span>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
              <p className="text-2xl font-bold mt-1">450,000 <span className="text-sm font-normal text-muted-foreground">ETB</span></p>
            </div>
            
            <div className="glass p-6 rounded-xl border border-border">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Users className="w-5 h-5" /></div>
                <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">+8%</span>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Total Customers</h3>
              <p className="text-2xl font-bold mt-1">3,450</p>
            </div>

            <div className="glass p-6 rounded-xl border border-border">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-lg"><Activity className="w-5 h-5" /></div>
                <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded">Stable</span>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Retention Rate</h3>
              <p className="text-2xl font-bold mt-1">68%</p>
            </div>

            <div className="glass p-6 rounded-xl border border-primary/30 bg-primary/5">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-primary text-primary-foreground rounded-lg"><PieChart className="w-5 h-5" /></div>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground">Business Health</h3>
              <p className="text-2xl font-bold mt-1">82 <span className="text-sm font-normal text-primary">/ 100</span></p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
             <div className="glass p-6 rounded-xl border border-border flex flex-col justify-center items-center text-muted-foreground">
               <BarChart className="w-12 h-12 mb-4 opacity-20" />
               <p>Revenue Trends Chart</p>
             </div>
             <div className="glass p-6 rounded-xl border border-border flex flex-col justify-center items-center text-muted-foreground">
               <PieChart className="w-12 h-12 mb-4 opacity-20" />
               <p>Customer Growth Chart</p>
             </div>
          </div>
        </TabsContent>

        <TabsContent value="manager" className="space-y-6">
          <div className="glass p-12 rounded-xl border border-border text-center text-muted-foreground">
            <LayoutDashboard className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Manager Dashboard Component</p>
            <p className="text-sm mt-2">Shows real-time order queue, staff on duty, and daily operations.</p>
          </div>
        </TabsContent>

        <TabsContent value="finance" className="space-y-6">
          <div className="glass p-12 rounded-xl border border-border text-center text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Finance Dashboard Component</p>
            <p className="text-sm mt-2">Shows margins, COGS, subscription revenue, and payment methods.</p>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-6">
          <div className="glass p-12 rounded-xl border border-border text-center text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>AI System Health Component</p>
            <p className="text-sm mt-2">Shows AI tokens used, recommendation conversion rates, and automation stats.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}