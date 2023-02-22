"use strict";
// Word groups that need &nbsp after them
const groupPrepositions = new Set([
    'в',
    'без',
    'до',
    'для',
    'за',
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
    'он',
    'она',
    'оно',
    'они',
    'все',
    'его',
    'ее',
    'их',
    'мой',
    'наш',
    'чем',
    'чей',
    'чья',
    'чье',
    'это',
]);
const groupNegativeParticles = new Set([
    'не',
    'нет',
]);
const groupAdverbs = new Set([
    'уже',
    'еще',
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
// Assemble all word groups, that need &nbsp after them, into one set
const nbspAfterWords = new Set([
    ...groupPrepositions,
    ...groupConjunctions,
    ...groupPronouns,
    ...groupNegativeParticles,
    ...groupAdverbs,
    ...groupNumerals,
    ...groupShortWords,
]);
// Word groups that need &nbsp before them
const groupParticles = new Set([
    'бы',
    'ли',
    'же',
]);
// Assemble all word groups, that need &nbsp before them, into one set
const nbspBeforeWords = new Set([
    ...groupParticles,
]);
// This function returns a list of text nodes that are in current selection (including nested nodes) and are visible
function getOperableTextNodes() {
    // This set contains node types that support nested search. Check the "Supported on" section of https://www.figma.com/plugin-docs/api/properties/nodes-findallwithcriteria
    const nestedSearchSupportedTypes = new Set(["BOOLEAN_OPERATION", "COMPONENT", "COMPONENT_SET", "FRAME", "GROUP", "INSTANCE", "SECTION"]);
    const selectedNodes = figma.currentPage.selection;
    var selectedTextNodesProbablyInvisible = new Array();
    // Find all nested text layers of the current selection and add them to 'selectedTextNodesProbablyInvisible'
    for (const node of selectedNodes) {
        if (node.type == 'TEXT') {
            selectedTextNodesProbablyInvisible.push(node);
        }
        else if (nestedSearchSupportedTypes.has(node.type)) {
            // @ts-ignore because we already ensured 'node' has narrowed down to one of types that has method 'findAllWithCriteria'
            selectedTextNodesProbablyInvisible = selectedTextNodesProbablyInvisible.concat(node.findAllWithCriteria({
                types: ['TEXT']
            }));
        }
    }
    // Leave only visible text nodes
    var selectedTextNodesVisible = new Array();
    for (const node of selectedTextNodesProbablyInvisible) {
        if (node.visible) {
            selectedTextNodesVisible.push(node);
        }
    }
    // Return operable text nodes
    return selectedTextNodesVisible;
}
// Load fonts so we can change text layer value
async function loadFontsForTextNodes(textNodes) {
    for (const node of textNodes) {
        await Promise.all(node.getRangeAllFontNames(0, node.characters.length)
            .map(figma.loadFontAsync));
    }
}
function setNbspAfterWords(textNodes) {
    for (const node of textNodes) {
        // Prepare words of TextLayer and final string
        var finalString = '';
        var splitWords = node.characters.split(/ +/);
        // Handle every word in TextLayer
        for (const rawWord of splitWords) {
            // Remove ',' and ';' from the word
            var cleanWord = rawWord.replace(/[,;]/g, '');
            // Add the word to the final string. If it's in a set, add &nbsp, otherwise a regular space
            finalString += rawWord + ((nbspAfterWords.has(cleanWord.toLowerCase()) ? ' ' : ' '));
        }
        // Replace initial text with modified. Also, remove spaces around string
        node.characters = finalString.trim();
    }
}
// Main function that will groom text
function groomText() {
    // Get a list of operable text nodes
    const textNodes = getOperableTextNodes();
    // Load fonts for the text nodes. Inside do whatever grooming you want
    loadFontsForTextNodes(textNodes).then(() => {
        // Set &nbsp after words of 'nbspAfterWords' list
        setNbspAfterWords(textNodes);
        // Replace all single hyphens with em-dashes. Also, add nbsp before em-dashes
        for (const node of textNodes) {
            node.characters = node.characters.replaceAll(/[  ][-—)][ ]/g, ' — ');
        }
        // Show that plugin ran successfully
        figma.notify('Причесано');
        // Close plugin
        figma.closePlugin();
    });
}
// Main call
groomText();
