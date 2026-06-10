import { cookies } from "next/headers";

export type Locale = "pl" | "en";

const LOCALES: Locale[] = ["pl", "en"];
const DEFAULT_LOCALE: Locale = "pl";
const COOKIE = "wcp_lang";

/** Słownik tłumaczeń. Klucze to angielskie krótkie identyfikatory. */
export const DICT = {
  // Navigation
  "nav.matches":         { pl: "Mecze",                    en: "Matches" },
  "nav.myPredictions":   { pl: "Moje typy",                en: "My picks" },
  "nav.champion":        { pl: "Typ na mistrza",           en: "Champion pick" },
  "nav.groups":          { pl: "Grupy",                    en: "Groups" },
  "nav.bracket":         { pl: "Drabinka",                 en: "Bracket" },
  "nav.ranking":         { pl: "Ranking",                  en: "Ranking" },
  "nav.stats":           { pl: "Statystyki",               en: "Stats" },
  "nav.leagues":         { pl: "Ligi",                     en: "Leagues" },
  "nav.profile":         { pl: "Profil",                   en: "Profile" },
  "nav.admin":           { pl: "Admin",                    en: "Admin" },
  "nav.more":            { pl: "Więcej",                   en: "More" },

  // Common
  "common.login":        { pl: "Zaloguj",                  en: "Log in" },
  "common.logout":       { pl: "Wyloguj się",              en: "Log out" },
  "common.cancel":       { pl: "Anuluj",                   en: "Cancel" },
  "common.save":         { pl: "Zapisz",                   en: "Save" },
  "common.back":         { pl: "Wstecz",                   en: "Back" },
  "common.loading":      { pl: "Ładowanie...",             en: "Loading..." },
  "common.points":       { pl: "pkt",                      en: "pts" },
  "common.players":      { pl: "graczy",                   en: "players" },
  "common.player":       { pl: "gracz",                    en: "player" },

  // Login
  "login.title":         { pl: "Zaloguj się",              en: "Sign in" },
  "login.signupTitle":   { pl: "Załóż konto",              en: "Create account" },
  "login.tabs.signin":   { pl: "Logowanie",                en: "Sign in" },
  "login.tabs.signup":   { pl: "Rejestracja",              en: "Sign up" },
  "login.nickname":      { pl: "Nick",                     en: "Nickname" },
  "login.password":      { pl: "Hasło",                    en: "Password" },
  "login.inviteCode":    { pl: "Kod ligi",                 en: "League code" },
  "login.pickChampion":  { pl: "Mistrz turnieju",          en: "Tournament champion" },
  "login.pickAvatar":    { pl: "Wybierz awatar",           en: "Pick avatar" },
  "login.submit":        { pl: "Wejdź",                    en: "Enter" },
  "login.signupSubmit":  { pl: "Wskakuję do gry",          en: "Join the game" },
  "login.noAccount":     { pl: "Nie masz konta?",          en: "No account?" },
  "login.createOne":     { pl: "Załóż je",                 en: "Create one" },

  // Dashboard
  "dashboard.title":         { pl: "Mecze",                       en: "Matches" },
  "dashboard.subtitle":      { pl: "Typuj poniżej. Blokada 5 minut przed gwizdkiem.", en: "Pick below. Locks 5 minutes before kickoff." },
  "dashboard.today":         { pl: "Dzisiejsze mecze",            en: "Today's matches" },
  "dashboard.noToday":       { pl: "Hola hola, mundial się jeszcze nie zaczął", en: "Hola hola, the World Cup hasn't started yet" },
  "dashboard.noTodayDesc":   { pl: "Dziś nie ma żadnego meczu. Wracaj za parę dni 😎", en: "No matches today. Come back in a few days 😎" },
  "dashboard.matchday":      { pl: "Kolejka",                     en: "Matchday" },
  "dashboard.pickChampion":  { pl: "Wybierz mistrza turnieju",    en: "Pick the tournament champion" },
  "dashboard.pickChampDesc": { pl: "+10 pkt jeśli trafisz. Można zmieniać do końca fazy grupowej.", en: "+10 pts if correct. You can change until group stage ends." },
  "dashboard.nextMatch":     { pl: "Najbliższy mecz",             en: "Next match" },

  // Match page
  "match.yourPick":          { pl: "Twój typ",                    en: "Your pick" },
  "match.firstTeamToScore":  { pl: "Pierwsza drużyna która strzeli bramkę", en: "First team to score" },
  "match.firstScorer":       { pl: "Pierwszy strzelec meczu",     en: "First goalscorer" },
  "match.noPick":            { pl: "- nie wybieram -",            en: "- skip -" },
  "match.boostTitle":        { pl: "Boost x3 ⚡",                 en: "Boost x3 ⚡" },
  "match.savePick":          { pl: "Zapisz typ",                  en: "Save pick" },
  "match.matchChat":         { pl: "💬 Czat meczowy",             en: "💬 Match chat" },
  "match.writeSomething":    { pl: "Napisz coś...",               en: "Write something..." },
  "match.send":              { pl: "Wyślij",                      en: "Send" },
  "match.noComments":        { pl: "Brak komentarzy. Rzuć pierwszą zaczepkę 🔥", en: "No comments. Drop the first one 🔥" },
  "match.othersPicks":       { pl: "👀 Typy innych",              en: "👀 Others' picks" },
  "match.acceptedTip":       { pl: "Zaakceptowano ✓",             en: "Saved ✓" },
  "match.noPickChip":        { pl: "Brak typu",                   en: "No pick" },

  // Profile
  "profile.title":           { pl: "Profil",                      en: "Profile" },
  "profile.stats":           { pl: "Statystyki",                  en: "Stats" },
  "profile.accuracy":        { pl: "Celność",                     en: "Accuracy" },
  "profile.avgPerMatch":     { pl: "Średnia/mecz",                en: "Avg/match" },
  "profile.exactHits":       { pl: "Dokładne wyniki",             en: "Exact scores" },
  "profile.scorerHits":      { pl: "Trafieni strzelcy",           en: "Scorer hits" },
  "profile.longestStreak":   { pl: "Najdłuższa seria",            en: "Longest streak" },
  "profile.boostsUsed":      { pl: "Udane boosty",                en: "Successful boosts" },
  "profile.changePassword":  { pl: "🔒 Zmień hasło",              en: "🔒 Change password" },
  "profile.changeTheme":     { pl: "Tryb",                        en: "Theme" },
  "profile.language":        { pl: "Język",                       en: "Language" },
  "profile.leagues":         { pl: "Ligi",                        en: "Leagues" },
  "profile.manage":          { pl: "Zarządzaj",                   en: "Manage" },
  "profile.badges":          { pl: "Odznaki",                     en: "Badges" },
  "profile.styleTitle":      { pl: "Twój styl typowania",         en: "Your prediction style" },

  // Footer
  "footer":                  { pl: "Aplikacja wykonana przez rpisonfire & Claude Code na Mistrzostwa Świata 2026 w piłce nożnej ⚽",
                               en: "Built by rpisonfire & Claude Code for the 2026 FIFA World Cup ⚽" },
} as const;

export type DictKey = keyof typeof DICT;

export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get(COOKIE)?.value as Locale | undefined;
  return LOCALES.includes(v as Locale) ? (v as Locale) : DEFAULT_LOCALE;
}

export async function setLocale(locale: Locale) {
  const c = await cookies();
  c.set(COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}

/** Tłumaczenie pojedynczego klucza */
export function tDict(key: DictKey, locale: Locale): string {
  const entry = DICT[key];
  if (!entry) return key;
  return entry[locale] ?? entry.pl;
}

/** Wygodny helper - zwraca funkcję t() dla danego locale */
export async function getT() {
  const locale = await getLocale();
  return (key: DictKey) => tDict(key, locale);
}
