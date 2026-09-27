# Handoff: water tenant rates and n8n ingestion (2026-09-27)

## Where things stand

A design ("grilling") session is complete; nothing has been changed in the Google Sheet yet. All decisions are captured in:

- `CONTEXT.md` — domain glossary (Polish). Key terms added this session: Ciepła woda, Naliczenie miesięczne, Zaliczka vs Koszt rzeczywisty, Stawka najemcy, Zasada stabilności dla najemcy, Korekta półroczna najemcy, Pozycja źródłowa / Pozycja najemcy, Dokument źródłowy, Fundusz remontowy.
- `docs/adr/0001-ceny-media-mirrors-source-documents.md`
- `docs/adr/0002-n8n-owns-ingestion-end-to-end.md`
- `docs/plans/2026-09-27-water-tenant-rates.md` — execute first (at least step 1).
- `docs/plans/2026-09-27-n8n-ingestion.md` — v1–v3; depends on step 1 above.

Commit: `a66efed` on `main` (not pushed).

## Next session: pick one

1. **Execute the water-rates plan, steps 1–4** (no user data needed). Start by grepping `src/najem.js` and live sheet formulas for lookups by `Ceny media` `Pozycja` names before renaming.
2. **Start n8n v1** — blocked until the user drops sample HTML pages (Naliczenie miesięczne, Rozliczenie wody, Rozliczenie C.O.) into `n8n/samples/` (gitignored) and checks Tauron e-BOK format.

## Open items not captured elsewhere

- **Pending from user:** cooperative documents from 2023-09 (monthly statements + semi-annual water settlements), and the rates actually used in past tenant emails — needed for plan steps 5–6 (margin check, overpayment calculation).
- **Unconfirmed interpretation:** user answered the home-server question by echoing "działa cały czas i ma Dockera"; treated as "yes". Browserless vs plain HTTP login and Cloudflare Tunnel are deferred to v2/v3.
- **Uncommitted, pre-existing change:** skill rename `.cursor/skills/rental-settlement-sheet/` → `.cursor/skills/rental-sheet/`. Not part of this session; ask before committing.
- **Source documents seen this session** (screenshots, contain the flat address): cooperative water settlement as of 30.06.2026 and the October 2026 monthly statement, in `~/.cursor/projects/Users-tarczyk-GitReposPriv-billings/assets/`. Key figures are already transcribed into `CONTEXT.md` and the water-rates plan.
- **`Szablon` tab is fully static** (typed values, no formulas): still shows stale `Ciepła woda 59,72`, `Zimna woda 14,02`, `Ciepła woda - podgrzanie 0,67`. Plan step 4 wires it to `Stawki najemcy`.
- **Scope later:** same tenant-rate rules for C.O. (2025 shortfall was 432 zł) — separate task after water.

## Working notes

- Workbook id is in `src/najem.js` (`ROZLICZENIA_SPREADSHEET_ID`); Sheet has pl_PL locale — formula argument separator is `;` (see top of `CONTEXT.md`).
- Access the workbook via the `user-google-sheets` MCP (`read_range`, `write_range`, …). Read with `valueRenderOption: FORMULA` before editing.
- User writes in Polish; artifacts (plans, ADRs, commits) in English, `CONTEXT.md` stays Polish.
- The user prefers one-line tenant-facing items and minimal surprise for the tenant; money-affecting data never goes to the sheet without review.

## Suggested skills

- `rental-sheet` (`.cursor/skills/rental-sheet/SKILL.md`) — mandatory for any sheet or Apps Script change; follow its verification branch.
- `domain-modeling` — keep `CONTEXT.md` and ADRs current as terms/decisions change.
- `grilling` — if the n8n v1 design needs re-opening (e.g. once Tauron format is known).
