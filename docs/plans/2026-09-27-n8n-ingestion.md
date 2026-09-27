# Plan: n8n ingestion of source documents

Status: approved 2026-09-27, not started.

Read first:
- `CONTEXT.md` — terms: Dokument źródłowy, Pozycja źródłowa / Pozycja najemcy, `Ceny media`, `Faktury`.
- `docs/adr/0001-ceny-media-mirrors-source-documents.md`
- `docs/adr/0002-n8n-owns-ingestion-end-to-end.md`
- Prerequisite: step 1 of `docs/plans/2026-09-27-water-tenant-rates.md` (source names in `Ceny media`) — change detection matches on those names.

Runtime: n8n in Docker on the owner's always-on home server. Workflows exported with `n8n export:workflow` to `n8n/workflows/` and committed after every change. Credentials (Google, e-BOK, Telegram) live only in n8n credentials, never in the repo.

## Sources and document types

| Source | Type | Format | Target |
|---|---|---|---|
| Spółdzielnia (e-BOK marhalonline.pl → Kartoteki) | Naliczenie miesięczne | HTML (preformatted text) | `Ceny media` — changes only |
| Spółdzielnia | Rozliczenie wody (semi-annual) | HTML (table) | `Faktury` |
| Spółdzielnia | Rozliczenie C.O. (annual) | HTML | `Faktury` |
| Tauron (e-BOK) | Faktura | unknown — check e-BOK; fallback PDF + LLM | `Faktury` + electricity rate in `Ceny media` |

Document key (`Źródło` column): type + period — `NAL/2026-10`, `ROZ-WODA/2026-H1`, `ROZ-CO/2025`; Tauron: invoice number. Store a Drive link to the file next to it.

## v1 — manual download, automated parsing

1. Owner saves the e-BOK page with Ctrl+S ("HTML only") into a Drive inbox folder (e.g. `dokumenty-biezace`); Tauron as PDF until its format is known.
2. n8n polls the folder, skips files whose document key is already processed.
3. Parse deterministically from HTML (no LLM) for cooperative documents; LLM extraction only for Tauron PDF fallback.
4. Validate before staging; on failure do not stage, email the reason:
   - every line: rate × quantity = amount (±0,01 zł);
   - sum of lines = document total ("RAZEM DO ZAPŁATY" / "RAZEM KOSZTY");
   - unknown item names are flagged as "nowa pozycja", never force-matched.
5. Change detection for Naliczenie miesięczne: compare each line with the open row (empty `Data_do`) in `Ceny media`. Stage only changes (new rate from the 1st of the document month, previous row closed the day before) and new items. No change → notification "bez zmian, suma zgodna".
6. Stage into a review tab `Dokumenty rozpoznane` with an approval checkbox. n8n polls approved rows and promotes them to `Ceny media` / `Faktury`, then archives the file.
7. Apps Script meter pipeline (`src/najem.js`) keeps running unchanged; it writes to `Odczyty`, n8n does not.

Prerequisites: sample HTML of each cooperative type in `n8n/samples/` (gitignored — personal data). Owner checks Tauron e-BOK format.

## v2 — automated e-BOK download

- n8n logs in to both e-BOKs and fetches the same HTML the v1 parser already handles (headless browser, e.g. Browserless container, if plain HTTP login is not feasible).
- Check each e-BOK's terms allow automated access; login must work without captcha/SMS.

## v3 — Telegram bot

- Meter photos via Telegram bot in n8n; migrate `przetworzNoweLiczniki` logic (dedupe, rising-value check, archive, report) from Apps Script to n8n, then retire the Apps Script trigger.
- Approval of staged documents moves to Telegram buttons (✅/❌).
- Public HTTPS for the Telegram webhook via Cloudflare Tunnel (no router port forwarding).

## Follow-ups

- Update `.cursor/skills/rental-sheet/SKILL.md` operating model: n8n becomes a system writing to the workbook; layout changes to `Ceny media`, `Faktury`, `Dokumenty rozpoznane` must be checked against `n8n/workflows/`.
