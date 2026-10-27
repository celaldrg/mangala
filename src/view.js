/**
 * The board on screen. Builds the twelve pits, the two treasuries and the sowing "hand" once,
 * then redraws stones, counts and highlights on request. DOM only: it knows the layout of the
 * board but not the rules; main.js decides what to show.
 */

import { pitsOf, storeOf } from './rules.js';
import { STONE_COLORS, stoneSlots } from './stones.js';

/** Pits from left to right on screen. Player 1's row is seen from player 0's side, so it runs backwards. */
export const TOP_ROW = Object.freeze([...pitsOf(1)].reverse());
export const BOTTOM_ROW = Object.freeze(pitsOf(0));

/**
 * @typedef {object} Cell
 * @property {number} index - board index
 * @property {HTMLElement} root - the pit button or the treasury box
 * @property {HTMLElement} well - the carved hollow that holds the stones
 * @property {HTMLElement} count - the number label
 * @property {HTMLElement[]} stones - stone elements, in slot order
 */

/**
 * @typedef {object} BoardView
 * @property {(board: number[], options?: { animate?: boolean }) => void} render - draws stone counts
 * @property {() => void} relabel - refreshes the accessible labels (after a language change)
 * @property {(pits: number[]) => void} setPlayable - highlights the pits that may be picked
 * @property {(kind: 'origin' | 'preview' | 'hit' | 'captured', indices: number[]) => void} mark
 * @property {(index: number, count: number, options?: { jump?: boolean }) => void} showHand
 * @property {() => void} hideHand
 * @property {(ms: number) => void} setTravelTime - how long the hand takes from pit to pit
 * @property {(target: EventTarget | null) => number | null} pitOf - pit index of an element
 * @property {(x: number, y: number) => number | null} pitAt - pit index under a screen point
 * @property {(index: number) => void} focusPit
 */

/**
 * Builds the board inside an empty element.
 * @param {HTMLElement} root - the board element (a CSS grid, see style.css)
 * @param {(index: number, count: number) => string} labelFor - accessible label of a cell
 * @returns {BoardView}
 */
export function createBoardView(root, labelFor) {
  const cells = new Map();
  const place = (cell, column, row) => {
    cell.root.style.gridColumn = column;
    cell.root.style.gridRow = row;
    cells.set(cell.index, cell);
    root.append(cell.root);
  };
  place(makeStore(storeOf(1), 'top'), '1', '1 / span 2');
  TOP_ROW.forEach((index, column) => place(makePit(index, 'top'), String(column + 2), '1'));
  BOTTOM_ROW.forEach((index, column) => place(makePit(index, 'bottom'), String(column + 2), '2'));
  place(makeStore(storeOf(0), 'bottom'), '8', '1 / span 2');
  const hand = element('span', 'hand');
  hand.setAttribute('aria-hidden', 'true');
  root.append(hand);

  const pitOf = (target) => {
    const pit = target instanceof Element ? target.closest('.pit') : null;
    return pit && root.contains(pit) ? Number(pit.dataset.index) : null;
  };

  return {
    render(board, { animate = false } = {}) {
      for (const cell of cells.values()) setStones(cell, board[cell.index], animate, labelFor);
    },
    relabel() {
      for (const cell of cells.values()) cell.root.setAttribute('aria-label', labelFor(cell.index, cell.stones.length));
    },
    setPlayable(pits) {
      for (const index of [...TOP_ROW, ...BOTTOM_ROW]) setPlayable(cells.get(index).root, pits.includes(index));
    },
    mark(kind, indices) {
      for (const cell of cells.values()) cell.root.classList.toggle(kind, indices.includes(cell.index));
    },
    showHand(index, count, { jump = false } = {}) {
      moveHand(hand, root, cells.get(index).well, jump);
      hand.textContent = String(count);
      hand.classList.add('visible');
    },
    hideHand() {
      hand.classList.remove('visible');
    },
    setTravelTime(ms) {
      root.style.setProperty('--travel', `${Math.round(ms)}ms`);
    },
    pitOf,
    pitAt: (x, y) => pitOf(document.elementFromPoint(x, y)),
    focusPit(index) {
      cells.get(index).root.focus();
    },
  };
}

/**
 * Shows `count` stones in a cell, keeping the stones already there in place.
 * @param {Cell} cell
 * @param {number} count
 * @param {boolean} animate - let newly added stones drop in
 * @param {(index: number, count: number) => string} labelFor
 */
function setStones(cell, count, animate, labelFor) {
  if (cell.stones.length === count && cell.count.textContent === String(count)) return;
  while (cell.stones.length > count) cell.stones.pop().remove();
  const slots = stoneSlots(cell.index, count);
  for (let k = cell.stones.length; k < count; k += 1) {
    const stone = makeStone(slots[k]);
    if (animate) stone.classList.add('new');
    cell.well.append(stone);
    cell.stones.push(stone);
  }
  cell.count.textContent = String(count);
  cell.root.setAttribute('aria-label', labelFor(cell.index, count));
}

/**
 * Makes a pit pickable or not: highlight, tab order and the accessible disabled state.
 * Not the `disabled` attribute, so a tap on a resting pit still reaches the board (to skip).
 * @param {HTMLElement} pit
 * @param {boolean} playable
 */
function setPlayable(pit, playable) {
  pit.classList.toggle('playable', playable);
  pit.tabIndex = playable ? 0 : -1;
  pit.setAttribute('aria-disabled', String(!playable));
}

/**
 * Puts the hand over the middle of a well, gliding there unless `jump` is set.
 * @param {HTMLElement} hand
 * @param {HTMLElement} board
 * @param {HTMLElement} well
 * @param {boolean} jump
 */
function moveHand(hand, board, well, jump) {
  const box = board.getBoundingClientRect();
  const rect = well.getBoundingClientRect();
  hand.classList.toggle('jump', jump);
  hand.style.setProperty('--hx', `${Math.round(rect.left + rect.width / 2 - box.left)}px`);
  hand.style.setProperty('--hy', `${Math.round(rect.top + rect.height / 2 - box.top)}px`);
}

/**
 * @param {number} index
 * @param {'top' | 'bottom'} row
 * @returns {Cell} a pit: a button with a well and a count label
 */
function makePit(index, row) {
  const root = element('button', `cell pit ${row}`);
  root.type = 'button';
  root.dataset.index = String(index);
  return withWell(index, root);
}

/**
 * @param {number} index
 * @param {'top' | 'bottom'} side - which end the count label sits at
 * @returns {Cell} a treasury: a tall well with a count label
 */
function makeStore(index, side) {
  const root = element('div', `cell store ${side}`);
  root.dataset.index = String(index);
  root.setAttribute('role', 'img');
  return withWell(index, root);
}

/**
 * @param {number} index
 * @param {HTMLElement} root
 * @returns {Cell}
 */
function withWell(index, root) {
  const well = element('span', 'well');
  const count = element('span', 'count');
  count.setAttribute('aria-hidden', 'true');
  root.append(well, count);
  return { index, root, well, count, stones: [] };
}

/**
 * @param {import('./stones.js').StoneSlot} slot
 * @returns {HTMLElement} a pebble placed and coloured by its slot
 */
function makeStone(slot) {
  const stone = element('span', 'stone');
  const { base, rim } = STONE_COLORS[slot.color];
  stone.style.setProperty('--x', String(slot.x));
  stone.style.setProperty('--y', String(slot.y));
  stone.style.setProperty('--c', base);
  stone.style.setProperty('--d', rim);
  stone.style.zIndex = String(slot.layer + 1);
  return stone;
}

/**
 * @param {string} tag
 * @param {string} className
 * @returns {HTMLElement}
 */
function element(tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}
