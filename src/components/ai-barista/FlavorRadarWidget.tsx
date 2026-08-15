import React from 'react';

export interface FlavorProfile {
  acidity: number;
  body: number;
  sweetness: number;
  bitterness: number;
  floral_notes: number;
}

interface Props {
  profile: Partial<FlavorProfile>;
  size?: number;
}

const AXES = [
  { key: 'acidity',      label: 'Acidity' },
  { key: 'body',         label: 'Body' },
  { key: 'sweetness',    label: 'Sweetness' },
  { key: 'bitterness',   label: 'Bitterness' },
  { key: 'floral_notes', label: 'Floral' },
] as const;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function FlavorRadarWidget({ profile, size = 180 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.36;
  const labelR = size * 0.48;
  const n = AXES.length;
  const step = 360 / n;

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  const dataPoints = AXES.map((ax, i) => {
    const val = (profile[ax.key] ?? 5) / 10;
    const angle = i * step;
    const pt = polarToCartesian(cx, cy, val * maxR, angle);
    return pt;
  });

  const polygon = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {rings.map(r => {
          const pts = AXES.map((_, i) => polarToCartesian(cx, cy, r * maxR, i * step));
          return (
            <polygon
              key={r}
              points={pts.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="0.75"
            />
          );
        })}

        {/* Axis spokes */}
        {AXES.map((_, i) => {
          const end = polarToCartesian(cx, cy, maxR, i * step);
          return (
            <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y}
              stroke="#E5E7EB" strokeWidth="0.75" />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={polygon}
          fill="#111827"
          fillOpacity={0.08}
          stroke="#111827"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#111827" />
        ))}

        {/* Labels */}
        {AXES.map((ax, i) => {
          const pt = polarToCartesian(cx, cy, labelR, i * step);
          const anchor = pt.x < cx - 4 ? 'end' : pt.x > cx + 4 ? 'start' : 'middle';
          return (
            <text
              key={ax.key}
              x={pt.x}
              y={pt.y}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize={9}
              fill="#6B7280"
              fontFamily="Montserrat, sans-serif"
            >
              {ax.label}
            </text>
          );
        })}
      </svg>

      {/* Value table */}
      <div className="grid grid-cols-5 gap-x-4 gap-y-1 text-center">
        {AXES.map(ax => (
          <div key={ax.key}>
            <p className="text-[10px] text-muted-foreground">{ax.label}</p>
            <p className="text-xs font-medium text-foreground">{profile[ax.key] ?? 5}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
