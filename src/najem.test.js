'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { wyznaczWizyteZDatyUtworzenia_ } = require('./najem.js');

// Issue #3, seam 2: Data i ID_wizyty pochodzą z daty utworzenia zdjęcia licznika,
// nigdy z dnia przetworzenia skryptu (ADR 0003).

test('zdjęcie utworzone 31.07, przetworzone 01.08 → V-2026-07 (nie V-2026-08)', () => {
  const wynik = wyznaczWizyteZDatyUtworzenia_('2026-07-31');
  assert.equal(wynik.dataWizyty, '2026-07-31');
  assert.equal(wynik.idWizyty, 'V-2026-07');
});

test('zdjęcie utworzone 10.08 → V-2026-08', () => {
  const wynik = wyznaczWizyteZDatyUtworzenia_('2026-08-10');
  assert.equal(wynik.dataWizyty, '2026-08-10');
  assert.equal(wynik.idWizyty, 'V-2026-08');
});

test('miesiąc z jedną cyfrą dziesiątek zachowuje zero wiodące w ID_wizyty', () => {
  const wynik = wyznaczWizyteZDatyUtworzenia_('2027-01-05');
  assert.equal(wynik.idWizyty, 'V-2027-01');
});

test('odrzuca datę w formacie innym niż yyyy-MM-dd', () => {
  assert.throws(() => wyznaczWizyteZDatyUtworzenia_('31-07-2026'), /Nieprawidłowy format/);
});
