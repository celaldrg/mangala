import test from 'node:test';
import assert from 'node:assert/strict';
import { AI_PLAYER, createGame } from '../src/game.js';
import { chooseMove } from '../src/ai.js';
import { TOTAL_STONES, createState, pitsOf, scores } from '../src/rules.js';
import { createRng, pick } from '../src/rng.js';

const OPENING = createState().board;

/** Lets the AI move until it is the human's turn again (or the game ends). */
function playAiTurns(game) {
  while (game.isAiTurn()) assert.notEqual(game.move(game.chooseAiMove()), null);
}

test('a new game starts from the opening with player 0 to move', () => {
  const game = createGame({ rng: createRng(1) });
  assert.deepEqual(game.getState().board, OPENING);
  assert.equal(game.getState().turn, 0);
  assert.deepEqual(game.legalMoves(), [0, 1, 2, 3, 4, 5]);
  assert.equal(game.isAiTurn(), false);
  assert.equal(game.canUndo(), false);
  assert.equal(game.undo(), false);
});

test('move() plays a legal pit and returns what happened; an illegal pit returns null', () => {
  const game = createGame({ mode: 'local' });
  const result = game.move(3);
  assert.equal(result.extraTurn, true);
  assert.equal(game.getState(), result.after);
  assert.equal(game.move(9), null, "not player 1's turn");
  assert.equal(game.move(6), null, 'a treasury is not a pit');
  assert.equal(game.getState(), result.after, 'a rejected move changes nothing');
});

test('in vs-AI mode the computer plays the top row', () => {
  const game = createGame({ mode: 'ai', level: 'easy', rng: createRng(7) });
  game.move(0);
  assert.equal(game.isAiTurn(), true);
  assert.equal(game.getState().turn, AI_PLAYER);
  const pit = game.chooseAiMove();
  assert.ok(pitsOf(AI_PLAYER).includes(pit));
  playAiTurns(game);
  assert.equal(game.getState().turn, 0);
});

test('the AI can make the first move', () => {
  const game = createGame({ first: 1, level: 'easy', rng: createRng(2) });
  assert.equal(game.isAiTurn(), true);
  playAiTurns(game);
  assert.equal(game.canUndo(), false, 'nothing of the human to take back yet');
  const humanTurn = game.getState();
  game.move(game.legalMoves()[0]);
  playAiTurns(game);
  assert.equal(game.undo(), true);
  assert.equal(game.getState(), humanTurn);
});

test('two-player mode: nobody is the AI and undo takes back one move at a time', () => {
  const game = createGame({ mode: 'local' });
  const positions = [game.getState()];
  for (const pit of [3, 0, 8, 1]) {
    assert.equal(game.isAiTurn(), false);
    assert.notEqual(game.move(pit), null, `pit ${pit}`);
    positions.push(game.getState());
  }
  for (let index = positions.length - 2; index >= 0; index -= 1) {
    assert.equal(game.undo(), true);
    assert.equal(game.getState(), positions[index]);
  }
  assert.equal(game.canUndo(), false);
});

test("vs-AI undo goes back to the human's last turn, skipping the AI's replies", () => {
  const game = createGame({ level: 'medium', rng: createRng(11) });
  game.move(3);
  const afterExtraTurn = game.getState();
  assert.equal(afterExtraTurn.turn, 0, 'pit 3 ends in the treasury: the human moves again');
  game.move(0);
  playAiTurns(game);
  assert.equal(game.undo(), true);
  assert.equal(game.getState(), afterExtraTurn);
  assert.equal(game.undo(), true);
  assert.deepEqual(game.getState().board, OPENING);
  assert.equal(game.canUndo(), false);
});

test('full games against every AI level end with all stones in the treasuries', () => {
  for (const [seed, level] of [[1, 'easy'], [2, 'medium'], [3, 'hard']]) {
    const rng = createRng(seed);
    const game = createGame({ level, rng: createRng(seed + 100), first: seed % 2 });
    while (!game.getState().over) {
      if (game.isAiTurn()) game.move(game.chooseAiMove());
      else game.move(pick(game.legalMoves(), rng));
    }
    const [mine, theirs] = scores(game.getState());
    assert.equal(mine + theirs, TOTAL_STONES);
    assert.equal(game.isAiTurn(), false);
    assert.deepEqual(game.legalMoves(), []);
  }
});

test('with a time limit the computer plays the deepest ply it finished in time', () => {
  const opening = createState({ turn: 1 });
  const rushed = createGame({ first: 1, level: 'hard', rng: createRng(1), timeLimit: 0 }).chooseAiMove();
  const patient = createGame({ first: 1, level: 'hard', rng: createRng(1) }).chooseAiMove();
  assert.equal(rushed, chooseMove(opening, { depth: 1, rng: createRng(1) }), 'no time: the first ply only');
  assert.equal(patient, chooseMove(opening, { level: 'hard', rng: createRng(1) }), 'no limit: the full depth');
  assert.notEqual(rushed, patient, 'the two depths disagree here, so the limit really applies');
});

test('unknown modes and levels are rejected', () => {
  assert.throws(() => createGame({ mode: 'online' }), RangeError);
  assert.throws(() => createGame({ level: 'expert' }), RangeError);
});
