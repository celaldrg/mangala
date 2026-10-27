/**
 * Computer opponent: negamax search with alpha-beta pruning over the rules in rules.js.
 * An extra turn keeps the same player to move, so the search never assumes strict alternation.
 * The search deepens one ply at a time, so a time limit can stop it with a sound move in hand.
 */

import { applyMove, legalMoves, opponentOf, storeOf } from './rules.js';
import { pick } from './rng.js';

/** Search depth in plies (single moves, extra turns included) for each difficulty level. */
export const LEVELS = Object.freeze({ easy: 1, medium: 4, hard: 8 });

/** Added to the final margin of a finished game, so a sure win beats any lead in an open game. */
const WIN_BONUS = 1000;

/** Thrown inside a search that ran out of time; chooseMove() then keeps the last finished depth. */
class OutOfTime extends Error {}

/** The time check of a search without a time limit. */
const NO_LIMIT = () => false;

/**
 * Static evaluation of a position for `player`: treasury difference, or the final margin plus
 * a large bonus once the game is over. Always an integer, and evaluate(s, p) === -evaluate(s, other).
 * @param {import('./rules.js').GameState} state
 * @param {import('./rules.js').Player} player
 * @returns {number} positive when `player` is ahead
 */
export function evaluate(state, player) {
  const margin = state.board[storeOf(player)] - state.board[storeOf(opponentOf(player))];
  if (!state.over || margin === 0) return margin;
  return margin + Math.sign(margin) * WIN_BONUS;
}

/**
 * Negamax value of a position, searched `depth` plies deep with alpha-beta pruning.
 * @param {import('./rules.js').GameState} state
 * @param {number} depth - plies to look ahead (0 = static evaluation)
 * @param {number} [alpha] - lower bound of the search window
 * @param {number} [beta] - upper bound of the search window
 * @param {() => boolean} [outOfTime] - asked once per position searched; true stops the search
 * @returns {number} the value for the player to move in `state`
 * @throws {OutOfTime} as soon as outOfTime() returns true
 */
export function search(state, depth, alpha = -Infinity, beta = Infinity, outOfTime = NO_LIMIT) {
  if (outOfTime()) throw new OutOfTime();
  if (state.over || depth <= 0) return evaluate(state, state.turn);
  let best = -Infinity;
  for (const { after } of orderedMoves(state)) {
    best = Math.max(best, valueAfter(state.turn, after, depth - 1, alpha, beta, outOfTime));
    alpha = Math.max(alpha, best);
    if (alpha >= beta) break;
  }
  return best;
}

/**
 * Picks a move for the player to move. The search deepens one ply at a time up to `depth`; when
 * `timeLimit` runs out it stops and plays the best move of the deepest ply it finished (the
 * first ply always finishes). Ties between equally good moves are broken with `rng`.
 * @param {import('./rules.js').GameState} state - a position that is not over
 * @param {object} [options]
 * @param {'easy' | 'medium' | 'hard'} [options.level] - sets the depth unless `depth` is given
 * @param {number} [options.depth] - plies to look ahead
 * @param {() => number} [options.rng] - tie-breaker; without it the first best move is taken
 * @param {number} [options.timeLimit] - milliseconds the search may take (default: no limit)
 * @param {() => number} [options.now] - the clock in milliseconds (tests pass a fake one)
 * @returns {number} board index of the chosen pit
 * @throws {RangeError} for an unknown level or a finished game
 */
export function chooseMove(
  state,
  { level = 'medium', depth = depthFor(level), rng, timeLimit = Infinity, now = () => performance.now() } = {},
) {
  if (state.over) throw new RangeError('The game is over');
  const deadline = now() + timeLimit;
  const outOfTime = () => now() >= deadline;
  let best = bestMoves(state, 1, NO_LIMIT);
  for (let ply = 2; ply <= depth; ply += 1) {
    try {
      best = bestMoves(state, ply, outOfTime);
    } catch (error) {
      if (!(error instanceof OutOfTime)) throw error;
      break;
    }
  }
  return rng ? pick(best, rng) : best[0];
}

/**
 * Search depth for a difficulty level.
 * @param {string} level - 'easy', 'medium' or 'hard'
 * @returns {number}
 * @throws {RangeError} for an unknown level
 */
export function depthFor(level) {
  if (!Object.hasOwn(LEVELS, level)) throw new RangeError(`Unknown level: ${level}`);
  return LEVELS[level];
}

/**
 * The moves of equal, best value for the player to move, searched `depth` plies deep.
 * @param {import('./rules.js').GameState} state
 * @param {number} depth
 * @param {() => boolean} outOfTime
 * @returns {number[]} board indices, in search order
 * @throws {OutOfTime} when the time runs out first
 */
function bestMoves(state, depth, outOfTime) {
  let bestValue = -Infinity;
  let bestPits = [];
  for (const { pit, after } of orderedMoves(state)) {
    // Values are integers, so a window starting just below the best still detects exact ties.
    const value = valueAfter(state.turn, after, depth - 1, bestValue - 1, Infinity, outOfTime);
    if (value > bestValue) {
      bestValue = value;
      bestPits = [pit];
    } else if (value === bestValue) {
      bestPits.push(pit);
    }
  }
  return bestPits;
}

/**
 * Value of the position reached by a move, for the player who made it.
 * @param {import('./rules.js').Player} player - the mover
 * @param {import('./rules.js').GameState} after - the position after the move
 * @param {number} depth - plies left
 * @param {number} alpha
 * @param {number} beta
 * @param {() => boolean} outOfTime
 * @returns {number}
 */
function valueAfter(player, after, depth, alpha, beta, outOfTime) {
  if (after.over) return evaluate(after, player);
  if (after.turn === player) return search(after, depth, alpha, beta, outOfTime);
  return -search(after, depth, -beta, -alpha, outOfTime);
}

/**
 * Legal moves with their resulting positions, most promising first (bigger treasury gain,
 * then extra turns), which lets alpha-beta prune more.
 * @param {import('./rules.js').GameState} state
 * @returns {{ pit: number, after: import('./rules.js').GameState }[]}
 */
function orderedMoves(state) {
  const store = storeOf(state.turn);
  const priority = ({ after }) => 2 * after.board[store] + (after.turn === state.turn ? 1 : 0);
  return legalMoves(state)
    .map((pit) => ({ pit, after: applyMove(state, pit).after }))
    .sort((a, b) => priority(b) - priority(a));
}
