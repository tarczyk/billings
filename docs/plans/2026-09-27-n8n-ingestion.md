# Plan: pozyskiwanie dokumentów źródłowych przez n8n

Status: zatwierdzony 2026-09-27, nie rozpoczęty.

Najpierw przeczytaj:
- `GLOSSARY.md` — terminy: dokument źródłowy, pozycja źródłowa / pozycja najemcy, `Ceny media`, `Faktury`.
- `docs/adr/0001-ceny-media-mirrors-source-documents.md`
- `docs/adr/0002-n8n-owns-ingestion-end-to-end.md`
- Wymaganie wstępne: krok 1 z `docs/plans/2026-09-27-water-tenant-rates.md` (nazwy źródłowe w `Ceny media`) — wykrywanie zmian dopasowuje się do tych nazw.

Środowisko: n8n w Dockerze na domowym serwerze właściciela (ciągle włączonym). Workflow eksportuje się przez `n8n export:workflow` do `n8n/workflows/` i commituje po każdej zmianie. Dane logowania (Google, e-BOK, Telegram) są wyłącznie w credentialach n8n, nigdy w repozytorium.

## Źródła i typy dokumentów

| Źródło | Typ | Format | Cel |
|---|---|---|---|
| Spółdzielnia (e-BOK marhalonline.pl → Kartoteki) | Naliczenie miesięczne | HTML (tekst preformatowany) | `Ceny media` — tylko zmiany |
| Spółdzielnia | Rozliczenie wody (półroczne) | HTML (tabela) | `Faktury` |
| Spółdzielnia | Rozliczenie C.O. (roczne) | HTML | `Faktury` |
| Tauron (e-BOK) | Faktura | nieznany — sprawdzić e-BOK; awaryjnie PDF + LLM | `Faktury` + stawka prądu w `Ceny media` |

Klucz dokumentu (kolumna `Źródło`): typ + okres — `NAL/2026-10`, `ROZ-WODA/2026-H1`, `ROZ-CO/2025`; Tauron: numer faktury. Obok zapisać link Dysku do pliku.

## v1 — ręczne pobranie, automatyczna analiza

1. Właściciel zapisuje stronę e-BOK skrótem Ctrl+S („tylko HTML”) do folderu inbox na Dysku (np. `dokumenty-biezace`); Tauron jako PDF, dopóki format nie jest znany.
2. n8n odpytuje folder; pomija pliki, których klucz dokumentu jest już przetworzony.
3. Parsowanie deterministyczne z HTML (bez LLM) dla dokumentów spółdzielni; ekstrakcja LLM tylko dla awaryjnego PDF-u Tauron.
4. Walidacja przed stagingiem; przy niepowodzeniu nie stagingować, wysłać e-mail z powodem:
   - każdy wiersz: stawka × ilość = kwota (±0,01 zł);
   - suma wierszy = suma dokumentu („RAZEM DO ZAPŁATY” / „RAZEM KOSZTY”);
   - nieznane nazwy pozycji oznaczać jako „nowa pozycja”, nigdy na siłę dopasowywać.
5. Wykrywanie zmian dla naliczenia miesięcznego: porównać każdy wiersz z otwartym wierszem (puste `Data_do`) w `Ceny media`. Stagingować tylko zmiany (nowa stawka od 1. dnia miesiąca dokumentu, poprzedni wiersz zamknięty dzień wcześniej) oraz nowe pozycje. Brak zmian → powiadomienie „bez zmian, suma zgodna”.
6. Staging do zakładki przeglądu `Dokumenty rozpoznane` z polem zatwierdzenia. n8n odpytuje zatwierdzone wiersze i promuje je do `Ceny media` / `Faktury`, potem archiwizuje plik.
7. Pipeline liczników w Apps Script (`src/najem.js`) działa bez zmian; zapisuje do `Odczyty`, n8n nie ingeruje.

Wymagania wstępne: przykładowe HTML każdego typu spółdzielczego w `n8n/samples/` (w `.gitignore` — dane osobowe). Właściciel sprawdza format e-BOK Tauron.

## v2 — zautomatyzowane pobieranie z e-BOK

- n8n loguje się do obu e-BOK-ów i pobiera ten sam HTML, który parser v1 już obsługuje (przeglądarka headless, np. kontener Browserless, jeśli zwykłe logowanie HTTP jest nierealne).
- Sprawdzić regulaminy każdego e-BOK pod kątem dostępu zautomatyzowanego; logowanie musi działać bez captchy/SMS.

## v3 — bot Telegram

- Zdjęcia liczników przez bota Telegram w n8n; migracja logiki `przetworzNoweLiczniki` (deduplikacja, kontrola rosnących odczytów, archiwum, raport) z Apps Script do n8n, potem wyłączenie triggera w Apps Script.
- Zatwierdzanie dokumentów ze stagingu przenosi się na przyciski w Telegramie (✅/❌).
- Publiczny HTTPS dla webhooka Telegram przez Cloudflare Tunnel (bez przekierowania portów na routerze).

## Dalsze kroki

- Zaktualizować model działania w `.cursor/skills/rental-sheet/SKILL.md`: n8n staje się systemem zapisującym do skoroszytu; zmiany układu w `Ceny media`, `Faktury`, `Dokumenty rozpoznane` trzeba uzgadniać z `n8n/workflows/`.
