// Stadion w tle - noc (dark mode) lub dzień (light mode). SVG fixed bottom.
// Renderowany w layout.tsx pod całą zawartością.
export function StadiumBackground() {
  return (
    <div className="stadium-bg" aria-hidden="true">
      {/* Reflektory - tylko widoczne w night mode */}
      <div className="floodlight floodlight-1" />
      <div className="floodlight floodlight-2" />
      <div className="floodlight floodlight-3" />

      {/* Stadion SVG na dole */}
      <svg
        className="stadium-svg"
        viewBox="0 0 1440 400"
        preserveAspectRatio="xMidYEnd slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Trybuny - łuk */}
        <path
          d="M0,400 L0,260 Q0,180 80,170 L200,160 Q280,155 320,150 L420,140 Q540,128 600,124 L720,118 Q820,116 880,118 L1000,124 Q1120,134 1180,148 L1300,160 Q1380,170 1440,200 L1440,400 Z"
          className="stadium-stand"
        />
        {/* Górna krawędź trybun - linia świateł */}
        <path
          d="M0,260 Q0,180 80,170 L200,160 Q280,155 320,150 L420,140 Q540,128 600,124 L720,118 Q820,116 880,118 L1000,124 Q1120,134 1180,148 L1300,160 Q1380,170 1440,200"
          className="stadium-rim"
          fill="none"
        />
        {/* Maszty reflektorów */}
        <g className="stadium-mast">
          <line x1="120" y1="170" x2="120" y2="40" strokeWidth="2" />
          <ellipse cx="120" cy="40" rx="22" ry="8" />
        </g>
        <g className="stadium-mast">
          <line x1="720" y1="118" x2="720" y2="20" strokeWidth="2" />
          <ellipse cx="720" cy="20" rx="28" ry="10" />
        </g>
        <g className="stadium-mast">
          <line x1="1320" y1="160" x2="1320" y2="40" strokeWidth="2" />
          <ellipse cx="1320" cy="40" rx="22" ry="8" />
        </g>
        {/* Pasek murawy */}
        <rect x="0" y="380" width="1440" height="20" className="stadium-pitch" />
      </svg>

      {/* Chmury - tylko w light mode (day) */}
      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />
      <div className="cloud cloud-3" />

      {/* Gwiazdki - tylko w dark mode (night) */}
      <div className="stars">
        {Array.from({ length: 25 }).map((_, i) => (
          <span key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 13) % 40}%`, animationDelay: `${i * 0.3}s` }} />
        ))}
      </div>
    </div>
  );
}
