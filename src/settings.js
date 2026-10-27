/**
 * Player preferences: their defaults and validation. Pure; main.js loads and saves them through
 * storage.js and passes whatever it read through normalizeSettings() first.
 */

import { LEVELS } from './ai.js';
import { DEFAULT_LANGUAGE, isLanguage } from './i18n.js';

export const MODES = Object.freeze(['ai', 'local']);

/** Milliseconds per sowing step for each animation speed; 0 shows the result at once. */
export const SPEEDS = Object.freeze({ slow: 420, normal: 260, fast: 130, instant: 0 });

/**
 * @typedef {object} Settings
 * @property {'ai' | 'local'} mode - against the computer or two players on one device
 * @property {'easy' | 'medium' | 'hard'} level - computer strength
 * @property {0 | 1} first - who starts against the computer: 0 = the human, 1 = the computer
 * @property {'slow' | 'normal' | 'fast' | 'instant'} speed - sowing animation speed
 * @property {'en' | 'tr'} language
 */

/** @type {Readonly<Settings>} */
export const DEFAULT_SETTINGS = Object.freeze({
  mode: 'ai',
  level: 'medium',
  first: 0,
  speed: 'normal',
  language: DEFAULT_LANGUAGE,
});

const VALIDATORS = Object.freeze({
  mode: (value) => MODES.includes(value),
  level: (value) => typeof value === 'string' && Object.hasOwn(LEVELS, value),
  first: (value) => value === 0 || value === 1,
  speed: (value) => typeof value === 'string' && Object.hasOwn(SPEEDS, value),
  language: isLanguage,
});

/**
 * The defaults for a device: when the system asks for reduced motion, stones are sown at the
 * fast speed instead of the normal one (the player can still pick any speed).
 * @param {{ reducedMotion?: boolean }} [device]
 * @returns {Settings}
 */
export function defaultSettings({ reducedMotion = false } = {}) {
  return { ...DEFAULT_SETTINGS, speed: reducedMotion ? 'fast' : DEFAULT_SETTINGS.speed };
}

/**
 * Keeps the valid fields of a settings object and fills in defaults for the rest.
 * @param {unknown} raw - anything, e.g. what storage returned
 * @param {Settings} [defaults] - used for every missing or invalid field
 * @returns {Settings} a complete, valid settings object
 */
export function normalizeSettings(raw, defaults = DEFAULT_SETTINGS) {
  const source = raw !== null && typeof raw === 'object' ? raw : {};
  const entries = Object.entries(defaults).map(([key, fallback]) => {
    const value = source[key];
    return [key, VALIDATORS[key](value) ? value : fallback];
  });
  return Object.fromEntries(entries);
}

/**
 * The createGame() options for a new game with these settings. Who starts is a choice against
 * the computer only: with two players on one device, Player 1 always starts.
 * @param {Settings} settings
 * @returns {{ mode: 'ai' | 'local', level: 'easy' | 'medium' | 'hard', first: 0 | 1 }}
 */
export function gameOptions({ mode, level, first }) {
  return { mode, level, first: mode === 'ai' ? first : 0 };
}

/**
 * The next animation speed in the cycle slow, normal, fast, instant, slow…
 * @param {string} speed - the current speed (an unknown one restarts the cycle)
 * @returns {'slow' | 'normal' | 'fast' | 'instant'}
 */
export function nextSpeed(speed) {
  const names = Object.keys(SPEEDS);
  return names[(names.indexOf(speed) + 1) % names.length];
}
