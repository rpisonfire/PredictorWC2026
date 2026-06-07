const TZ = "Europe/Warsaw";

export function fmtDateTime(d: Date): string {
  // DD/MM HH:mm (bez roku - oszczędność miejsca na kafelkach)
  const date = d.toLocaleDateString("en-GB", { timeZone: TZ, day: "2-digit", month: "2-digit" });
  const time = d.toLocaleTimeString("pl-PL", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

export function fmtDateTimeLong(d: Date): string {
  return d.toLocaleString("pl-PL", { timeZone: TZ, dateStyle: "long", timeStyle: "short" });
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString("pl-PL", { timeZone: TZ });
}

/** YYYY-MM-DD w czasie warszawskim (do porównań „ten sam dzień") */
export function dayKey(d: Date): string {
  // pl-PL daje DD.MM.YYYY, lepiej iso przez sv-SE
  return d.toLocaleDateString("sv-SE", { timeZone: TZ });
}
