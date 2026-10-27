import test from 'node:test';
import assert from 'node:assert/strict';
import { AI_PLAYER } from '../src/game.js';
import { LEVELS } from '../src/ai.js';
import { DEMO_MOVES } from '../src/demo.js';
import { applyMove, createState, legalMoves } from '../src/rules.js';
import { createRng, pick } from '../src/rng.js';
import { LANGUAGES, translate } from '../src/i18n.js';
import {
  levelKey,
  moveMessages,
  nameKey,
  resultMessage,
  roleOf,
  sowingMessage,
  turnMessage,
} from '../src/messages.js';

/** The ?demo position: the demo moves replayed from the opening. */
const demoState = () => DEMO_MOVES.reduce((state, pit) => applyMove(state, pit).after, createState());

/** The text the UI shows for a message, the way main.js builds it. */
function say(language, { key, role, values }) {
  return translate(language, key, { ...values, who: role ? translate(language, nameKey(role)) : '' });
}

test('roles: you and the computer, or player 1 and player 2 on one device', () => {
  assert.equal(roleOf(0, 'ai'), 'you');
  assert.equal(roleOf(AI_PLAYER, 'ai'), 'ai');
  assert.equal(roleOf(0, 'local'), 'p1');
  assert.equal(roleOf(1, 'local'), 'p2');
  for (const language of LANGUAGES) {
    for (const role of ['you', 'ai', 'p1', 'p2']) assert.ok(translate(language, nameKey(role)));
    for (const level of Object.keys(LEVELS)) assert.ok(translate(language, levelKey(level)));
  }
});

test('the status line says whose turn it is and who is sowing', () => {
  assert.deepEqual(turnMessage(createState(), 'ai'), { key: 'turnYou', role: 'you', tone: 'turn' });
  assert.deepEqual(turnMessage(createState({ turn: 1 }), 'ai'), { key: 'turnAi', role: 'ai', tone: 'turn' });
  assert.deepEqual(turnMessage(createState({ turn: 1 }), 'local'), { key: 'turnPlayer', role: 'p2', tone: 'turn' });
  assert.deepEqual(sowingMessage(0, 'ai'), { key: 'sowingYou', role: 'you', tone: 'turn' });
  assert.deepEqual(sowingMessage(1, 'ai'), { key: 'sowingOther', role: 'ai', tone: 'turn' });
  assert.equal(say('en', turnMessage(createState({ turn: 1 }), 'local')), 'Player 2 to move: pick a glowing pit');
});

test('captures and extra turns are announced for the player who made them', () => {
  const demo = demoState();
  const even = applyMove(demo, 3);
  assert.equal(even.capture.kind, 'even');
  assert.deepEqual(moveMessages(even, 'ai'), [
    { key: 'captureEvenYou', role: 'you', values: { count: even.capture.stones }, tone: 'capture' },
  ]);
  assert.equal(say('tr', moveMessages(even, 'local')[0]), `1. Oyuncu bir kuyuyu çift yapıp ${even.capture.stones} taş aldı.`);

  const extra = applyMove(demo, 5);
  assert.deepEqual(moveMessages(extra, 'ai'), [{ key: 'extraTurnYou', role: 'you', tone: 'extra' }]);

  const lonely = createState({ board: [1, 0, 4, 4, 4, 4, 7, 4, 4, 4, 4, 4, 4, 0] });
  const empty = applyMove(lonely, 0);
  assert.equal(empty.capture.kind, 'empty');
  assert.deepEqual(moveMessages(empty, 'ai'), [
    { key: 'captureEmptyYou', role: 'you', values: { count: 5 }, tone: 'capture' },
  ]);
  assert.deepEqual(moveMessages(applyMove(createState(), 0), 'ai'), []);
});

test('the end-of-game sweep is announced for the player who takes the stones', () => {
  const ending = createState({ board: [0, 0, 0, 0, 0, 1, 20, 3, 3, 3, 3, 3, 3, 9] });
  const result = applyMove(ending, 5);
  assert.equal(result.extraTurn, false, 'no extra turn once the game is over');
  assert.deepEqual(moveMessages(result, 'ai'), [{ key: 'sweepYou', role: 'you', values: { count: 18 }, tone: 'sweep' }]);
  assert.equal(say('en', moveMessages(result, 'local')[0]), 'One side is empty: Player 1 takes the last 18 stones.');

  const lastStone = applyMove(createState({ board: [0, 0, 0, 0, 0, 1, 23, 1, 0, 0, 0, 0, 0, 23] }), 5);
  assert.deepEqual(moveMessages(lastStone, 'ai'), [{ key: 'sweepYou', role: 'you', values: { count: 1 }, tone: 'sweep' }]);
  assert.equal(say('en', moveMessages(lastStone, 'ai')[0]), 'Your pits are empty: you take the last stone.');
  assert.equal(say('en', moveMessages(lastStone, 'local')[0]), 'One side is empty: Player 1 takes the last stone.');
  assert.equal(say('tr', moveMessages(lastStone, 'ai')[0]), 'Kuyuların boşaldı: kalan 1 taşı sen aldın.');
});

test('the result names the winner and puts the higher score first', () => {
  const finished = (mine, theirs) =>
    createState({ board: [0, 0, 0, 0, 0, 0, mine, 0, 0, 0, 0, 0, 0, theirs] });
  assert.deepEqual(resultMessage(finished(30, 18), 'ai'), {
    key: 'resultWin',
    role: 'you',
    values: { a: 30, b: 18 },
    tone: 'result',
  });
  assert.deepEqual(resultMessage(finished(18, 30), 'ai').key, 'resultLose');
  assert.deepEqual(resultMessage(finished(18, 30), 'ai').values, { a: 30, b: 18 });
  assert.equal(say('en', resultMessage(finished(18, 30), 'local')), 'Player 2 wins!');
  assert.deepEqual(resultMessage(finished(24, 24), 'local'), { key: 'resultDraw', values: { a: 24, b: 24 }, tone: 'result' });
  assert.deepEqual(turnMessage(finished(30, 18), 'ai'), resultMessage(finished(30, 18), 'ai'));
});

test('every message of many random games reads well in both languages', () => {
  const rng = createRng(7);
  const seen = new Set();
  for (let round = 0; round < 40; round += 1) {
    const mode = round % 2 === 0 ? 'ai' : 'local';
    let state = createState({ turn: round % 4 < 2 ? 0 : 1 });
    const messages = [];
    while (!state.over) {
      messages.push(turnMessage(state, mode), sowingMessage(state.turn, mode));
      const result = applyMove(state, pick(legalMoves(state), rng));
      messages.push(...moveMessages(result, mode));
      state = result.after;
    }
    messages.push(turnMessage(state, mode));
    for (const message of messages) {
      seen.add(message.key);
      for (const language of LANGUAGES) {
        assert.doesNotMatch(say(language, message), /\{\w+\}/, `${message.key} (${language}) is complete`);
      }
      assert.doesNotMatch(say('en', message), /\b1 stones\b/, `${message.key} uses the singular`);
      if (message.tone === 'capture') assert.ok(message.values.count >= 2, 'a capture takes two stones or more');
    }
  }
  for (const key of ['captureEven', 'captureEvenYou', 'captureEmpty', 'captureEmptyYou', 'extraTurn', 'extraTurnYou']) {
    assert.ok(seen.has(key), `random games produced ${key}`);
  }
});
