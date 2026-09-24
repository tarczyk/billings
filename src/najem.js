// ── Folder IDs ───────────────────────────────────────────────────────────────
const FOLDER_BIEZACE_ID  = "1fwWnW-4rjydwenxvaNsWyAVM0orXR9Fk"; // odczyty-biezace
const FOLDER_ARCHIWUM_ID  = "1VZbGt-XnOnMOl5A2jDSdF7ucxUXzPqQt"; // odczyty-archiwum

const FOLDER_BIEZACE_LABEL = 'odczyty-biezace';

const VALID_METER_TYPES = ['CO', 'PRAD', 'WODA_ZIMNA', 'WODA_CIEPLA'];

// ── Spreadsheet IDs ───────────────────────────────────────────────────────────
const SPREADSHEET_ID = "14oxXC2s_ubqfbPxeYd2hg5WZPODmfLuNUIHxYx8OtjI"; // odczyty-rozpoznane.gsheet
const ROZLICZENIA_SPREADSHEET_ID = "1vfrt1nmYMXcUie9C8CRCVVN39hfysj8drR24a8VzXDw"; // Rozliczenia_najem
const ROZLICZENIA_ODCZYTY_SHEET = "Odczyty";
const ROZLICZENIA_LOG_SHEET     = "Log";

// Rozliczenia_najem → Odczyty (kolumny B–G)
const ROZL_COL_DATA       = 2;  // B
const ROZL_COL_ID_WIZYTY  = 3;  // C
const ROZL_COL_MEDIUM     = 4;  // D
const ROZL_COL_STAN       = 5;  // E
const ROZL_COL_JEDNOSTKA  = 6;  // F
const ROZL_COL_STATUS     = 7;  // G
const ROZL_DATA_START_ROW = 4;  // wiersz 3 = nagłówki

// Rozliczenia_najem → Log (kolumny B–F)
const LOG_COL_DATA         = 2;  // B
const LOG_COL_ID_WIZYTY    = 3;  // C
const LOG_COL_MEDIA        = 4;  // D
const LOG_COL_OPIS         = 5;  // E
const LOG_COL_SKORYGOWANO  = 6;  // F
const LOG_DATA_START_ROW   = 4;

// ── Sheet columns (1-based) ───────────────────────────────────────────────────
const COL_DATE      = 1;  // A
const COL_TYPE      = 2;  // B
const COL_VALUE     = 3;  // C
const COL_FOLDER    = 4;  // D
const COL_FILENAME  = 5;  // E
const COL_FILE_ID   = 6;  // F – used for deduplication
const COL_FILE_URL  = 7;  // G

// ── Gemini ────────────────────────────────────────────────────────────────────
const GEMINI_MODEL_DEFAULT   = 'gemini-3.5-flash';
const GEMINI_API_MAX_ATTEMPTS = 6;   // pierwsze wywołanie + do 5 ponowień przy przeciążeniu
const GEMINI_RETRY_PAUSE_MS   = 8000; // ~8 s przed kolejną próbą (503/502/500); rośnie z numerem próby
const GEMINI_DELAY_MS         = 5000; // pauza między różnymi zdjęciami (limit RPM)

function getGeminiModel_() {
  return PropertiesService.getScriptProperties().getProperty('GEMINI_MODEL') || GEMINI_MODEL_DEFAULT;
}

function getGeminiApiKey_() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) {
    throw new Error('Brak GEMINI_API_KEY w Script Properties. Ustaw w: Projekt → Ustawienia → Właściwości skryptu.');
  }
  return key;
}

// ── Trigger setup (run once manually) ────────────────────────────────────────

/**
 * Creates a daily time-based trigger at 20:00.
 * Run this function ONCE manually from the Apps Script editor.
 * Existing triggers for the same function are removed first to avoid duplicates.
 */
function konfigurujTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'przetworzNoweLiczniki')
    .forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('przetworzNoweLiczniki')
    .timeBased()
    .atHour(20)
    .everyDays(1)
    .inTimezone(Session.getScriptTimeZone())
    .create();

  Logger.log('Trigger ustawiony: przetworzNoweLiczniki codziennie o 20:00.');
}

// ── Main entry point ──────────────────────────────────────────────────────────

function otworzFolderDrive_(etykieta, folderId) {
  try {
    return DriveApp.getFolderById(folderId);
  } catch (e) {
    throw new Error(
      `${etykieta}: brak folderu w Drive lub brak uprawnień (id=${folderId}). ` +
      'Udostępnij folder kontu, które uruchamia Apps Script (Edytor → uruchom jako). ' +
      `Drive: ${e.message || e}`
    );
  }
}

function otworzArkuszPoId_(etykieta, spreadsheetId) {
  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (e) {
    throw new Error(
      `${etykieta}: brak arkusza lub brak uprawnień (id=${spreadsheetId}). ` +
      'Otwórz plik w Drive tym samym kontem Google co projekt Apps Script. ' +
      `Sheets: ${e.message || e}`
    );
  }
}

function normalizeMeterType_(rawType) {
  const t = (rawType || '').toString().trim().toUpperCase();
  if (VALID_METER_TYPES.indexOf(t) === -1) {
    return null;
  }
  return t;
}

function etykietaLicznika_(meterType) {
  const map = {
    CO:          'c.o.',
    PRAD:        'prad',
    WODA_ZIMNA:  'woda-zimna',
    WODA_CIEPLA: 'woda-ciepla'
  };
  return map[meterType] || meterType;
}

/**
 * Uruchom ręcznie z edytora Apps Script — sprawdza dostęp do wszystkich folderów i arkuszy.
 */
function diagnostykaZasobow() {
  Logger.log(`Konto wykonujące: ${Session.getEffectiveUser().getEmail()}`);

  const zasoby = [
    { rodzaj: 'folder', etykieta: 'odczyty-archiwum', id: FOLDER_ARCHIWUM_ID },
    { rodzaj: 'folder', etykieta: 'odczyty-biezace', id: FOLDER_BIEZACE_ID },
    { rodzaj: 'arkusz', etykieta: 'odczyty-rozpoznane', id: SPREADSHEET_ID },
    { rodzaj: 'arkusz', etykieta: 'Rozliczenia_najem', id: ROZLICZENIA_SPREADSHEET_ID }
  ];

  for (const z of zasoby) {
    try {
      if (z.rodzaj === 'folder') {
        const folder = DriveApp.getFolderById(z.id);
        Logger.log(`OK  folder  ${z.etykieta}: "${folder.getName()}" (${z.id})`);
      } else {
        const ss = SpreadsheetApp.openById(z.id);
        Logger.log(`OK  arkusz  ${z.etykieta}: "${ss.getName()}" (${z.id})`);
      }
    } catch (e) {
      Logger.log(`BŁĄD ${z.rodzaj} ${z.etykieta} (${z.id}): ${e.message || e}`);
    }
  }

  try {
    const biezace = DriveApp.getFolderById(FOLDER_BIEZACE_ID);
    let obrazy = 0;
    const pliki = biezace.getFiles();
    while (pliki.hasNext()) {
      const f = pliki.next();
      const mime = f.getMimeType();
      if (mime && mime.indexOf('image/') === 0) {
        obrazy += 1;
      }
    }
    Logger.log(`OK  odczyty-biezace: ${obrazy} zdjęć do przetworzenia (typ rozpoznaje Gemini)`);
  } catch (e) {
    Logger.log(`BŁĄD odczyty-biezace: ${e.message || e}`);
  }
}

function przetworzNoweLiczniki() {
  const folderArchiwum = otworzFolderDrive_('odczyty-archiwum', FOLDER_ARCHIWUM_ID);
  const ss    = otworzArkuszPoId_('odczyty-rozpoznane', SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];

  const rozliczeniaSs = otworzArkuszPoId_('Rozliczenia_najem', ROZLICZENIA_SPREADSHEET_ID);
  const rozliczeniaSheet = rozliczeniaSs.getSheetByName(ROZLICZENIA_ODCZYTY_SHEET);
  const rozliczeniaLogSheet = rozliczeniaSs.getSheetByName(ROZLICZENIA_LOG_SHEET);
  if (!rozliczeniaSheet) {
    throw new Error(`Brak arkusza "${ROZLICZENIA_ODCZYTY_SHEET}" w Rozliczenia_najem.`);
  }
  if (!rozliczeniaLogSheet) {
    throw new Error(`Brak arkusza "${ROZLICZENIA_LOG_SHEET}" w Rozliczenia_najem.`);
  }

  const { processedFileIds, lastValueByType } = wczytajIstniejaceOdczyty_(sheet);
  const istniejaceKluczeOdczytyRozliczenia = wczytajIstniejaceKluczeOdczytyRozliczenia_(rozliczeniaSheet);

  const wyniki = []; // { meter, plik, wartosc, archiwumNazwa }
  const bledy  = []; // { meter, plik, powod }

  const folderBiezace = otworzFolderDrive_('odczyty-biezace', FOLDER_BIEZACE_ID);
  const files          = folderBiezace.getFiles();

  while (files.hasNext()) {
    const file     = files.next();
    const mimeType = file.getMimeType();

    if (!mimeType || mimeType.indexOf('image/') !== 0) {
      continue;
    }

    const fileId   = file.getId();
    const fileName = file.getName();

    if (processedFileIds.has(fileId)) {
      Logger.log(`Pominięto (już przetworzony): ${fileName} [${fileId}]`);
      continue;
    }

    const meterLabelFallback = FOLDER_BIEZACE_LABEL;

    try {
      const blob        = file.getBlob();
      const base64Image = Utilities.base64Encode(blob.getBytes());
      const odczyt      = analizujZdjecieGemini(base64Image, mimeType);

      Utilities.sleep(GEMINI_DELAY_MS);

      const meterType = normalizeMeterType_(odczyt.type);
      const wartosc   = Number(odczyt.value);
      const meterLabel = meterType ? etykietaLicznika_(meterType) : meterLabelFallback;

      if (!meterType || isNaN(wartosc) || wartosc === null) {
        throw new Error(`Nieprawidłowy wynik Gemini: ${JSON.stringify(odczyt)}`);
      }

      const ostatniOdczyt = lastValueByType[meterType];
      if (ostatniOdczyt !== undefined && wartosc <= ostatniOdczyt) {
        bledy.push({
          meter: meterLabel,
          plik: fileName,
          powod: `Odczyt ${wartosc} nie jest wyższy od ostatniego (${ostatniOdczyt}) – pominięto`
        });
        Logger.log(`Pominięto (nie nowy stan): ${fileName}, ${meterType}: ${wartosc} <= ${ostatniOdczyt}`);
        continue;
      }

      const teraz      = new Date();
      const formatData = Utilities.formatDate(teraz, Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
      const noweImie   = `${formatData}_${meterType.toLowerCase()}_${fileId.slice(0, 8)}.jpg`;

      sheet.appendRow([teraz, meterType, wartosc, FOLDER_BIEZACE_LABEL, fileName, fileId, file.getUrl()]);
      try {
        dopiszOdczytDoRozliczen_(rozliczeniaSheet, teraz, meterType, wartosc, istniejaceKluczeOdczytyRozliczenia);
      } catch (syncErr) {
        const powod = syncErr.message || String(syncErr);
        bledy.push({
          meter: meterLabel,
          plik: fileName,
          powod: `Zapis do Rozliczenia_najem/Odczyty: ${powod}`
        });
        Logger.log(`Rozliczenia_najem sync błąd: ${fileName}: ${syncErr}`);
        dopiszBladSyncDoLogRozliczenia_(
          rozliczeniaLogSheet,
          teraz,
          meterType,
          fileName,
          fileId,
          powod
        );
      }

      lastValueByType[meterType] = wartosc;
      processedFileIds.add(fileId);

      file.setName(noweImie);
      file.moveTo(folderArchiwum);

      wyniki.push({ meter: meterLabel, plik: fileName, wartosc, archiwumNazwa: noweImie });
      Logger.log(`OK: ${meterLabel} (${meterType}) → ${wartosc} | ${noweImie}`);

    } catch (e) {
      bledy.push({ meter: meterLabelFallback, plik: fileName, powod: e.message || String(e) });
      Logger.log(`Błąd: ${fileName}: ${e}`);
    }
  }

  wyslijRaport_(wyniki, bledy);
}

// ── Email report ──────────────────────────────────────────────────────────────

function wyslijRaport_(wyniki, bledy) {
  const email   = Session.getEffectiveUser().getEmail();
  const teraz   = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const arkuszUrl      = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`;
  const rozliczeniaUrl = `https://docs.google.com/spreadsheets/d/${ROZLICZENIA_SPREADSHEET_ID}`;

  const labelMap = {
    'c.o.':        'C.O.',
    'prad':        'Prąd',
    'woda-zimna':  'Woda zimna',
    'woda-ciepla': 'Woda ciepła'
  };

  let body = `Raport odczytu liczników – ${teraz}\n\n`;

  if (wyniki.length === 0 && bledy.length === 0) {
    body += 'Brak nowych zdjęć do przetworzenia.\n';
  }

  if (wyniki.length > 0) {
    body += `✅ Przetworzone (${wyniki.length}):\n`;
    for (const w of wyniki) {
      const label = labelMap[w.meter] || w.meter;
      body += `  • ${label}: ${w.wartosc}  (plik źródłowy: ${w.plik})\n`;
    }
    body += `\nArkusz z odczytami: ${arkuszUrl}\n`;
    body += `Rozliczenia (zakładka Odczyty): ${rozliczeniaUrl}\n`;
  }

  if (bledy.length > 0) {
    body += `\n⚠️ Problemy (${bledy.length}):\n`;
    for (const b of bledy) {
      body += `  • ${b.meter} / ${b.plik}: ${b.powod}\n`;
    }
  }

  const subject = wyniki.length > 0
    ? `✅ Liczniki – ${wyniki.length} nowych odczytów (${teraz})`
    : bledy.length > 0
      ? `⚠️ Liczniki – brak nowych odczytów, ${bledy.length} problemów (${teraz})`
      : `ℹ️ Liczniki – brak nowych zdjęć (${teraz})`;

  MailApp.sendEmail({ to: email, subject, body });
  Logger.log(`Email wysłany na ${email}: "${subject}"`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Reads existing rows from the sheet and returns:
 *  - processedFileIds: Set of file IDs already logged (column F)
 *  - lastValueByType:  Map of meter type → highest recorded numeric value
 */
function wczytajIstniejaceOdczyty_(sheet) {
  const processedFileIds = new Set();
  const lastValueByType  = {};

  const lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    return { processedFileIds, lastValueByType };
  }

  const data = sheet.getRange(1, 1, lastRow, COL_FILE_URL).getValues();

  for (const row of data) {
    const rowType   = (row[COL_TYPE  - 1] || '').toString().trim();
    const rowValue  = Number(row[COL_VALUE - 1]);
    const rowFileId = (row[COL_FILE_ID - 1] || '').toString().trim();

    if (rowFileId) {
      processedFileIds.add(rowFileId);
    }

    if (rowType && !isNaN(rowValue) && rowValue > 0) {
      if (lastValueByType[rowType] === undefined || rowValue > lastValueByType[rowType]) {
        lastValueByType[rowType] = rowValue;
      }
    }
  }

  return { processedFileIds, lastValueByType };
}

/** Mapowanie typu licznika (Gemini / odczyty-rozpoznane) → kolumny w Rozliczenia_najem. */
function mapTypNaRozliczeniaMedium_(meterType) {
  const map = {
    CO:          { medium: 'CO',          jednostka: 'GJ'  },
    PRAD:        { medium: 'Prad',        jednostka: 'kWh' },
    WODA_ZIMNA:  { medium: 'Woda_zimna',  jednostka: 'm3'  },
    WODA_CIEPLA: { medium: 'Woda_ciepla', jednostka: 'm3'  }
  };
  const entry = map[meterType];
  if (!entry) {
    throw new Error(`Nieznany typ licznika do Rozliczenia_najem: ${meterType}`);
  }
  return entry;
}

/** Wartość licznika CO w odczyty-rozpoznane jest ×1000 względem GJ w Rozliczenia_najem. */
function stanDlaRozliczenia_(meterType, wartosc) {
  if (meterType === 'CO') {
    return wartosc / 1000;
  }
  return wartosc;
}

function formatDataKomorkiRozliczenia_(cell) {
  if (cell instanceof Date) {
    return Utilities.formatDate(cell, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  const s = (cell || '').toString().trim();
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function kluczOdczytuRozliczenia_(dataWizyty, medium, stan) {
  return `${dataWizyty}|${medium}|${Number(stan)}`;
}

function wczytajIstniejaceKluczeOdczytyRozliczenia_(sheet) {
  const keys = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow < ROZL_DATA_START_ROW) {
    return keys;
  }

  const numRows = lastRow - ROZL_DATA_START_ROW + 1;
  const rows = sheet.getRange(ROZL_DATA_START_ROW, ROZL_COL_DATA, numRows, 4).getValues();
  for (const row of rows) {
    const dataWizyty = formatDataKomorkiRozliczenia_(row[0]);
    const medium     = (row[2] || '').toString().trim();
    const stan       = Number(row[3]);
    if (dataWizyty && medium && !isNaN(stan)) {
      keys.add(kluczOdczytuRozliczenia_(dataWizyty, medium, stan));
    }
  }
  return keys;
}

function dopiszOdczytDoRozliczen_(rozliczeniaSheet, teraz, meterType, wartosc, existingKeys) {
  const tz = Session.getScriptTimeZone();
  const dataWizyty = Utilities.formatDate(teraz, tz, 'yyyy-MM-dd');
  const idWizyty   = `V-${Utilities.formatDate(teraz, tz, 'yyyy-MM')}`;
  const { medium, jednostka } = mapTypNaRozliczeniaMedium_(meterType);
  const stan = stanDlaRozliczenia_(meterType, wartosc);
  const key  = kluczOdczytuRozliczenia_(dataWizyty, medium, stan);

  if (existingKeys.has(key)) {
    Logger.log(`Rozliczenia_najem/Odczyty: pominięto duplikat ${key}`);
    return;
  }

  const nextRow = rozliczeniaSheet.getLastRow() + 1;
  const colCount = ROZL_COL_STATUS - ROZL_COL_DATA + 1;
  rozliczeniaSheet
    .getRange(nextRow, ROZL_COL_DATA, 1, colCount)
    .setValues([[dataWizyty, idWizyty, medium, stan, jednostka, 'OK']]);

  existingKeys.add(key);
  Logger.log(`Rozliczenia_najem/Odczyty: ${medium} = ${stan} ${jednostka} (${idWizyty})`);
}

function dopiszBladSyncDoLogRozliczenia_(logSheet, teraz, meterType, fileName, fileId, powod) {
  const tz = Session.getScriptTimeZone();
  const dataLog  = Utilities.formatDate(teraz, tz, 'yyyy-MM-dd');
  const idWizyty = `V-${Utilities.formatDate(teraz, tz, 'yyyy-MM')}`;
  const { medium } = mapTypNaRozliczeniaMedium_(meterType);
  const opis = `Automat (odczyty): zapis do Odczyty nieudany — ${medium}, plik ${fileName}, id ${fileId}. ${powod}`;

  try {
    const nextRow = logSheet.getLastRow() + 1;
    const colCount = LOG_COL_SKORYGOWANO - LOG_COL_DATA + 1;
    logSheet
      .getRange(nextRow, LOG_COL_DATA, 1, colCount)
      .setValues([[dataLog, idWizyty, medium, opis, 'NIE']]);
    Logger.log(`Rozliczenia_najem/Log: zapisano błąd sync dla ${fileName}`);
  } catch (logErr) {
    Logger.log(`Nie udało się zapisać do Log: ${logErr.message || logErr}`);
  }
}

// ── Gemini vision call ────────────────────────────────────────────────────────

function analizujZdjecieGemini(base64Image, mimeType) {
  const apiKey = getGeminiApiKey_();
  const model  = getGeminiModel_();
  const url    = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const prompt = `
Extract the meter reading value from the image.
Possible meter types are: PRAD, WODA_ZIMNA, WODA_CIEPLA, CO.
Ignore serial numbers, labels, barcodes, and unrelated text.
Return ONLY valid JSON in this exact format:
{"type":"PRAD|WODA_ZIMNA|WODA_CIEPLA|CO|UNKNOWN","value":12345}
If reading is unclear, return:
{"type":"UNKNOWN","value":null}
`.trim();

  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: base64Image } }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0
    }
  };

  const options = {
    method: "post",
    contentType: "application/json",
    headers: { "x-goog-api-key": apiKey },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  for (let attempt = 1; attempt <= GEMINI_API_MAX_ATTEMPTS; attempt++) {
    const response     = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode === 200) {
      return parsujOdpowiedzGemini_(responseText);
    }

    const moznaPonowic = czyPonowicProbeGemini_(responseCode) && attempt < GEMINI_API_MAX_ATTEMPTS;
    if (moznaPonowic) {
      const waitMs = obliczGeminiRetryDelayMs_(responseCode, attempt, responseText);
      Logger.log(
        `Gemini HTTP ${responseCode} (${model}): czekam ${Math.round(waitMs / 1000)} s, ` +
        `ponawiam (${attempt + 1}/${GEMINI_API_MAX_ATTEMPTS})…`
      );
      Utilities.sleep(waitMs);
      continue;
    }

    throw new Error(`Błąd Gemini API (HTTP ${responseCode}, model=${model}): ${responseText}`);
  }

  throw new Error(`Błąd Gemini API: przekroczono liczbę prób (${GEMINI_API_MAX_ATTEMPTS})`);
}

function parsujOdpowiedzGemini_(responseText) {
  const resJson = JSON.parse(responseText);
  const text    = resJson?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || null;

  if (!text) {
    throw new Error(`Gemini nie zwróciło tekstu JSON. Odpowiedź: ${responseText}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`Nie udało się sparsować JSON z Gemini: ${text}`);
  }

  return {
    type:  parsed.type  ?? "UNKNOWN",
    value: parsed.value ?? null
  };
}

function czyPonowicProbeGemini_(responseCode) {
  return responseCode === 429 || responseCode === 503 || responseCode === 502 || responseCode === 500;
}

function obliczGeminiRetryDelayMs_(responseCode, attempt, responseText) {
  if (responseCode === 429) {
    return wyciagnijRetryDelayMs_(responseText) || (attempt * GEMINI_RETRY_PAUSE_MS);
  }
  // 503 UNAVAILABLE itp. — odczekaj kilka sekund, potem dłużej przy kolejnych próbach
  return Math.min(attempt * GEMINI_RETRY_PAUSE_MS, 60000);
}

function wyciagnijRetryDelayMs_(responseText) {
  try {
    const errJson = JSON.parse(responseText);
    const retryDelay = errJson?.error?.details
      ?.find(d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo')
      ?.retryDelay;

    if (!retryDelay) {
      return null;
    }

    const seconds = parseFloat(String(retryDelay).replace('s', ''));
    if (isNaN(seconds) || seconds <= 0) {
      return null;
    }

    return Math.ceil(seconds * 1000) + 1000;
  } catch (e) {
    return null;
  }
}
