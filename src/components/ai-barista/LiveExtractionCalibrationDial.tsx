import React, { useState, useMemo } from 'react';
import { Sliders, Flame, Gauge, Check, Sparkles, Info, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Props {
  drinkName?: string;
  onApplyCalibration?: (notes: string) => void;
}

export default function LiveExtractionCalibrationDial({
  drinkName = 'Yirgacheffe V60',
  onApplyCalibration,
}: Props) {
  const [grindClicks, setGrindClicks] = useState<number>(24); // 18 (fine) to 32 (coarse)
  const [waterTemp, setWaterTemp] = useState<number>(93); // 90 to 96 C
  const [brewRatio, setBrewRatio] = useState<number>(16); // 1:14 to 1:18

  // Compute scientific extraction dynamics
  const calibration = useMemo(() => {
    // Standard V60 baseline: 24 clicks, 93C, 1:16 ratio -> 20.2% EY, 1.35% TDS
    const tempFactor = (waterTemp - 93) * 0.25;
    const grindFactor = (26 - grindClicks) * 0.35;
    const ratioFactor = (16 - brewRatio) * 0.4;

    const extractionYield = +(20.2 + tempFactor + grindFactor).toFixed(1);
    const tds = +(1.35 + ratioFactor * 0.15 + (26 - grindClicks) * 0.03).toFixed(2);

    let profile = 'Balanced & Vibrant';
    let tastingNotes = 'Stone fruit sweetness, jasmine aroma, crisp citrus acidity.';

    if (extractionYield > 22.0) {
      profile = 'High Extraction (Rich Body)';
      tastingNotes = 'Pronounced caramel and cacao nibs with slightly drying finish.';
    } else if (extractionYield < 18.5) {
      profile = 'Under-extracted (Bright Acidity)';
      tastingNotes = 'Vibrant lemony brightness with lighter tea-like texture.';
    } else if (brewRatio <= 14.5) {
      profile = 'Intense & Concentrated';
      tastingNotes = 'Heavy mouthfeel, concentrated floral berry notes.';
    } else if (brewRatio >= 17) {
      profile = 'Delicate & Tea-Like';
      tastingNotes = 'Ultra-clean cup highlighting delicate bergamot and honey florals.';
    }

    const acidity = Math.min(10, Math.max(3, Math.round(9 - (extractionYield - 18) * 1.2)));
    const sweetness = Math.min(10, Math.max(4, Math.round(7 + (21 - Math.abs(extractionYield - 20.2)) * 0.5)));
    const body = Math.min(10, Math.max(3, Math.round(4 + (17 - brewRatio) * 1.5)));
    const clarity = Math.min(10, Math.max(4, Math.round(5 + (grindClicks - 20) * 0.5)));

    return {
      extractionYield,
      tds,
      profile,
      tastingNotes,
      acidity,
      sweetness,
      body,
      clarity,
      isGoldenCup: extractionYield >= 19.0 && extractionYield <= 21.5,
    };
  }, [grindClicks, waterTemp, brewRatio]);

  const handleApply = () => {
    const summary = `${drinkName} calibrated: Grind ${grindClicks} clicks, ${waterTemp}°C water, 1:${brewRatio} ratio (${calibration.profile})`;
    if (onApplyCalibration) {
      onApplyCalibration(summary);
    }
    toast.success(`Barista calibration locked in for ${drinkName}!`);
  };

  const handleReset = () => {
    setGrindClicks(24);
    setWaterTemp(93);
    setBrewRatio(16);
    toast.info('Calibration reset to Master Barista baseline');
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-xs font-semibold text-foreground">Live Pour-Over Extraction Dial</h3>
            <p className="text-[10px] text-muted-foreground">Adjust brew physics for {drinkName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {calibration.isGoldenCup && (
            <Badge variant="outline" className="text-[9px] border-amber-500/40 text-amber-500 bg-amber-500/10">
              <Sparkles className="w-2.5 h-2.5 mr-1" /> Golden Cup
            </Badge>
          )}
          <button onClick={handleReset} title="Reset to baseline" className="text-muted-foreground hover:text-foreground p-1">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Control Sliders */}
      <div className="space-y-3">
        {/* 1. Grind Size */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Grind Size</span>
            <span className="font-semibold text-foreground">
              {grindClicks} Clicks ({grindClicks <= 21 ? 'Fine' : grindClicks >= 27 ? 'Coarse' : 'Medium-Fine'})
            </span>
          </div>
          <input
            type="range"
            min={18}
            max={32}
            step={1}
            value={grindClicks}
            onChange={e => setGrindClicks(Number(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
            <span>Fine (18)</span>
            <span>Recommended (24)</span>
            <span>Coarse (32)</span>
          </div>
        </div>

        {/* 2. Water Temperature */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-500" /> Water Temp
            </span>
            <span className="font-semibold text-foreground">{waterTemp}°C</span>
          </div>
          <input
            type="range"
            min={90}
            max={96}
            step={0.5}
            value={waterTemp}
            onChange={e => setWaterTemp(Number(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
            <span>90°C (Gentle)</span>
            <span>93°C (Sweet Peak)</span>
            <span>96°C (Maximum Solubles)</span>
          </div>
        </div>

        {/* 3. Brew Ratio */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Gauge className="w-3 h-3 text-sky-500" /> Brew Ratio
            </span>
            <span className="font-semibold text-foreground">1:{brewRatio}</span>
          </div>
          <input
            type="range"
            min={14}
            max={18}
            step={0.5}
            value={brewRatio}
            onChange={e => setBrewRatio(Number(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
            <span>1:14 (Concentrated)</span>
            <span>1:16 (Standard)</span>
            <span>1:18 (Tea-like Clarity)</span>
          </div>
        </div>
      </div>

      {/* Real-time Computed Yield & Sensory Spectrum */}
      <div className="p-3 rounded-lg bg-muted/20 border border-border/60 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground">Extraction Yield: </span>
            <span className="font-bold text-foreground">{calibration.extractionYield}%</span>
          </div>
          <div>
            <span className="text-muted-foreground">Estimated TDS: </span>
            <span className="font-bold text-foreground">{calibration.tds}%</span>
          </div>
        </div>

        <div className="text-xs font-medium text-foreground">
          Profile: <span className="text-primary">{calibration.profile}</span>
        </div>
        <p className="text-[11px] text-muted-foreground italic">"{calibration.tastingNotes}"</p>

        {/* 4-Axis Sensory Balance Bars */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40 text-[10px]">
          <div>
            <div className="flex justify-between text-muted-foreground mb-0.5">
              <span>Brightness / Acidity</span>
              <span>{calibration.acidity}/10</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${calibration.acidity * 10}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-muted-foreground mb-0.5">
              <span>Natural Sweetness</span>
              <span>{calibration.sweetness}/10</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${calibration.sweetness * 10}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-muted-foreground mb-0.5">
              <span>Mouthfeel / Body</span>
              <span>{calibration.body}/10</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${calibration.body * 10}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-muted-foreground mb-0.5">
              <span>Floral Clarity</span>
              <span>{calibration.clarity}/10</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-sky-500" style={{ width: `${calibration.clarity * 10}%` }} />
            </div>
          </div>
        </div>
      </div>

      <Button
        onClick={handleApply}
        size="sm"
        className="w-full text-xs h-8"
      >
        <Check className="w-3.5 h-3.5 mr-1.5" />
        Apply Calibration to My Order
      </Button>
    </div>
  );
}
