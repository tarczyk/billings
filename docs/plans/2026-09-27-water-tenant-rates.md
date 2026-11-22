# Plan: stawki wody dla najemców i porządki w `Ceny media`

Status: zatwierdzony 2026-09-27, nie rozpoczęty. Wykonywać ze skillem `rental-sheet`.

Najpierw przeczytaj:
- `GLOSSARY.md` — terminy: pozycja źródłowa / pozycja najemcy, stawka najemcy, ciepła woda, zaliczka vs koszt rzeczywisty, korekta półroczna najemcy, zasada stabilności dla najemcy.
- `docs/adr/0001-ceny-media-mirrors-source-documents.md`.

Skoroszyt: `rozliczenie-najem`, id `1vfrt1nmYMXcUie9C8CRCVVN39hfysj8drR24a8VzXDw` (lokalizacja pl_PL: `;` jako separator argumentów).

## Ustalenia

1. `Ceny media` zawiera wyłącznie pozycje źródłowe: nazwy i stawki 1:1 z rozliczeniami spółdzielni i fakturami Tauron. Bez sum, bez VAT, bez marży.
2. `Faktury` przechowuje koszty rzeczywiste z rozliczeń (woda półroczna, C.O. roczne).
3. Nowy blok `Stawki najemcy` wyprowadza pozycje widoczne dla najemcy wzorami z `Ceny media` / `Faktury`. `Szablon` i zakładki mediów czytają stąd.
4. Najemca płaci za zużycie z licznika × ustaloną stawkę najemcy. Stawka resetuje się raz na pół roku po rozliczeniu spółdzielni: ostatni koszt rzeczywisty, straty (`Ubytki`) włączone, zaokrąglenie w górę z marżą. Najemca akceptuje niedobór ok. 20–30 zł w korekcie; nadpłata jest zwracana.
5. Robocze stawki najemcy: woda zimna `15,00 zł/m³`, woda ciepła `53,00 zł/m³` (marża tymczasowa, patrz krok 6), stała opłata za ogrzewanie `45 zł/mies.`
6. E-mail (`Szablon`): jeden wiersz na pozycję bez rozbicia na składniki, np. `Ciepła woda | 53,00 zł/m³ × 3,25 m³`.
7. Korekta półroczna w `Szablon`: znak zgodny z wynikiem (niedobór zwiększa należność, nadpłata ją zmniejsza); kwota i etykieta pochodzą ze wzoru z `Rozliczenie`.
8. C.O. według tych samych zasad — osobne zadanie po wodzie.

## Kroki

| # | Zmiana | Potrzebne dane użytkownika |
|---|---|---|
| 1 | Znaleźć każdą formułę/skrypt, który szuka wierszy `Ceny media` po nazwie `Pozycja`. Potem zmienić nazwy wierszy na źródłowe, dodać `Fund.remontowy-mienie SM` (`0,03 zł/m²`), rozbić wiersze parkingu na osobne wiersze netto źródłowe. **Wykonane 2026-11-22**: zmienione nazwy (5 pozycji), klucz w `Woda zimna!E4` i w `Stawki najemcy!H`, dodany `Fund.remontowy-mienie SM` (`Data_od` 2026-01-01 przyjęte jak przy `Fundusz remontowy`), parking rozbity na 4 wiersze netto (`Miejsce postojowe - Eksploatacja` 67,00, `- Fundusz remontowy-mienie SM` 0,78, `- Fundusz remontowy` 27,39, `- Energia elektryczna` 3,80; VAT w `Stawki najemcy!K5`). | nie |
| 2 | Poprawić `Faktury` Woda_zimna 2026-01-31..06-30 `Kwota`: `596,10` → `595,10` (`40,047 × 14,86`). | nie |
| 3 | Utworzyć `Stawki najemcy` ze wzorami (marża wody ciepłej tymczasowo przy 53 zł). **Wykonane 2026-11-22** (zakładka ze wzorami z `Ceny media`/`Faktury`/`Ustawienia`, `Data_od`-aware, klucze w kol. H, marża w `K4`). Zostaje po kroku 2: ponowne sprawdzenie wody zimnej (15). | nie |
| 4 | Podpiąć `Szablon` i `Woda ciepla` (`Cena_jedn`) pod `Stawki najemcy`; naprawić znak korekty (`=D25+D8-D28` odejmuje niedobór) i jej etykietę (pisze C.O., kwota to woda zimna `-41,65`). **Wykonane 2026-11-22 w nowej zakładce `Szablon nowy`** (stary `Szablon` nietknięty do czasu akceptacji; `Woda ciepla!E4` czyta ze `Stawki najemcy`, punkt cofnięcia: `docs/plans/2026-11-22-step4-rollback.md`). Zostaje: przełączenie (zmiana nazw zakładek), podpięcie `Woda zimna`/`Prad`/`CO` jeśli ma być spójne. | nie |
| 5 | Uzupełnić historię `Ceny media` od 2023-09 i zeszłe półroczne rozliczenia wody w `Faktury`. | tak: zrzuty rozliczeń |
| 6 | Zweryfikować marżę wody ciepłej (Q14) względem historii rozliczeń; wyliczyć nadpłatę najemcy z okresu `59,72` (Q6). | tak: rozliczenia + stawki faktycznie użyte w wysłanych mailach |

Zmiany nazw w kroku 1 (obecne → źródłowe):

| Obecna | Nazwa źródłowa |
|---|---|
| Zimna woda i ścieki | Woda i ścieki-zaliczka |
| Ciepła woda - podgrzanie (stała) | Podgrzanie wody-opł.stała |
| Wywóz śmieci | Wywóz nieczystości |
| Gniazdo RTV | Opłata za gniazdo AZART |
| Abonament za wodomierz | Abonament za wodomierz główny MPWiK |

## Znane problemy z danymi

- Stare zagregowane wiersze `Ciepła woda` (w tym `59,72` od 2026-01) wyglądają jak sumy trzech stawek (woda zimna liczona podwójnie). `59,72` nie może zasilać żadnej stawki najemcy.
- Daty stawek wg rozliczenia z 30.06.2026: woda zimna / woda do podgrzania `13,87` w 01–02.2026, `14,86` od 03.2026; ogrzewanie `25` w 01–03.2026, `30` od 04.2026; stała opłata za ogrzewanie `0,49` w 01–03.2026, `0,66` od 04.2026 (w arkuszu obecnie jest od 03.2026).
- `Zimna woda i ścieki 14,02` (2026-01..07) nie występuje w żadnym dotąd widzianym dokumencie — pochodzenie nieznane.
- Nowe rozbite wiersze zaczynają się `2026-07-15`, nakładając się na stary wiersz `Ciepła woda` kończący się tego samego dnia.
