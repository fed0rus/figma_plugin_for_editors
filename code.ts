// Sets of words
let nbspAfterWords = new Set<string>([
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
  'а',
  'и',
  'но',
  'или',
  'что',
  'чтобы',
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
  'как',
  'так',
  'акт',
  'бот',
  'вне',
  'вид',
  'вес',
  'год',
  'где',
  'дом',
  'два',
  'его',
  'ее',
  'зал',
  'иск',
  'имя',
  'код',
  'который',
  'которая',
  'которое',
  'которые',
  'мой',
  'нет',
  'наш',
  'оба',
  'пол',
  'ряд',
  'там',
  'тут',
  'чем',
  'чек',
  'чей',
  'чья',
  'чье',
  'щит',
  'это',
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


function setNbspAfterWords (textNodes: Array<TextNode>) {

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
function groomText () {

  // Get a list of operable text nodes
  const textNodes = getOperableTextNodes();
  
  // Load fonts for the text nodes. Inside do whatever grooming you want
  loadFontsForTextNodes(textNodes).then(() => {

    // Set &nbsp after words of 'nbspAfterWords' list
    setNbspAfterWords(textNodes);

    // Show that plugin ran successfully
    figma.notify('✨ Причесано ✨')

    // Close plugin
    figma.closePlugin();
  })
}

// Main call
groomText();