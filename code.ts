// Character constants
const nbsp = String.fromCharCode(160);
const hyphen = String.fromCharCode(45);
const nonBreakingHyphen = String.fromCharCode(8209);
const emDash = String.fromCharCode(8212);
const numberSign = String.fromCharCode(8470);

// Word groups that need &nbsp after them
const groupPrepositions = new Set<string> ([
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
  'вас',
  'нас',
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
// Assemble all word groups, that need &nbsp before them, into one array
const nbspBeforeWords = Array.from(new Set([
  ...groupParticles,
]));



// This function returns a list of text nodes that are in current selection (including nested nodes) and are visible
function getOperableTextNodes () {

  // This set contains node types that support nested search. Check the "Supported on" section of https://www.figma.com/plugin-docs/api/properties/nodes-findallwithcriteria
  const nestedSearchSupportedTypes = new Set<string>(["BOOLEAN_OPERATION", "COMPONENT", "COMPONENT_SET", "FRAME", "GROUP", "INSTANCE", "SECTION"]);

  const selectedNodes = figma.currentPage.selection;
  let selectedTextNodesProbablyInvisible = new Array<TextNode>();

  // Find all nested text layers of the current selection and add them to 'selectedTextNodesProbablyInvisible'
  for (const node of selectedNodes) {
    if (node.type == 'TEXT') {
      selectedTextNodesProbablyInvisible.push(node);
    } else if (nestedSearchSupportedTypes.has(node.type)) {

      // @ts-expect-error because we already ensured 'node' has narrowed down to one of types that has method 'findAllWithCriteria'
      selectedTextNodesProbablyInvisible = selectedTextNodesProbablyInvisible.concat(node.findAllWithCriteria({
        types: ['TEXT']
      }))
    }
  }

  // Leave only visible and editable text nodes
  const selectedTextNodesVisible = new Array<TextNode>();
  for (const node of selectedTextNodesProbablyInvisible) {
    if (node.visible && !(node.hasMissingFont)) {
      selectedTextNodesVisible.push(node);
    }
  }

  // Return operable text nodes
  return selectedTextNodesVisible;
}

// Load fonts so we can change text in TextNodes
async function loadFontsForTextNodes(textNodes: Array<TextNode>) {
  for (const node of textNodes) {
    await Promise.all(
      node.getRangeAllFontNames(0, node.characters.length)
        .map(figma.loadFontAsync)
    )
  }
}



// Replaces regular spaces after certain words, numbers and symbols with nbsp
function replaceSpacesAfterWords (node: TextNode) {

  // Regex that matches words from list, numbers and '№' symbol
  const regexNbspAfterSymbolGroups = new RegExp(`[\\s|${nbsp}](${nbspAfterWords.join('|')}|\\d+|${numberSign})(?=\\s)`, 'gi');

  // Some food for regex executer
  const text = node.characters;
  let regexBufferArray;

  // Find words (feed regex) and replace all regular spaces after them with nbsp
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  while ((regexBufferArray = regexNbspAfterSymbolGroups.exec(text)) !== null) {
    node.insertCharacters(regexNbspAfterSymbolGroups.lastIndex + 1, nbsp, "BEFORE");
    node.deleteCharacters(regexNbspAfterSymbolGroups.lastIndex, regexNbspAfterSymbolGroups.lastIndex + 1);
  }
}

// Replaces regular spaces after certain words, numbers and symbols with nbsp
function replaceSpacesBeforeWords (node: TextNode) {

  // Regex that matches words from list and em dashes
  const regexNbspBeforeSymbolGroups = new RegExp(`[\\s](?=(${nbspBeforeWords.join('|')}|${emDash}))`, 'gi');

  // Some food for regex executer
  const text = node.characters;
  let regexBufferArray;

  // Find words (feed regex) and replace all regular spaces before them with nbsp
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  while ((regexBufferArray = regexNbspBeforeSymbolGroups.exec(text)) !== null) {
    node.insertCharacters(regexNbspBeforeSymbolGroups.lastIndex, nbsp, "BEFORE");
    node.deleteCharacters(regexNbspBeforeSymbolGroups.lastIndex - 1, regexNbspBeforeSymbolGroups.lastIndex);
  }
}

// Replaces lonely hyphens '-' (which have spaces around them, ex. 'Lana - good daughter') with em dashes '—'
function replaceLonelyHyphensWithEmDashes (node: TextNode) {

  // Regex that matches lonely hyphens
  const regexLonelyHyphen = new RegExp(`[\\s|${nbsp}]${hyphen}(?=[\\s|${nbsp}])`, 'g');

  // Some food for regex executer
  const text = node.characters;
  let regexBufferArray;

  // Find words (feed regex) and replace lonely hyphens with em dashes
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  while ((regexBufferArray = regexLonelyHyphen.exec(text)) !== null) {
    node.insertCharacters(regexLonelyHyphen.lastIndex, emDash, "BEFORE");
    node.deleteCharacters(regexLonelyHyphen.lastIndex - 1, regexLonelyHyphen.lastIndex);
  }
}

// Replaces hyphens '-' inside words (non-space characters around them, ex. 'T-Bank') with non-breaking hyphens '‑'
function replaceHyphensWithNonBreakingHyphens (node: TextNode) {

  // Regex that matches hyphens
  const regexHyphen = new RegExp(`(?<![\\s|${nbsp}])${hyphen}(?![\\s|${nbsp}])`, 'g');

  // Some food for regex executer
  const text = node.characters;
  let regexBufferArray;

  // Find words (feed regex) and replace surrounded by symbols hyphens with non-breaking hyphens
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  while ((regexBufferArray = regexHyphen.exec(text)) !== null) {
    node.insertCharacters(regexHyphen.lastIndex, nonBreakingHyphen, "BEFORE");
    node.deleteCharacters(regexHyphen.lastIndex - 1, regexHyphen.lastIndex);
  }
}



// Main function that will groom text
function groomText () {

  // Get a list of operable text nodes
  const textNodes = getOperableTextNodes();
  
  // Load fonts for the text nodes. Inside do whatever grooming you want
  loadFontsForTextNodes(textNodes).then(() => {

    // Apply grooming functions to each node
    for (const node of textNodes) {

      // Replace lonely hyphens with em dashes
      replaceLonelyHyphensWithEmDashes(node);

      // Replace hyphens with non-breaking hyphens
      replaceHyphensWithNonBreakingHyphens(node);

      // Set nbsp after words and symbols
      replaceSpacesAfterWords(node);

      // Set nbsp before words and symbols
      replaceSpacesBeforeWords(node);
    }

    // Close plugin and show message that it ran successfully
    figma.closePlugin('✅ Причесано. Сказать спасибо tinyurl.com/fed0rus');
  })
}

// Main call
groomText();