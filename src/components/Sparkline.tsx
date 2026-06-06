export function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const W = 320, H = 60, P = 4;
  const max = Math.max(...points, 1);
  const stepX = (W - 2 * P) / (points.length - 1);
  const path = points
    .map((v, i) => {
      const x = P + i * stepX;
      const y = H - P - (v / max) * (H - 2 * P);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${path} L${W - P},${H - P} L${P},${H - P} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-16">
      <defs>
        <linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#F1B434" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#F1B434" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={path} stroke="#F1B434" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((v, i) => {
        const x = P + i * stepX;
        const y = H - P - (v / max) * (H - 2 * P);
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#F1B434" />;
      })}
    </svg>
  );
}
