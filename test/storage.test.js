import test from 'node:test';
import assert from 'node:assert/strict';
import { load, save } from '../src/storage.js';

/** A Map-backed stand-in for localStorage. */
function fakeStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      data.set(key, String(value));
    },
  };
}

test('save and load round-trip JSON under a mangala: prefix', () => {
  const storage = fakeStorage();
  assert.equal(save('settings', { speed: 'fast', first: 1 }, () => storage), true);
  assert.deepEqual([...storage.data.keys()], ['mangala:settings']);
  assert.deepEqual(load('settings', null, () => storage), { speed: 'fast', first: 1 });
});

test('load returns the fallback when nothing or garbage is stored', () => {
  const storage = fakeStorage();
  assert.equal(load('missing', 'default', () => storage), 'default');
  storage.setItem('mangala:broken', '{not json');
  assert.equal(load('broken', 'default', () => storage), 'default');
});

test('blocked, missing or full storage never throws', () => {
  const blocked = () => {
    throw new Error('SecurityError: storage is disabled');
  };
  for (const getStorage of [blocked, () => undefined, () => null]) {
    assert.equal(load('settings', 'default', getStorage), 'default');
    assert.equal(save('settings', { speed: 'fast' }, getStorage), false);
  }
  const full = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  assert.equal(save('settings', { speed: 'fast' }, () => full), false);
  assert.equal(save('settings', 10n, () => fakeStorage()), false, 'values JSON cannot hold are dropped');
});
