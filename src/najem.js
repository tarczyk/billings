// ── Folder IDs ───────────────────────────────────────────────────────────────
const FOLDER_BIERZACE_ID  = "1fwWnW-4rjydwenxvaNsWyAVM0orXR9Fk"; // odczyty-bierzace
const FOLDER_ARCHIWUM_ID  = "1VZbGt-XnOnMOl5A2jDSdF7ucxUXzPqQt"; // odczyty-archiwum

// Explicit subfolder IDs – iterate only known meter folders
const METER_FOLDERS = [
  { id: "1wV0atUHPEhxLYtx7aJ-j9nOyV-eBQWnN", name: "c.o.",        type: "CO"          },
  { id: "1sro0UEJbEZHTgt_mzYeWMsfc5LI4IHgJ", name: "prad",        type: "PRAD"        },
  { id: "1atvjqInc4NSCGq9oIcDBm2qWK_olf0C9", name: "woda-zimna",  type: "WODA_ZIMNA"  },
  { id: "1fbakwV390nbu8snUzA4BKzOXKE778dME", name: "woda-ciepla", type: "WODA_CIEPLA" }
];

// ── Spreadsheet ID ────────────────────────────────────────────────────────────
const SPREADSHEET_ID = "14oxXC2s_ubqfbPxeYd2hg5WZPODmfLuNUIHxYx8OtjI"; // odczyty-rozpoznane.gsheet

// ── Sheet columns (1-based) ───────────────────────────────────────────────────
const COL_DATE      = 1;  // A
const COL_TYPE      = 2;  // B
const COL_VALUE     = 3;  // C
const COL_FOLDER    = 4;  // D
const COL_FILENAME  = 5;  // E
const COL_FILE_ID   = 6;  // F – used for deduplication
const COL_FILE_URL  = 7;  // G

// ── Gemini ────────────────────────────────────────────────────────────────────
const GEMINI_MODEL_DEFAULT = 'gemini-3.5-flash';
const GEMINI_MAX_RETRIES   = 3;
const GEMINI_DELAY_MS      = 5000; // pause between images to stay within RPM limits

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

function przetworzNoweLiczniki() {
  const folderArchiwum = DriveApp.getFolderById(FOLDER_ARCHIWUM_ID);
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheets()[0];

  const { processedFileIds, lastValueByType } = wczytajIstniejaceOdczyty_(sheet);

  const wyniki = []; // { meter, plik, wartosc, archiwumNazwa }
  const bledy  = []; // { meter, plik, powod }

  for (const meter of METER_FOLDERS) {
    const folder = DriveApp.getFolderById(meter.id);
    const files  = folder.getFiles();

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

      try {
        const blob        = file.getBlob();
        const base64Image = Utilities.base64Encode(blob.getBytes());
        const odczyt      = analizujZdjecieGemini(base64Image, mimeType);

        Utilities.sleep(GEMINI_DELAY_MS);

        const meterType = meter.type;
        const wartosc   = Number(odczyt.value);

        if (!meterType || isNaN(wartosc) || wartosc === null) {
          throw new Error(`Nieprawidłowy wynik Gemini: ${JSON.stringify(odczyt)}`);
        }

        const ostatniOdczyt = lastValueByType[meterType];
        if (ostatniOdczyt !== undefined && wartosc <= ostatniOdczyt) {
          bledy.push({
            meter: meter.name,
            plik: fileName,
            powod: `Odczyt ${wartosc} nie jest wyższy od ostatniego (${ostatniOdczyt}) – pominięto`
          });
          Logger.log(`Pominięto (nie nowy stan): ${fileName}, ${meterType}: ${wartosc} <= ${ostatniOdczyt}`);
          continue;
        }

        const teraz      = new Date();
        const formatData = Utilities.formatDate(teraz, Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
        const noweImie   = `${formatData}_${meterType.toLowerCase()}_${fileId.slice(0, 8)}.jpg`;

        sheet.appendRow([teraz, meterType, wartosc, meter.name, fileName, fileId, file.getUrl()]);

        lastValueByType[meterType] = wartosc;
        processedFileIds.add(fileId);

        file.setName(noweImie);
        file.moveTo(folderArchiwum);

        wyniki.push({ meter: meter.name, plik: fileName, wartosc, archiwumNazwa: noweImie });
        Logger.log(`OK: ${meter.name} → ${wartosc} | ${noweImie}`);

      } catch (e) {
        bledy.push({ meter: meter.name, plik: fileName, powod: e.message || String(e) });
        Logger.log(`Błąd: ${fileName} (${meter.name}): ${e}`);
      }
    }
  }

  wyslijRaport_(wyniki, bledy);
}

// ── Email report ──────────────────────────────────────────────────────────────

function wyslijRaport_(wyniki, bledy) {
  const email   = Session.getEffectiveUser().getEmail();
  const teraz   = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
  const arkuszUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`;

  const labelMap = {
    CO:          'C.O.',
    PRAD:        'Prąd',
    WODA_ZIMNA:  'Woda zimna',
    WODA_CIEPLA: 'Woda ciepła'
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

  for (let attempt = 1; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    const response     = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode === 200) {
      return parsujOdpowiedzGemini_(responseText);
    }

    if (responseCode === 429 && attempt < GEMINI_MAX_RETRIES) {
      const waitMs = wyciagnijRetryDelayMs_(responseText) || (attempt * 30000);
      Logger.log(`Gemini 429 (${model}), próba ${attempt}/${GEMINI_MAX_RETRIES}, czekam ${waitMs}ms`);
      Utilities.sleep(waitMs);
      continue;
    }

    throw new Error(`Błąd Gemini API (HTTP ${responseCode}, model=${model}): ${responseText}`);
  }

  throw new Error(`Błąd Gemini API: przekroczono liczbę prób (${GEMINI_MAX_RETRIES})`);
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
