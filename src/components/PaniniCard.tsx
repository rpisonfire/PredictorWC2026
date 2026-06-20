import { Emoji } from "./Emoji";
import { Flag } from "./Flag";
import { teamColor } from "@/lib/teamColors";

export type PaniniData = {
  nickname: string;
  avatar: string;
  rank?: number | null;
  totalPoints: number;
  exactScoreHits?: number;
  scorerHits?: number;
  avgPointsPerMatch?: number;
  badges?: { emoji: string; label: string; description: string }[];
  styleLabel?: string;
  styleEmoji?: string;
  championFlag?: string | null;
  championShortCode?: string | null;
};

// Kolor karty zależy od pozycji w rankingu lub od championa
function cardTheme(rank: number | null | undefined, championShort?: string | null) {
  if (rank === 1) return {
    border: "linear-gradient(135deg, #FFD700, #FFA500, #FFD700)",
    label: "★ LEGEND ★",
    labelColor: "#FFD700",
    accentBg: "linear-gradient(135deg, #FFD700 0%, #B8860B 100%)",
    medalEmoji: "👑",
  };
  if (rank === 2) return {
    border: "linear-gradient(135deg, #E5E7EB, #9CA3AF, #E5E7EB)",
    label: "◆ SILVER ◆",
    labelColor: "#D1D5DB",
    accentBg: "linear-gradient(135deg, #E5E7EB 0%, #6B7280 100%)",
    medalEmoji: "🥈",
  };
  if (rank === 3) return {
    border: "linear-gradient(135deg, #D97706, #92400E, #D97706)",
    label: "♦ BRONZE ♦",
    labelColor: "#FBBF24",
    accentBg: "linear-gradient(135deg, #D97706 0%, #78350F 100%)",
    medalEmoji: "🥉",
  };
  // Reszta - kolor wg drużyny mistrza, fallback na czerwony
  const tc = teamColor(championShort);
  return {
    border: `linear-gradient(135deg, ${tc.primary}, ${tc.secondary ?? tc.primary}, ${tc.primary})`,
    label: "PLAYER CARD",
    labelColor: "#F1B434",
    accentBg: `linear-gradient(135deg, ${tc.primary} 0%, ${tc.secondary ?? tc.primary} 100%)`,
    medalEmoji: rank ? `#${String(rank).padStart(3, "0")}` : "—",
  };
}

/**
 * Pełnowymiarowa karta Panini - do /profile lub top 3 leaderboard.
 */
export function PaniniCardLarge({ data }: { data: PaniniData }) {
  const theme = cardTheme(data.rank, data.championShortCode);
  const isPodium = data.rank != null && data.rank <= 3;

  return (
    <div className="panini-card" style={{ background: theme.border }}>
      <div className="panini-inner">
        {/* Foil shine sweep */}
        <div className="panini-foil" />

        {/* Pattern diagonalne kreski */}
        <div className="panini-pattern" />

        {/* Header: card number + rank medal */}
        <div className="panini-header">
          <div className="panini-card-num">{theme.label}</div>
          <div className="panini-medal" style={{ background: theme.accentBg }}>
            {isPodium ? theme.medalEmoji : data.rank ? data.rank : "—"}
          </div>
        </div>

        {/* Avatar w aureoli */}
        <div className="panini-avatar-wrap">
          {data.rank === 1 && <div className="panini-aureola" />}
          <div className="panini-avatar" style={{ background: theme.accentBg }}>
            <Emoji char={data.avatar} size="2xl" alt={data.nickname} />
          </div>
        </div>

        {/* Name banner */}
        <div className="panini-name-banner">
          {data.championFlag && <Flag emoji={data.championFlag} size="sm" />}
          <span className="panini-name">{data.nickname.toUpperCase()}</span>
        </div>

        {/* Style / subtitle */}
        {data.styleLabel && (
          <div className="panini-subtitle">
            {data.styleEmoji} {data.styleLabel}
          </div>
        )}

        {/* Stats grid */}
        <div className="panini-stats">
          <Stat value={data.totalPoints} label="PKT" color="#F1B434" />
          {data.exactScoreHits != null && <Stat value={data.exactScoreHits} label="DOKŁADNE" color="#4ADE80" />}
          {data.avgPointsPerMatch != null && <Stat value={data.avgPointsPerMatch.toFixed(1)} label="ŚR./MECZ" color="#60A5FA" />}
          {data.scorerHits != null && <Stat value={data.scorerHits} label="STRZELCY" color="#F472B6" />}
        </div>

        {/* Badges */}
        {data.badges && data.badges.length > 0 && (
          <div className="panini-badges">
            {data.badges.map((b) => (
              <span key={b.label} title={`${b.label} - ${b.description}`} className="panini-badge">
                {b.emoji}
              </span>
            ))}
          </div>
        )}

        <div className="panini-footer">WC PREDICTOR 2026</div>
      </div>
    </div>
  );
}

/**
 * Kompaktowa karta - wiersz rankingu.
 */
export function PaniniCardMini({ data, isMe, href }: { data: PaniniData; isMe?: boolean; href?: string }) {
  const theme = cardTheme(data.rank, data.championShortCode);
  const Container: any = href ? require("next/link").default : "div";
  const containerProps = href ? { href } : {};

  return (
    <Container {...containerProps} className={`panini-mini ${isMe ? "is-me" : ""}`} style={{ background: theme.border }}>
      <div className="panini-mini-inner">
        <div className="panini-mini-rank" style={{ background: theme.accentBg }}>
          {data.rank ? data.rank : "—"}
        </div>
        <div className="panini-mini-avatar">
          <Emoji char={data.avatar} size="lg" alt={data.nickname} />
        </div>
        <div className="panini-mini-content">
          <div className="panini-mini-name">
            {data.nickname}
            {isMe && <span className="panini-mini-me">TY</span>}
            {data.badges?.slice(0, 4).map((b) => (
              <span key={b.label} title={`${b.label} - ${b.description}`} className="text-base">{b.emoji}</span>
            ))}
          </div>
          <div className="panini-mini-meta">
            {data.styleLabel && <span>{data.styleEmoji} {data.styleLabel}</span>}
            {data.exactScoreHits != null && data.exactScoreHits > 0 && <span>· 🎯 {data.exactScoreHits}</span>}
          </div>
        </div>
        <div className="panini-mini-pts">
          <span className="panini-mini-pts-val">{data.totalPoints}</span>
          <span className="panini-mini-pts-label">PKT</span>
        </div>
      </div>
    </Container>
  );
}

function Stat({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="panini-stat">
      <div className="panini-stat-val" style={{ color }}>{value}</div>
      <div className="panini-stat-label">{label}</div>
    </div>
  );
}
