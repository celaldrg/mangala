/**
 * Entry point of the page. Wires the board view, the dialogs and pointer/keyboard input to the
 * game controller, and runs the turn flow: sowing animations, the computer's moves and messages.
 */

import { createGame } from './game.js';
import { applyMove, ownerOf, pitsOf, storeOf, winnerOf } from './rules.js';
import { moveFrames } from './frames.js';
import { DEMO_MOVES } from './demo.js';
import { createRng } from './rng.js';
import { otherLanguage, translate } from './i18n.js';
import { load, save } from './storage.js';
import { SPEEDS, defaultSettings, gameOptions, nextSpeed, normalizeSettings } from './settings.js';
import { levelKey, moveMessages, nameKey, roleOf, sowingMessage, turnMessage } from './messages.js';
import { BOTTOM_ROW, TOP_ROW, createBoardView } from './view.js';
import { setupDialogs } from './dialogs.js';

const SETTINGS_KEY = 'settings';

/** The ?demo game (README screenshot): fixed settings and seed, so it looks the same every time. */
const DEMO_GAME = Object.freeze({ mode: 'ai', level: 'medium', first: 0, seed: 2026 });

/**
 * Milliseconds the computer may search for one move. The search runs on the page's main thread,
 * so on a slow phone the hard level then plays the deepest ply it finished instead of stalling.
 */
const AI_TIME_LIMIT = 150;

/**
 * Sowing steps spent on each frame kind: [before the board changes, after it]. A drop first
 * glides the hand to its pit; a capture first flashes the pits it takes.
 */
const TIMING = Object.freeze({ pickup: [0, 1], drop: [0.55, 0.45], capture: [1.2, 1.3], sweep: [1.2, 1.3] });

const SPEED_KEYS = Object.freeze({ slow: 'speedSlow', normal: 'speedNormal', fast: 'speedFast', instant: 'speedInstant' });

/** At most this many event chips (capture, extra turn…) are shown for one player's turn. */
const MAX_CHIPS = 3;

const KEY_ACTIONS = Object.freeze({
  u: () => undo(),
  n: () => dialogs.openSetup(app.settings),
  s: () => skip(),
  escape: () => skip(),
});

/** Everything that changes while the page runs. */
const app = {
  settings: normalizeSettings(null),
  /** @type {import('./game.js').Game | null} */
  game: null,
  mode: 'ai',
  level: 'medium',
  /** Bumped by New game and Undo, so a stale animation or computer turn stops. */
  epoch: 0,
  /** @type {null | 'thinking' | 'sowing'} */
  busy: null,
  /** The player whose move is being animated. */
  mover: 0,
  /** @type {import('./rules.js').MoveResult | null} */
  lastMove: null,
  /** @type {import('./messages.js').Message[]} */
  messages: [],
  skipping: false,
  /** @type {null | (() => void)} ends the current pause early */
  wake: null,
  /** @type {number | null} the pit under the pointer when it went down */
  pressedPit: null,
};

let ui;
let view;
let dialogs;

/** Finds the page elements, restores the settings and starts a game (the demo with ?demo). */
function boot() {
  ui = findElements();
  const defaults = defaultSettings({ reducedMotion: prefersReducedMotion() });
  app.settings = normalizeSettings(load(SETTINGS_KEY, null), defaults);
  view = createBoardView(ui.board, cellLabel);
  dialogs = setupDialogs({ setup: ui.setupDialog, rules: ui.rulesDialog, onStart: startChosenGame });
  bindInput();
  applyLanguage();
  applySpeed();
  startGame(new URLSearchParams(window.location.search).has('demo'));
}

/** @returns {object} the elements the UI updates */
function findElements() {
  const byId = (id) => document.getElementById(id);
  const playerBar = (root) => ({
    root,
    name: root.querySelector('.player-name'),
    tag: root.querySelector('.player-tag'),
    score: root.querySelector('.player-score'),
  });
  return {
    board: byId('board'),
    status: byId('status'),
    finalScore: byId('final-score'),
    events: byId('events'),
    playAgain: byId('play-again'),
    newGame: byId('new-game'),
    language: byId('language'),
    undo: byId('undo'),
    skip: byId('skip'),
    speed: byId('speed'),
    speedLabel: byId('speed-label'),
    rules: byId('rules'),
    players: [playerBar(byId('player-0')), playerBar(byId('player-1'))],
    setupDialog: byId('setup'),
    rulesDialog: byId('rules-dialog'),
  };
}

/** Connects buttons, the board (pointer and focus) and the keyboard. */
function bindInput() {
  const { board } = ui;
  board.addEventListener('pointerdown', onPointerDown);
  board.addEventListener('pointerup', onPointerUp);
  board.addEventListener('pointercancel', () => {
    app.pressedPit = null;
  });
  board.addEventListener('click', onBoardClick);
  board.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'mouse') preview(view.pitOf(event.target));
  });
  board.addEventListener('pointerout', (event) => {
    if (event.pointerType === 'mouse') preview(null);
  });
  board.addEventListener('focusin', (event) => preview(view.pitOf(event.target)));
  board.addEventListener('focusout', () => preview(null));
  document.addEventListener('keydown', onKeyDown);
  ui.newGame.addEventListener('click', () => dialogs.openSetup(app.settings));
  ui.playAgain.addEventListener('click', () => startGame());
  ui.undo.addEventListener('click', undo);
  ui.skip.addEventListener('click', skip);
  ui.speed.addEventListener('click', cycleSpeed);
  ui.rules.addEventListener('click', () => dialogs.openRules());
  ui.language.addEventListener('click', toggleLanguage);
}

// ---------------------------------------------------------------- game flow

/**
 * Starts a game with the saved settings, or the fixed demo game.
 * @param {boolean} [demo]
 */
function startGame(demo = false) {
  cancelFlow();
  const { mode, level, first } = demo ? DEMO_GAME : gameOptions(app.settings);
  app.mode = mode;
  app.level = level;
  const rng = demo ? createRng(DEMO_GAME.seed) : undefined;
  app.game = createGame({ mode, level, first, rng, timeLimit: AI_TIME_LIMIT });
  app.lastMove = null;
  setMessages([]);
  if (demo) replayDemo();
  refresh();
  runComputer();
}

/** Replays the demo moves, so the demo has an undo history and a last move to show. */
function replayDemo() {
  for (const pit of DEMO_MOVES) app.lastMove = app.game.move(pit);
  setMessages(moveMessages(app.lastMove, app.mode));
}

/**
 * Starts the game picked in the New game dialog and remembers the choice.
 * @param {{ mode: string, level: string, first: number }} choice
 */
function startChosenGame(choice) {
  updateSettings(choice);
  startGame();
}

/**
 * Plays a pit for the human whose turn it is, then lets the computer answer.
 * @param {number} pit
 */
async function playHuman(pit) {
  if (app.busy || !humanMoves().includes(pit)) return;
  if (await playMove(pit)) await runComputer();
}

/** Lets the computer move for as long as it is its turn (extra turns included). */
async function runComputer() {
  const epoch = app.epoch;
  while (app.game.isAiTurn() && epoch === app.epoch) {
    app.busy = 'thinking';
    renderChrome();
    await pause(Math.max(350, stepTime() * 2.2));
    if (epoch !== app.epoch) return;
    if (!(await playMove(app.game.chooseAiMove()))) return;
  }
}

/**
 * Plays a pit for the player to move, animates it and shows what it did.
 * @param {number} pit
 * @returns {Promise<boolean>} false when the move was refused or New game / Undo interrupted it
 */
async function playMove(pit) {
  const epoch = app.epoch;
  const previous = app.lastMove;
  const result = app.game.move(pit);
  if (!result) return false;
  const sameTurn = previous !== null && previous.extraTurn && previous.player === result.player;
  const earlier = sameTurn ? app.messages : [];
  app.busy = 'sowing';
  app.mover = result.player;
  app.lastMove = result;
  setMessages(earlier);
  view.mark('origin', []);
  view.mark('preview', []);
  renderChrome();
  await animate(result, epoch);
  if (epoch !== app.epoch) return false;
  app.busy = null;
  clearMotion();
  setMessages([...earlier, ...moveMessages(result, app.mode)].slice(-MAX_CHIPS));
  refresh();
  return true;
}

/** Takes back the human's last move (and the computer's answers to it). */
function undo() {
  if (!app.game.canUndo()) return;
  cancelFlow();
  app.game.undo();
  app.lastMove = null;
  setMessages([]);
  refresh();
  runComputer();
}

/** Finishes the running animation at once, or cuts the computer's thinking short. */
function skip() {
  if (!app.busy) return;
  app.skipping = true;
  app.wake?.();
}

/** Stops the running animation or computer turn and clears the transient highlights. */
function cancelFlow() {
  app.epoch += 1;
  app.busy = null;
  app.wake?.();
  clearMotion();
  view.mark('preview', []);
}

/** @returns {number[]} the pits a person may pick right now (none on the computer's turn) */
function humanMoves() {
  return app.game.isAiTurn() ? [] : app.game.legalMoves();
}

/** @returns {number} milliseconds per sowing step at the chosen speed (0 = no animation) */
function stepTime() {
  return SPEEDS[app.settings.speed];
}

/**
 * Waits `ms` milliseconds; skip(), New game and Undo end the wait early.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function pause(ms) {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      if (app.wake === finish) app.wake = null;
      resolve();
    };
    const timer = setTimeout(finish, ms);
    app.wake = finish;
  });
}

// ---------------------------------------------------------------- animation

/**
 * Shows a move stone by stone: the hand lifts the stones and glides from pit to pit dropping one
 * at a time, then captured pits flash and empty into the treasury. Returns early on a skip, at
 * 'instant' speed or when the game was reset; the caller then draws the final position.
 * @param {import('./rules.js').MoveResult} result
 * @param {number} epoch - the game the move belongs to
 */
async function animate(result, epoch) {
  app.skipping = false;
  const live = () => !app.skipping && epoch === app.epoch && stepTime() > 0;
  let inHand = result.drops.length;
  for (const frame of moveFrames(result)) {
    const [before, after] = TIMING[frame.kind];
    if (!live()) return;
    prepareFrame(frame, inHand);
    if (before > 0) {
      await pause(stepTime() * before);
      if (!live()) return;
    }
    if (frame.kind === 'drop') inHand -= 1;
    showFrame(frame, inHand);
    await pause(stepTime() * after);
  }
}

/**
 * Before a frame: bring the hand over its pit, or flash the pits about to be captured.
 * @param {import('./frames.js').Frame} frame
 * @param {number} inHand - stones still in the hand
 */
function prepareFrame(frame, inHand) {
  const [target] = frame.focus;
  if (frame.kind === 'pickup') {
    view.showHand(target, inHand, { jump: true });
  } else if (frame.kind === 'drop') {
    view.showHand(target, inHand);
  } else {
    view.hideHand();
    view.mark('hit', []);
    view.mark('captured', frame.focus);
  }
}

/**
 * Draws a frame: the new stone counts, and after a drop the stones left in the hand.
 * @param {import('./frames.js').Frame} frame
 * @param {number} inHand
 */
function showFrame(frame, inHand) {
  if (frame.kind === 'drop') {
    view.mark('hit', frame.focus);
    if (inHand > 0) view.showHand(frame.focus[0], inHand);
    else view.hideHand();
  }
  showBoard(frame.board, true);
}

/** Hides the hand and the sowing and capture highlights. */
function clearMotion() {
  view.hideHand();
  view.mark('hit', []);
  view.mark('captured', []);
}

// ---------------------------------------------------------------- rendering

/** Redraws everything from the current position. */
function refresh() {
  showBoard(app.game.getState().board);
  view.mark('origin', app.lastMove ? [app.lastMove.pit] : []);
  renderChrome();
}

/**
 * Draws a board (the current one or an animation frame) and the scores beside it.
 * @param {number[]} board
 * @param {boolean} [animate] - let newly added stones drop in
 */
function showBoard(board, animate = false) {
  view.render(board, { animate });
  ui.players.forEach((bar, player) => {
    bar.score.textContent = String(board[storeOf(player)]);
  });
}

/** Redraws everything around the stones: playable pits, players, status line and buttons. */
function renderChrome() {
  const state = app.game.getState();
  const finished = state.over && app.busy !== 'sowing';
  view.setPlayable(app.busy ? [] : humanMoves());
  renderPlayers(state, finished);
  renderStatus(state, finished);
  ui.undo.disabled = !app.game.canUndo();
  ui.skip.disabled = app.busy !== 'sowing';
}

/**
 * Names, computer level and turn marker of both players.
 * @param {import('./rules.js').GameState} state
 * @param {boolean} finished - the game is over and its last move has been shown
 */
function renderPlayers(state, finished) {
  const active = app.busy === 'sowing' ? app.mover : state.turn;
  const winner = finished ? winnerOf(state) : null;
  ui.players.forEach((bar, player) => {
    const role = roleOf(player, app.mode);
    bar.name.textContent = t(nameKey(role));
    bar.tag.hidden = role !== 'ai';
    bar.tag.textContent = role === 'ai' ? t(levelKey(app.level)) : '';
    bar.root.classList.toggle('active', !finished && active === player);
    bar.root.classList.toggle('thinking', app.busy === 'thinking' && active === player);
    bar.root.classList.toggle('winner', winner === player);
  });
}

/**
 * The status line: whose turn it is, who is sowing, or the result and final score.
 * @param {import('./rules.js').GameState} state
 * @param {boolean} finished
 */
function renderStatus(state, finished) {
  const message = app.busy === 'sowing' ? sowingMessage(app.mover, app.mode) : turnMessage(state, app.mode);
  ui.status.textContent = say(message);
  ui.status.classList.toggle('result', finished);
  ui.finalScore.hidden = !finished;
  ui.finalScore.textContent = finished ? t('finalScore', message.values) : '';
  ui.playAgain.hidden = !finished;
}

/**
 * Shows what the current turn did (capture, extra turn, sweep) as chips under the status line.
 * @param {import('./messages.js').Message[]} messages
 */
function setMessages(messages) {
  app.messages = messages;
  renderEvents();
}

/** Draws the event chips in the current language. */
function renderEvents() {
  const chips = app.messages.map((message) => {
    const chip = document.createElement('span');
    chip.className = `chip ${message.tone}`;
    chip.textContent = say(message);
    return chip;
  });
  ui.events.replaceChildren(...chips);
}

/**
 * Marks where the last stone of a pit would land while the pointer or focus rests on it.
 * @param {number | null} pit
 */
function preview(pit) {
  const show = pit !== null && !app.busy && humanMoves().includes(pit);
  view.mark('preview', show ? [applyMove(app.game.getState(), pit).last] : []);
}

// ---------------------------------------------------------------- language and speed

/**
 * Looks up a string in the current language.
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
function t(key, params) {
  return translate(app.settings.language, key, params);
}

/**
 * Text of a message, with {who} filled in from its role.
 * @param {import('./messages.js').Message} message
 * @returns {string}
 */
function say({ key, role, values }) {
  return t(key, { ...values, who: role ? t(nameKey(role)) : '' });
}

/**
 * Accessible label of a pit or treasury, such as "Computer, pit 3: 7 stones".
 * @param {number} index
 * @param {number} count
 * @returns {string}
 */
function cellLabel(index, count) {
  const owner = ownerOf(index);
  const who = t(nameKey(roleOf(owner, app.mode)));
  if (index === storeOf(owner)) return t('treasuryLabel', { who, count });
  return t('pitLabel', { who, count, n: pitsOf(owner).indexOf(index) + 1 });
}

/** Puts every visible string in the current language and updates <html lang>. */
function applyLanguage() {
  document.documentElement.lang = app.settings.language;
  for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
  for (const node of document.querySelectorAll('[data-i18n-label]')) {
    node.setAttribute('aria-label', t(node.dataset.i18nLabel));
  }
  renderSpeed();
  if (!app.game) return;
  view.relabel();
  renderChrome();
  renderEvents();
}

/** @returns {boolean} whether the system asks for reduced motion */
function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Switches between English and Turkish and remembers the choice. */
function toggleLanguage() {
  updateSettings({ language: otherLanguage(app.settings.language) });
  applyLanguage();
}

/** Steps to the next animation speed and remembers it. */
function cycleSpeed() {
  updateSettings({ speed: nextSpeed(app.settings.speed) });
  applySpeed();
}

/** Applies the animation speed to the hand's glide and the speed button. */
function applySpeed() {
  view.setTravelTime(stepTime() * TIMING.drop[0]);
  renderSpeed();
}

/** Writes the current speed on the speed button. */
function renderSpeed() {
  const speed = t(SPEED_KEYS[app.settings.speed]);
  ui.speedLabel.textContent = speed;
  ui.speed.setAttribute('aria-label', t('speed', { speed }));
  ui.speed.title = t('speed', { speed });
}

/**
 * Merges changes into the settings and saves them.
 * @param {Partial<import('./settings.js').Settings>} changes
 */
function updateSettings(changes) {
  app.settings = normalizeSettings({ ...app.settings, ...changes });
  save(SETTINGS_KEY, app.settings);
}

// ---------------------------------------------------------------- input

/**
 * Remembers the pit a press started on, so a tap counts only if it also ends there.
 * @param {PointerEvent} event
 */
function onPointerDown(event) {
  if (!event.isPrimary || event.button !== 0) return;
  app.pressedPit = view.pitOf(event.target);
}

/**
 * A tap or click on the board: skips a running animation, otherwise plays the pit tapped.
 * @param {PointerEvent} event
 */
function onPointerUp(event) {
  if (!event.isPrimary || event.button !== 0) return;
  const pressed = app.pressedPit;
  app.pressedPit = null;
  if (app.busy === 'sowing') {
    skip();
    return;
  }
  const pit = view.pitAt(event.clientX, event.clientY);
  if (pit !== null && pit === pressed) playHuman(pit);
}

/**
 * Enter or Space on a focused pit (and screen-reader activation) arrive as a click with no
 * pointer behind it (detail 0); real pointer clicks were already handled on pointerup.
 * @param {MouseEvent} event
 */
function onBoardClick(event) {
  if (event.detail !== 0) return;
  if (app.busy === 'sowing') {
    skip();
    return;
  }
  const pit = view.pitOf(event.target);
  if (pit !== null) playHuman(pit);
}

/**
 * Keyboard shortcuts: 1-6 play a pit, arrows move between pits, U / Ctrl+Z undo, N new game,
 * S or Escape skip the animation.
 * @param {KeyboardEvent} event
 */
function onKeyDown(event) {
  if (dialogs.isOpen() || event.altKey || event.metaKey) return;
  const key = String(event.key).toLowerCase();
  if (event.ctrlKey) {
    if (key === 'z') {
      event.preventDefault();
      undo();
    }
    return;
  }
  if (key === 'arrowleft' || key === 'arrowright') {
    event.preventDefault();
    moveFocus(key === 'arrowright' ? 1 : -1);
  } else if (event.repeat) {
    return;
  } else if (/^[1-6]$/.test(key)) {
    event.preventDefault();
    playColumn(Number(key) - 1);
  } else if (Object.hasOwn(KEY_ACTIONS, key)) {
    event.preventDefault();
    KEY_ACTIONS[key]();
  }
}

/**
 * Plays the pit in a column (0 = leftmost on screen) of the row whose turn it is.
 * @param {number} column
 */
function playColumn(column) {
  const row = app.game.getState().turn === 0 ? BOTTOM_ROW : TOP_ROW;
  playHuman(row[column]);
}

/**
 * Moves the keyboard focus to the next playable pit on the left or right, wrapping around.
 * @param {1 | -1} step
 */
function moveFocus(step) {
  const playable = app.busy ? [] : [...TOP_ROW, ...BOTTOM_ROW].filter((pit) => humanMoves().includes(pit));
  if (playable.length === 0) return;
  const current = playable.indexOf(view.pitOf(document.activeElement));
  const next = current === -1 ? (step > 0 ? 0 : playable.length - 1) : (current + step + playable.length) % playable.length;
  view.focusPit(playable[next]);
}

boot();
