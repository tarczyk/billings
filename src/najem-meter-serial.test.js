'use strict';

// Issue: Gemini wizualnie zgadywał typ licznika (zimna vs. ciepła woda) i czasem mylił się,
// co powodowało błędne porównanie z ostatnim odczytem innego licznika ("Odczyt X nie jest
// wyższy od ostatniego" mimo że to był inny, poprawny licznik). Od teraz typ licznika jest
// ustalany na podstawie numeru seryjnego widocznego na zdjęciu (METER_SERIALS w najem.js),
// a wizualne zgadywanie Gemini jest tylko fallbackiem, gdy numer seryjny jest nieczytelny.
//
// ustalTypLicznika_ woła Logger.log bezpośrednio (brak DI w kodzie GAS), więc stubujemy go
// przed require — zgodnie z konwencją z najem-sync.test.js.
global.Logger = { log: () => {} };

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { typLicznikaZNumeruSeryjnego_, ustalTypLicznika_ } = require('./najem.js');

test('typLicznikaZNumeruSeryjnego_ rozpoznaje znane numery liczników', () => {
  assert.equal(typLicznikaZNumeruSeryjnego_('521730059'), 'WODA_ZIMNA');
  assert.equal(typLicznikaZNumeruSeryjnego_('519734717'), 'WODA_CIEPLA');
  assert.equal(typLicznikaZNumeruSeryjnego_('547038719'), 'CO');
  assert.equal(typLicznikaZNumeruSeryjnego_('S34U28'), 'PRAD');
});

test('typLicznikaZNumeruSeryjnego_ normalizuje spacje/myślniki/wielkość liter', () => {
  assert.equal(typLicznikaZNumeruSeryjnego_('521 730 059'), 'WODA_ZIMNA');
  assert.equal(typLicznikaZNumeruSeryjnego_('s34-u28'), 'PRAD');
});

test('typLicznikaZNumeruSeryjnego_ zwraca null dla nieznanego/pustego numeru', () => {
  assert.equal(typLicznikaZNumeruSeryjnego_('000000000'), null);
  assert.equal(typLicznikaZNumeruSeryjnego_(null), null);
  assert.equal(typLicznikaZNumeruSeryjnego_(''), null);
});

test('ustalTypLicznika_ ufa numerowi seryjnemu nawet gdy Gemini wizualnie zgadł inny typ (regresja błędu z issue)', () => {
  // Zdjęcie licznika ciepłej wody (numer 519734717), ale Gemini wizualnie uznało je za zimną wodę.
  const odczyt = { type: 'WODA_ZIMNA', value: 39.262, serial: '519734717' };
  assert.equal(ustalTypLicznika_(odczyt, 'IMG20261111162312.jpg'), 'WODA_CIEPLA');
});

test('ustalTypLicznika_ rzuca błąd dla nierozpoznanego numeru seryjnego zamiast ufać zgadywance Gemini', () => {
  const odczyt = { type: 'WODA_ZIMNA', value: 39.262, serial: '999999999' };
  assert.throws(
    () => ustalTypLicznika_(odczyt, 'IMG20261111162312.jpg'),
    /Nierozpoznany numer seryjny.*999999999/
  );
});

test('ustalTypLicznika_ używa wizualnego zgadywania Gemini, gdy numer seryjny jest nieczytelny', () => {
  const odczyt = { type: 'CO', value: 1234, serial: null };
  assert.equal(ustalTypLicznika_(odczyt, 'IMG_bez_numeru.jpg'), 'CO');
});
