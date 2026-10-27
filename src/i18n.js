/**
 * Every visible string of the game in English and Turkish.
 * Pure module: the UI looks strings up with translate() and fills in {placeholders}.
 * {count} is always a number of stones. An English string that can be about a single stone
 * has a singular and a plural form; Turkish uses the same words for one stone and many.
 */

export const LANGUAGES = Object.freeze(['en', 'tr']);
export const DEFAULT_LANGUAGE = 'en';

/**
 * A string with a singular form for {count} = 1 and a plural form for every other count.
 * @param {string} one
 * @param {string} other
 * @returns {Readonly<{ one: string, other: string }>}
 */
const plural = (one, other) => Object.freeze({ one, other });

/** The string tables: a plain string, or the two forms made by plural(). */
export const STRINGS = Object.freeze({
  en: Object.freeze({
    newGame: 'New game',
    rules: 'Rules',
    undo: 'Undo',
    skip: 'Skip',
    speed: 'Animation speed: {speed}',
    speedSlow: 'Slow',
    speedNormal: 'Normal',
    speedFast: 'Fast',
    speedInstant: 'Instant',
    langButton: 'TR',
    langSwitch: 'Türkçe’ye geç (switch to Turkish)',
    source: 'Source on GitHub',
    nameYou: 'You',
    nameAi: 'Computer',
    nameP1: 'Player 1',
    nameP2: 'Player 2',
    levelEasy: 'Easy',
    levelMedium: 'Medium',
    levelHard: 'Hard',
    modeAi: 'vs Computer',
    modeLocal: '2 players',
    setupMode: 'Mode',
    setupLevel: 'Level',
    setupFirst: 'Who starts',
    start: 'Start',
    cancel: 'Cancel',
    close: 'Close',
    playAgain: 'Play again',
    boardLabel: 'Mangala board',
    pitLabel: plural('{who}, pit {n}: {count} stone', '{who}, pit {n}: {count} stones'),
    treasuryLabel: plural('Treasury of {who}: {count} stone', 'Treasury of {who}: {count} stones'),
    scoreLabel: 'Treasury',
    turnYou: 'Your turn: pick a glowing pit',
    turnAi: 'Computer is thinking…',
    turnPlayer: '{who} to move: pick a glowing pit',
    sowingYou: 'Sowing your stones…',
    sowingOther: '{who} is sowing…',
    resultWin: 'You win!',
    resultLose: 'Computer wins',
    resultPlayer: '{who} wins!',
    resultDraw: 'It’s a draw',
    finalScore: 'Final score {a} – {b}',
    captureEvenYou: 'Capture! You made a pit even: +{count} stones.',
    captureEven: '{who} made a pit even and took {count} stones.',
    captureEmptyYou: 'Capture! Your last stone hit an empty pit: +{count} stones.',
    captureEmpty: '{who} hit an empty pit and took {count} stones.',
    extraTurnYou: 'Last stone in your treasury: play again!',
    extraTurn: 'Last stone in the treasury: {who} plays again.',
    sweepYou: plural(
      'Your pits are empty: you take the last stone.',
      'Your pits are empty: you take the last {count} stones.',
    ),
    sweep: plural(
      'One side is empty: {who} takes the last stone.',
      'One side is empty: {who} takes the last {count} stones.',
    ),
    keysHint: 'Keys: 1–6 or ← → and Enter to play · U undo · N new game · S skip',
    rulesTitle: 'How to play',
    rulesIntro:
      'Mangala is the traditional Turkish mancala game for two players. Collect more stones in your treasury than your opponent.',
    rule1Title: 'Setup.',
    rule1:
      'The board has two rows of six pits (kuyu). You own the row in front of you and the treasury (hazine) on your right. Every pit starts with 4 stones, 48 in all.',
    rule2Title: 'Sowing.',
    rule2:
      'Pick one of your pits that holds stones. Take them all, drop the first one back into the same pit, then one into each following pit, counter-clockwise. Your own treasury gets a stone too; your opponent’s treasury is skipped.',
    rule3Title: 'Single stone.',
    rule3: 'If the pit holds a single stone, it simply moves to the next pit.',
    rule4Title: 'Extra turn.',
    rule4: 'If your last stone lands in your own treasury, you play again.',
    rule5Title: 'Even capture.',
    rule5:
      'If your last stone makes an opponent’s pit even (2, 4, 6…), all the stones in that pit go to your treasury.',
    rule6Title: 'Empty pit capture.',
    rule6:
      'If your last stone lands in an empty pit on your side and the pit opposite holds stones, that stone and all the stones opposite go to your treasury.',
    rule7Title: 'End of the game.',
    rule7:
      'The game ends as soon as all pits on one side are empty. The player whose pits ran out takes every stone left on the other side. The fuller treasury wins; equal treasuries are a draw.',
    rulesTerms: 'Turkish terms: kuyu = pit · hazine = treasury · taş = stone.',
  }),
  tr: Object.freeze({
    newGame: 'Yeni oyun',
    rules: 'Kurallar',
    undo: 'Geri al',
    skip: 'Atla',
    speed: 'Animasyon hızı: {speed}',
    speedSlow: 'Yavaş',
    speedNormal: 'Normal',
    speedFast: 'Hızlı',
    speedInstant: 'Anında',
    langButton: 'EN',
    langSwitch: 'Switch to English (İngilizceye geç)',
    source: 'Kaynak kod GitHub’da',
    nameYou: 'Sen',
    nameAi: 'Bilgisayar',
    nameP1: '1. Oyuncu',
    nameP2: '2. Oyuncu',
    levelEasy: 'Kolay',
    levelMedium: 'Orta',
    levelHard: 'Zor',
    modeAi: 'Bilgisayara karşı',
    modeLocal: 'İki oyuncu',
    setupMode: 'Oyun türü',
    setupLevel: 'Seviye',
    setupFirst: 'Kim başlasın',
    start: 'Başla',
    cancel: 'Vazgeç',
    close: 'Kapat',
    playAgain: 'Tekrar oyna',
    boardLabel: 'Mangala tahtası',
    pitLabel: '{who}, {n}. kuyu: {count} taş',
    treasuryLabel: 'Hazine ({who}): {count} taş',
    scoreLabel: 'Hazine',
    turnYou: 'Sıra sende: parlayan bir kuyu seç',
    turnAi: 'Bilgisayar düşünüyor…',
    turnPlayer: 'Hamle sırası: {who}. Parlayan bir kuyu seç',
    sowingYou: 'Taşlarını dağıtıyorsun…',
    sowingOther: '{who} taşlarını dağıtıyor…',
    resultWin: 'Kazandın!',
    resultLose: 'Bilgisayar kazandı',
    resultPlayer: '{who} kazandı!',
    resultDraw: 'Berabere',
    finalScore: 'Son skor {a} – {b}',
    captureEvenYou: 'Yakaladın! Rakibin kuyusunu çift yaptın: +{count} taş.',
    captureEven: '{who} bir kuyuyu çift yapıp {count} taş aldı.',
    captureEmptyYou: 'Yakaladın! Son taşın boş kuyuna düştü: +{count} taş.',
    captureEmpty: '{who} son taşı boş kuyusuna düşürüp {count} taş aldı.',
    extraTurnYou: 'Son taş hazinene düştü: bir kez daha oyna!',
    extraTurn: 'Son taş hazineye düştü: {who} bir kez daha oynuyor.',
    sweepYou: 'Kuyuların boşaldı: kalan {count} taşı sen aldın.',
    sweep: 'Bir taraf boşaldı: kalan {count} taşı {who} aldı.',
    keysHint: 'Tuşlar: oynamak için 1–6 ya da ← → ve Enter · U geri al · N yeni oyun · S atla',
    rulesTitle: 'Nasıl oynanır?',
    rulesIntro:
      'Mangala, iki kişiyle oynanan geleneksel bir Türk zekâ oyunudur. Amaç, hazinende rakibinden daha çok taş toplamaktır.',
    rule1Title: 'Kurulum.',
    rule1:
      'Tahtada altışar kuyudan oluşan iki sıra vardır. Önündeki sıra ve sağındaki hazine senindir. Her kuyuda başta 4 taş bulunur; toplam 48 taş.',
    rule2Title: 'Taş dağıtma.',
    rule2:
      'Kendi tarafında taş olan bir kuyu seç. Taşların hepsini al, ilkini aynı kuyuya bırak, sonra saat yönünün tersine sıradaki her kuyuya birer taş bırak. Kendi hazinene de taş bırakırsın; rakibin hazinesi atlanır.',
    rule3Title: 'Tek taş.',
    rule3: 'Kuyuda tek taş varsa o taş bir sonraki kuyuya geçer.',
    rule4Title: 'Ekstra tur.',
    rule4: 'Son taş kendi hazinene düşerse bir kez daha oynarsın.',
    rule5Title: 'Çift yakalama.',
    rule5:
      'Son taş rakibin bir kuyusundaki taş sayısını çift yaparsa (2, 4, 6…), o kuyudaki bütün taşlar hazinene geçer.',
    rule6Title: 'Boş kuyu yakalama.',
    rule6:
      'Son taş kendi tarafındaki boş bir kuyuya düşerse ve karşısındaki kuyuda taş varsa, bu taş ve karşıdaki bütün taşlar hazinene geçer.',
    rule7Title: 'Oyunun sonu.',
    rule7:
      'Bir taraftaki bütün kuyular boşalınca oyun biter. Kuyuları boşalan oyuncu, karşı tarafta kalan bütün taşları hazinesine alır. Hazinesinde daha çok taş olan kazanır; eşitlikte oyun berabere biter.',
    rulesTerms: 'Terimler: kuyu – taşların dağıtıldığı çukur · hazine – kazanılan taşların biriktiği büyük kuyu.',
  }),
});

/**
 * Whether a value names a supported language.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isLanguage(value) {
  return LANGUAGES.includes(value);
}

/**
 * The language the toggle button switches to.
 * @param {string} language - the current language
 * @returns {'en' | 'tr'}
 */
export function otherLanguage(language) {
  return language === 'tr' ? 'en' : 'tr';
}

/**
 * Looks up a string and fills in its {placeholders}. A string with two forms uses the singular
 * one when params.count is 1 ("1 stone") and the plural one otherwise ("0 stones", "5 stones").
 * @param {string} language - 'en' or 'tr'; anything else falls back to English
 * @param {string} key
 * @param {Record<string, string | number>} [params] - values for the placeholders
 * @returns {string}
 * @throws {RangeError} for an unknown key, so a typo fails loudly in the tests
 */
export function translate(language, key, params = {}) {
  const table = STRINGS[isLanguage(language) ? language : DEFAULT_LANGUAGE];
  if (!Object.hasOwn(table, key)) throw new RangeError(`Unknown string: ${key}`);
  const entry = table[key];
  const text = typeof entry === 'string' ? entry : entry[params.count === 1 ? 'one' : 'other'];
  return text.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder,
  );
}
