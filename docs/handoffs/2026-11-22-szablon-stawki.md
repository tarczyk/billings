# Handoff 2026-11-22: Stawki najemcy i Szablon (kroki 1, 3, 4)

Repo: `/Users/tarczyk/GitReposPriv/billings`. Skoroszyt `rozliczenie-najem`, id `1vfrt1nmYMXcUie9C8CRCVVN39hfysj8drR24a8VzXDw` (pl_PL: separator argumentów `;`). Praca na arkuszu przez MCP `user-google-sheets`, wszystko pod skillem `rental-sheet`.

## Stan źródeł prawdy (nie powielam)
- Plan i statusy kroków: `docs/plans/2026-09-27-water-tenant-rates.md` (kroki 1, 3, 4 oznaczone jako wykonane, z wyjątkami; krok 4 „przełączenie nazw zakładek" — wykonany, patrz niżej).
- Punkt cofnięcia `Woda ciepla!E4:F4`: `docs/plans/2026-11-22-step4-rollback.md`.
- Spec: issue #3 (`tarczyk/billings`, OPEN, `ready-for-agent`), decyzja `docs/adr/0003-szablon-reads-tenant-rates-per-visit.md`, terminy w `GLOSSARY.md`.
- **Working tree czysty** (`git status --short` puste, zweryfikowane ponownie w tej sesji). Scommitowane od poprzedniej wersji tej notatki: `e2b2d28` (seam 2 — `Data`/`ID_wizyty` z daty utworzenia zdjęcia, testy `src/najem.test.js`/`src/najem-sync.test.js`), `dc59cae`, `777ae4d`, `45660b1` (czas triggera), `fa571de` (przeniesienie konfiguracji MCP `google-sheets` do projektu — to dzięki temu ten MCP znów działa w nowej sesji). Komentarz statusu na issue #3: https://github.com/tarczyk/billings/issues/3#issuecomment-7077284100.
- **Uwaga do tej notatki**: wcześniejsza wersja (sprzed commitów `8673a51`/`c173ae6`) błędnie twierdziła, że working tree ma niezacommitowane zmiany i że seam 2 nie jest zrobiony — to było nieaktualne już w momencie zapisu (commit `c173ae6` cofnął poprawną aktualizację `8673a51`). Ta wersja zastępuje obie.

## Co zrobiono w arkuszu (stan zweryfikowany odczytem 2026-11-22, druga sesja)
- **`Ceny media`**: 5 zmian nazw na źródłowe, dodany `Fund.remontowy-mienie SM` (0,03, `Data_od` 2026-01-01 przyjęte z `Fundusz remontowy`), parking rozbity na 4 wiersze netto z prefiksem `Miejsce postojowe - ` (Eksploatacja 67,00; Fundusz remontowy-mienie SM 0,78; Fundusz remontowy 27,39; Energia elektryczna 3,80). Klucz w `Woda zimna!E4` zaktualizowany.
- **`Stawki najemcy`** (układ: tytuł w wierszu 1, nagłówek w 3, dane od kolumny B; klucze w H; parametry J3:K5: marża ciepłej wody `K4`=1, VAT parkingu `K5`=23%). Stawki są wzorami z `Faktury`/`Ceny media`/`Ustawienia`, z wyborem wg `Data_od` wiersza.
- **Zakładka przełączona na `Szablon`** (ex-`Szablon nowy`; żadna zakładka `Szablon nowy` już nie istnieje — tylko jedna `Szablon`, `sheetId=69026745`). **Otwarty punkt 1 z poprzedniej wersji tej notatki jest zamknięty**: widok formułowy wg `ID_wizyty` w `C3`, ostrzeżenie „NIE WYSYŁAĆ” w `B4`, korekta w wierszu 30 (suma wszystkich korekt przypisanych Wizycie z `Korekty najemcy`), suma końcowa `=D10+D27+SUM(D30)` w `D32`. Scenariusz na żywo: `V-2026-10` → Łącznie `4 354,31 zł` (bez ostrzeżeń, wszystkie media mają odczyt).
- **`Korekty najemcy`**: ręczne przypisanie (`B:D`), kwota liczona z `Rozliczenie`. Jeden wiersz: `V-2026-08`, `H1 2026`, `Woda_zimna`, kwota `41,65` (niedopłata).
  - **Naprawiono w tej sesji** (`F4`, formuła etykiety): poprzednia wersja robiła `SUBSTITUTE(Media;"_";" ")`, co dla `Woda_ciepla`/`Prad` dawało błędne „Woda ciepla”/„Prad” (bez polskich znaków). Nowa formuła dodaje `SWITCH` dla tych dwóch przypadków (`"Woda ciepła"`, `"Prąd"`), zachowując istniejące zachowanie dla `Woda_zimna`/`CO`. Verified: odczyt formuły po zapisie zgodny z oczekiwanym, istniejący wiersz `Woda_zimna` niezmieniony (`Niedopłata Woda zimna za H1 2026...`). Code-supported (nie Verified end-to-end z realnymi danymi) dla przypadków `Woda_ciepla`/`Prad`, bo żaden istniejący wiersz ich nie używa.
- **`Woda ciepla!E4`** czyta ze `Stawki najemcy`; starsze wiersze (przed 2026-07-15) mają puste Cena_jedn/Kwota.
- Zweryfikowane scenariusze (sesja poprzednia, nie powtórzone teraz): V-2026-08 (razem 4 328,58 zł), -07, -09, -10 (CO brak → NIE WYSYŁAĆ), -01 (wymiana licznika ze `Stan_przed_wymianą`, brak stawki), nieistniejące ID, dwie korekty.

## Lekcje
- Użytkownik edytuje arkusz równolegle (przesunął układ `Stawki najemcy`, usunął wiersze, sformatował). **Przed każdym zapisem odczytaj bieżący układ.** W tej sesji zapis na starych adresach nadpisał komórki i musiałem naprawiać.
- `Ceny media` formuły w zakładkach mediów czytają zakres do wiersza 50 (`$B$4:$B$50`). Tabela kończy się teraz na wierszu 46. Dalsze dopisywanie wymaga poszerzenia zakresu.

## Otwarte sprawy (zweryfikowane ponownie 2026-11-22, druga sesja — na żywo w arkuszu)
1. ~~**Przełączenie nazwy zakładki** „Szablon nowy” → „Szablon”~~ — **zrobione** (poza tą sesją — nie wiadomo kiedy/przez kogo; `get_spreadsheet` dziś nie zwraca żadnej zakładki `Szablon nowy`, tylko `Szablon`, `sheetId=69026745`). n8n/właściciel może czytać `Szablon`.
2. **Krok 2 planu**: `Faktury` Woda_zimna 2026-01-31..06-30 `Kwota` wciąż `596,10` (nie `595,10`). **Nadal otwarte**, zweryfikowane odczytem `Faktury!A1:K20` w tej sesji. Wzór wody zimnej tego nie używa (liczy z `Cena`), ale dane są błędne.
3. ~~**Seam 2 z issue #3**~~ — **zrobione i scommitowane** (`e2b2d28`, patrz wyżej).
4. **Weryfikacje wymagające użytkownika** (niezmienione, brak nowych danych): (a) `Ubytki 4,82` w `Faktury` to kwota zł czy %? (zakładam zł, wychodzi stawka zimnej wody 15); (b) opłata stała 269,70 zł / 6 mies. = 45 (niepotwierdzone na dokumencie); (c) `Data_od` 0,03 funduszu.
5. **Stawki historyczne**: `Stawki najemcy` ma dla każdej pozycji tylko `Data_od=2026-07-15` (poza `Prąd`, które ma 2 wiersze); Wizyty przed tą datą wciąż nie da się odtworzyć ze stawką najemcy. **Nadal otwarte**, zweryfikowane odczytem całej zakładki w tej sesji. Wymaga decyzji, czy dopisać (krok 5/6 planu, dane od użytkownika).
6. **Znane dane do poprawy w `Ceny media`**: **nadal otwarte**, zweryfikowane odczytem w tej sesji — `Podgrzanie wody-opł.stała 0,66` ma `Data_od` 2026-03-01 zamiast 2026-04-01, wiersz `0,49` kończy się `2026-02-28` zamiast `2026-03-31`.
7. **Kosmetyka `Szablon`**: częściowo naprawione w tej sesji — etykieta korekty w `Korekty najemcy!F4` już nie gubi polskie znaki dla `Woda_ciepla`/`Prad` (patrz wyżej). **Nadal otwarte**: etykieta powtórzyłaby cały bojlerplejt przy ≥2 korektach przypisanych tej samej Wizycie (nie przetestowane — obecnie tylko 1 wiersz w `Korekty najemcy`); lista wyboru `C3` statyczna (tylko ostrzeżenie `NIE WYSYŁAĆ`, bez walidacji/dropdownu z `Odczyty!ID_wizyty`).
8. ~~**CO**: brak odczytów CO dla V-2026-09 i -10~~ — **zrobione poza tą sesją**: `Odczyty` ma teraz wiersze `2026-09-24,V-2026-09,CO,14,096` i `2026-10-27,V-2026-10,CO,14,096` (dopisane na końcu tabeli, poza chronologicznym porządkiem reszty, ale `QUERY`/`MAXIFS` w `Szablon`/`CO` nie zależą od porządku wierszy). Zweryfikowano V-2026-10 w `Szablon`: brak ostrzeżenia „NIE WYSYŁAĆ”, suma `4 354,31 zł`.
9. Kolejne zakładki mediów (`Woda zimna`, `Prad`, `CO`) wciąż czytają `Ceny media`, nie `Stawki najemcy`. **Nadal otwarte**, zweryfikowane odczytem formuł w tej sesji. Poza planem; zdecyduj, czy ujednolicić.
10. ~~Po stabilizacji rozważ commit dokumentów i issue #3~~ — zrobione w poprzedniej sesji (komentarz na issue #3, link wyżej); ta notatka zastępuje poprzednią wersję tego pliku, commit dalej potrzebny dla tej aktualizacji + fix w `Korekty najemcy!F4`.
11. **Issue #3 zostaje otwarty**: pozostają punkty 2, 4, 5, 6, 9, które wymagają danych/decyzji użytkownika. Punkty 1, 3, 8 (zamknięte) i 7 (częściowo) nie blokują już niczego ze strony agenta.

## Sugerowane skille
- `rental-sheet` (każda zmiana arkusza lub Apps Script; zawiera wymóg odczytu przed zapisem i raportowanie dowodów).
- `domain-modeling` (jeśli zmieniają się terminy w `GLOSSARY.md`, np. po decyzji o nazwach pozycji lub `Stawki najemcy`).
- `tdd` (dla seam 2: funkcja wyznaczająca `Data`/`ID_wizyty` ze zdjęcia).
- `writing-jira-tickets`/`technical-communication` tylko jeśli aktualizujesz issue #3.