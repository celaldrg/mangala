import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMove, createState, legalMoves } from '../src/rules.js';
import { LEVELS, chooseMove, depthFor, evaluate, search } from '../src/ai.js';
import { createRng, pick } from '../src/rng.js';

const board = (pits0, store0, pits1, store1) => [...pits0, store0, ...pits1, store1];
const LEVEL_NAMES = Object.keys(LEVELS);

/** Plain minimax without pruning: the player to move picks max for `player`, the other min. */
function minimax(state, depth, player) {
  if (state.over || depth === 0) return evaluate(state, player);
  const values = legalMoves(state).map((pit) => minimax(applyMove(state, pit).after, depth - 1, player));
  return state.turn === player ? Math.max(...values) : Math.min(...values);
}

/** Positions reached by seeded random play, plus one full of extra-turn chains. */
function samplePositions() {
  const positions = [createState({ board: board([7, 6, 5, 4, 3, 1], 0, [4, 4, 4, 4, 3, 3], 0) })];
  for (let seed = 1; positions.length < 30; seed += 1) {
    const rng = createRng(seed);
    let state = createState({ turn: seed % 2 });
    for (let ply = seed % 25; ply > 0 && !state.over; ply -= 1) {
      state = applyMove(state, pick(legalMoves(state), rng)).after;
    }
    if (!state.over) positions.push(state);
  }
  return positions;
}

test('AI takes the one immediate even capture among six moves, at every level and seed', () => {
  // Pit 2 is the only capture, and it is not the first, the last or the fullest pit.
  const state = createState({ board: board([8, 2, 7, 3, 4, 3], 2, [2, 9, 2, 1, 2, 2], 1) });
  assert.equal(legalMoves(state).length, 6);
  assert.deepEqual(legalMoves(state).filter((pit) => applyMove(state, pit).capture), [2]);
  assert.deepEqual(applyMove(state, 2).capture, { kind: 'even', pits: [8], stones: 10, store: 6 });
  for (const level of LEVEL_NAMES) {
    for (let seed = 1; seed <= 4; seed += 1) {
      assert.equal(chooseMove(state, { level, rng: createRng(seed) }), 2, `${level}, seed ${seed}`);
    }
  }
});

test('AI takes an immediate empty-pit capture at every level', () => {
  const state = createState({ board: board([0, 1, 0, 3, 2, 3], 9, [4, 2, 2, 8, 2, 2], 10) });
  assert.equal(applyMove(state, 1).capture?.kind, 'empty');
  for (const level of LEVEL_NAMES) {
    assert.equal(chooseMove(state, { level, rng: createRng(2) }), 1, level);
  }
});

test('AI playing the top row takes its captures too', () => {
  const even = createState({ turn: 1, board: board([9, 3, 3, 3, 3, 3], 10, [0, 0, 0, 2, 4, 0], 8) });
  const empty = createState({ turn: 1, board: board([4, 2, 2, 8, 2, 2], 10, [0, 1, 0, 3, 2, 3], 9) });
  for (const level of LEVEL_NAMES) {
    assert.equal(chooseMove(even, { level, rng: createRng(3) }), 11, level);
    assert.equal(chooseMove(empty, { level, rng: createRng(3) }), 8, level);
  }
});

test('extra turns: looking ahead, the AI banks a free stone first and captures after', () => {
  const state = createState({ board: board([0, 1, 0, 3, 2, 1], 9, [4, 2, 2, 8, 2, 2], 12) });
  assert.equal(chooseMove(state, { depth: 1 }), 1, 'one ply deep it simply captures');
  for (const depth of [2, 3, 4]) assert.equal(chooseMove(state, { depth }), 5, `depth ${depth}`);
  const next = applyMove(state, 5).after;
  assert.equal(next.turn, 0, 'still the same player after the extra turn');
  for (const depth of [1, 2, 3, 4]) assert.equal(chooseMove(next, { depth }), 1, `depth ${depth}`);
});

test('alpha-beta search equals plain minimax, extra turns included', () => {
  for (const state of samplePositions()) {
    for (let depth = 1; depth <= 5; depth += 1) {
      // "+ 0" folds the -0 a negated draw score can produce into 0.
      assert.equal(search(state, depth) + 0, minimax(state, depth, state.turn), `depth ${depth}`);
    }
  }
});

test('the chosen move is always one of the best moves, whatever the tie-break seed', () => {
  for (const state of samplePositions()) {
    const values = legalMoves(state).map((pit) => minimax(applyMove(state, pit).after, 3, state.turn));
    const best = Math.max(...values);
    for (let seed = 1; seed <= 4; seed += 1) {
      const pit = chooseMove(state, { depth: 4, rng: createRng(seed) });
      assert.equal(values[legalMoves(state).indexOf(pit)], best);
    }
  }
});

test('the AI is repeatable for a seed and always picks a legal pit', () => {
  for (const state of samplePositions()) {
    const first = chooseMove(state, { level: 'easy', rng: createRng(42) });
    assert.equal(chooseMove(state, { level: 'easy', rng: createRng(42) }), first);
    assert.ok(legalMoves(state).includes(first));
  }
});

test('evaluation is the treasury margin, with a decisive bonus once the game is over', () => {
  const open = createState({ board: board([4, 4, 4, 4, 4, 4], 5, [4, 4, 4, 4, 0, 0], 3) });
  assert.equal(evaluate(open, 0), 2);
  assert.equal(evaluate(open, 1), -2);
  const won = createState({ board: board([0, 0, 0, 0, 0, 0], 25, [0, 0, 0, 0, 0, 0], 23) });
  assert.ok(evaluate(won, 0) > 48);
  assert.equal(evaluate(won, 1), -evaluate(won, 0));
});

test('levels get deeper from easy to hard; bad input is rejected', () => {
  assert.ok(LEVELS.easy < LEVELS.medium && LEVELS.medium < LEVELS.hard);
  assert.equal(depthFor('hard'), LEVELS.hard);
  assert.throws(() => depthFor('impossible'), RangeError);
  assert.throws(() => depthFor('toString'), RangeError);
  const over = createState({ board: board([0, 0, 0, 0, 0, 0], 24, [0, 0, 0, 0, 0, 0], 24) });
  assert.throws(() => chooseMove(over), RangeError);
});

/** A fake clock for chooseMove(): it moves on by 1 ms each time it is read and counts the reads. */
function tickingClock() {
  const clock = { reads: 0, now: () => clock.reads++ };
  return clock;
}

test('out of time, the AI stops at once and plays the best move of the deepest finished ply', () => {
  // One ply deep the AI captures at once (pit 1); two plies deep it banks a free stone first (pit 5).
  const state = createState({ board: board([0, 1, 0, 3, 2, 1], 9, [4, 2, 2, 8, 2, 2], 12) });
  assert.equal(chooseMove(state, { depth: 4, timeLimit: 0 }), 1, 'no time at all: the first ply still finishes');

  // The clock is read once for the deadline and then once per position searched.
  const probe = tickingClock();
  assert.equal(chooseMove(state, { depth: 2, timeLimit: Infinity, now: probe.now }), 5);
  const secondPly = probe.reads - 1;

  const enough = tickingClock();
  assert.equal(chooseMove(state, { depth: 4, timeLimit: secondPly + 1, now: enough.now }), 5, 'ply 2 finished');
  assert.equal(enough.reads, secondPly + 2, 'ply 3 stopped at its first position');
  const short = tickingClock();
  assert.equal(chooseMove(state, { depth: 4, timeLimit: secondPly, now: short.now }), 1, 'ply 2 cut short');
});

test('alpha-beta keeps the hard search small: thousands of positions, not millions', () => {
  for (const state of [createState(), ...samplePositions().slice(0, 10)]) {
    const clock = tickingClock();
    const pit = chooseMove(state, { level: 'hard', timeLimit: Infinity, now: clock.now });
    assert.ok(legalMoves(state).includes(pit));
    assert.ok(clock.reads < 60000, `${clock.reads} positions searched`);
  }
});
