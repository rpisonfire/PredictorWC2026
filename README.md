# WC Predictor 2026 ⚽

Prywatna aplikacja do typowania meczów Mistrzostw Świata 2026 dla ciebie i znajomych.

## Co to potrafi

- 🎯 Typowanie **dokładnego wyniku**, **pierwszej drużyny, która strzeli**, i **pierwszego strzelca**
- ⚡ **Boost x3** — raz na kolejkę pomnóż swoje punkty z jednego meczu razy 3
- 🏆 Tabela ligi w czasie rzeczywistym
- 💬 Czat pod każdym meczem (trash talk!)
- 🎨 Profil z awatarem
- 🔒 Zamknięcie typowania **5 min przed gwizdkiem**
- 🇵🇱 Interfejs po polsku

## Punktacja

| Co trafisz | Punkty |
|---|---|
| Dokładny wynik | **5** |
| Różnica bramek | **3** |
| Sam zwycięzca / remis | **2** |
| Pierwsza drużyna ze strzałem | **2** |
| Pierwszy strzelec meczu | **5** |
| **Boost x3** | mnoży zdobyte punkty z meczu × 3 |

## Stack

- **Next.js 15** (App Router, Server Actions)
- **Prisma** + SQLite (lokalnie) / Postgres (produkcja)
- **Tailwind CSS** w barwach MŚ 2026 (USA · Kanada · Meksyk)
- Hosting: **Vercel**

## Uruchomienie lokalnie

```bash
# 1. Zainstaluj pakiety
npm install

# 2. Skonfiguruj zmienne
cp .env.example .env
# Otwórz .env i ustaw ADMIN_PASSWORD (np. "tajnehaslo123")

# 3. Stwórz bazę i wypełnij demo danymi
npx prisma db push
npm run db:seed

# 4. Odpal
npm run dev
```

Otwórz http://localhost:3000 — kod do testowej ligi: **MUNDIAL2026**

## Deploy na Vercel

1. Wrzuć projekt na GitHub:
   ```bash
   git init && git add . && git commit -m "init"
   gh repo create wc-predictor --private --source=. --push
   ```
2. Wejdź na [vercel.com/new](https://vercel.com/new), wybierz repo.
3. Stwórz darmową bazę Postgres (np. na [Neon](https://neon.tech) albo [Supabase](https://supabase.com)) — wklej `DATABASE_URL` w **Environment Variables** w Vercel.
4. **Zmień provider w `prisma/schema.prisma`** z `sqlite` na `postgresql` (lokalnie zostaw sqlite albo użyj dwóch plików schema).
5. Dodaj zmienne: `DATABASE_URL`, `ADMIN_PASSWORD`.
6. Deploy. Po pierwszym build wejdź na zakładkę **Deployments → ...** i w terminalu Vercel CLI zrób raz `npx prisma db push && npm run db:seed`, albo zrób to lokalnie z produkcyjnym `DATABASE_URL`.
7. Wyślij link kumplom + kod ligi 🚀

## Panel admina

Wejdź na `/admin`, podaj hasło z `ADMIN_PASSWORD`. Tam wpisujesz wyniki meczów — punkty wszystkich typujących przeliczają się automatycznie.

## Co dodać później

- Auto-pull wyników z [API-Football](https://www.api-football.com/) lub [football-data.org](https://www.football-data.org/)
- Wykresy formy (ostatnie 5 typów)
- Odznaki ("Król strzelców", "Trzy z rzędu")
- Predykcje całego turnieju (kto wygra cały Mundial)
- Multi-liga (różne grupy znajomych w jednej apce)
