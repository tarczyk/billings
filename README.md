# billings

Odczyt stanu liczników mediów (prąd, woda zimna/ciepła, c.o.) ze zdjęć w Google Drive, z zapisem do arkusza Google Sheets i automatycznym rozliczeniem w arkuszu najmu. Rozpoznawanie przez Gemini API.

## Architektura

```
Google Drive (folder odczyty-biezace, płasko – bez podfolderów)
  └── zdjęcia liczników (typ rozpoznaje Gemini, nie nazwa folderu)
         ↓  przetworzNoweLiczniki()
    Gemini API (OCR + klasyfikacja: PRAD / WODA_ZIMNA / WODA_CIEPLA / CO)
         ↓
    walidacja: odczyt musi być wyższy niż ostatni zapisany dla danego typu
         ↓
Google Sheets „odczyty-rozpoznane” (wiersz: data, typ, wartość, folder, plik, fileId, URL)
         ↓
Google Sheets „Rozliczenia_najem” → zakładka „Odczyty” (dopisanie odczytu, dedup po dacie+medium+stanie)
         │        (błąd zapisu → zakładka „Log”)
         ↓
Google Drive (folder odczyty-archiwum) – plik przemianowany na `{data}_{typ}_{fileId8}.jpg`
         ↓
E-mail z raportem (przetworzone / problemy) na konto wykonujące skrypt
```

## Wymagania

- [Node.js](https://nodejs.org/) (do `clasp`)
- Konto Google z dostępem do projektu Apps Script
- Klucz [Gemini API](https://aistudio.google.com/apikey)

## Konfiguracja (jednorazowo)

```bash
npm install
clasp login
```

Ustaw klucz API w Google Apps Script (nie trzymaj go w kodzie):

1. Otwórz projekt: `npm run open`
2. **Projekt → Ustawienia projektu → Właściwości skryptu**
3. Dodaj: `GEMINI_API_KEY` = twój klucz z Google AI Studio
4. Opcjonalnie: `GEMINI_MODEL` = nazwa modelu (domyślnie `gemini-3.5-flash`)

## CI/CD – GitHub → Google Apps Script

Każdy push na `main` (w tym zmiany od GitHub Copilot) automatycznie wgrywa kod do Apps Script przez GitHub Actions.

### Jednorazowa konfiguracja GitHub Secrets

1. **Włącz Apps Script API**  
   https://script.google.com/home/usersettings → Google Apps Script API → **Włączone**

2. **Zaloguj clasp lokalnie** (jeśli jeszcze nie):
   ```bash
   npm install
   clasp login
   ```

3. **Skopiuj credentials do GitHub Secret:**
   ```bash
   cat ~/.clasprc.json
   ```
   W repozytorium GitHub: **Settings → Secrets and variables → Actions → New repository secret**
   - Nazwa: `CLASPRC_JSON`
   - Wartość: cała zawartość pliku `~/.clasprc.json`

4. **Wypchnij kod na GitHub** – workflow `.github/workflows/deploy-gas.yml` uruchomi się przy pierwszym pushu na `main`.

5. **Sprawdź deploy:** zakładka **Actions** w repozytorium GitHub. Możesz też uruchomić ręcznie: **Actions → Deploy to Google Apps Script → Run workflow**.

### Typowe błędy CI

| Błąd | Rozwiązanie |
|------|-------------|
| Secret `CLASPRC_JSON` not found | Dodaj secret w Settings → Secrets |
| 401 Unauthorized | Token wygasł – `clasp login` lokalnie, zaktualizuj secret |
| Script API not enabled | Włącz API w usersettings (link powyżej) |
| Push OK, kod się nie zmienił | Sprawdź `scriptId` w `.clasp.json` |

> Token OAuth w `CLASPRC_JSON` wygasa okresowo. Przy błędzie 401 odśwież: `clasp login` → skopiuj nowy `~/.clasprc.json` → zaktualizuj secret.

## Workflow lokalny (opcjonalnie)

```bash
npm run pull    # pobierz z chmury
npm run push    # wgraj ręcznie (CI robi to automatycznie)
npm run open    # edytor w przeglądarce
npm run run     # uruchom funkcję (wymaga clasp run + GCP)
```

Typowy cykl z Copilotem: edycja w GitHub → commit + push na `main` → Actions wgrywa do GAS → test w arkuszu.

## Struktura `src/`

| Plik | Opis |
|------|------|
| `najem.js` | Główna logika: skan folderu, analiza Gemini, zapis do arkusza, sync z Rozliczenia_najem, raport e-mail |
| `appsscript.json` | Manifest (strefa czasowa, runtime V8) |

## Funkcje w `najem.js`

| Funkcja | Przeznaczenie |
|---------|---------------|
| `przetworzNoweLiczniki()` | Główna funkcja wejściowa – przetwarza nowe zdjęcia (patrz architektura powyżej) |
| `konfigurujTrigger()` | Uruchom raz ręcznie – ustawia trigger czasowy: `przetworzNoweLiczniki` codziennie o 20:00 |
| `diagnostykaZasobow()` | Uruchom ręcznie – sprawdza dostęp do folderów/arkuszy i liczbę zdjęć czekających na przetworzenie |
| `sprawdzSynchronizacjeOdczytow()` | Uruchom ręcznie – porównuje „odczyty-rozpoznane” z „Rozliczenia_najem/Odczyty” (klucz: data + medium + stan), wynik w Dzienniku |
| `naprawStylWierszyOdczyty()` | Uruchom ręcznie, jednorazowo – naprawia formatowanie wierszy w „Rozliczenia_najem/Odczyty” (kopiuje styl z wiersza powyżej) |

## Uruchomienie w arkuszu

Funkcja wejściowa: `przetworzNoweLiczniki()`. Można ją przypiąć do menu niestandardowego lub uruchomić `konfigurujTrigger()` (trigger czasowy, codziennie 20:00).

Po każdym uruchomieniu skrypt wysyła e-mail z podsumowaniem (przetworzone odczyty + ewentualne problemy) na konto wykonujące skrypt.

## Walidacja odczytów

- Typ licznika rozpoznaje Gemini na podstawie treści zdjęcia (nie nazwa folderu/podfolderu).
- Nowy odczyt musi być **wyższy** niż ostatnia zapisana wartość dla danego typu – w przeciwnym razie jest odrzucany i zgłaszany jako problem w raporcie.
- Odczyty CO w arkuszu „odczyty-rozpoznane” są ×1000 względem wartości w GJ zapisywanej do „Rozliczenia_najem” (przelicznik w `stanDlaRozliczenia_`).
- Deduplikacja: po `fileId` (plik już przetworzony) oraz po kluczu data+medium+stan (wpis w Rozliczenia_najem/Odczyty).

## ID folderów i arkuszy Drive

Skonfigurowane w `najem.js`:

- **`FOLDER_BIEZACE_ID`** (odczyty-biezace) – zdjęcia do przetworzenia, folder płaski (bez podfolderów wg medium)
- **`FOLDER_ARCHIWUM_ID`** (odczyty-archiwum) – przetworzone pliki z nową nazwą
- **`SPREADSHEET_ID`** (odczyty-rozpoznane) – log wszystkich rozpoznanych odczytów
- **`ROZLICZENIA_SPREADSHEET_ID`** (Rozliczenia_najem) – docelowy arkusz rozliczeniowy, zakładki `Odczyty` i `Log`
