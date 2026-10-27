import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMove, createState } from '../src/rules.js';
import { moveFrames } from '../src/frames.js';

const board = (pits0, store0, pits1, store1) => [...pits0, store0, ...pits1, store1];

test('frames lift the stones, drop them one by one, then show the capture', () => {
  const state = createState({ board: board([4, 4, 4, 4, 4, 4], 0, [3, 4, 4, 4, 4, 5], 0) });
  const result = applyMove(state, 4);
  const frames = moveFrames(result);
  assert.deepEqual(frames.map((frame) => frame.kind), ['pickup', 'drop', 'drop', 'drop', 'drop', 'capture']);
  assert.equal(frames[0].board[4], 0, 'the chosen pit is emptied first');
  assert.deepEqual(frames.slice(1, 5).map((frame) => frame.focus[0]), [4, 5, 6, 7]);
  assert.equal(frames[4].board[7], 4, 'the captured pit is shown full before the capture');
  assert.deepEqual(frames[5].focus, [7, 6]);
  assert.deepEqual(frames.at(-1).board, result.after.board);
});

test('a finishing move ends with the sweep frame', () => {
  const state = createState({ board: board([2, 0, 0, 0, 4, 3], 20, [1, 0, 0, 0, 0, 0], 18) });
  const result = applyMove(state, 4);
  const frames = moveFrames(result);
  assert.deepEqual(frames.slice(-2).map((frame) => frame.kind), ['capture', 'sweep']);
  assert.deepEqual(frames.at(-1).focus, [0, 4, 5, 13]);
  assert.deepEqual(frames.at(-1).board, result.after.board);
});

test('a single stone takes one drop frame and frames never alias each other', () => {
  const state = createState({ board: board([1, 2, 3, 4, 4, 4], 3, [4, 4, 4, 4, 4, 3], 4) });
  const frames = moveFrames(applyMove(state, 0));
  assert.deepEqual(frames.map((frame) => frame.kind), ['pickup', 'drop']);
  assert.notEqual(frames[0].board, frames[1].board);
  assert.deepEqual(frames[1].board, board([0, 3, 3, 4, 4, 4], 3, [4, 4, 4, 4, 4, 3], 4));
});
