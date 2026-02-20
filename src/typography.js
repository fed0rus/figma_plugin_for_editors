// Character constants
export const nbsp = String.fromCharCode(160);
export const hyphen = String.fromCharCode(45);
export const nonBreakingHyphen = String.fromCharCode(8209);
export const emDash = String.fromCharCode(8212);
export const numberSign = String.fromCharCode(8470);
// Word groups that need &nbsp after them
const groupPrepositions = new Set([
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
const groupConjunctions = new Set([
    'а',
    'и',
    'но',
    'или',
    'что',
    'чтобы',
]);
const groupPronouns = new Set([
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
    'её', // ё variant
    'их',
    'мой',
    'наш',
    'чем',
    'чей',
    'чья',
    'чье',
    'чьё', // ё variant
    'это',
]);
const groupNegativeParticles = new Set([
    'не',
    'нет',
]);
const groupAdverbs = new Set([
    'уже',
    'еще',
    'ещё', // ё variant
    'как',
    'так',
    'вне',
    'где',
    'там',
    'тут',
]);
const groupNumerals = new Set([
    'один',
    'два',
    'три',
    'оба',
]);
const groupShortWords = new Set([
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
const groupParticles = new Set([
    'бы',
    'ли',
    'же',
]);
// Assemble all word groups that need &nbsp before them into one array
export const nbspBeforeWords = Array.from(new Set([
    ...groupParticles,
]));
// Helper: find all positions where regex matches in a string, return them as an array of indices.
// We collect first, then replace from end to start — so earlier positions don't shift.
export function collectMatchPositions(regex, text) {
    const positions = [];
    while (regex.exec(text) !== null) {
        positions.push(regex.lastIndex);
    }
    return positions;
}
// Finds positions where regular spaces after certain words, numbers and symbols should become nbsp
export function findNbspAfterWords(text) {
    const regex = new RegExp(`[\\s${nbsp}](${nbspAfterWords.join('|')}|\\d+|${numberSign})(?=\\s)`, 'gi');
    return collectMatchPositions(regex, text)
        .map(pos => ({ deleteStart: pos, deleteEnd: pos + 1, replacement: nbsp }));
}
// Finds positions where regular spaces before certain words and em dashes should become nbsp
export function findNbspBeforeWords(text) {
    const regex = new RegExp(`[\\s](?=(${nbspBeforeWords.join('|')}|${emDash}))`, 'gi');
    return collectMatchPositions(regex, text)
        .map(pos => ({ deleteStart: pos - 1, deleteEnd: pos, replacement: nbsp }));
}
// Finds positions where lonely hyphens '-' (spaces around them) should become em dashes '—'
export function findLonelyHyphens(text) {
    const regex = new RegExp(`[\\s${nbsp}]${hyphen}(?=[\\s${nbsp}])`, 'g');
    return collectMatchPositions(regex, text)
        .map(pos => ({ deleteStart: pos - 1, deleteEnd: pos, replacement: emDash }));
}
// Finds positions where hyphens '-' inside words (e.g. 'T-Bank') should become non-breaking hyphens '‑'
export function findInWordHyphens(text) {
    const regex = new RegExp(`(?<![\\s${nbsp}])${hyphen}(?![\\s${nbsp}])`, 'g');
    return collectMatchPositions(regex, text)
        .map(pos => ({ deleteStart: pos - 1, deleteEnd: pos, replacement: nonBreakingHyphen }));
}
// Applies a list of text operations to a plain string (from end to start to preserve positions)
export function applyOperations(text, operations) {
    const chars = [...text];
    for (let i = operations.length - 1; i >= 0; i--) {
        const op = operations[i];
        chars.splice(op.deleteStart, op.deleteEnd - op.deleteStart, op.replacement);
    }
    return chars.join('');
}
// Applies all typography transforms in the correct order
export function groomString(text) {
    let result = text;
    const transforms = [findLonelyHyphens, findInWordHyphens, findNbspAfterWords, findNbspBeforeWords];
    for (const findFn of transforms) {
        result = applyOperations(result, findFn(result));
    }
    return result;
}
