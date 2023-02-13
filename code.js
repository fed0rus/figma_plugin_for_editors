"use strict";
// Runs this code if the plugin is run in Figma
if (figma.editorType === "figma") {
    // Sets of words
    let nbspAfterWords = [
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
    ];
    async function setNbspAfterWords() {
        for (const node of figma.currentPage.selection) {
            if (node.type == 'TEXT') {
                // Load fonts so we can change text layer value
                await Promise.all(node.getRangeAllFontNames(0, node.characters.length)
                    .map(figma.loadFontAsync));
                // Update nbsp for each word in nbspAfterWords
                for (var i = 0; i < nbspAfterWords.length; i++) {
                    // Check the word with 2 spaces around
                    var word = ' ' + nbspAfterWords[i] + ' ';
                    var wordStartIndex = node.characters.toLowerCase().indexOf(word);
                    if (wordStartIndex != -1) {
                        console.log(word);
                        node.deleteCharacters(wordStartIndex + word.length - 1, wordStartIndex + word.length);
                        node.insertCharacters(wordStartIndex + word.length - 1, ' ');
                    }
                    // Check the word with 1 nbsp before and 1 space after it
                    var wordWithNbspBefore = ' ' + nbspAfterWords[i] + ' ';
                    var wordWithNbspBeforeStartIndex = node.characters.toLowerCase().indexOf(wordWithNbspBefore);
                    if (wordWithNbspBeforeStartIndex != -1) {
                        console.log(wordWithNbspBefore);
                        node.deleteCharacters(wordWithNbspBeforeStartIndex + word.length - 1, wordWithNbspBeforeStartIndex + word.length);
                        node.insertCharacters(wordWithNbspBeforeStartIndex + word.length - 1, ' ');
                    }
                }
            }
        }
    }
    setNbspAfterWords().then(() => {
        // Show that plugin ran successfully
        figma.notify('✅ Проставил неразрывные пробелы');
        // Make sure to close the plugin when you're done. Otherwise the plugin will
        // keep running, which shows the cancel button at the bottom of the screen.
        figma.closePlugin();
    });
    // // This plugin creates 5 rectangles on the screen.
    // const numberOfRectangles = 5;
    // const nodes: SceneNode[] = [];
    // for (let i = 0; i < numberOfRectangles; i++) {
    //   const rect = figma.createRectangle();
    //   rect.x = i * 150;
    //   rect.fills = [{ type: "SOLID", color: { r: 1, g: 0.5, b: 0 } }];
    //   figma.currentPage.appendChild(rect);
    //   nodes.push(rect);
    // }
    // figma.currentPage.selection = nodes;
    // figma.viewport.scrollAndZoomIntoView(nodes);
    // If the plugins isn't run in Figma, run this code
}
else {
    figma.closePlugin();
}
