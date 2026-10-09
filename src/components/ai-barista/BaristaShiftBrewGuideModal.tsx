import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Coffee, Flame, Droplets, Gauge, Compass, Clock, Check } from 'lucide-react';
import { toast } from 'sonner';

export interface BrewGuideSpec {
  drinkName: string;
  method: 'Pour-Over (V60)' | 'Espresso' | 'Aeropress' | 'Cold Drip' | 'French Press';
  dose: string;
  yield: string;
  ratio: string;
  waterTemp: string;
  grindSize: string;
  brewTime: string;
  elevation: string;
  processing: string;
  tastingNotes: string[];
  baristaTip: string;
}

const PRESET_BREW_GUIDES: Record<string, BrewGuideSpec> = {
  'yirgacheffe': {
    drinkName: 'Yirgacheffe V60 Single Origin',
    method: 'Pour-Over (V60)',
    dose: '16.0g',
    yield: '250g',
    ratio: '1:15.6',
    waterTemp: '93°C (200°F)',
    grindSize: 'Medium-Fine (22 clicks on Comandante)',
    brewTime: '2m 45s',
    elevation: '1,900 - 2,200m',
    processing: 'Washed, Grade 1',
    tastingNotes: ['Bergamot', 'Jasmine', 'Meyer Lemon', 'Peach'],
    baristaTip: 'Bloom with 50g water for 40s. Spiral pour gently in concentric circles to preserve delicate floral esters without over-extracting tannins.'
  },
  'espresso': {
    drinkName: 'Origin Espresso Double Shot',
    method: 'Espresso',
    dose: '18.5g',
    yield: '38.0g',
    ratio: '1:2.05',
    waterTemp: '93.5°C',
    grindSize: 'Fine Espresso (Micrometric step 1.8)',
    brewTime: '27 - 29s',
    elevation: '1,750m',
    processing: 'Natural Sun-Dried',
    tastingNotes: ['Dark Chocolate', 'Cacao Nibs', 'Black Cherry', 'Velvety Crema'],
    baristaTip: 'Pre-infuse at 3 bars for 4 seconds before ramping to 9 bars. Target 38g in 28s for balanced sweetness and lingering cacao finish.'
  },
  'cold brew': {
    drinkName: 'Slow Drip Cold Brew',
    method: 'Cold Drip',
    dose: '60.0g',
    yield: '600g',
    ratio: '1:10',
    waterTemp: '4°C Chilled Spring Water',
    grindSize: 'Coarse Sand',
    brewTime: '8 Hours Slow Maceration',
    elevation: '2,000m',
    processing: 'Anaerobic Natural',
    tastingNotes: ['Blueberry', 'Winey Stone Fruit', 'Brown Sugar'],
    baristaTip: 'Maintain a drip rate of 1 drip every 1.5 seconds. Served over a single hand-carved ice sphere to minimize dilution.'
  },
  'harar': {
    drinkName: 'White Harar Flat White',
    method: 'Espresso',
    dose: '19.0g',
    yield: '36.0g espresso + 140ml micro-foam',
    ratio: '1:1.9 base',
    waterTemp: '92.5°C',
    grindSize: 'Fine Espresso',
    brewTime: '26s',
    elevation: '1,800m',
    processing: 'Dry-Processed (Natural)',
    tastingNotes: ['Wild Berry', 'Cardamom Spice', 'Sweet Cream'],
    baristaTip: 'Steam milk to exactly 62°C to maximize natural lactose sweetness without scorching the sweet Harar fruit notes.'
  }
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drinkName?: string;
}

export default function BaristaShiftBrewGuideModal({
  open,
  onOpenChange,
  drinkName = 'Yirgacheffe V60',
}: Props) {
  const [selectedKey, setSelectedKey] = useState<string>('yirgacheffe');
  const [copied, setCopied] = useState(false);

  // Derive matching spec
  const spec = PRESET_BREW_GUIDES[selectedKey] ?? PRESET_BREW_GUIDES['yirgacheffe'];

  const handleCopySpec = () => {
    const text = `${spec.drinkName} Brewing Guide\nMethod: ${spec.method}\nDose: ${spec.dose} | Yield: ${spec.yield} | Ratio: ${spec.ratio}\nTemp: ${spec.waterTemp} | Time: ${spec.brewTime}\nGrind: ${spec.grindSize}\nTip: ${spec.baristaTip}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Brew guide copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4 text-primary" />
            <DialogTitle className="text-base font-semibold">Barista Shift Recipe & Brew Guide</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Official brew calibrations and extraction parameters used by Coffee OS certified baristas.
          </DialogDescription>
        </DialogHeader>

        {/* Tab selection */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-border/40">
          {[
            { key: 'yirgacheffe', label: 'Yirgacheffe V60' },
            { key: 'espresso', label: 'Origin Espresso' },
            { key: 'harar', label: 'White Harar' },
            { key: 'cold brew', label: 'Slow Drip Cold Brew' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedKey(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedKey === tab.key
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Spec Content */}
        <div className="space-y-4 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{spec.drinkName}</h3>
              <p className="text-xs text-muted-foreground">{spec.elevation} · {spec.processing}</p>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              {spec.method}
            </Badge>
          </div>

          {/* Grid of parameters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500" /> Dose & Yield
              </span>
              <p className="text-xs font-semibold text-foreground mt-1">{spec.dose} → {spec.yield}</p>
              <p className="text-[10px] text-muted-foreground">{spec.ratio}</p>
            </div>

            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <Droplets className="w-3 h-3 text-blue-500" /> Water Temp
              </span>
              <p className="text-xs font-semibold text-foreground mt-1">{spec.waterTemp}</p>
              <p className="text-[10px] text-muted-foreground">Filtered mineral</p>
            </div>

            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <Gauge className="w-3 h-3 text-emerald-500" /> Grind Size
              </span>
              <p className="text-xs font-semibold text-foreground mt-1 truncate">{spec.grindSize}</p>
              <p className="text-[10px] text-muted-foreground">Calibrated daily</p>
            </div>

            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
              <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-500" /> Extraction Time
              </span>
              <p className="text-xs font-semibold text-foreground mt-1">{spec.brewTime}</p>
              <p className="text-[10px] text-muted-foreground">Target window</p>
            </div>
          </div>

          {/* Tasting notes */}
          <div>
            <span className="text-[11px] font-medium text-muted-foreground block mb-1.5">
              Verified Sensory Notes:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {spec.tastingNotes.map((note, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full border border-border bg-card text-foreground"
                >
                  {note}
                </span>
              ))}
            </div>
          </div>

          {/* Barista Tip */}
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs space-y-1">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-primary" /> Shift Barista Extraction Secret:
            </span>
            <p className="text-muted-foreground leading-relaxed">{spec.baristaTip}</p>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySpec}
              className="text-xs flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Coffee className="w-3.5 h-3.5" />}
              {copied ? 'Copied Recipe' : 'Copy Brew Specs'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
