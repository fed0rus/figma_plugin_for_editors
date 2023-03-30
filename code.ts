// Word groups that need &nbsp after them
const groupPrepositions = new Set<string> ([
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
const groupConjunctions = new Set<string> ([
  'а',
  'и',
  'но',
  'или',
  'что',
  'чтобы',
]);
const groupPronouns = new Set<string> ([
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
const groupNegativeParticles = new Set<string> ([
  'не',
  'нет',
]);
const groupAdverbs = new Set<string> ([
  'уже',
  'еще',
  'как',
  'так',
  'вне',
  'где',
  'там',
  'тут',
]);
const groupNumerals = new Set<string> ([
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
// Assemble all word groups, that need &nbsp after them, into one array
const nbspAfterWords = Array.from(new Set([
  ...groupPrepositions,
  ...groupConjunctions,
  ...groupPronouns,
  ...groupNegativeParticles,
  ...groupAdverbs,
  ...groupNumerals,
  ...groupShortWords,
]));


// Word groups that need &nbsp before them
const groupParticles = new Set<string> ([
  'бы',
  'ли',
  'же',
]);
// Assemble all word groups, that need &nbsp before them, into one set
const nbspBeforeWords = new Set([
  ...groupParticles,
]);



// This function returns a list of text nodes that are in current selection (including nested nodes) and are visible
function getOperableTextNodes () {

  // This set contains node types that support nested search. Check the "Supported on" section of https://www.figma.com/plugin-docs/api/properties/nodes-findallwithcriteria
  const nestedSearchSupportedTypes = new Set<string>(["BOOLEAN_OPERATION", "COMPONENT", "COMPONENT_SET", "FRAME", "GROUP", "INSTANCE", "SECTION"]);

  const selectedNodes = figma.currentPage.selection;
  var selectedTextNodesProbablyInvisible = new Array<TextNode>();

  // Find all nested text layers of the current selection and add them to 'selectedTextNodesProbablyInvisible'
  for (const node of selectedNodes) {
    if (node.type == 'TEXT') {
      selectedTextNodesProbablyInvisible.push(node);
    } else if (nestedSearchSupportedTypes.has(node.type)) {

      // @ts-ignore because we already ensured 'node' has narrowed down to one of types that has method 'findAllWithCriteria'
      selectedTextNodesProbablyInvisible = selectedTextNodesProbablyInvisible.concat(node.findAllWithCriteria({
        types: ['TEXT']
      }))
    }
  }

  // Leave only visible text nodes
  var selectedTextNodesVisible = new Array<TextNode>();
  for (const node of selectedTextNodesProbablyInvisible) {
    if (node.visible) {
      selectedTextNodesVisible.push(node);
    }
  }

  // Return operable text nodes
  return selectedTextNodesVisible;
}

// Load fonts so we can change text layer value
async function loadFontsForTextNodes(textNodes: Array<TextNode>) {
  for (const node of textNodes) {
    await Promise.all(
      node.getRangeAllFontNames(0, node.characters.length)
        .map(figma.loadFontAsync)
    )
  }
}

// OLD FUNCTION B4 IN-PLACE OPTIMIZATION. DELETE AFTER THE OPTIMIZATION
// function setNbspAfterWords (textNodes: Array<TextNode>) {

//   for (const node of textNodes) {

//     // Prepare words of TextLayer and final string
//     var finalString = '';
//     var splitWords = node.characters.split(/ +/);

//     // Handle every word in TextLayer
//     for (const rawWord of splitWords) {

//       // Remove ',' and ';' from the word
//       var cleanWord = rawWord.replace(/[,;]/g, '');

//       // Add the word to the final string. If it's in a set, add &nbsp, otherwise a regular space
//       finalString += rawWord + ((nbspAfterWords.has(cleanWord.toLowerCase()) ? ' ' : ' '));
//     }

//     // Replace initial text with modified. Also, remove spaces around string
//     node.characters = finalString.trim();
//   }
// }

function setNbspBeforeWords (textNodes: Array<TextNode>) {

  for (const node of textNodes) {

    // Prepare words of TextLayer and final string
    var finalString = '';
    var splitWords = node.characters.split(/ +/);

    // Handle every word in TextLayer
    for (const rawWord of splitWords) {

      // Remove ',' and ';' from the word
      var cleanWord = rawWord.replace(/[,;]/g, '');

      // Add the word to the final string. If it's in a set, add &nbsp, otherwise a regular space
      finalString += ((nbspBeforeWords.has(cleanWord.toLowerCase()) ? ' ' : ' ')) + rawWord;
    }

    // Replace initial text with modified. Also, remove spaces around string
    node.characters = finalString.trim();
  }
}

// TODO: CODE FROM GPT, DELETE LATER
// async function replaceSpacesAfterWords(textNode: TextNode, wordRegex: RegExp) {
//   var characters = textNode.characters;
//   let match;
//   let replacedCharacters = '';

//   while ((match = wordRegex.exec(characters)) !== null) {
//     const wordEndIndex = match.index + match[0].length;
//     const nextCharacter = characters.charAt(wordEndIndex);
//     const spaceRegex = /\s/;

//     if (spaceRegex.test(nextCharacter)) {
//       replacedCharacters += characters.substring(0, wordEndIndex);
//       replacedCharacters += '&nbsp;';
//       characters = characters.substring(wordEndIndex + 1);
//       wordRegex.lastIndex = 0;
//     } else {
//       replacedCharacters += characters.substring(0, wordEndIndex);
//       characters = characters.substring(wordEndIndex);
//       wordRegex.lastIndex = wordEndIndex;
//     }
//   }

//   replacedCharacters += characters;
//   await textNode.setRangeFills(0, characters.length, textNode.getRangeFills(0, characters.length));
//   await textNode.insertCharacters(0, replacedCharacters);
// }


function replaceSpacesAfterWords(textNode: TextNode, regexNbspAfterWords: RegExp) {

  const matches = textNode.characters.matchAll(regexNbspAfterWords);
  
  for (const match of matches) {
    console.log(`Found ${match[0]} start=${match.index}.`);
  }

  // let match;

  // while ((match = wordRegex.exec(characters)) !== null) {
  //   console.log(match);
  //   textNode.insertCharacters(wordRegex.lastIndex + 1, '\u00a0', 'BEFORE');
  //   textNode.deleteCharacters(wordRegex.lastIndex, wordRegex.lastIndex + 1);

    // if (spaceRegex.test(nextCharacter)) {
      
    //   characters = characters.substring(wordEndIndex + 1);
    //   wordRegex.lastIndex = 0;
    // } else {
    //   characters = characters.substring(wordEndIndex);
    //   wordRegex.lastIndex = wordEndIndex;
    // }
  // }
}


function setNbspAfterWordsNew (textNodes: Array<TextNode>) {


  const regexNbspAfterSymbolGroups = new RegExp(`(\s|&nbsp;)((${nbspAfterWords.join('|')})|(\d+)|(№))(\s)`, 'gid');

  for (const node of textNodes) {
    replaceSpacesAfterWords(node, regexNbspAfterSymbolGroups);
  }
}





// Main function that will groom text
function groomText () {

  // Get a list of operable text nodes
  const textNodes = getOperableTextNodes();
  
  // Load fonts for the text nodes. Inside do whatever grooming you want
  loadFontsForTextNodes(textNodes).then(() => {

    // DUBUG CODE
    setNbspAfterWordsNew(textNodes);

    // PRODUCTION CODE
    // TODO: UNCOMMENT AFTER DEBUG

    // Set &nbsp after words of 'nbspAfterWords' list
    // setNbspAfterWords(textNodes);

    // // Set &nbsp before words of 'nbspBeforeWords' list
    // setNbspBeforeWords(textNodes);

    // // Set &nbsp around special characters
    // for (const node of textNodes) {

    //   // Replace all single hyphens with em-dashes. Also, add nbsp before em-dashes
    //   node.characters = node.characters.replaceAll(/[  ][-—][ ]/g, ' — ');

    //   // Add nbsp after '№' sign
    //   node.characters = node.characters.replaceAll(/[ ][№][ ]/g, ' № ');
    //   node.characters = node.characters.replaceAll(/[ ][№][ ]/g, ' № ');

    //   // Add nbsp after numbers
    //   const regexOfSpacedAroundNumbers = /[\ | ]?[0-9]+[,;)]?\ /g;
    //   const matchedNumbers = node.characters.match(regexOfSpacedAroundNumbers);
    //   if (matchedNumbers != null) {
    //     for (const matchedNumber of matchedNumbers) {
    //       // Change last space to nbsp
    //       const replacement = matchedNumber.slice(0, -1) + ' ';
    //       node.characters = node.characters.replace(matchedNumber, replacement);
    //     }
    //   }
    // }

    // Close plugin and show message that it ran successfully
    figma.closePlugin('✅ Причесано');
  })
}

// Main call
groomText();