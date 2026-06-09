function positionColor(pos?: string | null): { ring: string; legend: string } {
  if (!pos) return { ring: "border-app", legend: "" };
  const p = pos.toLowerCase();
  if (p.includes("goal")) return { ring: "border-orange-500", legend: "BR" }; // bramkarz
  if (p.includes("defence") || p.includes("defender") || p.includes("back")) return { ring: "border-yellow-400", legend: "OB" }; // obrońca
  if (p.includes("midfield")) return { ring: "border-green-500", legend: "PM" }; // pomocnik
  if (p.includes("forward") || p.includes("attack") || p.includes("offence") || p.includes("striker") || p.includes("winger")) return { ring: "border-blue-500", legend: "NP" }; // napastnik
  return { ring: "border-app", legend: "" };
}

export function PlayerAvatar({
  name,
  photoUrl,
  position,
  size = 32,
}: { name: string; photoUrl?: string | null; position?: string | null; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const dim = { width: size, height: size };
  const { ring } = positionColor(position);

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        style={dim}
        className={`rounded-full object-cover bg-app-hover border-2 ${ring} shrink-0`}
        loading="lazy"
      />
    );
  }
  return (
    <span
      style={{ ...dim, fontSize: size * 0.4 }}
      className={`rounded-full bg-wc-blue/30 border-2 ${ring} inline-flex items-center justify-center font-black text-white shrink-0`}
    >
      {initials}
    </span>
  );
}

export function PositionLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-[10px] text-app-muted">
      <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full border-2 border-orange-500" /> Bramkarz</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full border-2 border-yellow-400" /> Obrońca</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full border-2 border-green-500" /> Pomocnik</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-full border-2 border-blue-500" /> Napastnik</span>
    </div>
  );
}
