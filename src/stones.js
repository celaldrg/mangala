/**
 * Where each stone sits inside a pit or a treasury, and what colour it is.
 * Pure and deterministic: stone k of a board cell always gets the same place and colour, so
 * stones never jump around while a pit fills up or empties during a move.
 */

import { createRng } from './rng.js';
import { TOTAL_STONES, storeOf } from './rules.js';

/** Glass-pebble colours: a bright body and a darker rim for each. */
export const STONE_COLORS = Object.freeze([
  Object.freeze({ base: '#f43f5e', rim: '#881337' }),
  Object.freeze({ base: '#3b82f6', rim: '#1e3a8a' }),
  Object.freeze({ base: '#22c55e', rim: '#14532d' }),
  Object.freeze({ base: '#fbbf24', rim: '#92400e' }),
  Object.freeze({ base: '#f1f5f9', rim: '#64748b' }),
  Object.freeze({ base: '#a855f7', rim: '#4c1d95' }),
  Object.freeze({ base: '#2dd4bf', rim: '#115e59' }),
  Object.freeze({ base: '#fb923c', rim: '#9a3412' }),
]);

/** Stones per layer before the next ones pile on top, and how far the layer spreads out. */
const PIT_LAYOUT = Object.freeze({ perLayer: 9, radius: 0.3 });
const STORE_LAYOUT = Object.freeze({ perLayer: 24, radius: 0.34 });
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * @typedef {object} StoneSlot
 * @property {number} x - offset from the cell's centre as a fraction of its width (-0.5 to 0.5)
 * @property {number} y - offset from the cell's centre as a fraction of its height (-0.5 to 0.5)
 * @property {number} layer - 0 for the bottom layer; higher layers are drawn on top
 * @property {number} color - index into STONE_COLORS
 */

const tables = new Map();

/**
 * Places for the first `count` stones of a board cell.
 * @param {number} index - board index 0-13 (6 and 13 are the treasuries)
 * @param {number} count - how many stones the cell holds (at most 48)
 * @returns {StoneSlot[]}
 */
export function stoneSlots(index, count) {
  if (!tables.has(index)) tables.set(index, buildTable(index));
  return tables.get(index).slice(0, count);
}

/**
 * All 48 slots of a cell: sunflower spirals (golden angle) with a little seeded jitter, so a
 * handful of stones sits in the middle and more stones spread out and then pile up.
 * @param {number} index
 * @returns {StoneSlot[]}
 */
function buildTable(index) {
  const isStore = index === storeOf(0) || index === storeOf(1);
  const { perLayer, radius } = isStore ? STORE_LAYOUT : PIT_LAYOUT;
  const rng = createRng(1000 + index * 7919);
  return Array.from({ length: TOTAL_STONES }, (_, k) => {
    const layer = Math.floor(k / perLayer);
    const ring = k % perLayer;
    const distance = radius * Math.sqrt((ring + 0.6) / perLayer) * (0.92 + 0.12 * rng());
    const angle = ring * GOLDEN_ANGLE + layer * 1.1 + (rng() - 0.5) * 0.5;
    return {
      x: round(distance * Math.cos(angle)),
      y: round(distance * Math.sin(angle) - layer * 0.04),
      layer,
      color: Math.floor(rng() * STONE_COLORS.length),
    };
  });
}

/**
 * @param {number} value
 * @returns {number} the value rounded to 4 decimals (short inline styles)
 */
function round(value) {
  return Math.round(value * 10000) / 10000;
}
