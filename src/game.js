/**
 * Game controller for the UI: holds the current position, the undo history and the AI's turns.
 * Pure (no DOM); the UI calls move() with a pit, animates the returned MoveResult with
 * moveFrames(), and asks chooseAiMove() for a pit whenever isAiTurn() is true.
 */

import { applyMove, createState, isLegalMove, legalMoves } from './rules.js';
import { chooseMove, depthFor } from './ai.js';
import { createRng } from './rng.js';

/** In 'ai' mode the computer plays player 1 (the top row) and the human player 0. */
export const AI_PLAYER = 1;

/**
 * @typedef {object} GameOptions
 * @property {'ai' | 'local'} [mode] - against the computer (default) or two players on one device
 * @property {'easy' | 'medium' | 'hard'} [level] - AI strength, default 'medium'
 * @property {import('./rules.js').Player} [first] - who moves first, default 0 (1 = the AI in 'ai' mode)
 * @property {() => number} [rng] - random source for the AI's tie-breaks; pass createRng(seed)
 *   for a repeatable game (default: seeded from the clock)
 * @property {number} [timeLimit] - milliseconds the AI may search for one move; it then plays
 *   the best move of the deepest ply it finished (default: no limit, always the full depth)
 */

/**
 * @typedef {object} Game
 * @property {() => import('./rules.js').GameState} getState - the current position (read-only)
 * @property {() => number[]} legalMoves - pits the player to move may pick
 * @property {(pit: number) => import('./rules.js').MoveResult | null} move - plays a pit for the
 *   player to move (human or AI); null if illegal
 * @property {() => boolean} isAiTurn - whether the computer should move now
 * @property {() => number} chooseAiMove - the computer's pick for the player to move
 * @property {() => boolean} canUndo - whether there is a human move to take back
 * @property {() => boolean} undo - takes back the last human move (and the AI replies after it)
 */

/**
 * Creates a game.
 * @param {GameOptions} [options]
 * @returns {Game}
 * @throws {RangeError} for an unknown mode or level
 */
export function createGame({ mode = 'ai', level = 'medium', first = 0, rng, timeLimit = Infinity } = {}) {
  if (mode !== 'ai' && mode !== 'local') throw new RangeError(`Unknown mode: ${mode}`);
  const depth = depthFor(level);
  const random = rng ?? createRng(Date.now());
  const history = [];
  let current = createState({ turn: first });
  const isHumanTurn = (position) => mode === 'local' || position.turn !== AI_PLAYER;

  return {
    getState: () => current,
    legalMoves: () => legalMoves(current),
    move(pit) {
      if (!isLegalMove(current, pit)) return null;
      const result = applyMove(current, pit);
      history.push(current);
      current = result.after;
      return result;
    },
    isAiTurn: () => !current.over && !isHumanTurn(current),
    chooseAiMove: () => chooseMove(current, { depth, rng: random, timeLimit }),
    canUndo: () => history.some(isHumanTurn),
    undo() {
      if (!history.some(isHumanTurn)) return false;
      do {
        current = history.pop();
      } while (!isHumanTurn(current));
      return true;
    },
  };
}
