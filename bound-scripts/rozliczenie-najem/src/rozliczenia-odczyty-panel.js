/**
 * SKRYPT KONTENEROWY — tylko skoroszyt Rozliczenia_najem
 *
 * Wklej całość w: Rozszerzenia → Apps Script (bound do tego pliku).
 * Nie deployuj przez clasp / najem.js.
 *
 * Panel (wiersze 4–7): ostatni odczyt per medium z historii (od wiersza 8).
 * Odświeża się przy wejściu na zakładkę „Odczyty” (onSelectionChange).
 * Ręcznie: uruchom odswiezPanelOstatnichOdczytow w edytorze.
 */

const ODCZYTY_SHEET_NAME = 'Odczyty';
const HIST_DATA_START_ROW = 8;

/** Wiersz panelu B:G dla danego medium (kolumna D w historii). */
const PANEL_ROW_BY_MEDIUM = {
  CO: 4,
  Woda_zimna: 5,
  Woda_ciepla: 6,
  Prad: 7
};

const SP_LAST_SHEET = 'panelOdczyty_lastActiveSheet';

/**
 * Prosty trigger — działa w skrypcie powiązanym ze skoroszytem.
 * Odświeża panel tylko przy przejściu z innej zakładki na „Odczyty”.
 */
function onSelectionChange(e) {
  if (!e || !e.source) {
    return;
  }

  const activeName = e.source.getActiveSheet().getName();
  const props = PropertiesService.getScriptProperties();
  const previous = props.getProperty(SP_LAST_SHEET);

  if (activeName !== ODCZYTY_SHEET_NAME) {
    props.setProperty(SP_LAST_SHEET, activeName);
    return;
  }

  if (previous === ODCZYTY_SHEET_NAME) {
    return;
  }

  props.setProperty(SP_LAST_SHEET, ODCZYTY_SHEET_NAME);
  odswiezPanelOstatnichOdczytow();
}

/** Przelicza wiersze 4–7 z historii B8:G… (najnowsza data w kolumnie B per medium). */
function odswiezPanelOstatnichOdczytow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ODCZYTY_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Brak zakładki "${ODCZYTY_SHEET_NAME}".`);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < HIST_DATA_START_ROW) {
    wyczyscPanelOdczyty_(sheet);
    return;
  }

  const rows = sheet.getRange(`B${HIST_DATA_START_ROW}:G${lastRow}`).getValues();
  /** @type {Record<string, { date: Date, index: number, values: unknown[] }>} */
  const latestByMedium = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const medium = (row[2] || '').toString().trim();
    if (PANEL_ROW_BY_MEDIUM[medium] === undefined) {
      continue;
    }

    const rowDate = parseDateOdczytu_(row[0]);
    if (!rowDate) {
      continue;
    }

    const prev = latestByMedium[medium];
    if (!prev || rowDate > prev.date || (rowDate.getTime() === prev.date.getTime() && i > prev.index)) {
      latestByMedium[medium] = {
        date: rowDate,
        index: i,
        values: [row[0], row[1], row[2], row[3], row[4], row[5]]
      };
    }
  }

  for (const medium of Object.keys(PANEL_ROW_BY_MEDIUM)) {
    const panelRow = PANEL_ROW_BY_MEDIUM[medium];
    const hit = latestByMedium[medium];
    const dest = sheet.getRange(`B${panelRow}:G${panelRow}`);
    if (hit) {
      dest.setValues([hit.values]);
    } else {
      dest.clearContent();
    }
  }
}

function parseDateOdczytu_(cell) {
  if (cell instanceof Date && !isNaN(cell.getTime())) {
    return cell;
  }
  const text = (cell || '').toString().trim();
  if (!text) {
    return null;
  }
  const parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function wyczyscPanelOdczyty_(sheet) {
  for (const row of Object.values(PANEL_ROW_BY_MEDIUM)) {
    sheet.getRange(`B${row}:G${row}`).clearContent();
  }
}
