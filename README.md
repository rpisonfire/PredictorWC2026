# ⚽ WC Predictor 2026

[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![Vercel](https://img.shields.io/badge/Vercel-Hosting-000000?style=for-the-badge&logo=vercel)](https://vercel.com/)

Niekomercyjna aplikacja internetowa służąca do typowania wyników meczów Mistrzostw Świata 2026, zaprojektowana dla zamkniętej grupy użytkowników. Projekt funkcjonuje jako aplikacja PWA (Progressive Web App) na urządzeniach mobilnych, oferując tryb pełnoekranowy, powiadomienia push oraz dedykowany interfejs graficzny nawiązujący do stylistyki turniejowej (tablice wyników LED, kolekcjonerskie karty jako etykiety graczy w rankingu oraz dedykowane tło stadionu).

🔗 **Live demo**: [wc-predictor-one.vercel.app](https://wc-predictor-one.vercel.app)

---

## 🎨 Warstwa wizualna

* 🏟️ **Dedykowane tło stadionu** – widok płyty boiska z lotu ptaka (pasy murawy, linie boczne oraz reflektory). Tło automatycznie adaptuje się do motywu systemowego: wariant nocny dla *dark mode* oraz wariant dzienny dla *light mode*.
* 🇺🇸🇨🇦🇲🇽 **Motyw gospodarzy turnieju** – gradient reprezentujący kraje organizujące Mistrzostwa Świata, zaimplementowany w górnym pasku nawigacyjnym oraz jako akcent elementów rozwijanych i kafelków informacyjnych.
* 📺 **Stadionowe tablice LED** – ujednolicona stylistyka tablic wyników zastosowana w sekcjach statystyk, tabelach liderów, komponentach rozwijanych oraz widżecie ekranu głównego.
* 🃏 **Karty kolekcjonerskie** – profile użytkowników stylizowane na wzór fizycznych naklejek z efektem połysku (*foil shine*). Kolorystyka ramek zależy od zajmowanej pozycji w rankingu (miejsce #1 – złoto, #2 – srebro, #3 – brąz, pozostałe pozycje na podstawie przypisanego stylu).
* ⚡ **Mikroanimacje** – rotacja piłki w logotypie, animacje powiewających flag, pulsujący wskaźnik transmisji na żywo (LIVE), sygnalizacja aktywnych mnożników punktowych oraz sekcja wyróżnionego meczu z dynamicznym oświetleniem.
* 🍔 **Sidebar tunnel-entry** – otwarcie bocznego menu uruchamia płynną animację imitującą wyjście zawodników z tunelu stadionowego.
* 🎉 **Moduł celebracji gola** – pełnoekranowa animacja „GOOOOL!” wywoływana globalnie w momencie zatwierdzenia wyniku przez administratora.

---

## ✨ Funkcjonalności systemu

### Panel użytkownika
* 🎯 **Typowanie meczów** – wprowadzanie dokładnego wyniku, wskazanie pierwszej drużyny zdobywającej bramkę oraz pierwszego strzelca meczu. Blokada anty-spoilerowa aktywuje się automatycznie na 5 minut przed oficjalnym rozpoczęciem spotkania.
* ⚡ **Mnożnik "Boost x3"** – możliwość wyboru jednego meczu w danej kolejce, którego punktacja zostanie potrojona. Wybór może być modyfikowany wielokrotnie aż do momentu zablokowania typów.
* 🏆 **Typowanie mistrza turnieju** – wskazanie triumfatora całego turnieju (bonus o wartości +10 punktów). Blokada dokonywania wyboru następuje w momencie rozpoczęcia fazy 1/16 finału.
* 📺 **Personalny widget dashboardu** – zintegrowany moduł 3-w-1 prezentujący najbliższe spotkanie, aktualny awans lub spadek w rankingu oraz zestawienie punktowe z ostatniego rozegranego meczu.
* 📊 **Rankingi** – tabela ogólna (wyróżniająca top 3 użytkowników w formie kart Panini oraz pozostałych w wersji kompaktowej) oraz tabele dedykowane dla poszczególnych kolejek wraz z oznaczeniem użycia mnożnika.
* 📈 **Statystyki turniejowe** – zestawienia analityczne obejmujące pozycję lidera, najczęściej typowane wyniki, popularne rozkłady punktów, style typowania, wykorzystanie „Złotego boosta” oraz wykresy przebiegu rywalizacji.
* ⚔️ **Moduł porównawczy (H2H)** – bezpośrednie zestawienie statystyk z wybranym użytkownikiem, zawierające porównanie wyników mecz po meczu.
* 🃏 **Profil użytkownika** – indywidualna karta Panini zawierająca awatar, przypisany styl gry, szczegółowe statystyki oraz zdobyte odznaki.
* 🔮 **Wisdom of the crowd** – agregacja danych prezentująca anonimowo trzy najczęściej typowane wyniki danego spotkania przed momentem jego zablokowania.
* 📈 **Wskaźnik formy zespołów** – prezentacja wyników (W/D/L) w ramach turnieju (od 2. kolejki) wraz z miniaturami flag przeciwników.
* 💬 **System komentarzy** – dedykowany moduł dyskusyjny pod każdym wydarzeniem meczowym, umożliwiający interakcję między użytkownikami.
* ⏱️ **Zegar odliczający (Reveal countdown)** – stadionowy licznik wskazujący czas pozostały do publicznego odsłonięcia typów innych graczy (czas rozpoczęcia meczu + 45 minut).
* 👀 **Wgląd w typy innych użytkowników** – pełna analityka przyznanych punktów w podziale na kategorie z weryfikacją poprawności (✅/❌).
* 🎁 **Tournament Wrapped** – generowane po meczu finałowym podsumowanie statystyczne całego turnieju w formacie inspirowanym zestawieniami rocznymi platform streamingowych.
* 🌍 **Automatyzacja tabel i drabinki** – tabele grupowe oraz faza pucharowa są przeliczane automatycznie na podstawie wprowadzanych wyników końcowych.
* 🏟️ **Obsługa wielu lig** – możliwość tworzenia niezależnych podgrup i klasyfikacji dla różnych społeczności użytkowników.
* 🌙 **Zarządzanie motywem** – pełne wsparcie dla trybu ciemnego (Dark) i jasnego (Light) wraz z dostosowaniem grafik tła.
* 🔔 **Powiadomienia push** – implementacja standardu Web Push przy użyciu kluczy VAPID, zapewniająca poprawne działanie również w środowisku iOS PWA.
* 📱 **Standard PWA** – możliwość instalacji aplikacji na ekranie głównym urządzenia (Add to Home Screen) z zaawansowaną konfiguracją Service Workera (wersja v4 z mechanizmem timeoutów zapobiegającym serwowaniu nieaktualnych plików cache).

### 🎖️ System odznak w rankingu

**Odznaki skumulowane** (trwałe przypisanie do profilu użytkownika):
* 🎯 **Snajper** – zarejestrowanie minimum 3 dokładnych wyników w trakcie turnieju.
* 👑 **Król strzelców** – poprawne wskazanie minimum 5 strzelców bramek.
* ⚡ **Mistrzowski boost** – zdobycie punktów za dokładny wynik przy aktywnym mnożniku x3.

**Odznaki dynamiczne** (odbierane lub nadawane w zależności od bieżących wyników):
* 🔥 **Gorący** – utrzymanie serii minimum 3 meczów z rzędu ze zdobyczą punktową ≥5.
* 🧊 **Lodowaty** – zdobycie 0 punktów w ostatnim rozegranym meczu.

### Panel administracyjny
* 🛠️ **Zarządzanie wynikami** – wprowadzanie rezultatów z wykorzystaniem dynamicznie zwijanych sekcji kolejek (kolejka aktywna pozostaje otwarta, mecze archiwalne są automatycznie minimalizowane). Kafelki meczowe zaprojektowano w stylistyce tablic LED.
* 👥 **Zarządzanie bazą użytkowników** – podgląd profili wraz ze wskaźnikami aktywności (data ostatniego typu), opcja usuwania kont (usuwanie kaskadowe w bazie danych), resetowanie haseł oraz możliwość ręcznej edycji typów gracza.
* 🔄 **Synchronizacja danych** – moduł ręcznego wywoływania zapytania do API [football-data.org](https://www.football-data.org/) (harmonogram zadań cron pozostaje domyślnie wyłączony).
* ✅ **System powiadomień i celebracji** – wywołanie komunikatów typu Toast oraz pełnoekranowej animacji bramki po pomyślnym zapisie danych.
* 🔔 **Komunikaty push** – masowe wysyłanie powiadomień do wszystkich zarejestrowanych urządzeń lub do pojedynczego użytkownika.
* 🔒 **Ochrona przed atakami typu Brute Force** – automatyczna blokada konta na 15 minut po 5 nieudanych próbach logowania (konto administratora jest wyłączone z mechanizmu blokady).

### System punktacji

| Kryterium trafienia | Punkty |
| :--- | :---: |
| Dokładny wynik (pełna kaskada) | **5** |
| Różnica bramek | **3** |
| Wskazanie zwycięzcy lub remisu | **2** |
| **Bonusy sumowane (additive do wyniku kaskady)** | |
| Liczba bramek gospodarzy | **+1** |
| Liczba bramek gości | **+1** |
| Pierwsza drużyna zdobywająca bramkę | **+2** |
| Pierwszy strzelec meczu | **+5** |
| **Mnożnik Boost x3** | Mnoży całkowitą liczbę punktów z meczu × 3 |
| **Poprawny mistrz turnieju** | **+10** |

*Przykład kalkulacji:*
* Typ: `2:1`, Wynik: `2:0` -> Różnica bramek poprawna (+3 pkt), bramki gospodarzy poprawne (+1 pkt) -> Łącznie **4 punkty**.
* Typ: `2:0`, Wynik: `2:0` -> Wynik dokładny (+5 pkt), bramki gospodarzy (+1 pkt), bramki gości (+1 pkt) -> Łącznie **7 punktów**.

---

## 🚀 Stos technologiczny

* **Next.js 15** (App Router oraz Server Actions jako warstwa komunikacji)
* **Prisma ORM** wraz z bazą danych **PostgreSQL** (hostowaną na platformie [Neon](https://neon.tech) w planie darmowym, region Frankfurt)
* **Tailwind CSS** wspomagany zmiennymi CSS do zarządzania motywami graficznymi
* **Vercel** jako platforma hostingowa (wariant Hobby, region funkcji **fra1** – kolokacja z bazą danych Neon)
* **Web Push API** z wykorzystaniem identyfikacji VAPID
* **football-data.org API** (plan darmowy – obsługa Mistrzostw Świata w pakiecie One)
* **FlagCDN** oraz **Twemoji** jako biblioteki zapewniające spójne renderowanie flag i emotikonów niezależnie od systemu operacyjnego
* **@vercel/analytics** oraz **@vercel/speed-insights** – monitorowanie wskaźników RUM oraz Web Vitals
* Pełna statyczna typizacja z wykorzystaniem języka **TypeScript**

---

## 🔧 Konfiguracja środowiska lokalnego

### Wymagania systemowe
* Node.js wersja 20 lub wyższa
* Instancja bazy danych PostgreSQL (zalecane użycie darmowego konta w usłudze Neon.tech)
* Klucz API serwisu [football-data.org](https://www.football-data.org/client/register)

### Procedura instalacji

1. **Klonowanie repozytorium**
   ```bash
   git clone https://github.com/rpisonfire/wc-predictor.git
   cd wc-predictor
   ```

2. **Instalacja zależności pakietów**
   ```bash
   npm install
   ```

3. **Konfiguracja zmiennych środowiskowych**
   ```bash
   cp .env.example .env
   ```
   W pliku `.env` należy zdefiniować następujące zmienne:
   ```env
   DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
   FOOTBALL_DATA_TOKEN="twój_token_z_football-data.org"
   CRON_SECRET="losowy_string_32_znaki"         # Generowanie: openssl rand -hex 32
   NEXT_PUBLIC_VAPID_PUBLIC_KEY="public_key"     # Generowanie: npx web-push generate-vapid-keys --json
   VAPID_PRIVATE_KEY="private_key"
   VAPID_SUBJECT="mailto:twój@email.com"
   ```

4. **Wykonanie migracji struktury bazy danych**
   ```bash
   npx prisma db push
   ```

5. **Pobranie danych startowych (drużyny, zawodnicy, terminarz) z API** (~6 minut ze względu na rate limit)
   ```bash
   npm run db:fd
   ```

6. **Inicjalizacja domyślnej ligi**
   ```bash
   npx tsx scripts/seed-league.ts
   ```

7. **Uruchomienie serwera deweloperskiego**
   ```bash
   npm run dev
   ```

Aplikacja będzie dostępna pod adresem `http://localhost:3000`. Rejestracja nowych użytkowników wymaga użycia kodu dostępu `MUNDIAL2026` (lub wartości zdefiniowanej w skrypcie `seed-league.ts`).

#### Nadawanie uprawnień administratora
```bash
npx tsx scripts/make-admin.ts <twój_nick>
```
Po ponownym uwierzytelnieniu w aplikacji, w menu bocznym pojawi się dedykowany panel administracyjny.

---

## ☁️ Wdrożenie produkcyjne (Vercel)

1. **Repozytorium zdalne** – wypchnięcie kodu do platformy GitHub.
2. **Inicjalizacja projektu** – import repozytorium w panelu kontrolnym Vercel.
3. **Zmienne środowiskowe** – wprowadzenie konfiguracji z pliku `.env` dla środowisk Production oraz Preview.
4. **Wybór regionu obliczeniowego** – kluczowy krok optymalizacyjny. Należy ustawić region funkcji na `fra1` (Frankfurt) w sekcji *Settings -> Functions*. Kolokacja z bazą danych Neon eliminuje opóźnienia sieciowe (spadek opóźnień z ~100ms do ~5ms), redukując czas wykonywania funkcji bezserwerowych.
5. **Harmonogram zadań (Cron)** – domyślnie wyłączony. Automatyczną synchronizację można aktywować poprzez definicję ścieżki w pliku `vercel.json`:
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/sync",
         "schedule": "0 5 * * *"
       }
     ]
   }
   ```

---

## 💰 Optymalizacja darmowych limitów (Free Tier)

Aplikacja została zoptymalizowana pod kątem rygorystycznych limitów usług Neon Free Plan (100 CU-hrs/miesiąc) oraz Vercel Hobby (360 GB-hrs Fluid Memory):
* **Kolokacja zasobów** – wykorzystanie regionu `fra1` minimalizuje czas aktywności procesora.
* **Strategia pamięci podręcznej (ISR)** – zastosowano zróżnicowane okna czasowe rewalidacji: tabele liderów oraz grupy (15 minut), faza pucharowa (30 minut), statystyki i typy użytkownika (5 minut). Każda operacja zapisu wyniku przez administratora natychmiastowo unieważnia (invaliduje) powiązane ścieżki cache.
* **Ograniczenie zapytań w tle** – wyłączono mechanizm ciągłego odpytywania bazy (polling) na ekranie głównym oraz widoku meczu.
* **Zarządzanie instancją Neon** – zaleca się ustawienie automatycznego skalowania w zakresie 0.25 ↔ 0.5 CU oraz czasu przejścia w stan uśpienia (suspend timeout) na wartość 5 minut bezpośrednio w konsoli Neon.
* **Konfiguracja Service Workera** – wprowadzenie restrykcyjnych limitów czasu oczekiwania na żądania sieciowe zapobiega zawieszaniu się aplikacji w przypadku problemów z łącznością.

---

## 🛠️ Skrypty pomocnicze

| Komenda | Opis działania |
| :--- | :--- |
| `npm run dev` | Uruchomienie środowiska deweloperskiego wraz z czyszczeniem katalogu `.next`. |
| `npm run build` | Kompilacja wersji produkcyjnej aplikacji. |
| `npm run db:fd` | Pobranie struktur danych z API football-data.org. Działa w trybie bezpiecznym (nie usuwa typów użytkowników). Flaga `-- --wipe` czyści całą bazę danych. |
| `npm run db:fixtures` | Generowanie danych demonstracyjnych (mocków) na potrzeby testów. |
| `npx tsx scripts/seed-league.ts` | Inicjalizacja domyślnej struktury ligowej MUNDIAL2026. |
| `npx tsx scripts/make-admin.ts <nick>` | Przypisanie flagi administratora do wskazanego konta. |
| `npx tsx scripts/unlock.ts <nick>` | Odblokowanie konta zablokowanego przez system brute-force (flaga `--all` odblokowuje wszystkich). |
| `npx tsx scripts/fix-flags.ts` | Korekta powiązań ikon flag narodowych w bazie danych po imporcie. |
| `npx tsx scripts/wipe.ts` | Usunięcie danych transakcyjnych (typy, komentarze, użytkownicy). Wydzielona struktura drużyn zostaje zachowana. |

---

## 🏗️ Architektura katalogów

```
src/
├── app/                      # Struktura routingu Next.js App Router i Server Actions
│   ├── (auth)/login          # Moduł uwierzytelniania (wykorzystanie useActionState)
│   ├── dashboard              # Widok główny: terminarz, odliczanie, zarządzanie mnożnikami
│   ├── match/[id]             # Szczegóły wydarzenia, wprowadzanie typów, czat
│   ├── champion              # Wybór mistrza turnieju
│   ├── groups                # Tabele grupowe kalkulowane w czasie rzeczywistym
│   ├── bracket                # Graficzna prezentacja fazy pucharowej
│   ├── leaderboard           # Klasyfikacja ogólna oraz zestawienia cząstkowe
│   ├── stats                  # Zaawansowana analityka i statystyki turniejowe
│   ├── leagues                # Zarządzanie wieloma ligami (funkcjonalność niezależna)
│   ├── profile                # Profil użytkownika w formie karty Panini z historią odznak
│   ├── admin                  # Panel zarządzania systemem dla administratora
│   ├── admin/user/[userId]    # Narzędzie administracyjnej edycji typów gracza
│   ├── compare                # Wybór użytkownika do porównania statystyk
│   ├── compare/[userId]       # Widok zestawienia bezpośredniego H2H
│   ├── wrapped                # Podsumowanie turnieju (blokada dostępu do meczu finałowego)
│   ├── my-predictions        # Historia typów użytkownika wraz z wykresem formy
│   └── api/                  # Punkty końcowe API (odświeżanie danych, subskrypcje Push)
├── components/                # Komponenty interfejsu użytkownika wielokrotnego użytku
│   ├── Sidebar                # Menu boczne z animacją staggered tunnel-entry
│   ├── MobileNav              # Dolny pasek nawigacyjny dedykowany dla urządzeń mobilnych
│   ├── PaniniCard            # Komponent karty zawodnika w wariantach Large oraz Mini
│   ├── PersonalScoreboard    # Zintegrowany widżet tablicy wyników LED
│   ├── PlayerPicker          # Wyszukiwarka i selektor zawodników z autouzupełnianiem
│   └── ...                    # Pozostałe komponenty interfejsu (Flagi, Liczniki, Efekty)
├── lib/                      # Warstwa logiczna, narzędziowa i konfiguracyjna
│   ├── db.ts                  # Implementacja wzorca Singleton dla klienta Prisma
│   ├── session.ts            # Mechanizmy autoryzacji i zabezpieczeń sesji
│   ├── scoring.ts            # Silnik obliczeniowy punktacji turniejowej
│   ├── stats.ts              # Algorytmy obliczania pozycji, stylów gry i przyznawania odznak
│   └── ...                    # Pomocnicze moduły logiczne
├── scripts/                  # Skrypty administracyjne i uruchomieniowe
└── prisma/schema.prisma      # Definicja schematu bazy danych ORM Prisma
```

---

## 🔐 Bezpieczeństwo i ochrona danych

* **Przechowywanie haseł** – kryptograficzne haszowanie algorytmem `scrypt` z wykorzystaniem soli (wbudowany moduł kryptograficzny Node.js).
* **Zarządzanie sesją** – mechanizm ciasteczek z flagami `httpOnly` oraz `sameSite=lax`.
* **Zabezpieczenie przed CSRF** – natywne mechanizmy ochronne wbudowane w Next.js Server Actions.
* **Ograniczanie prób autoryzacji** – blokada konta na okres 15 minut po odnotowaniu 5 nieudanych logowań. Poziom administracyjny posiada stałe opóźnienie 1.5 sekundy na odpowiedź przy błędnym uwierzytelnieniu w celu minimalizacji ryzyka ataków słownikowych.
* **Integracja bazodanowa** – parametryzacja wszystkich zapytań SQL poprzez warstwę Prisma ORM, zapewniająca całkowitą odporność na ataki typu SQL Injection.

---

## 🎨 Moduły personalizacji i modyfikacji

Wszystkie kluczowe parametry aplikacji zostały odseparowane i mogą być łatwo modyfikowane:
* **Paleta kolorów** – definicje kolorów `wc.*` znajdują się w pliku `tailwind.config.ts` oraz jako zmienne CSS w `globals.css`.
* **Reguły punktacji** – modyfikacji wag punktowych można dokonać bezpośrednio w module `src/lib/scoring.ts`.
* **Wartość mnożnika** – konfiguracja potęgowania punktów dostępna jest w pliku `src/app/match/[id]/page.tsx`.
* **Logika przyznawania odznak** – progi punktowe oraz warunki nadawania odznak zdefiniowano w funkcji `badgesFor()` w pliku `src/lib/stats.ts`.
* **Widoczność typów** – czas publicznego udostępnienia typów innych użytkowników konfigurowany jest w komponencie meczu (wartość domyślna: czas rozpoczęcia + 45 minut).

---

## 🐛 Rozwiązywanie problemów (Troubleshooting)

* **Błąd kompilacji: `Cannot find module './541.js'`**
  Należy usunąć wygenerowany katalog podręczny i ponownie uruchomić proces:
  ```bash
  rm -rf .next && npm run dev
  ```
* **Brak powiadomień push na urządzeniach z systemem iOS**
  System operacyjny iOS wymaga, aby aplikacja PWA została dodana do ekranu głównego (*Udostępnij -> Dodaj do ekranu początkowego*). W przeglądarce Safari powiadomienia Web Push są zablokowane.
* **Brak automatycznej synchronizacji danych**
  Harmonogram zadań (cron) jest domyślnie dezaktywowany. W przypadku jego włączenia należy zweryfikować konfigurację pliku `vercel.json` oraz obecność zmiennej `CRON_SECRET` w panelu Vercel.
* **Przekroczenie limitów jednostek obliczeniowych (CU) w usłudze Neon**
  W panelu administracyjnym Neon należy zmniejszyć parametr *Max CU* do wartości 0.5 oraz zredukować *Suspend timeout* do 5 minut. Taka konfiguracja jest w pełni wystarczająca do obsługi 50 aktywnych użytkowników przy włączonym buforowaniu ISR.
* **Przypadkowe uszkodzenie struktury danych po imporcie**
  W przypadku problemów z wyświetlaniem flag na systemach operacyjnych Windows należy upewnić się, że renderowanie odbywa się za pomocą dedykowanego komponentu `<Flag>`, który przetwarza pliki SVG z FlagCDN. System Windows nie posiada natywnego wsparcia dla flag w formacie emoji.

---

## 📝 Licencja

Projekt o charakterze prywatnym i niekomercyjnym, przeznaczony do użytku własnego. Wykorzystanie komercyjne wymaga uprzedniego kontaktu z autorem projektu.

---

## 🙏 Podziękowania i źródła danych

* **Data Provider:** [football-data.org](https://www.football-data.org/)
* **Usługa flag narodowych SVG:** [FlagCDN](https://flagcdn.com/)
* **Biblioteka emotikonów:** [Twemoji](https://twemoji.twitter.com/)
* **Infrastruktura bazodanowa:** [Neon](https://neon.tech/)
* **Środowisko uruchomieniowe i hosting:** [Vercel](https://vercel.com/)

---
Projekt zrealizowany przy użyciu platformy *Claude Code* na potrzeby obsługi Mistrzostw Świata 2026 w piłce nożnej mężczyzn.
