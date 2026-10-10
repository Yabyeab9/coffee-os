import React from 'react';
import { Coffee, Flame } from 'lucide-react';
import type { ChatMode } from '@/lib/ai-barista-client';

interface Props {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  counts: { coffee: number; roast: number };
}

const TABS: Array<{
  mode: ChatMode;
  label: string;
  tagline: string;
  icon: React.ReactNode;
}> = [
  {
    mode: 'coffee',
    label: 'Coffee Chat',
    tagline: 'Thoughtful, expert guidance',
    icon: <Coffee className="w-3.5 h-3.5" />,
  },
  {
    mode: 'roast',
    label: 'Roast Chat',
    tagline: 'Playful banter, honest truths',
    icon: <Flame className="w-3.5 h-3.5" />,
  },
];

/**
 * Switches between the two barista personalities. Each mode keeps
 * its own persistent conversation thread.
 */
export default function ChatModeTabs({ mode, onModeChange, counts }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Barista conversation mode"
      className="flex gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/40"
    >
      {TABS.map(tab => {
        const active = mode === tab.mode;
        const count = counts[tab.mode] ?? 0;
        return (
          <button
            key={tab.mode}
            role="tab"
            aria-selected={active}
            onClick={() => onModeChange(tab.mode)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              active
                ? 'bg-card border border-border shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <span className={active ? 'text-primary' : ''}>{tab.icon}</span>
            <span className="truncate">{tab.label}</span>
            {count > 0 && (
              <span
                className={`text-[9px] px-1.5 py-px rounded-full ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
