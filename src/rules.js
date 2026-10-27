/**
 * Mangala rules: the board, sowing, captures and the end of the game.
 * Pure module (no DOM, no globals), shared by the browser UI, the AI and the tests.
 *
 * The board is an array of 14 stone counts. Sowing walks up the indices (counter-clockwise):
 *
 *            12  11  10   9   8   7        <- player 1's pits (kuyu)
 *      [13]                          [6]   <- treasuries (hazine)
 *             0   1   2   3   4   5        <- player 0's pits
 *
 * Each player owns six pits and the treasury on their right: player 0 owns 0-5 and 6,
 * player 1 owns 7-12 and 13. Pits facing each other add up to 12 (0 faces 12, 5 faces 7).
 */

export const PITS_PER_SIDE = 6;
export const STONES_PER_PIT = 4;
export const BOARD_SIZE = 2 * PITS_PER_SIDE + 2;
export const TOTAL_STONES = 2 * PITS_PER_SIDE * STONES_PER_PIT;

/** @typedef {0 | 1} Player */

/**
 * @typedef {object} GameState
 * @property {number[]} board - the 14 stone counts described above (treat as read-only)
 * @property {Player} turn - the player to move
 * @property {boolean} over - true once all pits on one side are empty
 */

/**
 * @typedef {object} Capture
 * @property {'even' | 'empty'} kind - 'even': last stone made an opponent pit even;
 *   'empty': last stone landed in an empty own pit facing a non-empty one
 * @property {number[]} pits - the pits emptied into the treasury
 * @property {number} stones - how many stones were captured
 * @property {number} store - board index of the receiving treasury
 */

/**
 * @typedef {object} Sweep
 * @property {Player} player - the player whose side ran out, who takes the rest
 * @property {number[]} pits - the non-empty pits emptied into that player's treasury
 * @property {number} stones - how many stones were swept
 * @property {number} store - board index of the receiving treasury
 */

/**
 * @typedef {object} MoveResult
 * @property {Player} player - who moved
 * @property {number} pit - the pit picked
 * @property {number[]} drops - board indices that received a stone, in sowing order
 * @property {number} last - where the last stone landed
 * @property {Capture | null} capture
 * @property {boolean} extraTurn - the last stone landed in the mover's treasury and the game goes on
 * @property {Sweep | null} sweep - set when the move ended the game with stones still on one side
 * @property {GameState} before - the position before the move (unchanged)
 * @property {GameState} after - the position after the move
 */

/**
 * Board index of a player's treasury.
 * @param {Player} player
 * @returns {number} 6 for player 0, 13 for player 1
 */
export function storeOf(player) {
  return player === 0 ? PITS_PER_SIDE : BOARD_SIZE - 1;
}

/**
 * Board indices of a player's six pits, in sowing order.
 * @param {Player} player
 * @returns {number[]}
 */
export function pitsOf(player) {
  const first = player === 0 ? 0 : PITS_PER_SIDE + 1;
  return Array.from({ length: PITS_PER_SIDE }, (_, offset) => first + offset);
}

/**
 * The player who owns a pit or treasury.
 * @param {number} index - board index 0-13
 * @returns {Player}
 */
export function ownerOf(index) {
  return index <= PITS_PER_SIDE ? 0 : 1;
}

/**
 * The pit facing a pit across the board.
 * @param {number} pit - a pit index (not a treasury)
 * @returns {number}
 */
export function oppositeOf(pit) {
  return 2 * PITS_PER_SIDE - pit;
}

/**
 * The other player.
 * @param {Player} player
 * @returns {Player}
 */
export function opponentOf(player) {
  return player === 0 ? 1 : 0;
}

/**
 * Creates a position: the standard opening (4 stones in each pit, empty treasuries) or a given board.
 * A given board with one side all empty counts as a finished game.
 * @param {{ turn?: Player, board?: number[] }} [options] - turn: who moves first (default 0)
 * @returns {GameState}
 * @throws {RangeError} on a malformed board or turn
 */
export function createState({ turn = 0, board = openingBoard() } = {}) {
  if (turn !== 0 && turn !== 1) throw new RangeError(`Invalid turn: ${turn}`);
  const valid = board.length === BOARD_SIZE && board.every((n) => Number.isInteger(n) && n >= 0);
  if (!valid) throw new RangeError('A board needs 14 non-negative whole numbers');
  const cells = [...board];
  return { board: cells, turn, over: hasEmptySide(cells) };
}

/**
 * The pits the player to move may pick: their own non-empty pits.
 * @param {GameState} state
 * @returns {number[]} board indices, empty once the game is over
 */
export function legalMoves(state) {
  if (state.over) return [];
  return pitsOf(state.turn).filter((pit) => state.board[pit] > 0);
}

/**
 * Whether the player to move may pick this pit.
 * @param {GameState} state
 * @param {number} pit - board index
 * @returns {boolean}
 */
export function isLegalMove(state, pit) {
  return legalMoves(state).includes(pit);
}

/**
 * Plays one move: sows, applies a capture, decides the next turn and ends the game when a side is empty.
 * @param {GameState} state - not modified
 * @param {number} pit - board index of one of the mover's non-empty pits
 * @returns {MoveResult}
 * @throws {RangeError} when the move is not legal
 */
export function applyMove(state, pit) {
  if (!isLegalMove(state, pit)) throw new RangeError(`Illegal move: pit ${pit}`);
  const player = state.turn;
  const board = [...state.board];
  const drops = sow(board, player, pit);
  const last = drops[drops.length - 1];
  const capture = captureAt(board, player, last);
  const over = hasEmptySide(board);
  const sweep = over ? sweepRest(board) : null;
  const extraTurn = !over && last === storeOf(player);
  const after = { board, turn: extraTurn ? player : opponentOf(player), over };
  return { player, pit, drops, last, capture, extraTurn, sweep, before: state, after };
}

/**
 * Treasury counts.
 * @param {GameState} state
 * @returns {[number, number]} [player 0, player 1]
 */
export function scores(state) {
  return [state.board[storeOf(0)], state.board[storeOf(1)]];
}

/**
 * The result of a finished game: the fuller treasury wins.
 * @param {GameState} state
 * @returns {Player | 'draw' | null} the winner, 'draw' on equal treasuries, null while the game is on
 */
export function winnerOf(state) {
  if (!state.over) return null;
  const [first, second] = scores(state);
  if (first === second) return 'draw';
  return first > second ? 0 : 1;
}

/** @returns {number[]} the opening board */
function openingBoard() {
  const board = new Array(BOARD_SIZE).fill(STONES_PER_PIT);
  board[storeOf(0)] = 0;
  board[storeOf(1)] = 0;
  return board;
}

/**
 * Next index in sowing order for `player`, skipping the opponent's treasury.
 * @param {number} index
 * @param {Player} player
 * @returns {number}
 */
function nextIndex(index, player) {
  const next = (index + 1) % BOARD_SIZE;
  return next === storeOf(opponentOf(player)) ? (next + 1) % BOARD_SIZE : next;
}

/**
 * Empties `pit` and sows its stones in place, one per index. The first stone goes back into
 * the emptied pit; a pit holding a single stone passes it on to the next pit instead.
 * @param {number[]} board - modified in place
 * @param {Player} player
 * @param {number} pit
 * @returns {number[]} the indices that received a stone, in order
 */
function sow(board, player, pit) {
  let stones = board[pit];
  board[pit] = 0;
  const drops = [];
  let index = stones === 1 ? nextIndex(pit, player) : pit;
  while (stones > 0) {
    board[index] += 1;
    drops.push(index);
    stones -= 1;
    index = nextIndex(index, player);
  }
  return drops;
}

/**
 * Applies the capture triggered by the last stone, if any.
 * @param {number[]} board - modified in place
 * @param {Player} player - the mover
 * @param {number} last - where the last stone landed
 * @returns {Capture | null}
 */
function captureAt(board, player, last) {
  const found = findCapture(board, player, last);
  if (!found) return null;
  const store = storeOf(player);
  return { ...found, stones: moveToStore(board, found.pits, store), store };
}

/**
 * Which capture the last stone triggers: an opponent pit made even, or an own pit that was
 * empty (it now holds just the last stone) facing a non-empty opponent pit.
 * @param {number[]} board
 * @param {Player} player - the mover
 * @param {number} last - where the last stone landed
 * @returns {{ kind: 'even' | 'empty', pits: number[] } | null}
 */
function findCapture(board, player, last) {
  if (last === storeOf(player)) return null;
  if (ownerOf(last) !== player) return board[last] % 2 === 0 ? { kind: 'even', pits: [last] } : null;
  const facing = oppositeOf(last);
  if (board[last] === 1 && board[facing] > 0) return { kind: 'empty', pits: [last, facing] };
  return null;
}

/**
 * End of the game: the player whose pits ran out takes every stone left on the other side.
 * @param {number[]} board - a board with at least one empty side, modified in place
 * @returns {Sweep | null} null when both sides are already empty
 */
function sweepRest(board) {
  const player = sideTotal(board, 0) === 0 ? 0 : 1;
  const pits = pitsOf(opponentOf(player)).filter((pit) => board[pit] > 0);
  if (pits.length === 0) return null;
  const store = storeOf(player);
  return { player, pits, stones: moveToStore(board, pits, store), store };
}

/**
 * Empties `pits` into a treasury.
 * @param {number[]} board - modified in place
 * @param {number[]} pits
 * @param {number} store
 * @returns {number} how many stones moved
 */
function moveToStore(board, pits, store) {
  let stones = 0;
  for (const pit of pits) {
    stones += board[pit];
    board[pit] = 0;
  }
  board[store] += stones;
  return stones;
}

/**
 * @param {number[]} board
 * @param {Player} player
 * @returns {number} stones in the player's pits
 */
function sideTotal(board, player) {
  return pitsOf(player).reduce((sum, pit) => sum + board[pit], 0);
}

/**
 * @param {number[]} board
 * @returns {boolean} whether all pits on either side are empty
 */
function hasEmptySide(board) {
  return sideTotal(board, 0) === 0 || sideTotal(board, 1) === 0;
}
