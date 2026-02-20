import {
  findNbspAfterWords,
  findNbspBeforeWords,
  findLonelyHyphens,
  findInWordHyphens,
  TextOperation,
} from './typography';


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


// Applies a list of text operations to a Figma TextNode (preserves per-character formatting)
function applyToNode(node: TextNode, operations: TextOperation[]) {
  for (let i = operations.length - 1; i >= 0; i--) {
    const op = operations[i];
    node.insertCharacters(op.deleteEnd, op.replacement, "BEFORE");
    node.deleteCharacters(op.deleteStart, op.deleteEnd);
  }
}


// Main function that grooms text
async function groomText() {

  const startTime = Date.now();

  // Show a notification so the user knows the plugin is working
  const notification = figma.notify('💈 Причесываю...', { timeout: Infinity });
  await new Promise(resolve => setTimeout(resolve, 0)); // let Figma render the notification

  // Makes searching through big files WAY faster (Figma docs recommend this)
  figma.skipInvisibleInstanceChildren = true;

  // Get all text nodes we can work with (and their fonts in one pass)
  const { textNodes, fonts } = getOperableTextNodesAndFonts();
  console.log(`Finding nodes: ${Date.now() - startTime}ms — found ${textNodes.length}, ${fonts.length} unique fonts`);

  if (textNodes.length === 0) {
    notification.cancel();
    figma.closePlugin('⚠️ Выделите зону с текстами и запустите плагин');
    return;
  }

  try {
    // Load fonts so we can modify text
    await loadFonts(fonts);
    console.log(`Loading fonts: ${Date.now() - startTime}ms`);

    let successCount = 0;
    let errorCount = 0;

    for (const node of textNodes) {
      try {
        // Phase 1: hyphen transforms (read text once, merge operations)
        const text1 = node.characters;
        applyToNode(node, [...findLonelyHyphens(text1), ...findInWordHyphens(text1)]);

        // Phase 2: nbsp transforms (must run after hyphens — needs em dashes to exist)
        const text2 = node.characters;
        applyToNode(node, [...findNbspAfterWords(text2), ...findNbspBeforeWords(text2)]);

        successCount++;
      } catch (err) {
        // If one text layer fails, skip it and keep going
        errorCount++;
        console.error(`Failed to groom node "${node.name}":`, err);
      }
    }

    console.log(`Grooming took ${Date.now() - startTime}ms — ${successCount} nodes`);

    // Tell the user what happened
    notification.cancel();
    if (errorCount === 0) {
      figma.closePlugin('✅ Причесано');
    } else {
      figma.closePlugin(`⚠️ Причесано ${successCount}, ошибок: ${errorCount}`);
    }
  } catch (err) {
    console.error('Font loading failed:', err);
    notification.cancel();
    figma.closePlugin('❌ Не получилось загрузить шрифты');
  }
}

// Main call
groomText();
