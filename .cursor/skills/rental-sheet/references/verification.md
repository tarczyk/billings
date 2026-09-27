# Verification checklist

Use every section that matches the classified scope.

## Formula changes

- Establish the formula pattern from the target and neighboring cells.
- Confirm workbook locale and formula separators before an API/MCP write.
- Account for every absolute, relative, mixed, cross-tab, and external reference.
- Confirm whether the formula is scalar, filled down, or array-expanding.
- Verify the displayed result for a representative row and each applicable edge case.

## Structural changes

- Check scripts for hard-coded tab names, row numbers, and column indexes.
- Check named ranges, charts, pivots, validations, conditional formatting, and protected ranges if the changed area may affect them.
- Account for every dependency before deleting or reordering rows, columns, or tabs.
- Preserve a rollback point before broad changes.

## Formatting changes

- Verify number/date/currency formats separately from displayed values.
- Check frozen rows/columns, hidden rows/columns, widths, heights, wrap, alignment, borders, and conditional formatting where relevant.
- Compare formulas and values before and after presentation-only changes.

## Apps Script changes

- Check manifest/timezone/scopes if relevant.
- Run available static/lint/tests if present.
- Exercise each changed function or trigger path that the available runtime permits.
- Inspect execution logs and errors for the exercised paths.
- Match every resulting Sheet mutation against the expected ranges and values.

## Trigger changes

- Determine whether the trigger is simple or installable.
- Check authorization needs.
- Run or inspect setup twice to establish that it cannot create duplicates.
- Verify handler name and event shape.
- Inspect Executions after a real event.

## Data safety

- Use test rows or a test copy for destructive transformations.
- Bound every clear or replacement operation to content already inspected.
- Record which formulas, notes, validations, protections, and formats the change preserves.
