import test from 'node:test';
import assert from 'node:assert/strict';
import { createRng, pick } from '../src/rng.js';

const draw = (rng, count) => Array.from({ length: count }, () => rng());

test('the same seed gives the same sequence, different seeds differ', () => {
  assert.deepEqual(draw(createRng(123), 20), draw(createRng(123), 20));
  assert.notDeepEqual(draw(createRng(123), 20), draw(createRng(124), 20));
});

test('values are floats in [0, 1) spread over the whole range', () => {
  const values = draw(createRng(9), 5000);
  assert.ok(values.every((value) => value >= 0 && value < 1));
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  assert.ok(Math.abs(mean - 0.5) < 0.02, `mean ${mean}`);
});

test('pick returns every element of the array over many draws', () => {
  const rng = createRng(77);
  const items = ['a', 'b', 'c', 'd'];
  const seen = new Set(Array.from({ length: 200 }, () => pick(items, rng)));
  assert.deepEqual([...seen].sort(), items);
});
