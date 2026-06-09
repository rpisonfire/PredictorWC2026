"use client";
import { useMemo, useState } from "react";
import { Emoji } from "./Emoji";

export type RankingSeries = {
  userId: string;
  nickname: string;
  avatar: string;
  points: number[]; // skumulowane po każdej kolejce
  color: string;
};

export function RankingChart({
  series,
  matchdays,
  highlightUserId,
}: {
  series: RankingSeries[];
  matchdays: number[];
  highlightUserId?: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const { paths, max, W, H, padding } = useMemo(() => {
    const W = 800, H = 320, padding = { top: 16, right: 20, bottom: 32, left: 36 };
    const maxPts = Math.max(1, ...series.flatMap((s) => s.points));
    const stepX = matchdays.length > 1 ? (W - padding.left - padding.right) / (matchdays.length - 1) : 0;
    const yScale = (v: number) => H - padding.bottom - (v / maxPts) * (H - padding.top - padding.bottom);

    const paths = series.map((s) => {
      const pts = s.points.map((v, i) => ({
        x: padding.left + i * stepX,
        y: yScale(v),
        v,
      }));
      const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      return { ...s, d, pts };
    });

    return { paths, max: maxPts, W, H, padding };
  }, [series, matchdays]);

  if (series.length === 0 || matchdays.length === 0) return null;

  const stepX = matchdays.length > 1 ? (W - padding.left - padding.right) / (matchdays.length - 1) : 0;

  return (
    <div>
      <div className="overflow-x-auto -mx-1 px-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[640px]" preserveAspectRatio="none">
          {/* Y-axis gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p) => {
            const y = padding.top + p * (H - padding.top - padding.bottom);
            const val = Math.round(max * (1 - p));
            return (
              <g key={p}>
                <line x1={padding.left} x2={W - padding.right} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="2 4" />
                <text x={padding.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.4">{val}</text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {matchdays.map((md, i) => {
            const x = padding.left + i * stepX;
            return (
              <text key={md} x={x} y={H - padding.bottom + 18} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.4">
                K{md}
              </text>
            );
          })}

          {/* Lines */}
          {paths.map((s) => {
            const isHighlighted = hovered ? hovered === s.userId : (!highlightUserId || s.userId === highlightUserId);
            const opacity = hovered && hovered !== s.userId ? 0.2 : (highlightUserId && s.userId !== highlightUserId ? 0.35 : 1);
            const strokeWidth = isHighlighted ? 2.5 : 1.5;
            return (
              <g key={s.userId} opacity={opacity}>
                <path d={s.d} fill="none" stroke={s.color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
                {s.pts.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r={isHighlighted ? 3 : 2} fill={s.color} />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {series.map((s) => {
          const isHighlight = hovered === s.userId || (!hovered && highlightUserId === s.userId);
          return (
            <button
              key={s.userId}
              type="button"
              onMouseEnter={() => setHovered(s.userId)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setHovered((h) => (h === s.userId ? null : s.userId))}
              className={`chip transition ${isHighlight ? "bg-app-hover" : ""}`}
              style={{ borderLeft: `3px solid ${s.color}` }}
            >
              <Emoji char={s.avatar} size="sm" />
              <span className="font-bold text-xs">{s.nickname}</span>
              <span className="text-app-subtle text-xs tabular-nums">{s.points[s.points.length - 1] ?? 0}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
