/**
 * What the game tells the players: whose turn it is, what a move did and who won.
 * Pure: it returns string keys for translate() (see i18n.js) plus their values, so all the
 * wording lives in one place. `role` names the player a message is about; the UI turns it
 * into the {who} placeholder.
 */

import { AI_PLAYER } from './game.js';
import { scores, winnerOf } from './rules.js';

/** @typedef {'you' | 'ai' | 'p1' | 'p2'} Role */

/**
 * @typedef {object} Message
 * @property {string} key - string key in i18n.js
 * @property {Role} [role] - the player the message is about (fills {who})
 * @property {Record<string, number>} [values] - other placeholders, such as {count}
 * @property {'capture' | 'extra' | 'sweep' | 'turn' | 'result'} tone - how the UI styles it
 */

const NAME_KEYS = Object.freeze({ you: 'nameYou', ai: 'nameAi', p1: 'nameP1', p2: 'nameP2' });
const LEVEL_KEYS = Object.freeze({ easy: 'levelEasy', medium: 'levelMedium', hard: 'levelHard' });

/**
 * Who a player is in a mode: 'you' and 'ai' against the computer, 'p1' and 'p2' with two
 * players on one device.
 * @param {import('./rules.js').Player} player
 * @param {'ai' | 'local'} mode
 * @returns {Role}
 */
export function roleOf(player, mode) {
  if (mode === 'local') return player === 0 ? 'p1' : 'p2';
  return player === AI_PLAYER ? 'ai' : 'you';
}

/**
 * String key of a role's name.
 * @param {Role} role
 * @returns {string}
 */
export function nameKey(role) {
  return NAME_KEYS[role];
}

/**
 * String key of a computer level's name.
 * @param {'easy' | 'medium' | 'hard'} level
 * @returns {string}
 */
export function levelKey(level) {
  return LEVEL_KEYS[level];
}

/**
 * The status line for a position: whose turn it is, or the result once the game is over.
 * @param {import('./rules.js').GameState} state
 * @param {'ai' | 'local'} mode
 * @returns {Message}
 */
export function turnMessage(state, mode) {
  if (state.over) return resultMessage(state, mode);
  const role = roleOf(state.turn, mode);
  if (role === 'you') return { key: 'turnYou', role, tone: 'turn' };
  if (role === 'ai') return { key: 'turnAi', role, tone: 'turn' };
  return { key: 'turnPlayer', role, tone: 'turn' };
}

/**
 * The status line while a player's move is being animated.
 * @param {import('./rules.js').Player} player - the mover
 * @param {'ai' | 'local'} mode
 * @returns {Message}
 */
export function sowingMessage(player, mode) {
  const role = roleOf(player, mode);
  return { key: role === 'you' ? 'sowingYou' : 'sowingOther', role, tone: 'turn' };
}

/**
 * The result of a finished game, with the winner's score first.
 * @param {import('./rules.js').GameState} state - a finished game
 * @param {'ai' | 'local'} mode
 * @returns {Message}
 */
export function resultMessage(state, mode) {
  const [first, second] = scores(state);
  const values = { a: Math.max(first, second), b: Math.min(first, second) };
  const winner = winnerOf(state);
  if (winner === 'draw') return { key: 'resultDraw', values, tone: 'result' };
  const role = roleOf(winner, mode);
  const key = { you: 'resultWin', ai: 'resultLose' }[role] ?? 'resultPlayer';
  return { key, role, values, tone: 'result' };
}

/**
 * What a move did worth announcing: a capture, an extra turn, the end-of-game sweep.
 * @param {import('./rules.js').MoveResult} result
 * @param {'ai' | 'local'} mode
 * @returns {Message[]} in the order they happened (often empty)
 */
export function moveMessages(result, mode) {
  const messages = [];
  const role = roleOf(result.player, mode);
  const you = role === 'you';
  if (result.capture) {
    const kind = result.capture.kind === 'even' ? 'captureEven' : 'captureEmpty';
    messages.push({ key: you ? `${kind}You` : kind, role, values: { count: result.capture.stones }, tone: 'capture' });
  }
  if (result.extraTurn) {
    messages.push({ key: you ? 'extraTurnYou' : 'extraTurn', role, tone: 'extra' });
  }
  if (result.sweep) {
    const taker = roleOf(result.sweep.player, mode);
    const key = taker === 'you' ? 'sweepYou' : 'sweep';
    messages.push({ key, role: taker, values: { count: result.sweep.stones }, tone: 'sweep' });
  }
  return messages;
}
