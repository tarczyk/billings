# billings

Odczyt stanu liczników mediów (prąd, woda zimna/ciepła, c.o.) ze zdjęć w Google Drive, z zapisem do arkusza Google Sheets. Rozpoznawanie przez Gemini API.

## Architektura

```
Google Drive (folder surowe)
  ├── prad/           → zdjęcia licznika prądu
  ├── woda-zimna/
  ├── woda-ciepla/
  └── c.o./
         ↓  przetworzNoweLiczniki()
    Gemini API (OCR + klasyfikacja)
         ↓
Google Sheets (wiersz: data, typ, wartość, folder, plik, URL)
         ↓
Google Drive (folder archiwum) – przemianowany plik
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
| `najem.js` | Główna logika: skan folderów, analiza Gemini, zapis do arkusza |
| `appsscript.json` | Manifest (strefa czasowa, runtime V8) |

## Uruchomienie w arkuszu

Funkcja wejściowa: `przetworzNoweLiczniki()`. Można ją przypiąć do menu niestandardowego lub triggera czasowego w edytorze Apps Script.

## ID folderów Drive

Skonfigurowane w `najem.js`:

- **Surowe** – zdjęcia do przetworzenia (podfoldery wg typu medium)
- **Archiwum** – przetworzone pliki z nową nazwą
