# ⚽ WC Predictor 2026

Prywatna apka do typowania meczów Mistrzostw Świata 2026 dla Ciebie i znajomych. Działa jako PWA na telefonie, pełnoekranowa, z powiadomieniami push.

🔗 **Live demo**: [wc-predictor-one.vercel.app](https://wc-predictor-one.vercel.app)

---

## ✨ Co potrafi

### Dla graczy
- 🎯 **Typowanie meczów** — dokładny wynik, pierwsza drużyna ze strzałem, pierwszy strzelec (z anty-spoiler lock 5 min przed gwizdkiem)
- ⚡ **Boost x3** — jeden mecz na kolejkę z potrójnymi punktami (możesz zmieniać między meczami do gwizdka)
- 🏆 **Typ na mistrza** — wybierasz zwycięzcę całego turnieju (+10 pkt bonus, lock przy starcie 1/16 finału)
- 📊 **Ranking** — ogólny i per kolejka, z odznakami i wykresem formy (sparkline per gracz, hover dla szczegółów meczu)
- 📈 **Statystyki turnieju** — lider, najczęstsze typy, najpopularniejsze wyniki, style typowania, "Złoty boost", najbardziej kontrowersyjny mecz
- 🔮 **Wisdom of the crowd** — przed lockiem widzisz top 3 najczęściej typowane wyniki (anonimowo)
- 📈 **Forma drużyn** — W/D/L z meczów WC (pokazuje się od 2. kolejki), z mini-flagami przeciwników
- 💬 **Czat pod każdym meczem** — komentarze i trash talk
- 👀 **Typy innych** — po zablokowaniu meczu zobaczysz co wytypowali pozostali, z możliwością rozwinięcia breakdown punktów
- 🎉 **Confetti** — przy trafieniu dokładnego wyniku 🦈
- 🌍 **Tabele grupowe + drabinka pucharowa** — auto-liczone z wyników
- 🏟️ **Multi-liga** — możesz tworzyć osobne ligi dla różnych grup znajomych
- 🌙 **Dark/Light mode**
- 🔔 **Powiadomienia push** — Web Push z VAPID, działa też na iOS PWA
- 📱 **PWA** — instalacja jak natywna apka (Add to Home Screen, anty-stale-cache SW)

### 🎖️ Odznaki w rankingu

**Kumulacyjne** (raz zdobyte, zostają w profilu):
- 🎯 **Snajper** — 3+ dokładne wyniki w turnieju
- 👑 **Król strzelców** — 5+ trafionych strzelców
- ⚡ **Mistrzowski boost** — trafiony dokładny wynik na mnożniku x3

**Dynamiczne** (znikają gdy stan się zmienia):
- 🔥 **Gorący** — 3+ ostatnie mecze pod rząd z ≥5 pkt
- 🧊 **Lodowaty** — 0 pkt w ostatnim rozegranym meczu

### Dla admina (Ciebie)
- 🛠️ Panel admina: wpisywanie wyników z **collapsible kolejkami** (tylko aktualna otwarta, rozegrane schowane na dole)
- 🔄 Ręczny przycisk sync z [football-data.org](https://www.football-data.org/) (cron domyślnie wyłączony — wpisuj wyniki ręcznie)
- ✅ **Toast po zapisie wyniku** ("Wynik dla meczu zapisany - punkty zostały rozdane")
- 🔔 Wysyłanie powiadomień do wybranego usera lub wszystkich
- 🔒 Reset hasła kumpla, dodawanie ludzi do ligi
- 🛡️ Ochrona przed bruteforce (5 prób → 15 min blokada; admin niblokowalny)

### Punktacja
| Co trafisz | Punkty |
|---|---|
| Dokładny wynik (cała kaskada) | **5** |
| Różnica bramek | **3** |
| Sam zwycięzca / remis | **2** |
| **Bonusy additive (sumują się z kaskadą)** | |
| Trafione bramki gospodarzy | **+1** |
| Trafione bramki gości | **+1** |
| Pierwsza drużyna ze strzałem | **+2** |
| Pierwszy strzelec meczu | **+5** |
| **Boost x3** | mnoży punkty meczu × 3 |
| **Trafiony mistrz turnieju** | +10 |

Przykład: typ 2:1, wynik 2:0 → różnica 1, ale gospodarze 2:2 → kaskada 0 + 1 (gospodarze) = 1 pkt. Typ 2:0, wynik 2:0 → 5 (dokładny) + 1 + 1 = **7 pkt**.

---

## 🚀 Stack

- **Next.js 15** (App Router + Server Actions)
- **Prisma** + **PostgreSQL** ([Neon](https://neon.tech) free tier, Frankfurt region)
- **Tailwind CSS** + CSS variables dla motywów
- **Vercel** hosting (Hobby = free, **fra1** Function Region = co-located z Neon)
- **Web Push** (VAPID) dla powiadomień
- **football-data.org** API (free tier — WC w plan One)
- **FlagCDN** + **Twemoji** dla cross-platform flag/emoji
- **@vercel/analytics** + **@vercel/speed-insights** — RUM i Web Vitals
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

5. **Function Region: `fra1`** (Frankfurt) — Vercel Project → Settings → Functions. Co-located z Neon (jeśli też w Frankfurt) → latency Vercel↔Neon spada z ~100ms (USA) do ~5ms → realna apka 2-3× szybsza i mniej GB-hrs zżytych.

6. **Cron sync jest domyślnie wyłączony** — wpisuj wyniki ręcznie z panelu admina. Jeśli chcesz włączyć codzienny sync z football-data.org, dodaj sekcję `crons` w `vercel.json`:
   ```json
   "crons": [{ "path": "/api/cron/sync", "schedule": "0 5 * * *" }]
   ```

### 💰 Optymalizacja zużycia (free tier)

Apka jest tunowana pod **Neon Free Plan** (100 CU-hrs/mc) i **Vercel Hobby** (360 GB-hrs Fluid Memory). Co się dzieje pod maską:

- **Function Region fra1** ← najważniejszy klucz: co-location z Neon = krótszy czas funkcji = mniej GB-hrs naliczane
- **Memory cap** w `vercel.json` — większość stron ma alokację **256 MB** zamiast domyślnych 1024 MB (4× mniej GB-hrs); admin/cron 512 MB
- **ISR cache** — leaderboard/groups 15 min, bracket 30 min, stats/my-predictions 5 min. Każda akcja admina (wpisanie wyniku) **natychmiast invaliduje** wszystkie zależne strony
- **Auto-refresh wyłączony** — match page i dashboard nie pollują w tle (kumple sami F5)
- **Neon autoscaling** — ustaw `0.25 ↔ 0.5 CU` (nie 2 CU domyślne) + suspend 5 min, w Neon Console
- **Cold Start Prevention: Disabled** — bo to płatna funkcja która utrzymuje funkcje ciepłe = ciągle naliczają GB-hrs
- **Service Worker timeouty** (3.5s navigate, 5s background) — gdy Vercel ma chwilowe lagi, SW poddaje się szybko i serwuje cache zamiast wisieć

### 📊 Observability

- **Web Analytics** w Vercel (~2500 wizyt/mc na Hobby) — top strony, urządzenia, kraje
- **Speed Insights** w Vercel (~10k pomiarów/mc) — Real Experience Score, LCP/FCP/CLS/INP/TTFB
- Po przekroczeniu limitu: zbieranie wstrzymane do końca miesiąca, apka działa normalnie, **nic nie płacisz**

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
│   ├── stats                 # Statystyki turnieju (lider, styl typowania, top wyniki)
│   ├── leagues               # Multi-liga: stwórz/dołącz/opuść
│   ├── profile               # Stats konta, styl, motyw, hasło
│   ├── admin                 # Panel admina (mecze/userzy/ligi/mistrz/push)
│   ├── my-predictions        # Lista typów z wykresem formy
│   └── api/
│       ├── cron/sync         # Ręczny sync z football-data (cron domyślnie wyłączony)
│       ├── push/subscribe    # Subskrypcje Web Push
│       └── push/test         # Test notyfikacji
├── components/               # Reusable UI
│   ├── Sidebar, MobileNav    # Nawigacja desktop + mobile
│   ├── MatchCard*            # Karty meczów
│   ├── PlayerPicker          # Custom picker zawodników z search
│   ├── TeamRadioPicker       # Picker drużyny (pierwszy gol) z flagą
│   ├── PlayerAvatar          # Awatar z kolorem pozycji (inicjały gdy brak photoUrl)
│   ├── Flag                  # SVG flagi przez FlagCDN
│   ├── Emoji                 # Cross-platform emoji przez Twemoji
│   ├── Countdown             # Timer do kickoffu
│   ├── Sparkline             # Mini-wykres formy
│   ├── UserPickSearch        # Search + expandable breakdown punktów typów innych
│   ├── ConfettiCelebration   # Konfetti po trafieniu dokładnego wyniku
│   ├── Toast / AutoToast     # Powiadomienia akcji
│   ├── ThemeToggle           # Dark/Light
│   ├── LiveChip              # 🔴 LIVE indicator
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
│   ├── syncResults.ts        # Pobieranie wyników z football-data + revalidatePath po sync
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
- **Skoring** w `src/lib/scoring.ts` — zmień liczbę punktów per akcja
- **Boost** w `src/app/match/[id]/page.tsx` — zmień mnożnik z 3
- **Odznaki** w `src/lib/stats.ts` → `badgesFor()` — dodaj/usuń badge, zmień progi
- **Ikony PWA** generowane przez `npx tsx scripts/generate-icons.ts` (z SVG źródłowego)
- **ISR cache windows** — każda strona z `export const revalidate = N` w `src/app/<page>/page.tsx`
- **Memory per route** — `vercel.json` → `functions`
- **Service Worker** (timeouty, precache) — `public/sw.js`. Bump `CACHE = "wcp-vN"` żeby wymusić aktywację nowej wersji.

---

## 🐛 Troubleshooting

**"Cannot find module './541.js'"** po buildzie → wyczyść `.next`:
```bash
rm -rf .next && npm run dev
```

**Push notifications nie działają na iPhone** → musi być dodana do home screen (Share → Add to Home Screen). Inaczej iOS nie wspiera.

**Cron nie odpala się** → cron jest domyślnie wyłączony. Jeśli go włączyłeś, sprawdź `vercel.json` (`"schedule": "0 5 * * *"` = 7:00 PL) i czy `CRON_SECRET` jest w Vercel env.

**Wysokie zużycie Neon CU** → w Neon Console → Branches → Edit: zmniejsz `Max CU` z 2 na 0.5 i `Suspend timeout` na 5 min. Dla 50 użytkowników z ISR cache wystarczy.

**Konto zablokowane (5 nieudanych prób)** → `npx tsx scripts/unlock.ts <nick>` z prod DATABASE_URL.

**Flagi pokazują białe prostokąty na Windows** → sprawdź czy używany jest komponent `<Flag>` (renderuje SVG z FlagCDN). Natywne emoji flagi są zepsute w Windows.

**Po `npm run db:fd` zniknęły typy** → odpaliłeś z flagą `--wipe`. Bez niej (tryb bezpieczny) typy zostają.

**Biały ekran u kumpli po deployu** → stary Service Worker serwuje cache z odniesieniami do nieistniejących chunków JS. Fix: DevTools → Application → Service Workers → Unregister + Clear site data. Nowa wersja SW (od `wcp-v3`) ma timeouty fetch i fallback do cache - nie powinno się powtórzyć.

**`ERR_CONNECTION_TIMED_OUT` na Vercelu, ale "It's just you"** → lokalny ISP ma chwilowy problem z routing do Vercel edge. Spróbuj VPN, mobile data, lub `1.1.1.1` jako DNS. Vercel działa, Ty nie możesz dojść.

**Admin: wpisuję wynik a zapisuje się 0:0** → był to bug z duplikowanymi `name="homeScore"` w mobile + desktop layout (przed `MatchForm` refactorem). Naprawione - jeden uniwersalny layout.

**Zawodnik kontuzjowany** → możesz zmienić nazwę w Prisma Studio (`npx prisma studio`) lub SQL: `UPDATE "Player" SET name = '...', "photoUrl" = NULL WHERE id = 'fd-XXX';`. Predykcje referują przez `id`, więc istniejące typy automatycznie wskażą zastępcę - przekaż info kumplom.

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
