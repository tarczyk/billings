const FOLDER_SUROWE_ID = "1fwWnW-4rjydwenxvaNsWyAVM0orXR9Fk";
const FOLDER_ARCHIWUM_ID = "1VZbGt-XnOnMOl5A2jDSdF7ucxUXzPqQt";

function getGeminiApiKey_() {
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) {
    throw new Error('Brak GEMINI_API_KEY w Script Properties. Ustaw w: Projekt → Ustawienia → Właściwości skryptu.');
  }
  return key;
}

function przetworzNoweLiczniki() {
  const folderSurowe = DriveApp.getFolderById(FOLDER_SUROWE_ID);
  const folderArchiwum = DriveApp.getFolderById(FOLDER_ARCHIWUM_ID);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  const subfolders = folderSurowe.getFolders();

  while (subfolders.hasNext()) {
    const subfolder = subfolders.next();
    const folderName = subfolder.getName();
    const files = subfolder.getFiles();

    while (files.hasNext()) {
      const file = files.next();
      const mimeType = file.getMimeType();

      if (!mimeType || mimeType.indexOf('image/') !== 0) {
        continue;
      }

      const blob = file.getBlob();
      const base64Image = Utilities.base64Encode(blob.getBytes());

      try {
        const odczyt = analizujZdjecieGemini(base64Image, mimeType);

        const typZFolderu = mapujTypZFolderu_(folderName);
        const typKoncowy = typZFolderu !== 'UNKNOWN'
          ? typZFolderu
          : (odczyt.type || 'UNKNOWN');

        const wartosc = odczyt.value;

        if (typKoncowy === 'UNKNOWN' || wartosc === null || wartosc === undefined || wartosc === '') {
          throw new Error(`Nie udało się ustalić typu lub wartości. folder=${folderName}, gemini=${JSON.stringify(odczyt)}`);
        }

        const teraz = new Date();
        const formatData = Utilities.formatDate(teraz, Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
        const noweImie = `${formatData}_${typKoncowy.toLowerCase()}_${file.getId().slice(0,8)}.jpg`;

        sheet.appendRow([
          teraz,
          typKoncowy,
          wartosc,
          folderName,
          file.getName(),
          file.getUrl()
        ]);

        file.setName(noweImie);
        file.moveTo(folderArchiwum);

      } catch (e) {
        Logger.log(`Błąd przetwarzania pliku ${file.getName()} z folderu ${folderName}: ${e}`);
      }
    }
  }
}

function mapujTypZFolderu_(folderName) {
  const name = (folderName || '').toString().trim().toLowerCase();

  if (name === 'prad') return 'PRAD';
  if (name === 'woda-zimna') return 'WODA_ZIMNA';
  if (name === 'woda-ciepla') return 'WODA_CIEPLA';
  if (name === 'c.o.' || name === 'co' || name === 'c.o') return 'CO';

  return 'UNKNOWN';
}

function analizujZdjecieGemini(base64Image, mimeType) {
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent';

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
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          }
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
    headers: {
      "x-goog-api-key": getGeminiApiKey_()
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  if (responseCode !== 200) {
    throw new Error(`Błąd Gemini API (HTTP ${responseCode}): ${responseText}`);
  }

  const resJson = JSON.parse(responseText);
  const text =
    resJson?.candidates?.[0]?.content?.parts?.find(part => part.text)?.text || null;

  if (!text) {
    throw new Error(`Gemini nie zwróciło tekstu JSON. Odpowiedź: ${responseText}`);
  }

  try {
    const parsed = JSON.parse(text);

    return {
      type: parsed.type ?? "UNKNOWN",
      value: parsed.value ?? null
    };
  } catch (e) {
    throw new Error(`Nie udało się sparsować JSON z Gemini: ${text}`);
  }
}
