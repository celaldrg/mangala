/**
 * The New game and Rules dialogs, built on the native <dialog> element (Escape and the close
 * buttons work out of the box; a click on the dimmed backdrop closes them too).
 */

/** Fields of the New game form; all are radio groups. */
const SETUP_FIELDS = Object.freeze(['mode', 'level', 'first']);

/**
 * @typedef {object} Dialogs
 * @property {(settings: import('./settings.js').Settings) => void} openSetup - shows New game,
 *   preset to the given settings
 * @property {() => void} openRules
 * @property {() => boolean} isOpen - whether either dialog is showing
 */

/**
 * Wires both dialogs.
 * @param {object} options
 * @param {HTMLDialogElement} options.setup - holds a <form method="dialog"> with the radio groups
 * @param {HTMLDialogElement} options.rules
 * @param {(choice: { mode: string, level: string, first: number }) => void} options.onStart -
 *   called when the player presses Start
 * @returns {Dialogs}
 */
export function setupDialogs({ setup, rules, onStart }) {
  const form = setup.querySelector('form');
  const syncAiOnly = () => {
    const vsComputer = form.elements.namedItem('mode').value === 'ai';
    for (const group of form.querySelectorAll('[data-ai-only]')) group.hidden = !vsComputer;
  };
  form.addEventListener('change', syncAiOnly);
  setup.addEventListener('close', () => {
    if (setup.returnValue === 'start') onStart(readChoice(form));
  });
  closeOnBackdrop(setup);
  closeOnBackdrop(rules);

  return {
    openSetup(settings) {
      for (const name of SETUP_FIELDS) form.elements.namedItem(name).value = String(settings[name]);
      syncAiOnly();
      setup.returnValue = '';
      setup.showModal();
      // showModal() focuses the first radio; start on the chosen mode so Space cannot flip it.
      form.querySelector('input[name="mode"]:checked')?.focus();
    },
    openRules() {
      rules.showModal();
    },
    isOpen: () => setup.open || rules.open,
  };
}

/**
 * @param {HTMLFormElement} form
 * @returns {{ mode: string, level: string, first: number }} the chosen options
 */
function readChoice(form) {
  const value = (name) => form.elements.namedItem(name).value;
  return { mode: value('mode'), level: value('level'), first: Number(value('first')) };
}

/**
 * Closes a dialog when its backdrop is clicked. The dialog has no padding of its own, so only
 * clicks outside its content land on the <dialog> element itself.
 * @param {HTMLDialogElement} dialog
 */
function closeOnBackdrop(dialog) {
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
