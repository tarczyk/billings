# Plan: water tenant rates and `Ceny media` cleanup

Status: approved 2026-09-27, not started. Execute with the `rental-sheet` skill.

Read first:
- `CONTEXT.md` — terms: Pozycja źródłowa / Pozycja najemcy, Stawka najemcy, Ciepła woda, Zaliczka vs Koszt rzeczywisty, Korekta półroczna najemcy, Zasada stabilności dla najemcy.
- `docs/adr/0001-ceny-media-mirrors-source-documents.md`.

Workbook: `rozliczenie-najem`, id `1vfrt1nmYMXcUie9C8CRCVVN39hfysj8drR24a8VzXDw` (pl_PL locale: `;` as argument separator).

## Agreed decisions

1. `Ceny media` holds source items only: names and rates 1:1 from cooperative statements and Tauron invoices. No sums, no VAT, no margin.
2. `Faktury` holds actual costs from settlements (semi-annual water, annual C.O.).
3. New block `Stawki najemcy` derives tenant-facing items by formula from `Ceny media` / `Faktury`. `Szablon` and media tabs read from it.
4. Tenant pays meter consumption × fixed tenant rate. Rate is reset once per half-year after the cooperative settlement: last actual cost, losses (`Ubytki`) included, rounded up with margin. Tenant tolerates a ~20–30 zł shortfall in the correction; any overpayment is refunded.
5. Working tenant rates: cold water `15,00 zł/m³`, hot water `53,00 zł/m³` (margin provisional, see step 6), fixed heating fee `45 zł/month`.
6. Email (`Szablon`): one line per item without component breakdown, e.g. `Ciepła woda | 53,00 zł/m³ × 3,25 m³`.
7. Semi-annual correction in `Szablon`: sign follows the result (shortfall increases the amount due, overpayment decreases it); amount and label come by formula from `Rozliczenie`.
8. C.O. follows the same rules — separate task after water.

## Steps

| # | Change | Needs user data |
|---|---|---|
| 1 | Find every formula/script that looks up `Ceny media` rows by `Pozycja` name. Then rename rows to source names, add `Fund.remontowy-mienie SM` (`0,03 zł/m²`), split parking rows into net source lines. | no |
| 2 | Fix `Faktury` Woda_zimna 2026-01-31..06-30 `Kwota`: `596,10` → `595,10` (`40,047 × 14,86`). | no |
| 3 | Create `Stawki najemcy` with formulas (hot water margin provisional at 53 zł). | no |
| 4 | Point `Szablon` and `Woda ciepla` (`Cena_jedn`) at `Stawki najemcy`; fix correction sign (`=D25+D8-D28` subtracts a shortfall) and its label (says C.O., amount is cold water `-41,65`). | no |
| 5 | Backfill `Ceny media` history from 2023-09 and past semi-annual water settlements into `Faktury`. | yes: statement screenshots |
| 6 | Validate hot-water margin (Q14) against settlement history; compute tenant overpayment from the `59,72` period (Q6). | yes: settlements + rates actually used in sent emails |

Renames to apply in step 1 (current → source):

| Current | Source name |
|---|---|
| Zimna woda i ścieki | Woda i ścieki-zaliczka |
| Ciepła woda - podgrzanie (stała) | Podgrzanie wody-opł.stała |
| Wywóz śmieci | Wywóz nieczystości |
| Gniazdo RTV | Opłata za gniazdo AZART |
| Abonament za wodomierz | Abonament za wodomierz główny MPWiK |

## Known data issues

- Old aggregate `Ciepła woda` rows (incl. `59,72` from 2026-01) look like sums of three rates (cold water counted twice). `59,72` must not feed any tenant rate.
- Rate dates per the 30.06.2026 settlement: cold water / water-to-heat `13,87` in 01–02.2026, `14,86` from 03.2026; heating `25` in 01–03.2026, `30` from 04.2026; fixed heating fee `0,49` in 01–03.2026, `0,66` from 04.2026 (sheet currently says from 03.2026).
- `Zimna woda i ścieki 14,02` (2026-01..07) is not in any document seen so far — origin unknown.
- New split rows start `2026-07-15`, overlapping the old `Ciepła woda` row ending the same day.
