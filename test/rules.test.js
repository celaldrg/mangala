import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_STONES,
  applyMove,
  createState,
  legalMoves,
  oppositeOf,
  ownerOf,
  pitsOf,
  scores,
  storeOf,
  winnerOf,
} from '../src/rules.js';

/** Builds a board from player 0's pits and treasury, then player 1's pits and treasury. */
const board = (pits0, store0, pits1, store1) => [...pits0, store0, ...pits1, store1];
const sum = (values) => values.reduce((total, n) => total + n, 0);

test('the opening has 4 stones in each of the 12 pits and empty treasuries', () => {
  const state = createState();
  assert.deepEqual(state.board, [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4, 4, 4, 0]);
  assert.equal(state.turn, 0);
  assert.equal(state.over, false);
  assert.equal(sum(state.board), TOTAL_STONES);
  assert.deepEqual(legalMoves(state), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(legalMoves(createState({ turn: 1 })), [7, 8, 9, 10, 11, 12]);
});

test('board geometry: six pits and a treasury on the right for each player, facing pits', () => {
  assert.deepEqual(pitsOf(0), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(pitsOf(1), [7, 8, 9, 10, 11, 12]);
  assert.equal(storeOf(0), 6);
  assert.equal(storeOf(1), 13);
  assert.deepEqual([oppositeOf(0), oppositeOf(3), oppositeOf(5), oppositeOf(9)], [12, 9, 7, 3]);
  assert.deepEqual([ownerOf(5), ownerOf(6), ownerOf(7), ownerOf(13)], [0, 0, 1, 1]);
});

test('only own non-empty pits can be played; anything else throws', () => {
  const state = createState({ board: board([0, 4, 4, 4, 4, 4], 4, [4, 4, 4, 4, 4, 4], 0) });
  assert.deepEqual(legalMoves(state), [1, 2, 3, 4, 5]);
  for (const pit of [0, 6, 7, 12, 13, -1, 14, 2.5]) {
    assert.throws(() => applyMove(state, pit), RangeError, `pit ${pit}`);
  }
});

test('createState rejects malformed boards and turns', () => {
  assert.throws(() => createState({ turn: 2 }), RangeError);
  assert.throws(() => createState({ board: [4, 4, 4] }), RangeError);
  assert.throws(() => createState({ board: board([4, 4, 4, 4, 4, -4], 8, [4, 4, 4, 4, 4, 4], 0) }), RangeError);
  assert.throws(() => createState({ board: board([4, 4, 4, 4, 4, 1.5], 2.5, [4, 4, 4, 4, 4, 4], 0) }), RangeError);
});

test('rule: the first stone goes back into the chosen pit', () => {
  const result = applyMove(createState(), 1);
  assert.deepEqual(result.drops, [1, 2, 3, 4]);
  assert.deepEqual(result.after.board, [4, 1, 5, 5, 5, 4, 0, 4, 4, 4, 4, 4, 4, 0]);
  assert.equal(result.capture, null);
  assert.equal(result.extraTurn, false);
  assert.equal(result.after.turn, 1);

  const second = applyMove(result.after, 8);
  assert.deepEqual(second.drops, [8, 9, 10, 11]);
  assert.equal(second.after.board[8], 1);
  assert.equal(second.after.turn, 0);
});

test('rule: a pit holding a single stone passes it on to the next pit', () => {
  const state = createState({ board: board([1, 2, 3, 4, 4, 4], 3, [4, 4, 4, 4, 4, 3], 4) });
  const result = applyMove(state, 0);
  assert.deepEqual(result.drops, [1]);
  assert.deepEqual(result.after.board, board([0, 3, 3, 4, 4, 4], 3, [4, 4, 4, 4, 4, 3], 4));
  assert.equal(result.after.turn, 1);

  const intoStore = createState({ board: board([4, 4, 4, 4, 3, 1], 4, [4, 4, 4, 4, 4, 4], 0) });
  const last = applyMove(intoStore, 5);
  assert.deepEqual(last.drops, [6]);
  assert.equal(last.after.board[5], 0);
  assert.equal(last.after.board[6], 5);
});

test("rule: sowing skips the opponent's treasury", () => {
  const state = createState({ board: board([2, 2, 2, 2, 2, 10], 4, [3, 3, 3, 3, 3, 3], 6) });
  const result = applyMove(state, 5);
  assert.deepEqual(result.drops, [5, 6, 7, 8, 9, 10, 11, 12, 0, 1]);
  assert.deepEqual(result.after.board, board([3, 3, 2, 2, 2, 1], 5, [4, 4, 4, 4, 4, 4], 6));

  const mirrored = createState({ turn: 1, board: board([3, 3, 3, 3, 3, 3], 6, [2, 2, 2, 2, 2, 10], 4) });
  const reply = applyMove(mirrored, 12);
  assert.deepEqual(reply.drops, [12, 13, 0, 1, 2, 3, 4, 5, 7, 8]);
  assert.deepEqual(reply.after.board, board([4, 4, 4, 4, 4, 4], 6, [3, 3, 2, 2, 2, 1], 5));
});

test('sowing 14 stones goes round the board and refills the chosen pit', () => {
  const state = createState({ board: board([14, 2, 2, 2, 2, 2], 0, [4, 4, 4, 4, 4, 4], 0) });
  const result = applyMove(state, 0);
  assert.deepEqual(result.drops, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0]);
  assert.deepEqual(result.after.board, board([2, 3, 3, 3, 3, 3], 1, [5, 5, 5, 5, 5, 5], 0));
  assert.equal(result.capture, null, 'the refilled pit was not empty, so no capture');
});

test('rule: the last stone in your own treasury gives you another turn', () => {
  const result = applyMove(createState(), 3);
  assert.deepEqual(result.drops, [3, 4, 5, 6]);
  assert.equal(result.last, 6);
  assert.equal(result.extraTurn, true);
  assert.equal(result.after.turn, 0);
  assert.equal(result.after.board[6], 1);

  const top = applyMove(createState({ turn: 1 }), 10);
  assert.deepEqual(top.drops, [10, 11, 12, 13]);
  assert.equal(top.extraTurn, true);
  assert.equal(top.after.turn, 1);
});

test("rule: the last stone making an opponent's pit even captures that pit", () => {
  const state = createState({ board: board([4, 4, 4, 4, 4, 4], 0, [3, 4, 4, 4, 4, 5], 0) });
  const result = applyMove(state, 4);
  assert.deepEqual(result.drops, [4, 5, 6, 7]);
  assert.deepEqual(result.capture, { kind: 'even', pits: [7], stones: 4, store: 6 });
  assert.deepEqual(result.after.board, board([4, 4, 4, 4, 1, 5], 5, [0, 4, 4, 4, 4, 5], 0));
  assert.equal(result.after.turn, 1);

  const odd = applyMove(createState(), 4);
  assert.equal(odd.capture, null, '4 + 1 = 5 is odd');
  assert.equal(odd.after.board[7], 5);

  const top = createState({ turn: 1, board: board([3, 4, 4, 4, 4, 5], 0, [4, 4, 4, 4, 4, 4], 0) });
  const reply = applyMove(top, 11);
  assert.deepEqual(reply.capture, { kind: 'even', pits: [0], stones: 4, store: 13 });
  assert.deepEqual(reply.after.board, board([0, 4, 4, 4, 4, 5], 0, [4, 4, 4, 4, 1, 5], 5));
});

test('rule: the last stone in an empty pit of your own captures it and the pit opposite', () => {
  const state = createState({ board: board([4, 3, 4, 0, 4, 4], 2, [4, 4, 6, 4, 4, 4], 1) });
  const result = applyMove(state, 1);
  assert.deepEqual(result.drops, [1, 2, 3]);
  assert.deepEqual(result.capture, { kind: 'empty', pits: [3, 9], stones: 7, store: 6 });
  assert.deepEqual(result.after.board, board([4, 1, 5, 0, 4, 4], 9, [4, 4, 0, 4, 4, 4], 1));
  assert.equal(result.after.turn, 1);

  const single = createState({ board: board([4, 4, 1, 0, 4, 4], 3, [4, 4, 5, 4, 4, 4], 3) });
  assert.deepEqual(applyMove(single, 2).capture, { kind: 'empty', pits: [3, 9], stones: 6, store: 6 });

  const top = createState({ turn: 1, board: board([4, 4, 6, 4, 4, 4], 1, [4, 3, 4, 0, 4, 4], 2) });
  const reply = applyMove(top, 8);
  assert.deepEqual(reply.capture, { kind: 'empty', pits: [10, 2], stones: 7, store: 13 });
  assert.deepEqual(reply.after.board, board([4, 4, 0, 4, 4, 4], 1, [4, 1, 5, 0, 4, 4], 9));
});

test('no empty-pit capture when the opposite pit is empty', () => {
  const state = createState({ board: board([4, 3, 4, 0, 4, 4], 2, [4, 4, 0, 4, 4, 4], 7) });
  const result = applyMove(state, 1);
  assert.equal(result.capture, null);
  assert.deepEqual(result.after.board, board([4, 1, 5, 1, 4, 4], 2, [4, 4, 0, 4, 4, 4], 7));
});

test('rule: the player who empties their side takes every stone left on the other side', () => {
  const state = createState({ board: board([0, 0, 0, 0, 0, 1], 20, [2, 3, 0, 1, 4, 2], 15) });
  const result = applyMove(state, 5);
  assert.equal(result.after.over, true);
  assert.equal(result.extraTurn, false, 'the game is over, so the treasury landing gives no extra turn');
  assert.deepEqual(result.sweep, { player: 0, pits: [7, 8, 10, 11, 12], stones: 12, store: 6 });
  assert.deepEqual(result.after.board, board([0, 0, 0, 0, 0, 0], 33, [0, 0, 0, 0, 0, 0], 15));
  assert.deepEqual(legalMoves(result.after), []);
  assert.equal(winnerOf(result.after), 0);
});

test('end of game: when a capture empties the other side, its owner takes the stones left', () => {
  const state = createState({ board: board([2, 0, 0, 0, 4, 3], 20, [1, 0, 0, 0, 0, 0], 18) });
  const result = applyMove(state, 4);
  assert.deepEqual(result.capture, { kind: 'even', pits: [7], stones: 2, store: 6 });
  assert.equal(result.after.over, true);
  assert.deepEqual(result.sweep, { player: 1, pits: [0, 4, 5], stones: 7, store: 13 });
  assert.deepEqual(result.after.board, board([0, 0, 0, 0, 0, 0], 23, [0, 0, 0, 0, 0, 0], 25));
  assert.equal(winnerOf(result.after), 1);
});

test('end of game: when both sides empty at once there is nothing left to sweep', () => {
  const state = createState({ board: board([0, 0, 1, 0, 0, 0], 20, [0, 0, 5, 0, 0, 0], 22) });
  const result = applyMove(state, 2);
  assert.deepEqual(result.capture, { kind: 'empty', pits: [3, 9], stones: 6, store: 6 });
  assert.equal(result.after.over, true);
  assert.equal(result.sweep, null);
  assert.deepEqual(scores(result.after), [26, 22]);
});

test('rule: the fuller treasury wins and equal treasuries are a draw', () => {
  const state = createState({ board: board([0, 0, 0, 0, 0, 1], 15, [2, 2, 2, 2, 0, 0], 24) });
  assert.equal(winnerOf(state), null, 'no result while the game is on');
  const result = applyMove(state, 5);
  assert.deepEqual(scores(result.after), [24, 24]);
  assert.equal(winnerOf(result.after), 'draw');

  const final = (store0, store1) => createState({ board: board([0, 0, 0, 0, 0, 0], store0, [0, 0, 0, 0, 0, 0], store1) });
  assert.equal(winnerOf(final(30, 18)), 0);
  assert.equal(winnerOf(final(18, 30)), 1);
  assert.equal(winnerOf(final(24, 24)), 'draw');
});

test('applyMove leaves the given position untouched', () => {
  const state = createState({ board: board([4, 3, 4, 0, 4, 4], 2, [4, 4, 6, 4, 4, 4], 1) });
  const copy = structuredClone(state);
  const result = applyMove(state, 1);
  assert.deepEqual(state, copy);
  assert.equal(result.before, state);
  assert.notEqual(result.after.board, state.board);
});
