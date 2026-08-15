import React, { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FlavorRadarWidget from './FlavorRadarWidget';

export interface PalateLevelDef {
  level: number;
  title: string;
  xpRequired: number;
  unlocksCount: number;
}

export const PALATE_LEVELS: PalateLevelDef[] = [
  { level: 1,  title: 'Coffee Novice',       xpRequired: 0,    unlocksCount: 0 },
  { level: 2,  title: 'Espresso Explorer',   xpRequired: 100,  unlocksCount: 0 },
  { level: 3,  title: 'Latte Artist',        xpRequired: 250,  unlocksCount: 2 },
  { level: 4,  title: 'Pour-Over Alchemist', xpRequired: 500,  unlocksCount: 2 },
  { level: 5,  title: 'Master Cupper',       xpRequired: 1000, unlocksCount: 3 },
  { level: 10, title: 'Master Roaster',      xpRequired: 5000, unlocksCount: 99 },
];

export function getPalateLevel(xp: number): { current: PalateLevelDef; next: PalateLevelDef | null } {
  let current = PALATE_LEVELS[0];
  let next: PalateLevelDef | null = PALATE_LEVELS[1];
  for (let i = PALATE_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= PALATE_LEVELS[i].xpRequired) {
      current = PALATE_LEVELS[i];
      next = PALATE_LEVELS[i + 1] ?? null;
      break;
    }
  }
  return { current, next };
}

export interface SecretDrink {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  flavor_profile: Record<string, number>;
  unlock_level: number;
  price: number | null;
}

interface Props {
  xp: number;
  badges: Array<{ badge: string; earned_at: string }>;
  secretDrinks: SecretDrink[];
}

export default function PalateXPProgressCard({ xp, badges, secretDrinks }: Props) {
  const { current, next } = getPalateLevel(xp);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [selectedDrink, setSelectedDrink] = useState<SecretDrink | null>(null);

  const xpInLevel = next ? xp - current.xpRequired : current.xpRequired;
  const xpToNext  = next ? next.xpRequired - current.xpRequired : 1;
  const pct = Math.min(100, (xpInLevel / xpToNext) * 100);
  const isVaultUnlocked = current.level >= 3;
  const visibleDrinks = secretDrinks.filter(d => d.unlock_level <= current.level);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Level {current.level}</p>
            <p className="text-sm font-medium text-foreground">{current.title}</p>
          </div>
          <p className="text-lg font-semibold text-foreground">{xp} <span className="text-xs font-normal text-muted-foreground">XP</span></p>
        </div>

        {/* XP bar */}
        {next && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{xpInLevel} / {xpToNext} XP to {next.title}</span>
              <span>{Math.round(pct)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full transition-all duration-700"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {badges.slice(0, 6).map((b, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground"
                title={new Date(b.earned_at).toLocaleDateString()}
              >
                {b.badge.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Secret Vault button */}
        <button
          onClick={() => isVaultUnlocked && setVaultOpen(true)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-colors text-xs font-medium ${
            isVaultUnlocked
              ? 'border-foreground/15 hover:border-foreground/30 text-foreground'
              : 'border-border text-muted-foreground cursor-default'
          }`}
        >
          <span>Secret AI Vault</span>
          {isVaultUnlocked
            ? <Unlock className="w-3.5 h-3.5" />
            : <Lock className="w-3.5 h-3.5" />
          }
        </button>
        {!isVaultUnlocked && (
          <p className="text-[10px] text-muted-foreground text-center">
            Unlocks at Level 3 ({250 - xp > 0 ? `${250 - xp} XP away` : 'almost there'})
          </p>
        )}
      </div>

      {/* Secret Vault Modal */}
      <Dialog open={vaultOpen} onOpenChange={setVaultOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium">Secret AI Vault</DialogTitle>
          </DialogHeader>
          {visibleDrinks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Reach Level 3 to unlock secret drinks.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {visibleDrinks.map(d => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDrink(d)}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:border-foreground/20 transition-colors"
                >
                  {d.image_url ? (
                    <img src={d.image_url} alt={d.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted shrink-0 flex items-center justify-center text-base">☕</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{d.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.description}</p>
                  </div>
                  {d.price && <span className="text-xs text-muted-foreground shrink-0">{d.price} ETB</span>}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Drink flavor detail */}
      {selectedDrink && (
        <Dialog open={!!selectedDrink} onOpenChange={() => setSelectedDrink(null)}>
          <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-sm font-medium">{selectedDrink.name}</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">{selectedDrink.description}</p>
            <FlavorRadarWidget profile={selectedDrink.flavor_profile} size={180} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
