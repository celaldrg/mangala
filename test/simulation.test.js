// The "done" criterion: over 1000 seeded random games no stone is ever created or lost,
// every game ends, and every single move follows the sowing rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TOTAL_STONES,
  applyMove,
  createState,
  legalMoves,
  opponentOf,
  scores,
  storeOf,
  winnerOf,
} from '../src/rules.js';
import { moveFrames } from '../src/frames.js';
import { createRng, pick } from '../src/rng.js';

const GAMES = 1000;
const MAX_PLIES = 500;

const sum = (values) => values.reduce((total, n) => total + n, 0);

/**
 * Plays `GAMES` games of uniformly random legal moves (seeds 1..GAMES, alternating who starts).
 * @param {(result: import('../src/rules.js').MoveResult, seed: number) => void} onMove
 * @returns {{ seed: number, plies: number, final: import('../src/rules.js').GameState }[]}
 */
function playRandomGames(onMove) {
  const games = [];
  for (let seed = 1; seed <= GAMES; seed += 1) {
    const rng = createRng(seed);
    let state = createState({ turn: seed % 2 });
    let plies = 0;
    while (!state.over) {
      const moves = legalMoves(state);
      assert.ok(moves.length > 0, `seed ${seed}: an open game must offer a move`);
      const result = applyMove(state, pick(moves, rng));
      onMove(result, seed);
      state = result.after;
      plies += 1;
      assert.ok(plies <= MAX_PLIES, `seed ${seed}: game did not end within ${MAX_PLIES} moves`);
    }
    games.push({ seed, plies, final: state });
  }
  return games;
}

test(`DONE: ${GAMES} seeded random games keep all ${TOTAL_STONES} stones and always end`, () => {
  const games = playRandomGames(({ before, after }, seed) => {
    assert.equal(sum(after.board), TOTAL_STONES, `seed ${seed}: stone count changed`);
    assert.ok(after.board.every((n) => Number.isInteger(n) && n >= 0), `seed ${seed}: bad pit count`);
    assert.ok(after.board[6] >= before.board[6] && after.board[13] >= before.board[13], 'a treasury shrank');
  });
  assert.equal(games.length, GAMES);
  for (const { seed, final } of games) {
    assert.equal(sum(scores(final)), TOTAL_STONES, `seed ${seed}: stones left outside the treasuries`);
    assert.notEqual(winnerOf(final), null);
  }
  const outcomes = new Set(games.map(({ final }) => winnerOf(final)));
  assert.ok(outcomes.has(0) && outcomes.has(1), 'both players win some random games');
});

test(`every move of ${GAMES} random games follows the sowing rules and replays as frames`, () => {
  playRandomGames((result, seed) => {
    const { player, pit, drops, last, before, after } = result;
    const lifted = before.board[pit];
    assert.equal(drops.length, lifted, `seed ${seed}: one drop per lifted stone`);
    assert.equal(drops[0] === pit, lifted > 1, `seed ${seed}: first stone back unless it was alone`);
    assert.ok(!drops.includes(storeOf(opponentOf(player))), `seed ${seed}: opponent treasury skipped`);
    assert.equal(last, drops.at(-1));
    if (!after.over) {
      assert.equal(result.extraTurn, last === storeOf(player), `seed ${seed}: extra turn iff last in own treasury`);
      assert.equal(after.turn, result.extraTurn ? player : opponentOf(player));
    }
    if (result.sweep) assert.ok(after.over && result.sweep.stones > 0, `seed ${seed}: sweep only at the end`);
    assert.deepEqual(moveFrames(result).at(-1).board, after.board, `seed ${seed}: frames end on the new board`);
  });
});
