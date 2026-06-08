export function PlayerAvatar({
  name,
  photoUrl,
  size = 32,
}: { name: string; photoUrl?: string | null; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const dim = { width: size, height: size };

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        style={dim}
        className="rounded-full object-cover bg-app-hover border border-app shrink-0"
        loading="lazy"
      />
    );
  }
  return (
    <span
      style={{ ...dim, fontSize: size * 0.4 }}
      className="rounded-full bg-wc-blue/30 border border-app inline-flex items-center justify-center font-black text-white shrink-0"
    >
      {initials}
    </span>
  );
}
