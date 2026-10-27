import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_MOVES } from '../src/demo.js';
import { createGame } from '../src/game.js';
import { createRng } from '../src/rng.js';
import { TOTAL_STONES, applyMove, createState, legalMoves, pitsOf, scores } from '../src/rules.js';

/** The demo moves replayed from the opening, each one checked to be legal. */
function demoState() {
  return DEMO_MOVES.reduce((state, pit) => {
    assert.ok(legalMoves(state).includes(pit), `pit ${pit} is legal`);
    return applyMove(state, pit).after;
  }, createState());
}

test('the ?demo position is a valid, lively mid-game with player 0 to move', () => {
  assert.ok(Object.isFrozen(DEMO_MOVES));
  const state = demoState();
  assert.deepEqual(state.board, [4, 0, 1, 7, 2, 1, 8, 4, 0, 1, 2, 3, 8, 7]);
  assert.equal(state.turn, 0);
  assert.equal(state.over, false);
  assert.equal(state.board.reduce((total, n) => total + n, 0), TOTAL_STONES);

  const [mine, theirs] = scores(state);
  assert.ok(mine > 0 && theirs > 0, 'both treasuries hold stones');
  const pits = [...pitsOf(0), ...pitsOf(1)].map((pit) => state.board[pit]);
  assert.ok(new Set(pits).size >= 6, 'pit counts are uneven');

  const options = legalMoves(state).map((pit) => applyMove(state, pit));
  assert.ok(options.some((result) => result.capture), 'a capture is on offer');
  assert.ok(options.some((result) => result.extraTurn), 'an extra turn is on offer');
});

test('the UI reaches the demo position by replaying DEMO_MOVES through the game controller', () => {
  const game = createGame({ mode: 'ai', level: 'medium', first: 0, rng: createRng(2026) });
  for (const pit of DEMO_MOVES) assert.ok(game.move(pit), `pit ${pit} is legal`);
  assert.deepEqual(game.getState(), demoState());
  assert.equal(game.isAiTurn(), false, 'the demo waits for the human, so the screenshot is stable');
  assert.equal(game.canUndo(), true);
});
