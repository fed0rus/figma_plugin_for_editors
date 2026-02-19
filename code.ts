// Character constants
const nbsp = String.fromCharCode(160);
const hyphen = String.fromCharCode(45);
const nonBreakingHyphen = String.fromCharCode(8209);
const emDash = String.fromCharCode(8212);
const numberSign = String.fromCharCode(8470);

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
const groupParticles = new Set<string>([
  'бы',
  'ли',
  'же',
]);
// Assemble all word groups that need &nbsp before them into one array
const nbspBeforeWords = Array.from(new Set([
  ...groupParticles,
]));






// Helper: find all positions where regex matches in a string, return them as an array of indices.
// We collect first, then replace from end to start — so earlier positions don't shift.
function collectMatchPositions(regex: RegExp, text: string): number[] {
  const positions: number[] = [];
  while (regex.exec(text) !== null) {
    positions.push(regex.lastIndex);
  }
  return positions;
}


// Returns a list of visible, editable text nodes from the current selection (including nested ones)
// Also collects all unique fonts while we're at it, to avoid a second pass later
function getOperableTextNodesAndFonts(): { textNodes: TextNode[], fonts: FontName[] } {

  // Node types that support searching inside their children
  const nestedSearchSupportedTypes = new Set<string>([
    "BOOLEAN_OPERATION", "COMPONENT", "COMPONENT_SET",
    "FRAME", "GROUP", "INSTANCE", "SECTION",
  ]);

  const selectedNodes = figma.currentPage.selection;
  const allTextNodes: TextNode[] = [];
  const uniqueFonts = new Map<string, FontName>();

  // Find all text layers in the selection (including deeply nested ones)
  for (const node of selectedNodes) {
    if (node.type === 'TEXT') {
      allTextNodes.push(node);
    } else if (nestedSearchSupportedTypes.has(node.type)) {
      // @ts-expect-error — we already checked that node.type supports findAllWithCriteria
      const nested: TextNode[] = node.findAllWithCriteria({ types: ['TEXT'] });
      allTextNodes.push(...nested);
    }
  }

  // Keep only visible nodes without missing fonts, and collect their fonts
  const operableNodes: TextNode[] = [];
  for (const node of allTextNodes) {
    if (node.visible && !node.hasMissingFont) {
      operableNodes.push(node);
      for (const font of node.getRangeAllFontNames(0, node.characters.length)) {
        const key = `${font.family}::${font.style}`;
        if (!uniqueFonts.has(key)) {
          uniqueFonts.set(key, font);
        }
      }
    }
  }

  return { textNodes: operableNodes, fonts: Array.from(uniqueFonts.values()) };
}


// Load fonts so we can change text in TextNodes
async function loadFonts(fonts: FontName[]) {
  await Promise.all(fonts.map(figma.loadFontAsync));
}


// Replaces regular spaces after certain words, numbers and symbols with nbsp
function replaceSpacesAfterWords(node: TextNode) {

  // Regex that matches words from list, numbers and '№' symbol
  // FIX: Removed stray | inside [...] (was matching literal pipe character by accident)
  const regexNbspAfterSymbolGroups = new RegExp(
    `[\\s${nbsp}](${nbspAfterWords.join('|')}|\\d+|${numberSign})(?=\\s)`,
    'gi'
  );

  const text = node.characters;
  const positions = collectMatchPositions(regexNbspAfterSymbolGroups, text);

  // Find words (feed regex) and replace all regular spaces after them with nbsp
  // (replacing from end to start so positions don't shift)
  for (let i = positions.length - 1; i >= 0; i--) {
    const pos = positions[i];
    node.insertCharacters(pos + 1, nbsp, "BEFORE");
    node.deleteCharacters(pos, pos + 1);
  }
}


// Replaces regular spaces before certain words and em dashes with nbsp
function replaceSpacesBeforeWords(node: TextNode) {

  const regexNbspBeforeSymbolGroups = new RegExp(
    `[\\s](?=(${nbspBeforeWords.join('|')}|${emDash}))`,
    'gi'
  );

  const text = node.characters;
  const positions = collectMatchPositions(regexNbspBeforeSymbolGroups, text);

  // Find words (feed regex) and replace all regular spaces before them with nbsp
  // (replacing from end to start so positions don't shift)
  for (let i = positions.length - 1; i >= 0; i--) {
    const pos = positions[i];
    node.insertCharacters(pos, nbsp, "BEFORE");
    node.deleteCharacters(pos - 1, pos);
  }
}


// Replaces lonely hyphens '-' (spaces around them, e.g. 'Lana - good daughter') with em dashes '—'
function replaceLonelyHyphensWithEmDashes(node: TextNode) {

  // FIX: Removed stray | inside [...]
  const regexLonelyHyphen = new RegExp(`[\\s${nbsp}]${hyphen}(?=[\\s${nbsp}])`, 'g');

  const text = node.characters;
  const positions = collectMatchPositions(regexLonelyHyphen, text);

  // Find words (feed regex) and replace lonely hyphens with em dashes
  // (replacing from end to start so positions don't shift)
  for (let i = positions.length - 1; i >= 0; i--) {
    const pos = positions[i];
    node.insertCharacters(pos, emDash, "BEFORE");
    node.deleteCharacters(pos - 1, pos);
  }
}


// Replaces hyphens '-' inside words (e.g. 'T-Bank') with non-breaking hyphens '‑'
function replaceHyphensWithNonBreakingHyphens(node: TextNode) {

  // FIX: Removed stray | inside [...]
  const regexHyphen = new RegExp(`(?<![\\s${nbsp}])${hyphen}(?![\\s${nbsp}])`, 'g');

  const text = node.characters;
  const positions = collectMatchPositions(regexHyphen, text);

  // Find words (feed regex) and replace surrounded by symbols hyphens with non-breaking hyphens
  // (replacing from end to start so positions don't shift)
  for (let i = positions.length - 1; i >= 0; i--) {
    const pos = positions[i];
    node.insertCharacters(pos, nonBreakingHyphen, "BEFORE");
    node.deleteCharacters(pos - 1, pos);
  }
}


// Main function that grooms text
function groomText() {

  const startTime = Date.now();

  // Makes searching through big files WAY faster (Figma docs recommend this)
  figma.skipInvisibleInstanceChildren = true;

  // Get all text nodes we can work with (and their fonts in one pass)
  const { textNodes, fonts } = getOperableTextNodesAndFonts();
  console.log(`Finding nodes: ${Date.now() - startTime}ms — found ${textNodes.length}, ${fonts.length} unique fonts`);

  if (textNodes.length === 0) {
    figma.closePlugin('⚠️ Не найдено текстовых слоёв');
    return;
  }

  // Load fonts, then do all the replacements
  loadFonts(fonts).then(() => {
    console.log(`Loading fonts: ${Date.now() - startTime}ms`);

    let successCount = 0;
    let errorCount = 0;

    for (const node of textNodes) {
      try {
        replaceLonelyHyphensWithEmDashes(node);
        replaceHyphensWithNonBreakingHyphens(node);
        replaceSpacesAfterWords(node);
        replaceSpacesBeforeWords(node);
        successCount++;
      } catch (err) {
        // If one text layer fails, skip it and keep going
        errorCount++;
        console.error(`Failed to groom node "${node.name}":`, err);
      }
    }

    console.log(`Grooming took ${Date.now() - startTime}ms — ${successCount} nodes`);

    // Tell the user what happened
    if (errorCount === 0) {
      figma.closePlugin('✅ Причесано');
    } else {
      figma.closePlugin(`⚠️ Причесано ${successCount}, ошибок: ${errorCount}`);
    }
  }).catch((err) => {
    console.error('Font loading failed:', err);
    figma.closePlugin('❌ Ошибка загрузки шрифтов');
  });
}

// Main call
groomText();