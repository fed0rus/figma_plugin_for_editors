"use strict";
// Sets of words
let nbspAfterWords = new Set([
    'в',
    'без',
    'до',
    'для',
    'за',
    'через',
    'над',
    'по',
    'из',
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
    'между',
    'а',
    'и',
    'но',
    'или',
    'я',
    'ты',
    'вы',
    'мы',
    'не',
    'уже',
    'еще',
    'все',
    'он',
    'она',
    'оно',
    'они',
]);
async function setNbspAfterWords() {
    for (const node of figma.currentPage.selection) {
        // Operate only on TextLayers
        if (node.type == 'TEXT') {
            // Load fonts so we can change text layer value
            await Promise.all(node.getRangeAllFontNames(0, node.characters.length)
                .map(figma.loadFontAsync));
            // Prepare words of TextLayer and final string
            var finalString = '';
            var splitWords = node.characters.split(/ | /);
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
}
// Update &nbsp after words and close plugin after this
setNbspAfterWords().then(() => {
    // Show that plugin ran successfully
    figma.notify('✅ Проставил неразрывные пробелы');
    // Close plugin
    figma.closePlugin();
});
