export type Stadium = {
  name: string;
  city: string;
  country: "USA" | "Kanada" | "Meksyk";
  flag: string;
  capacity: number;
  note?: string;
};

export const STADIUMS: Stadium[] = [
  // Meksyk
  { name: "Estadio Banorte",        city: "Ciudad de México", country: "Meksyk", flag: "🇲🇽", capacity: 83264, note: "Mecz otwarcia" },
  { name: "Estadio Akron",          city: "Guadalajara",      country: "Meksyk", flag: "🇲🇽", capacity: 49850 },
  { name: "Estadio BBVA",           city: "Monterrey",        country: "Meksyk", flag: "🇲🇽", capacity: 53500 },
  // Kanada
  { name: "BMO Field",              city: "Toronto",          country: "Kanada", flag: "🇨🇦", capacity: 45500 },
  { name: "BC Place",               city: "Vancouver",        country: "Kanada", flag: "🇨🇦", capacity: 54500 },
  // USA
  { name: "MetLife Stadium",        city: "East Rutherford",  country: "USA", flag: "🇺🇸", capacity: 82500, note: "Finał" },
  { name: "AT&T Stadium",           city: "Arlington",        country: "USA", flag: "🇺🇸", capacity: 80000 },
  { name: "Arrowhead Stadium",      city: "Kansas City",      country: "USA", flag: "🇺🇸", capacity: 76416 },
  { name: "NRG Stadium",            city: "Houston",          country: "USA", flag: "🇺🇸", capacity: 72220 },
  { name: "Mercedes-Benz Stadium",  city: "Atlanta",          country: "USA", flag: "🇺🇸", capacity: 71000 },
  { name: "SoFi Stadium",           city: "Inglewood",        country: "USA", flag: "🇺🇸", capacity: 70240 },
  { name: "Lincoln Financial Field",city: "Filadelfia",       country: "USA", flag: "🇺🇸", capacity: 69879 },
  { name: "Lumen Field",            city: "Seattle",          country: "USA", flag: "🇺🇸", capacity: 68740 },
  { name: "Levi's Stadium",         city: "Santa Clara",      country: "USA", flag: "🇺🇸", capacity: 68500 },
  { name: "Hard Rock Stadium",      city: "Miami Gardens",    country: "USA", flag: "🇺🇸", capacity: 65326 },
  { name: "Gillette Stadium",       city: "Foxborough",       country: "USA", flag: "🇺🇸", capacity: 65878 },
];

// Aliasy nazw z football-data -> nasze STADIUMS (FD używa czasem starych/innych nazw)
const VENUE_ALIASES: Record<string, string> = {
  "estadio azteca": "Estadio Banorte",
  "azteca": "Estadio Banorte",
  "estadio guadalajara": "Estadio Akron",
  "new york new jersey": "MetLife Stadium",
  "dallas": "AT&T Stadium",
  "kansas city": "Arrowhead Stadium",
  "san francisco bay area": "Levi's Stadium",
  "los angeles": "SoFi Stadium",
};

/** Mapuje nazwę venue z football-data na wpis STADIUMS (dopasowanie luźne). */
export function stadiumForVenue(venue: string | null | undefined): Stadium | null {
  if (!venue) return null;
  const v = venue.toLowerCase().trim();
  // 1. Dokładne / zawierające dopasowanie po nazwie
  const direct = STADIUMS.find(
    (s) => v.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(v),
  );
  if (direct) return direct;
  // 2. Aliasy FD
  for (const [alias, name] of Object.entries(VENUE_ALIASES)) {
    if (v.includes(alias)) {
      return STADIUMS.find((s) => s.name === name) ?? null;
    }
  }
  // 3. Po mieście
  return STADIUMS.find((s) => v.includes(s.city.toLowerCase())) ?? null;
}
