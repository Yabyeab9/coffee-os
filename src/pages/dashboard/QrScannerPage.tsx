import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { QrCode, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function QrScannerPage() {
  const [scannedCode, setScannedCode] = useState('');
  const queryClient = useQueryClient();

  const checkInMutation = useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.functions.invoke('process-check-in', {
        body: { qr_code: code }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.reservation;
    },
    onSuccess: (reservation) => {
      toast.success(`Check-in successful! Table assigned.`);
      setScannedCode('');
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (err: any) => toast.error(err.message)
  });

  const handleSimulateScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedCode) return;
    checkInMutation.mutate(scannedCode);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <QrCode className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-heading font-semibold text-foreground">QR Scanner</h1>
          <p className="text-muted-foreground mt-1">Scan customer QR codes to verify and check in</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass rounded-xl p-8 border border-border flex flex-col items-center justify-center text-center h-80 bg-black/5">
          {/* Mock Camera View */}
          <div className="w-full h-full border-2 border-dashed border-primary/50 rounded-lg flex items-center justify-center relative overflow-hidden bg-background/50">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="text-muted-foreground flex flex-col items-center gap-2">
              <QrCode className="w-12 h-12 mb-2 opacity-50" />
              <p>Camera Feed Active</p>
              <p className="text-xs">Position QR code within frame</p>
            </div>
            {/* Scanning line animation */}
            <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_8px_2px_rgba(var(--primary),0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
          </div>
        </div>

        <div className="glass rounded-xl p-8 border border-border flex flex-col justify-center">
          <h2 className="text-xl font-semibold mb-4">Manual Entry</h2>
          <p className="text-muted-foreground text-sm mb-6">If scanner is unavailable, enter the reservation code or QR token manually.</p>
          
          <form onSubmit={handleSimulateScan} className="space-y-4">
            <div>
              <Input 
                value={scannedCode} 
                onChange={(e) => setScannedCode(e.target.value)} 
                placeholder="Enter token..." 
                className="font-mono text-center text-lg h-12"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg" disabled={checkInMutation.isPending || !scannedCode}>
              {checkInMutation.isPending ? 'Verifying...' : 'Verify & Check In'}
            </Button>
          </form>

          {checkInMutation.isSuccess && (
            <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3 text-green-600 dark:text-green-400">
              <CheckCircle className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-semibold">Verified Successfully</p>
                <p className="text-sm">Points awarded and status updated.</p>
              </div>
            </div>
          )}
          
          {checkInMutation.isError && (
            <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-3 text-destructive">
              <XCircle className="w-6 h-6 shrink-0" />
              <div>
                <p className="font-semibold">Verification Failed</p>
                <p className="text-sm text-destructive/80">Please check the code and try again.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
