'use strict';

// Issue #3, seam 2, scenario "duplikat nie dopisuje wiersza": dopiszOdczytDoRozliczen_ must not
// touch the Rozliczenia_najem/Odczyty sheet at all when the (Data, Medium, Stan) key already
// exists — regardless of which date (processing time vs. photo creation date) produced it.
//
// dopiszOdczytDoRozliczen_ calls the GAS globals `Utilities`/`Session`/`Logger` directly (there's
// no dependency injection in the GAS codebase), so this file stubs the minimal surface used by
// the function under test before requiring the module. These stubs are process-local to this
// test file and have no effect on the real Apps Script runtime.
global.Utilities = {
  formatDate(date, _tz, fmt) {
    if (fmt !== 'yyyy-MM-dd') {
      throw new Error(`stub Utilities.formatDate: unsupported format "${fmt}"`);
    }
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
};
global.Session = { getScriptTimeZone: () => 'UTC' };
global.Logger = { log: () => {} };

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { dopiszOdczytDoRozliczen_, kluczOdczytuRozliczenia_ } = require('./najem.js');

test('duplikat (ta sama Data+Medium+Stan) nie dopisuje wiersza do Rozliczenia_najem/Odczyty', () => {
  const dataUtworzeniaZdjecia = new Date('2026-08-10T00:00:00Z');
  const existingKeys = new Set([kluczOdczytuRozliczenia_('2026-08-10', 'Woda_zimna', 12.5)]);

  const sheetZadotknietyNiePrzezCiebie = new Proxy({}, {
    get() {
      throw new Error('sheet nie powinien być odczytywany/zapisywany dla duplikatu');
    }
  });

  assert.doesNotThrow(() =>
    dopiszOdczytDoRozliczen_(sheetZadotknietyNiePrzezCiebie, dataUtworzeniaZdjecia, 'WODA_ZIMNA', 12.5, existingKeys)
  );
  // Set pozostaje niezmieniony — brak nowego wpisu.
  assert.equal(existingKeys.size, 1);
});

test('nowy klucz (inna Data) dopisuje wiersz (dociera do sheet.getRange)', () => {
  const dataUtworzeniaZdjecia = new Date('2026-09-10T00:00:00Z');
  const existingKeys = new Set([kluczOdczytuRozliczenia_('2026-08-10', 'Woda_zimna', 12.5)]);

  let dotarloDoSheet = false;
  const fakeRange = {
    getValues: () => [['']], // brak danych pod ROZL_DATA_START_ROW → ostatniWierszDanychKolB_ zwraca start-1
    copyTo: () => {},
    setValues: () => {}
  };
  const fakeSheet = {
    getLastRow: () => 3, // < ROZL_DATA_START_ROW (4) → ostatniWierszDanychKolB_ krótka ścieżka
    getRange: (...args) => { dotarloDoSheet = true; return fakeRange; }
  };

  dopiszOdczytDoRozliczen_(fakeSheet, dataUtworzeniaZdjecia, 'WODA_ZIMNA', 12.5, existingKeys);

  assert.equal(dotarloDoSheet, true);
  assert.equal(existingKeys.has(kluczOdczytuRozliczenia_('2026-09-10', 'Woda_zimna', 12.5)), true);
});
