// Boisko w tle - widziane z góry. Linie + koło środkowe + pola karne.
// Dark mode: ciemnozielona murawa + jasne reflektory.
// Light mode: jasnozielona w słońcu + delikatny cień.
export function StadiumBackground() {
  return (
    <div className="pitch-bg" aria-hidden="true">
      {/* Reflektory - rogi murawy */}
      <div className="floodlight floodlight-1" />
      <div className="floodlight floodlight-2" />
      <div className="floodlight floodlight-3" />
      <div className="floodlight floodlight-4" />

      {/* Pasy murawy - alternujący zielony */}
      <div className="pitch-stripes" />

      {/* Linie boiska SVG */}
      <svg
        className="pitch-svg"
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer rectangle */}
        <rect
          x="40" y="40" width="920" height="520"
          className="pitch-line"
          fill="none"
        />
        {/* Halfway line */}
        <line x1="500" y1="40" x2="500" y2="560" className="pitch-line" />
        {/* Center circle */}
        <circle cx="500" cy="300" r="80" className="pitch-line" fill="none" />
        <circle cx="500" cy="300" r="3" className="pitch-line-dot" />

        {/* Left penalty area */}
        <rect x="40" y="170" width="120" height="260" className="pitch-line" fill="none" />
        {/* Left goal area */}
        <rect x="40" y="230" width="48" height="140" className="pitch-line" fill="none" />
        {/* Left penalty arc */}
        <path d="M 160 235 A 80 80 0 0 1 160 365" className="pitch-line" fill="none" />
        {/* Left penalty spot */}
        <circle cx="120" cy="300" r="3" className="pitch-line-dot" />
        {/* Left goal */}
        <rect x="32" y="280" width="8" height="40" className="pitch-line" fill="none" />

        {/* Right penalty area */}
        <rect x="840" y="170" width="120" height="260" className="pitch-line" fill="none" />
        {/* Right goal area */}
        <rect x="912" y="230" width="48" height="140" className="pitch-line" fill="none" />
        {/* Right penalty arc */}
        <path d="M 840 235 A 80 80 0 0 0 840 365" className="pitch-line" fill="none" />
        {/* Right penalty spot */}
        <circle cx="880" cy="300" r="3" className="pitch-line-dot" />
        {/* Right goal */}
        <rect x="960" y="280" width="8" height="40" className="pitch-line" fill="none" />

        {/* Corner arcs */}
        <path d="M 40 50 A 10 10 0 0 0 50 40" className="pitch-line" fill="none" />
        <path d="M 950 40 A 10 10 0 0 0 960 50" className="pitch-line" fill="none" />
        <path d="M 40 550 A 10 10 0 0 1 50 560" className="pitch-line" fill="none" />
        <path d="M 950 560 A 10 10 0 0 1 960 550" className="pitch-line" fill="none" />
      </svg>

      {/* Gwiazdki - tylko w dark mode (night) */}
      <div className="stars">
        {Array.from({ length: 25 }).map((_, i) => (
          <span key={i} style={{ left: `${(i * 37) % 100}%`, top: `${(i * 13) % 30}%`, animationDelay: `${i * 0.3}s` }} />
        ))}
      </div>
    </div>
  );
}
