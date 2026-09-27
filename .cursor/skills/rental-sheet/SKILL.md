---
name: rental-sheet
description: Maintains the rental-settlement Google Sheet and its Git-backed Apps Script. Use for formula, layout, formatting, validation, trigger, automation, or data-flow changes involving that workbook.
---

# Rental Settlement Sheet

## Operating model

Treat the systems as follows:

- Google Sheet via MCP/connector = current workbook state and data.
- GitHub/local repo = source of truth for Apps Script code.
- Apps Script editor = runtime/debugging surface, not the primary editor.
- `clasp` = synchronization/deployment mechanism.

Inspect the live workbook and repository before relying on a layout, formula, named range, trigger, column index, or script behavior.

## Core workflow

For every non-trivial change:

1. Classify the scope as Google Sheets, Apps Script, or both. Name every target tab/range and file/function.
2. Inspect every target and its direct callers, consumers, formulas, triggers, or referenced ranges. Inspection is complete when each target and direct dependency is accounted for.
3. State the observed behavior and expected behavior in concrete terms.
4. Before changing formulas, structure, formatting, Apps Script, triggers, or data destructively, read the corresponding section in `references/verification.md`.
5. Make the narrowest change that produces the expected behavior.
6. Complete the applicable verification branch below.
7. Report evidence using the labels in **Evidence**.

## Google Sheets branch

Before a write, read the exact target range, enough neighboring cells to establish its pattern, and every directly dependent formula or script reference.

Preserve values, formulas, notes, formats, validations, protections, dimensions, and visibility unless the requested behavior requires changing them.

After a write:

1. Read back every modified range.
2. Confirm the expected formulas, values, and formats.
3. Check one representative case and every applicable boundary case identified before the edit.

This branch is complete when every modified cell and expected result has been read back, and all selected cases match the stated expectation.

## Visual redesign

Keep the existing data model and dependencies stable. Use:

- clear hierarchy between title, controls, summary, and transaction/history sections;
- consistent header styles;
- stable column widths and row heights;
- appropriate number/date/currency formats;
- restrained conditional formatting tied to business meaning;
- frozen headers where useful;
- spacing and grouping instead of decorative clutter.

Before moving columns, renaming tabs, merging cells, or changing input areas, account for every dependent formula, script, named range, chart, pivot, validation, and protected range.

## Apps Script branch

Edit Apps Script only in the Git-backed repo unless explicitly instructed otherwise.

Before code changes:

- locate every caller of each changed function;
- inspect `appsscript.json` when scopes, timezone, runtime, advanced services, or triggers may be affected;
- inspect trigger setup and removal when changing a handler;
- verify every referenced tab and range against the live workbook.

Implement with these invariants:

- translate explicitly between one-based Sheets coordinates and zero-based JavaScript indexes;
- choose `getValues()` or `getDisplayValues()` according to the required data semantics;
- batch range reads and writes;
- limit writes to the exact target range;
- use a deterministic spreadsheet context;
- make trigger setup idempotent and compatible with its authorization model;
- surface errors with enough context to diagnose the failed operation.

If deployment is in scope:

1. Confirm the target `.clasp.json` project mapping and expected file set.
2. Review repository status, `git diff`, and the clasp file status.
3. Push only after the target and diff match the stated scope.
4. Execute the changed path when feasible, inspect runtime errors, and read affected Sheet ranges back.

Use `clasp pull` only to investigate or recover an external change; review its diff immediately.

This branch is complete when local checks pass, the diff contains only intended changes, and either the changed path has been exercised successfully or its missing runtime test is reported as unverified.

## Evidence

Classify conclusions as:

- **Verified**: directly checked in the Sheet, repo, command output, or runtime result.
- **Code-supported**: follows from inspected code but has not been run end-to-end.
- **Unverified**: requires a runtime/manual test or missing access.

Claim that behavior works only when its relevant Sheet or runtime path was exercised successfully. If required evidence is unavailable, identify the missing source and stop before the dependent change or claim.

## Change discipline

Keep focused changes free of unrelated refactoring.

For risky structural changes, first produce a short plan containing:

- current structure;
- target structure;
- formulas/scripts affected;
- migration order;
- rollback point;
- validation steps.

For small isolated fixes, proceed directly after inspecting the relevant context.

## Completion format

Report:

1. What changed.
2. Files/ranges affected.
3. What was verified and how.
4. What remains unverified.
5. Exact next command or manual test, if any.
