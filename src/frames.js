/**
 * Animation timeline for a move: board snapshots the UI can show one after another,
 * stone by stone, and skip by jumping straight to the last one.
 */

/**
 * @typedef {object} Frame
 * @property {'pickup' | 'drop' | 'capture' | 'sweep'} kind - what happened in this step
 * @property {number[]} focus - board indices touched by this step (to highlight)
 * @property {number[]} board - the stone counts right after this step
 */

/**
 * Expands a move into frames: lifting the stones, one frame per dropped stone, then the capture
 * and the end-of-game sweep when they happen. The last frame's board equals `result.after.board`.
 * @param {import('./rules.js').MoveResult} result - as returned by applyMove
 * @returns {Frame[]}
 */
export function moveFrames(result) {
  const board = [...result.before.board];
  const frames = [];
  const snapshot = (kind, focus) => frames.push({ kind, focus, board: [...board] });

  board[result.pit] = 0;
  snapshot('pickup', [result.pit]);
  for (const index of result.drops) {
    board[index] += 1;
    snapshot('drop', [index]);
  }
  if (result.capture) {
    collect(board, result.capture);
    snapshot('capture', [...result.capture.pits, result.capture.store]);
  }
  if (result.sweep) {
    collect(board, result.sweep);
    snapshot('sweep', [...result.sweep.pits, result.sweep.store]);
  }
  return frames;
}

/**
 * Moves a capture's or sweep's stones into its treasury.
 * @param {number[]} board - modified in place
 * @param {{ pits: number[], stones: number, store: number }} haul
 */
function collect(board, haul) {
  for (const pit of haul.pits) board[pit] = 0;
  board[haul.store] += haul.stones;
}
