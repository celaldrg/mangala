import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  MODES,
  SPEEDS,
  defaultSettings,
  gameOptions,
  nextSpeed,
  normalizeSettings,
} from '../src/settings.js';
import { LEVELS } from '../src/ai.js';
import { createGame } from '../src/game.js';

test('normalizeSettings falls back to the defaults for missing or broken input', () => {
  for (const raw of [null, undefined, 'fast', 42, [], {}]) {
    assert.deepEqual(normalizeSettings(raw), DEFAULT_SETTINGS);
  }
  assert.notEqual(normalizeSettings(null), DEFAULT_SETTINGS, 'a fresh object every time');
  assert.equal(DEFAULT_SETTINGS.language, 'en');
});

test('normalizeSettings keeps valid fields, replaces invalid ones and drops unknown ones', () => {
  const raw = { mode: 'local', level: 'insane', first: '1', speed: 'instant', language: 'tr', extra: true };
  assert.deepEqual(normalizeSettings(raw), {
    mode: 'local',
    level: 'medium',
    first: 0,
    speed: 'instant',
    language: 'tr',
  });
  assert.deepEqual(normalizeSettings({ level: 'hard', first: 1, language: 'de', speed: 'toString' }), {
    ...DEFAULT_SETTINGS,
    level: 'hard',
    first: 1,
  });
});

test('nextSpeed cycles slow, normal, fast, instant and back to slow', () => {
  assert.equal(nextSpeed('slow'), 'normal');
  assert.equal(nextSpeed('normal'), 'fast');
  assert.equal(nextSpeed('fast'), 'instant');
  assert.equal(nextSpeed('instant'), 'slow');
  assert.equal(nextSpeed('warp'), 'slow');
  const times = Object.values(SPEEDS);
  assert.equal(SPEEDS.instant, 0);
  times.slice(1).forEach((time, index) => assert.ok(time < times[index], 'each speed is faster'));
});

test('every mode and level the settings accept can start a game', () => {
  for (const mode of MODES) {
    for (const level of Object.keys(LEVELS)) {
      const game = createGame({ mode, level, first: 1 });
      assert.equal(game.getState().turn, 1);
      assert.equal(game.isAiTurn(), mode === 'ai');
    }
  }
});

test('with reduced motion the default speed is fast, but a saved speed still wins', () => {
  assert.deepEqual(defaultSettings(), DEFAULT_SETTINGS);
  assert.deepEqual(defaultSettings({ reducedMotion: false }), DEFAULT_SETTINGS);
  const calm = defaultSettings({ reducedMotion: true });
  assert.deepEqual(calm, { ...DEFAULT_SETTINGS, speed: 'fast' });
  assert.equal(normalizeSettings(null, calm).speed, 'fast', 'nothing saved yet');
  assert.equal(normalizeSettings({ speed: 'slow' }, calm).speed, 'slow', 'the player chose slow');
  assert.equal(normalizeSettings({ speed: 'warp' }, calm).speed, 'fast', 'a broken saved speed');
  assert.equal(DEFAULT_SETTINGS.speed, 'normal', 'the shared defaults stay untouched');
});

test('who starts applies against the computer only: with two players, Player 1 always starts', () => {
  const saved = { ...DEFAULT_SETTINGS, level: 'hard', first: 1 };
  assert.deepEqual(gameOptions({ ...saved, mode: 'ai' }), { mode: 'ai', level: 'hard', first: 1 });
  assert.deepEqual(gameOptions({ ...saved, mode: 'local' }), { mode: 'local', level: 'hard', first: 0 });
  assert.equal(createGame(gameOptions({ ...saved, mode: 'local' })).getState().turn, 0);
  assert.equal(createGame(gameOptions({ ...saved, mode: 'ai' })).isAiTurn(), true);
});
