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
- **Prisma** + Postgres
- **Tailwind CSS** w barwach MŚ 2026 (USA · Kanada · Meksyk)

## Jak uruchomić projekt na nowym komputerze (Lokalnie)

### Wymagania:
- **Node.js** (rekomendowana wersja 20+)
- Dostęp do bazy **PostgreSQL** (możesz użyć lokalnej bazy z Dockera lub darmowej chmurowej bazy np. na [Neon.tech](https://neon.tech/) lub [Supabase](https://supabase.com/)).

### Krok po kroku:

1. **Sklonuj repozytorium**
   ```bash
   git clone <link_do_repozytorium>
   cd wc-predictor
   ```

2. **Zainstaluj zależności**
   ```bash
   npm install
   ```

3. **Skonfiguruj zmienne środowiskowe**
   Skopiuj przykładowy plik `.env.example` i nazwij go `.env`:
   ```bash
   cp .env.example .env
   ```
   Następnie otwórz plik `.env` i uzupełnij `DATABASE_URL` linkiem do Twojej bazy danych PostgreSQL.

4. **Przygotuj bazę danych i wgraj dane testowe**
   Zbuduj schemat bazy i wygeneruj klienta Prisma:
   ```bash
   npx prisma db push
   ```
   Wgraj początkowe dane (drużyny, stadiony, itp.):
   ```bash
   npm run db:seed
   ```

5. **Uruchom aplikację**
   ```bash
   npm run dev
   ```
   Aplikacja będzie dostępna pod adresem: [http://localhost:3000](http://localhost:3000)

## Uprawnienia Administratora

Z poziomu panelu administratora (`/admin`) możesz wpisywać wyniki meczów, co spowoduje automatyczne przeliczenie punktów wszystkich graczy. 

Aby nadać sobie uprawnienia administratora:
1. Zarejestruj się w aplikacji używając swojego loginu (np. "TwojNick").
2. W terminalu uruchom skrypt:
   ```bash
   npx tsx scripts/make-admin.ts TwojNick
   ```
3. Odśwież stronę aplikacji. Masz teraz dostęp do zakładki **Admin**.

## Deploy na Vercel

1. Wejdź na [vercel.com/new](https://vercel.com/new), wybierz to repozytorium z GitHub.
2. Stwórz darmową bazę Postgres (np. na Neon lub Supabase) i skopiuj `DATABASE_URL`.
3. W ustawieniach projektu na Vercel dodaj zmienną środowiskową: `DATABASE_URL`.
4. Wykonaj Deploy. 
5. Po pierwszym zbudowaniu aplikacji, wejdź na zakładkę **Deployments → ...** i w terminalu Vercel CLI (lub po prostu z własnego komputera podłączonego do produkcyjnej bazy) wykonaj:
   ```bash
   npx prisma db push && npm run db:seed
   ```
