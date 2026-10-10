import React, { useState, useMemo } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Dna, ArrowRight, CheckCircle2 } from 'lucide-react';
import FlavorRadarWidget, { FlavorProfile } from './FlavorRadarWidget';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  flavor_profile?: FlavorProfile | null;
  caffeine_mg?: number;
  description?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPalate: Partial<FlavorProfile>;
  menuItems: MenuItem[];
  onSelectDrink?: (drink: MenuItem) => void;
}

export default function SmartPalateRadarModal({
  open,
  onOpenChange,
  userPalate,
  menuItems,
  onSelectDrink,
}: Props) {
  const [selectedDrinkId, setSelectedDrinkId] = useState<string | null>(
    menuItems[0]?.id ?? null
  );

  const selectedDrink = useMemo(() => {
    return menuItems.find(m => m.id === selectedDrinkId) ?? menuItems[0] ?? null;
  }, [menuItems, selectedDrinkId]);

  // Compute 5-axis compatibility score
  const compatibility = useMemo(() => {
    if (!selectedDrink?.flavor_profile) return { score: 85, analysis: 'Balanced signature pairing' };
    const dp = selectedDrink.flavor_profile;
    const axes: (keyof FlavorProfile)[] = ['acidity', 'body', 'sweetness', 'bitterness', 'floral_notes'];
    let totalDiff = 0;
    axes.forEach(axis => {
      const u = userPalate[axis] ?? 5;
      const d = dp[axis] ?? 5;
      totalDiff += Math.abs(u - d);
    });
    // max possible diff is 5 * 10 = 50. Compatibility % = 100 - (diff / 50 * 100)
    const score = Math.max(50, Math.min(99, Math.round(100 - (totalDiff / 50) * 80)));
    
    let analysis = 'Harmonious match across body and sweetness';
    if (dp.acidity > 7 && (userPalate.acidity ?? 5) > 6) {
      analysis = 'Bright, high-acidity Ethiopian terroir matching your vibrant palate preference';
    } else if (dp.body > 7 && (userPalate.body ?? 5) > 6) {
      analysis = 'Full velvety body and rich mouthfeel aligning with your preference for deep roasts';
    } else if (dp.sweetness > 7) {
      analysis = 'Naturally sweet honey-processed finish satisfying your low-bitterness profile';
    } else if (dp.floral_notes > 7) {
      analysis = 'Jasmine and bergamot floral aromatics tailored to your adventurous profile';
    }

    return { score, analysis };
  }, [userPalate, selectedDrink]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Dna className="w-4 h-4 text-primary" />
            <DialogTitle className="text-base font-semibold">Palate DNA & Flavor Radar</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Compare your taste profile against live café menu extractions using 5-axis sensory mapping.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Left Column: Visual Radar */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-border bg-card">
            <span className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              {selectedDrink ? selectedDrink.name : 'Your Taste Profile'}
            </span>
            
            <FlavorRadarWidget
              profile={selectedDrink?.flavor_profile ?? userPalate}
              size={200}
            />

            {selectedDrink && (
              <div className="mt-4 w-full text-center border-t border-border/40 pt-3">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-bold tracking-tight text-foreground">
                    {compatibility.score}%
                  </span>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    Sensory Match
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                  {compatibility.analysis}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Drink Selector */}
          <div className="flex flex-col space-y-3 min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Live Menu Spectrum ({menuItems.length} Available)
            </span>
            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
              {menuItems.map(item => {
                const isSelected = item.id === (selectedDrink?.id ?? '');
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedDrinkId(item.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border/60 hover:border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {item.caffeine_mg ? `${item.caffeine_mg}mg caffeine` : 'Specialty roast'} · {item.price} ETB
                      </p>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDrink && onSelectDrink && (
              <Button
                className="w-full mt-2 text-xs"
                onClick={() => {
                  onSelectDrink(selectedDrink);
                  onOpenChange(false);
                }}
              >
                Discuss this brew with AI Barista
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
