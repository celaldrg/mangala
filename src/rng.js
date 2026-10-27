/**
 * Seeded randomness. Everything random in the game goes through a generator made here,
 * so a test can pass a fixed seed and get the same game every run.
 */

/**
 * Creates a seeded pseudo-random generator (mulberry32).
 * @param {number} seed - any number; the same seed always gives the same sequence
 * @returns {() => number} a function returning floats in [0, 1)
 */
export function createRng(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Picks one element of a non-empty array uniformly at random.
 * @template T
 * @param {T[]} items
 * @param {() => number} rng - a generator from createRng (or any [0, 1) source)
 * @returns {T}
 */
export function pick(items, rng) {
  return items[Math.floor(rng() * items.length)];
}
