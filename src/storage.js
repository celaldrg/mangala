/**
 * Tiny localStorage helper. Every access is wrapped in try/catch: in private mode, in a sandboxed
 * frame or with storage full, reads fall back to a default and writes are dropped, never thrown.
 * Nothing is touched at import time.
 */

const PREFIX = 'mangala:';

/** @returns {Storage} the browser's localStorage (reading it may throw) */
const browserStorage = () => globalThis.localStorage;

/**
 * Reads a saved value.
 * @param {string} key
 * @param {*} fallback - returned when nothing usable is stored or storage is unavailable
 * @param {() => Storage} [getStorage] - where to read from (tests pass a fake)
 * @returns {*} the stored value, parsed from JSON
 */
export function load(key, fallback, getStorage = browserStorage) {
  try {
    const raw = getStorage().getItem(PREFIX + key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/**
 * Saves a value as JSON.
 * @param {string} key
 * @param {*} value - anything JSON can hold
 * @param {() => Storage} [getStorage] - where to write to (tests pass a fake)
 * @returns {boolean} whether it was stored
 */
export function save(key, value, getStorage = browserStorage) {
  try {
    getStorage().setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
