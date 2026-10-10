import React, { useState } from 'react';
import { ShoppingCart, Sliders, Activity, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import FlavorRadarWidget, { FlavorProfile } from './FlavorRadarWidget';
import { addToTray } from '@/lib/tray';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { DrinkCardData } from './chat-tags';

// Strip DB artifacts from product names
export function sanitizeName(raw: string): string {
  return raw
    .replace(/\s*\(Copy\)\s*/gi, '')
    .replace(/\s*\[Draft\]\s*/gi, '')
    .replace(/\s+v\d+\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type { DrinkCardData };

interface Props {
  drink: DrinkCardData;
  onAddToCart?: (drink: DrinkCardData, options: CartOptions) => void;
  onLogCaffeine?: (drink: DrinkCardData, caffeineMg: number) => void;
}

export interface CartOptions {
  milk: string;
  sugar: number;
}

const MILK_OPTIONS = [
  { value: 'whole', label: 'Whole milk' },
  { value: 'oat',   label: 'Oat milk' },
  { value: 'skim',  label: 'Skim milk' },
  { value: 'almond',label: 'Almond milk' },
  { value: 'soy',   label: 'Soy milk' },
  { value: 'none',  label: 'No milk' },
];

export default function InChatDrinkCard({ drink, onAddToCart, onLogCaffeine }: Props) {
  const { profile } = useAuth();
  const [added, setAdded] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [flavorOpen, setFlavorOpen] = useState(false);
  const [milk, setMilk] = useState('whole');
  const [sugar, setSugar] = useState([2]);

  const cleanName = sanitizeName(drink.name);
  const cafeId = drink.cafe_id ?? profile?.cafe_id ?? '';

  const handleAddToCart = (options: CartOptions) => {
    if (!cafeId) {
      toast.error('This drink is not linked to your café yet.');
      return;
    }
    addToTray({
      id: drink.id,
      name: cleanName,
      price: drink.price,
      image_url: drink.image_url,
      cafe_id: cafeId,
      caffeine_mg: drink.caffeine_mg ?? null,
    }, options);
    setAdded(true);
    toast.success(`${cleanName} added to your tray`, {
      description: 'Open the menu page to check out whenever you are ready.',
    });
    onAddToCart?.(drink, options);
    setTimeout(() => setAdded(false), 2500);
  };

  return (
    <>
      <div className="flex items-center gap-3 bg-background border border-border rounded-xl p-3 my-1 max-w-xs">
        {/* Image */}
        {drink.image_url ? (
          <img
            src={drink.image_url}
            alt={cleanName}
            className="w-14 h-14 rounded-lg object-cover shrink-0 border border-border"
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-muted shrink-0 flex items-center justify-center">
            <span className="text-xl">☕</span>
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-medium text-foreground leading-tight">{cleanName}</p>
            {drink.match_pct != null && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-foreground/8 text-foreground font-medium whitespace-nowrap">
                {drink.match_pct}% match
              </span>
            )}
          </div>
          {drink.price != null && (
            <p className="text-xs text-muted-foreground">{drink.price} ETB</p>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleAddToCart({ milk, sugar: sugar[0] })}
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                added
                  ? 'border-success/30 bg-success/8 text-success'
                  : 'border-foreground/15 hover:border-foreground/30 text-foreground'
              }`}
            >
              {added ? <Check className="w-3 h-3" /> : <ShoppingCart className="w-3 h-3" />}
              {added ? 'Added' : 'Add'}
            </button>
            <button
              onClick={() => setCustomizeOpen(true)}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-foreground/15 hover:border-foreground/30 text-foreground transition-colors"
            >
              <Sliders className="w-3 h-3" />
              Customize
            </button>
            {drink.flavor_profile && (
              <button
                onClick={() => setFlavorOpen(true)}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-foreground/15 hover:border-foreground/30 text-foreground transition-colors"
              >
                <Activity className="w-3 h-3" />
                Flavor
              </button>
            )}
            {(drink.caffeine_mg ?? 0) > 0 && onLogCaffeine && (
              <button
                onClick={() => onLogCaffeine(drink, drink.caffeine_mg ?? 0)}
                title={`Log ${drink.caffeine_mg} mg of caffeine from this drink`}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-foreground/15 hover:border-foreground/30 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Zap className="w-3 h-3" />
                Log {drink.caffeine_mg}mg
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customize Dialog */}
      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Customize {cleanName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Milk type</label>
              <Select value={milk} onValueChange={setMilk}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MILK_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Sugar level</label>
                <span className="text-xs font-medium">{sugar[0]}/5</span>
              </div>
              <Slider min={0} max={5} step={1} value={sugar} onValueChange={setSugar} className="w-full" />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>No sugar</span><span>Very sweet</span>
              </div>
            </div>
            <Button
              className="w-full h-8 text-xs"
              onClick={() => { handleAddToCart({ milk, sugar: sugar[0] }); setCustomizeOpen(false); }}
            >
              Add to cart
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Flavor Radar Dialog */}
      {drink.flavor_profile && (
        <Dialog open={flavorOpen} onOpenChange={setFlavorOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm font-medium">Sensory Profile — {cleanName}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center py-2">
              <FlavorRadarWidget profile={drink.flavor_profile} size={200} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
