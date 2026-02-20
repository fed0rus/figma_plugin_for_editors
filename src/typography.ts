// Character constants
export const nbsp = String.fromCharCode(160);
export const hyphen = String.fromCharCode(45);
export const nonBreakingHyphen = String.fromCharCode(8209);
export const emDash = String.fromCharCode(8212);
export const numberSign = String.fromCharCode(8470);

// Word groups that need &nbsp after them
const groupPrepositions = new Set<string>([
  'в',
  'без',
  'до',
  'для',
  'за',
  'от',
  'через',
  'над',
  'по',
  'из',
  'из-за',
  'у',
  'около',
  'под',
  'о',
  'про',
  'на',
  'к',
  'перед',
  'при',
  'с',
  'со',
  'между',
]);
const groupConjunctions = new Set<string>([
  'а',
  'и',
  'но',
  'или',
  'что',
  'чтобы',
]);
const groupPronouns = new Set<string>([
  'я',
  'ты',
  'вы',
  'мы',
  'вас',
  'нас',
  'он',
  'она',
  'оно',
  'они',
  'все',
  'его',
  'ее',
  'её',
  'их',
  'мой',
  'наш',
  'чем',
  'чей',
  'чья',
  'чье',
  'чьё',
  'это',
]);
const groupNegativeParticles = new Set<string>([
  'не',
  'нет',
]);
const groupAdverbs = new Set<string>([
  'уже',
  'еще',
  'ещё',
  'как',
  'так',
  'вне',
  'где',
  'там',
  'тут',
]);
const groupNumerals = new Set<string>([
  'один',
  'два',
  'три',
  'оба',
]);
const groupShortWords = new Set<string>([
  'акт',
  'бот',
  'вид',
  'вес',
  'год',
  'дом',
  'зал',
  'иск',
  'имя',
  'код',
  'пол',
  'ряд',
  'чек',
  'щит',
]);
// Assemble all word groups that need &nbsp after them into one array
export const nbspAfterWords = Array.from(new Set([
  ...groupPrepositions,
  ...groupConjunctions,
  ...groupPronouns,
  ...groupNegativeParticles,
  ...groupAdverbs,
  ...groupNumerals,
  ...groupShortWords,
]));


// Word groups that need &nbsp before them
const groupParticles = new Set<string>([
  'бы',
  'ли',
  'же',
]);
// Assemble all word groups that need &nbsp before them into one array
export const nbspBeforeWords = Array.from(new Set([
  ...groupParticles,
]));


// A text operation: replace characters from deleteStart to deleteEnd with replacement
export interface TextOperation {
  deleteStart: number;
  deleteEnd: number;
  replacement: string;
}


// Helper: find all positions where regex matches in a string, return them as an array of indices.
// We collect first, then replace from end to start — so earlier positions don't shift.
export function collectMatchPositions(regex: RegExp, text: string): number[] {
  const positions: number[] = [];
  while (regex.exec(text) !== null) {
    positions.push(regex.lastIndex);
  }
  return positions;
}


// Finds positions where regular spaces after certain words, numbers and symbols should become nbsp
export function findNbspAfterWords(text: string): TextOperation[] {
  const regex = new RegExp(
    `[\\s${nbsp}](${nbspAfterWords.join('|')}|\\d+|${numberSign})(?=\\s)`,
    'gi'
  );
  return collectMatchPositions(regex, text)
    .map(pos => ({ deleteStart: pos, deleteEnd: pos + 1, replacement: nbsp }));
}


// Finds positions where regular spaces before certain words and em dashes should become nbsp
export function findNbspBeforeWords(text: string): TextOperation[] {
  const regex = new RegExp(
    `[\\s](?=(${nbspBeforeWords.join('|')}|${emDash}))`,
    'gi'
  );
  return collectMatchPositions(regex, text)
    .map(pos => ({ deleteStart: pos - 1, deleteEnd: pos, replacement: nbsp }));
}


// Finds positions where lonely hyphens '-' (spaces around them) should become em dashes '—'
export function findLonelyHyphens(text: string): TextOperation[] {
  const regex = new RegExp(`[\\s${nbsp}]${hyphen}(?=[\\s${nbsp}])`, 'g');
  return collectMatchPositions(regex, text)
    .map(pos => ({ deleteStart: pos - 1, deleteEnd: pos, replacement: emDash }));
}


// Finds positions where hyphens '-' inside words (e.g. 'T-Bank') should become non-breaking hyphens '‑'
export function findInWordHyphens(text: string): TextOperation[] {
  const regex = new RegExp(`(?<![\\s${nbsp}])${hyphen}(?![\\s${nbsp}])`, 'g');
  return collectMatchPositions(regex, text)
    .map(pos => ({ deleteStart: pos - 1, deleteEnd: pos, replacement: nonBreakingHyphen }));
}


// Applies a list of text operations to a plain string (from end to start to preserve positions)
export function applyOperations(text: string, operations: TextOperation[]): string {
  const chars = [...text];
  for (let i = operations.length - 1; i >= 0; i--) {
    const op = operations[i];
    chars.splice(op.deleteStart, op.deleteEnd - op.deleteStart, op.replacement);
  }
  return chars.join('');
}


// Applies all typography transforms in the correct order (2 phases)
export function groomString(text: string): string {
  // Phase 1: hyphen transforms (independent, can be merged)
  let result = applyOperations(text, [...findLonelyHyphens(text), ...findInWordHyphens(text)]);
  // Phase 2: nbsp transforms (must run after hyphens — needs em dashes to exist)
  result = applyOperations(result, [...findNbspAfterWords(result), ...findNbspBeforeWords(result)]);
  return result;
}
