# Handoff 2026-11-22: Stawki najemcy i Szablon (kroki 1, 3, 4)

Repo: `/Users/tarczyk/GitReposPriv/billings`. Skoroszyt `rozliczenie-najem`, id `1vfrt1nmYMXcUie9C8CRCVVN39hfysj8drR24a8VzXDw` (pl_PL: separator argumentów `;`). Praca na arkuszu przez MCP `user-google-sheets`, wszystko pod skillem `rental-sheet`.

## Stan źródeł prawdy (nie powielam)
- Plan i statusy kroków: `docs/plans/2026-09-27-water-tenant-rates.md` (kroki 1, 3, 4 oznaczone jako wykonane, z wyjątkami).
- Punkt cofnięcia `Woda ciepla!E4:F4`: `docs/plans/2026-11-22-step4-rollback.md`.
- Spec: issue #3 (`tarczyk/billings`), decyzja `docs/adr/0003-szablon-reads-tenant-rates-per-visit.md`, terminy w `GLOSSARY.md`.
- Niezacommitowane w working tree: ADR 0001/0002, plany, handoff, `src/najem.js`, `AGENTS.md`, `CLAUDE.md`, `docs/agents/`, nowy `docs/plans/2026-11-22-step4-rollback.md`. Nic nie commitowano w tej sesji.

## Co zrobiono w arkuszu (stan zweryfikowany odczytem)
- **`Ceny media`**: 5 zmian nazw na źródłowe, dodany `Fund.remontowy-mienie SM` (0,03, `Data_od` 2026-01-01 przyjęte z `Fundusz remontowy`), parking rozbity na 4 wiersze netto z prefiksem `Miejsce postojowe - ` (Eksploatacja 67,00; Fundusz remontowy-mienie SM 0,78; Fundusz remontowy 27,39; Energia elektryczna 3,80). Klucz w `Woda zimna!E4` zaktualizowany.
- **`Stawki najemcy`** (układ: tytuł w wierszu 1, nagłówek w 3, dane od kolumny B; klucze w H; parametry J3:K5: marża ciepłej wody `K4`=1, VAT parkingu `K5`=23%). Stawki są wzorami z `Faktury`/`Ceny media`/`Ustawienia`, z wyborem wg `Data_od` wiersza.
- **`Szablon nowy`** (stary `Szablon` został usunięty przez użytkownika): widok formułowy wg `ID_wizyty` w `C3`. Pomocnicze `K:S`, kolumny `E:I` pomocnicze, ostrzeżenie „NIE WYSYŁAĆ” w `B4`. Korekta w jednym wierszu 30 (suma wszystkich korekt Wizyty), suma końcowa w `D32`.
- **`Korekty najemcy`**: ręczne przypisanie (`B:D`), kwota i etykieta liczone z `Rozliczenie`. Jeden wiersz: `V-2026-08`, `H1 2026`, `Woda_zimna`.
- **`Woda ciepla!E4`** czyta ze `Stawki najemcy`; starsze wiersze (przed 2026-07-15) mają puste Cena_jedn/Kwota.
- Zweryfikowane scenariusze: V-2026-08 (razem 4 328,58 zł), -07, -09, -10 (CO brak → NIE WYSYŁAĆ), -01 (wymiana licznika ze `Stan_przed_wymianą`, brak stawki), nieistniejące ID, dwie korekty.

## Lekcje
- Użytkownik edytuje arkusz równolegle (przesunął układ `Stawki najemcy`, usunął wiersze, sformatował). **Przed każdym zapisem odczytaj bieżący układ.** W tej sesji zapis na starych adresach nadpisał komórki i musiałem naprawiać.
- `Ceny media` formuły w zakładkach mediów czytają zakres do wiersza 50 (`$B$4:$B$50`). Tabela kończy się teraz na wierszu 46. Dalsze dopisywanie wymaga poszerzenia zakresu.

## Otwarte sprawy
1. **Przełączenie nazwy zakładki** „Szablon nowy” → „Szablon” (jeśli n8n ma czytać „Szablon”). Decyzja użytkownika.
2. **Krok 2 planu**: `Faktury` Woda_zimna 2026-01-31..06-30 `Kwota` `596,10` → `595,10`. Wzór wody zimnej tego nie używa (liczy z `Cena`), ale dane są błędne.
3. **Seam 2 z issue #3**: `Data` i `ID_wizyty` z daty utworzenia zdjęcia w `src/najem.js` (dziś `V-${yyyy-MM}` z `teraz`, linie ~467 i ~540). Niezacommitowane zmiany w tym pliku istnieją już od wcześniej, przejrzyj `git diff` przed edycją.
4. **Weryfikacje wymagające użytkownika**: (a) `Ubytki 4,82` w `Faktury` to kwota zł czy %? (zakładam zł, wychodzi stawka zimnej wody 15); (b) opłata stała 269,70 zł / 6 mies. = 45 (niepotwierdzone na dokumencie); (c) `Data_od` 0,03 funduszu.
5. **Stawki historyczne**: wizyty przed 2026-07-15 nie mają wierszy w `Stawki najemcy`, więc nie da się ich odtworzyć. Wymaga decyzji, czy dopisać (krok 5/6 planu, dane od użytkownika).
6. **Znane dane do poprawy w `Ceny media`**: `Podgrzanie wody-opł.stała 0,66` ma `Data_od` 2026-03-01 zamiast 2026-04-01, wiersz 0,49 kończy się 02-28 zamiast 03-31 (wg planu, „Znane problemy”).
7. **Kosmetyka `Szablon nowy`**: etykieta korekty powtarza boilerplate przy wielu korektach; `Woda ciepla` bez „ł" w etykiecie (`SUBSTITUTE` z `_`); lista wyboru `C3` statyczna (tylko ostrzeżenie).
8. **CO**: brak odczytów CO dla V-2026-09 i -10 blokuje maile (dane od użytkownika).
9. Kolejne zakładki mediów (`Woda zimna`, `Prad`, `CO`) wciąż czytają `Ceny media`, nie `Stawki najemcy`. Poza planem; zdecyduj, czy ujednolicić.
10. Po stabilizacji rozważ commit dokumentów i issue #3 (zaktualizuj o to, co jest zrobione, i zamknij po przełączeniu szablonu i seam 2).

## Sugerowane skille
- `rental-sheet` (każda zmiana arkusza lub Apps Script; zawiera wymóg odczytu przed zapisem i raportowanie dowodów).
- `domain-modeling` (jeśli zmieniają się terminy w `GLOSSARY.md`, np. po decyzji o nazwach pozycji lub `Stawki najemcy`).
- `tdd` (dla seam 2: funkcja wyznaczająca `Data`/`ID_wizyty` ze zdjęcia).
- `writing-jira-tickets`/`technical-communication` tylko jeśli aktualizujesz issue #3.