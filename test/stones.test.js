import test from 'node:test';
import assert from 'node:assert/strict';
import { STONE_COLORS, stoneSlots } from '../src/stones.js';
import { BOARD_SIZE, TOTAL_STONES } from '../src/rules.js';

const cells = Array.from({ length: BOARD_SIZE }, (_, index) => index);

test('stoneSlots gives one slot per stone, the same every time', () => {
  for (const index of cells) {
    assert.deepEqual(stoneSlots(index, 0), []);
    assert.equal(stoneSlots(index, 5).length, 5);
    assert.equal(stoneSlots(index, TOTAL_STONES).length, TOTAL_STONES);
    assert.deepEqual(stoneSlots(index, TOTAL_STONES), stoneSlots(index, TOTAL_STONES));
  }
});

test('adding stones never moves the stones already in a cell', () => {
  for (const index of cells) {
    const all = stoneSlots(index, TOTAL_STONES);
    for (const count of [1, 4, 9, 25]) assert.deepEqual(stoneSlots(index, count), all.slice(0, count));
  }
});

test('slots stay inside their cell and use the stone palette', () => {
  for (const index of cells) {
    for (const slot of stoneSlots(index, TOTAL_STONES)) {
      assert.ok(Math.abs(slot.x) <= 0.5 && Math.abs(slot.y) <= 0.5, `cell ${index} slot inside`);
      assert.ok(Number.isInteger(slot.layer) && slot.layer >= 0);
      assert.ok(Number.isInteger(slot.color) && slot.color >= 0 && slot.color < STONE_COLORS.length);
    }
  }
  for (const { base, rim } of STONE_COLORS) {
    assert.match(base, /^#[0-9a-f]{6}$/);
    assert.match(rim, /^#[0-9a-f]{6}$/);
  }
});

test('the opening stones of a pit sit apart and the cells do not all look alike', () => {
  for (const index of cells) {
    const places = stoneSlots(index, 4).map(({ x, y }) => `${x},${y}`);
    assert.equal(new Set(places).size, 4);
  }
  const looks = new Set(cells.map((index) => stoneSlots(index, 4).map((slot) => slot.color).join()));
  assert.ok(looks.size > BOARD_SIZE / 2);
});
