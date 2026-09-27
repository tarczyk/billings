---
status: accepted
---

# n8n owns document and meter ingestion end to end

All inbound data — cooperative and Tauron documents (e-BOK), and later meter photos via a Telegram bot — is fetched, recognized, validated and written to the `rozliczenie-najem` workbook by n8n running on the owner's home server. We chose this over keeping Apps Script as the single writer (with n8n only dropping files into Drive) because the owner wants one system for all channels and immediate feedback in the Telegram bot. The existing Apps Script meter-photo pipeline (`src/najem.js`, `przetworzNoweLiczniki`) is to be migrated to n8n; until then both systems write to the workbook, each to separate tabs.

## Consequences

- Business rules (source-item names, `Data_od`/`Data_do` closing, deduplication, sum checks) live in n8n workflows, so workflows are exported with `n8n export:workflow` to `n8n/workflows/` in this repo and committed after every change.
- The meter pipeline moves to n8n together with the Telegram bot (v3), not earlier.
- Recognized data is never written straight to `Ceny media`/`Faktury`: v1 stages it in a review tab with an approval checkbox; from v3 approval moves to Telegram buttons.
- n8n writes by sheet column layout; layout changes to target tabs must be checked against the workflows.
- Ingestion depends on the home server being up; Google-side formulas keep working without it.
