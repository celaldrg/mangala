import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEFAULT_LANGUAGE, LANGUAGES, STRINGS, isLanguage, otherLanguage, translate } from '../src/i18n.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
const captures = (text, pattern) => [...text.matchAll(pattern)].map((match) => match[1]);
const keysOf = (language) => Object.keys(STRINGS[language]).sort();

test('English and Turkish define the same strings with the same placeholders', () => {
  assert.deepEqual(keysOf('tr'), keysOf('en'));
  for (const key of keysOf('en')) {
    const en = translate('en', key);
    const tr = translate('tr', key);
    assert.ok(en.trim() !== '' && tr.trim() !== '', `${key} is not empty`);
    assert.deepEqual(placeholders(tr), placeholders(en), `${key} has the same placeholders`);
  }
});

test('translate fills in placeholders and leaves unknown ones visible', () => {
  assert.equal(translate('en', 'finalScore', { a: 30, b: 18 }), 'Final score 30 – 18');
  assert.equal(translate('tr', 'pitLabel', { who: 'Sen', n: 2, count: 5 }), 'Sen, 2. kuyu: 5 taş');
  assert.equal(translate('en', 'turnPlayer'), '{who} to move: pick a glowing pit');
});

test('English says "1 stone" but "0 stones" and "5 stones"; Turkish says "taş" for any number', () => {
  assert.equal(translate('en', 'pitLabel', { who: 'You', n: 2, count: 1 }), 'You, pit 2: 1 stone');
  assert.equal(translate('en', 'pitLabel', { who: 'You', n: 2, count: 0 }), 'You, pit 2: 0 stones');
  assert.equal(translate('en', 'treasuryLabel', { who: 'Computer', count: 1 }), 'Treasury of Computer: 1 stone');
  assert.equal(translate('en', 'treasuryLabel', { who: 'Computer', count: 5 }), 'Treasury of Computer: 5 stones');
  assert.equal(translate('en', 'sweep', { who: 'Player 2', count: 1 }), 'One side is empty: Player 2 takes the last stone.');
  assert.equal(translate('en', 'sweepYou', { count: 1 }), 'Your pits are empty: you take the last stone.');
  assert.equal(translate('en', 'sweepYou', { count: 3 }), 'Your pits are empty: you take the last 3 stones.');
  assert.equal(translate('tr', 'pitLabel', { who: 'Sen', n: 2, count: 1 }), 'Sen, 2. kuyu: 1 taş');
  assert.equal(translate('tr', 'sweep', { who: '2. Oyuncu', count: 1 }), 'Bir taraf boşaldı: kalan 1 taşı 2. Oyuncu aldı.');

  for (const [key, entry] of Object.entries(STRINGS.en)) {
    if (typeof entry === 'string') continue;
    assert.ok(entry.one.trim() !== '' && entry.other.includes('{count}'), `${key} has both forms`);
    const extra = placeholders(entry.one).filter((name) => !placeholders(entry.other).includes(name));
    assert.deepEqual(extra, [], `${key}: the singular form needs nothing the plural one lacks`);
  }
  // Only captures, which always take two stones or more, may say "{count} stones" with no singular.
  const pluralOnly = Object.entries(STRINGS.en)
    .filter(([, entry]) => typeof entry === 'string' && entry.includes('{count} stones'))
    .map(([key]) => key);
  assert.deepEqual(pluralOnly.sort(), ['captureEmpty', 'captureEmptyYou', 'captureEven', 'captureEvenYou']);
});

test('an unsupported language falls back to English and an unknown key throws', () => {
  assert.equal(translate('de', 'undo'), 'Undo');
  assert.equal(translate(undefined, 'undo'), 'Undo');
  assert.throws(() => translate('en', 'noSuchString'), RangeError);
  assert.throws(() => translate('en', 'toString'), RangeError);
});

test('language helpers: English first, and the toggle shows the language it switches to', () => {
  assert.deepEqual([...LANGUAGES], ['en', 'tr']);
  assert.equal(DEFAULT_LANGUAGE, 'en');
  assert.ok(isLanguage('tr') && isLanguage('en'));
  assert.ok(!isLanguage('TR') && !isLanguage('de') && !isLanguage(undefined));
  assert.equal(otherLanguage('en'), 'tr');
  assert.equal(otherLanguage('tr'), 'en');
  for (const language of LANGUAGES) {
    assert.equal(translate(language, 'langButton'), otherLanguage(language).toUpperCase());
  }
});

test('every string key used by the page and the UI code exists', () => {
  const html = read('../index.html');
  const main = read('../src/main.js');
  const used = [
    ...captures(html, /data-i18n(?:-label)?="([^"]+)"/g),
    ...captures(main, /\bt\('(\w+)'/g),
    ...captures(main, /:\s*'(speed\w+)'/g),
  ];
  assert.ok(used.length > 40, 'the scan found the keys');
  const known = new Set(keysOf('en'));
  for (const key of used) assert.ok(known.has(key), `missing string: ${key}`);
});
