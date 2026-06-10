# ⚽ WC Predictor 2026

Prywatna apka do typowania meczów Mistrzostw Świata 2026 dla Ciebie i znajomych. Działa jako PWA na telefonie, pełnoekranowa, z powiadomieniami push.

🔗 **Live demo**: [wc-predictor-one.vercel.app](https://wc-predictor-one.vercel.app)

---

## ✨ Co potrafi

### Dla graczy
- 🎯 **Typowanie meczów** — dokładny wynik, pierwsza drużyna ze strzałem, pierwszy strzelec
- ⚡ **Boost x3** — jeden mecz na kolejkę z potrójnymi punktami (możesz zmieniać między meczami do gwizdka)
- 🏆 **Typ na mistrza** — wybierasz zwycięzcę całego turnieju (+10 pkt bonus)
- 📊 **Ranking** — ogólny i per kolejka, z odznakami i wykresem formy
- 📈 **Statystyki** — Twój styl typowania, lider rankingu, najczęstsze typy, ranking w czasie
- 💬 **Czat pod każdym meczem** — komentarze i trash talk
- 👀 **Typy innych** — po zablokowaniu meczu zobaczysz co wytypowali pozostali
- 🌍 **Tabele grupowe + drabinka pucharowa** — auto-liczone z wyników
- 🏟️ **Multi-liga** — możesz tworzyć osobne ligi dla różnych grup znajomych
- 🌙 **Dark/Light mode** + 🇵🇱/🇬🇧 **PL/EN** (częściowe tłumaczenie)
- 🔔 **Powiadomienia push** — Web Push z VAPID, działa też na iOS PWA
- 📱 **PWA** — instalacja jak natywna apka (Add to Home Screen)

### Dla admina (Ciebie)
- 🛠️ Panel admina: wpisywanie wyników, zarządzanie ligami, ustawianie mistrza turnieju
- 🔄 Synchronizacja wyników z [football-data.org](https://www.football-data.org/) — cron raz dziennie o 7:00 + ręczny przycisk
- 🔔 Wysyłanie powiadomień do wybranego usera lub wszystkich
- 🔒 Reset hasła kumpla, dodawanie ludzi do ligi
- 🛡️ Ochrona przed bruteforce (5 prób → 15 min blokada; admin niblokowalny)

### Punktacja
| Co trafisz | Punkty |
|---|---|
| Dokładny wynik | **5** |
| Różnica bramek | **3** |
| Sam zwycięzca / remis | **2** |
| Pierwsza drużyna ze strzałem | **2** |
| Pierwszy strzelec meczu | **5** |
| **Boost x3** | mnoży punkty meczu × 3 |
| **Trafiony mistrz turnieju** | +10 |

---

## 🚀 Stack

- **Next.js 15** (App Router + Server Actions)
- **Prisma** + **PostgreSQL** ([Neon](https://neon.tech) free tier)
- **Tailwind CSS** + CSS variables dla motywów
- **Vercel** hosting (Hobby = free)
- **Web Push** (VAPID) dla powiadomień
- **football-data.org** API (free tier — WC w plan One)
- **FlagCDN** + **Twemoji** dla cross-platform flag/emoji
- TypeScript wszędzie

---

## 🔧 Setup lokalny

### Wymagania
- Node.js 20+
- Baza PostgreSQL (najprościej: darmowy [Neon.tech](https://neon.tech))
- Konto na [football-data.org](https://www.football-data.org/client/register) (free, do pobierania danych WC)
- Opcjonalnie: konto Vercel + GitHub do deployu

### Krok po kroku

```bash
# 1. Klonuj repo
git clone https://github.com/rpisonfire/wc-predictor.git
cd wc-predictor

# 2. Instaluj
npm install

# 3. Skonfiguruj .env
cp .env.example .env
```

Edytuj `.env` i wklej wartości:

```env
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
FOOTBALL_DATA_TOKEN="twój_token_z_football-data.org"
CRON_SECRET="losowy_string_32_znaki"          # openssl rand -hex 32
NEXT_PUBLIC_VAPID_PUBLIC_KEY="public_key"     # npx web-push generate-vapid-keys --json
VAPID_PRIVATE_KEY="private_key"
VAPID_SUBJECT="mailto:twój@email.com"
```

```bash
# 4. Migracja bazy
npx prisma db push

# 5. Pobierz drużyny + zawodników + terminarz z football-data.org (~6 min, rate limit)
npm run db:fd

# 6. Stwórz pierwszą ligę
npx tsx scripts/seed-league.ts

# 7. Odpal
npm run dev
```

Otwórz [localhost:3000](http://localhost:3000). Zarejestruj się kodem **MUNDIAL2026** (lub własnym z seed-league.ts).

### Zostań adminem

```bash
npx tsx scripts/make-admin.ts <twój_nick>
```

Wyloguj się i zaloguj ponownie — w sidebarze pojawi się złoty link **Admin**.

---

## ☁️ Deploy na Vercel

1. **Pushnij repo na GitHub**
   ```bash
   git remote add origin git@github.com:USER/REPO.git
   git push -u origin main
   ```

2. **Vercel** → New Project → Import z GitHuba

3. **Environment Variables** (dla `Production` *i* `Preview`):
   ```
   DATABASE_URL
   FOOTBALL_DATA_TOKEN
   CRON_SECRET
   NEXT_PUBLIC_VAPID_PUBLIC_KEY
   VAPID_PRIVATE_KEY
   VAPID_SUBJECT
   ```

4. **Deploy** → automatycznie zbuduje + odpali

5. **Vercel Cron** (`vercel.json`) jest już skonfigurowany — raz dziennie o 7:00 czasu PL synchronizuje wyniki.

---

## 🛠️ Skrypty pomocnicze

| Komenda | Co robi |
|---|---|
| `npm run dev` | Dev server na :3000 (auto-czyści `.next`) |
| `npm run build` | Production build |
| `npm run db:fd` | Pobiera drużyny + zawodników + terminarz z football-data.org. **Tryb bezpieczny** — nie kasuje predykcji. Dodaj `-- --wipe` żeby wyczyścić wszystko (DO TESTÓW). |
| `npm run db:fixtures` | Tworzy mocki meczów (do dev/test). |
| `npx tsx scripts/seed-league.ts` | Tworzy domyślną ligę `MUNDIAL2026`. |
| `npx tsx scripts/make-admin.ts <nick>` | Nadaje uprawnienia admina. |
| `npx tsx scripts/unlock.ts <nick>` | Odblokowuje konto po bruteforce. `--all` = wszyscy. |
| `npx tsx scripts/fix-flags.ts` | Naprawia flagi w bazie po imporcie. |
| `npx tsx scripts/wipe.ts` | **Wyciera** wszystkie typy/komentarze/użytkowników/mecze. Drużyny zostają. |

---

## 🏗️ Architektura

```
src/
├── app/                       # Next.js App Router pages + actions
│   ├── (auth)/login          # Logowanie/rejestracja (useActionState)
│   ├── dashboard             # Mecze + countdown + dziś + boost button
│   ├── match/[id]            # Szczegóły meczu, typowanie, czat
│   ├── champion              # Wybór mistrza turnieju
│   ├── groups                # Tabele grupowe (auto-liczone)
│   ├── bracket               # Drabinka pucharowa
│   ├── leaderboard           # Ranking ogólny + per kolejka
│   ├── stats                 # Statystyki turnieju + ranking w czasie
│   ├── leagues               # Multi-liga: stwórz/dołącz/opuść
│   ├── profile               # Stats konta, styl, motyw, język, hasło
│   ├── admin                 # Panel admina (mecze/userzy/ligi/mistrz/push)
│   ├── my-predictions        # Lista typów z wykresem formy
│   └── api/
│       ├── cron/sync         # Cron Vercel + ręczny sync z football-data
│       ├── push/subscribe    # Subskrypcje Web Push
│       ├── push/test         # Test notyfikacji
│       └── language          # Przełącznik PL/EN
├── components/               # Reusable UI
│   ├── Sidebar, MobileNav    # Nawigacja desktop + mobile
│   ├── MatchCard*            # Karty meczów
│   ├── PlayerPicker          # Custom picker zawodników z search
│   ├── PlayerAvatar          # Awatar z kolorem pozycji
│   ├── Flag                  # SVG flagi przez FlagCDN
│   ├── Emoji                 # Cross-platform emoji przez Twemoji
│   ├── Countdown             # Timer do kickoffu
│   ├── RankingChart          # Liniowy wykres rankingu
│   ├── Sparkline             # Mini-wykres formy
│   ├── Toast / AutoToast     # Powiadomienia akcji
│   ├── ThemeToggle           # Dark/Light
│   ├── LanguageToggle        # PL/EN
│   ├── LiveChip              # 🔴 LIVE indicator
│   ├── AutoRefresh           # Polling z pause na hidden tab
│   ├── NotificationsButton   # Subskrypcja push
│   └── RegisterSW            # Service worker registration
├── lib/                      # Logika i utils
│   ├── db.ts                 # Singleton Prisma client
│   ├── session.ts            # Auth (requireAuth, requireAdmin)
│   ├── password.ts           # scrypt hashing
│   ├── scoring.ts            # Silnik punktacji
│   ├── stats.ts              # Ranking, leaderboard, styles
│   ├── groups.ts             # Klasyfikacja grupowa
│   ├── championLock.ts       # Lock typu mistrza po fazie grupowej
│   ├── matchStatus.ts        # isLive() helper
│   ├── dates.ts              # Formatowanie w Europe/Warsaw
│   ├── push.ts               # Web Push (sendPushToAll, sendPushToUser)
│   ├── syncResults.ts        # Pobieranie wyników z football-data
│   ├── i18n.ts               # Dictionary PL/EN
│   └── stadiums.ts           # Dane stadionów MŚ 2026
├── scripts/                  # Skrypty dev/admin (npx tsx)
└── prisma/schema.prisma      # Schema DB
```

---

## 🔐 Bezpieczeństwo

- **Hasła**: scrypt z solą (Node built-in)
- **Sesje**: cookie `httpOnly` + `sameSite=lax`
- **CSRF**: wbudowana ochrona Server Actions w Next.js
- **Rate limit**: 5 prób logowania → blokada na 15 min
- **Admin protection**: niemożliwy do zablokowania, 1.5s opóźnienia per nieudana próba
- **Push secrets**: VAPID keys jako env vars
- **CRON_SECRET**: chroni `/api/cron/sync` przed publicznym wywołaniem
- **Prisma**: parametryzowane queries (brak SQL injection)
- **HTTPS**: wymuszone przez Vercel

---

## 🎨 Personalizacja

- **Kolory** w `tailwind.config.ts` (paleta `wc.*`) i `globals.css` (CSS vars)
- **Tłumaczenia** w `src/lib/i18n.ts` — dodaj nowe klucze do `DICT`
- **Skoring** w `src/lib/scoring.ts` — zmień liczbę punktów per akcja
- **Boost** w `src/app/match/[id]/page.tsx` — zmień mnożnik z 3
- **Ikony PWA** generowane przez `npx tsx scripts/generate-icons.ts` (z SVG źródłowego)

---

## 🐛 Troubleshooting

**"Cannot find module './541.js'"** po buildzie → wyczyść `.next`:
```bash
rm -rf .next && npm run dev
```

**Push notifications nie działają na iPhone** → musi być dodana do home screen (Share → Add to Home Screen). Inaczej iOS nie wspiera.

**Cron nie odpala się** → sprawdź `vercel.json` (`"schedule": "0 5 * * *"` = 7:00 PL) i czy `CRON_SECRET` jest w Vercel env.

**Konto zablokowane (5 nieudanych prób)** → `npx tsx scripts/unlock.ts <nick>` z prod DATABASE_URL.

**Flagi pokazują białe prostokąty na Windows** → sprawdź czy używany jest komponent `<Flag>` (renderuje SVG z FlagCDN). Natywne emoji flagi są zepsute w Windows.

**Po `npm run db:fd` zniknęły typy** → odpaliłeś z flagą `--wipe`. Bez niej (tryb bezpieczny) typy zostają.

---

## 📝 Licencja

Projekt prywatny, do użytku własnego z kumplami. Nie do komercyjnego użycia bez kontaktu z autorem.

---

## 🙏 Podziękowania

- [football-data.org](https://www.football-data.org/) — darmowe dane WC 2026
- [FlagCDN](https://flagcdn.com/) — SVG flagi narodowe
- [Twemoji](https://twemoji.twitter.com/) — cross-platform emoji
- [Neon](https://neon.tech/) — darmowy Postgres
- [Vercel](https://vercel.com/) — darmowy hosting

Zrobione z ⚽ przez **rpisonfire** & **Claude Code** na Mistrzostwa Świata 2026 🇺🇸 🇨🇦 🇲🇽
