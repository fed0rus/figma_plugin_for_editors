/* global figma, console */
"use strict";
(() => {
  // src/typography.ts
  var nbsp = String.fromCharCode(160);
  var hyphen = String.fromCharCode(45);
  var nonBreakingHyphen = String.fromCharCode(8209);
  var emDash = String.fromCharCode(8212);
  var numberSign = String.fromCharCode(8470);
  var groupPrepositions = /* @__PURE__ */ new Set([
    "\u0432",
    "\u0431\u0435\u0437",
    "\u0434\u043E",
    "\u0434\u043B\u044F",
    "\u0437\u0430",
    "\u043E\u0442",
    "\u0447\u0435\u0440\u0435\u0437",
    "\u043D\u0430\u0434",
    "\u043F\u043E",
    "\u0438\u0437",
    "\u0438\u0437-\u0437\u0430",
    "\u0443",
    "\u043E\u043A\u043E\u043B\u043E",
    "\u043F\u043E\u0434",
    "\u043E",
    "\u043F\u0440\u043E",
    "\u043D\u0430",
    "\u043A",
    "\u043F\u0435\u0440\u0435\u0434",
    "\u043F\u0440\u0438",
    "\u0441",
    "\u0441\u043E",
    "\u043C\u0435\u0436\u0434\u0443"
  ]);
  var groupConjunctions = /* @__PURE__ */ new Set([
    "\u0430",
    "\u0438",
    "\u043D\u043E",
    "\u0438\u043B\u0438",
    "\u0447\u0442\u043E",
    "\u0447\u0442\u043E\u0431\u044B"
  ]);
  var groupPronouns = /* @__PURE__ */ new Set([
    "\u044F",
    "\u0442\u044B",
    "\u0432\u044B",
    "\u043C\u044B",
    "\u0432\u0430\u0441",
    "\u043D\u0430\u0441",
    "\u043E\u043D",
    "\u043E\u043D\u0430",
    "\u043E\u043D\u043E",
    "\u043E\u043D\u0438",
    "\u0432\u0441\u0435",
    "\u0435\u0433\u043E",
    "\u0435\u0435",
    "\u0435\u0451",
    // ё variant
    "\u0438\u0445",
    "\u043C\u043E\u0439",
    "\u043D\u0430\u0448",
    "\u0447\u0435\u043C",
    "\u0447\u0435\u0439",
    "\u0447\u044C\u044F",
    "\u0447\u044C\u0435",
    "\u0447\u044C\u0451",
    // ё variant
    "\u044D\u0442\u043E"
  ]);
  var groupNegativeParticles = /* @__PURE__ */ new Set([
    "\u043D\u0435",
    "\u043D\u0435\u0442"
  ]);
  var groupAdverbs = /* @__PURE__ */ new Set([
    "\u0443\u0436\u0435",
    "\u0435\u0449\u0435",
    "\u0435\u0449\u0451",
    // ё variant
    "\u043A\u0430\u043A",
    "\u0442\u0430\u043A",
    "\u0432\u043D\u0435",
    "\u0433\u0434\u0435",
    "\u0442\u0430\u043C",
    "\u0442\u0443\u0442"
  ]);
  var groupNumerals = /* @__PURE__ */ new Set([
    "\u043E\u0434\u0438\u043D",
    "\u0434\u0432\u0430",
    "\u0442\u0440\u0438",
    "\u043E\u0431\u0430"
  ]);
  var groupShortWords = /* @__PURE__ */ new Set([
    "\u0430\u043A\u0442",
    "\u0431\u043E\u0442",
    "\u0432\u0438\u0434",
    "\u0432\u0435\u0441",
    "\u0433\u043E\u0434",
    "\u0434\u043E\u043C",
    "\u0437\u0430\u043B",
    "\u0438\u0441\u043A",
    "\u0438\u043C\u044F",
    "\u043A\u043E\u0434",
    "\u043F\u043E\u043B",
    "\u0440\u044F\u0434",
    "\u0447\u0435\u043A",
    "\u0449\u0438\u0442"
  ]);
  var nbspAfterWords = Array.from(/* @__PURE__ */ new Set([
    ...groupPrepositions,
    ...groupConjunctions,
    ...groupPronouns,
    ...groupNegativeParticles,
    ...groupAdverbs,
    ...groupNumerals,
    ...groupShortWords
  ]));
  var groupParticles = /* @__PURE__ */ new Set([
    "\u0431\u044B",
    "\u043B\u0438",
    "\u0436\u0435"
  ]);
  var nbspBeforeWords = Array.from(/* @__PURE__ */ new Set([
    ...groupParticles
  ]));
  function collectMatchPositions(regex, text) {
    const positions = [];
    while (regex.exec(text) !== null) {
      positions.push(regex.lastIndex);
    }
    return positions;
  }
  function findNbspAfterWords(text) {
    const regex = new RegExp(
      `[\\s${nbsp}](${nbspAfterWords.join("|")}|\\d+|${numberSign})(?=\\s)`,
      "gi"
    );
    return collectMatchPositions(regex, text).map((pos) => ({ deleteStart: pos, deleteEnd: pos + 1, replacement: nbsp }));
  }
  function findNbspBeforeWords(text) {
    const regex = new RegExp(
      `[\\s](?=(${nbspBeforeWords.join("|")}|${emDash}))`,
      "gi"
    );
    return collectMatchPositions(regex, text).map((pos) => ({ deleteStart: pos - 1, deleteEnd: pos, replacement: nbsp }));
  }
  function findLonelyHyphens(text) {
    const regex = new RegExp(`[\\s${nbsp}]${hyphen}(?=[\\s${nbsp}])`, "g");
    return collectMatchPositions(regex, text).map((pos) => ({ deleteStart: pos - 1, deleteEnd: pos, replacement: emDash }));
  }
  function findInWordHyphens(text) {
    const regex = new RegExp(`(?<![\\s${nbsp}])${hyphen}(?![\\s${nbsp}])`, "g");
    return collectMatchPositions(regex, text).map((pos) => ({ deleteStart: pos - 1, deleteEnd: pos, replacement: nonBreakingHyphen }));
  }

  // src/plugin.ts
  function getOperableTextNodesAndFonts() {
    const nestedSearchSupportedTypes = /* @__PURE__ */ new Set([
      "BOOLEAN_OPERATION",
      "COMPONENT",
      "COMPONENT_SET",
      "FRAME",
      "GROUP",
      "INSTANCE",
      "SECTION"
    ]);
    const selectedNodes = figma.currentPage.selection;
    const allTextNodes = [];
    const uniqueFonts = /* @__PURE__ */ new Map();
    for (const node of selectedNodes) {
      if (node.type === "TEXT") {
        allTextNodes.push(node);
      } else if (nestedSearchSupportedTypes.has(node.type)) {
        const nested = node.findAllWithCriteria({ types: ["TEXT"] });
        allTextNodes.push(...nested);
      }
    }
    const operableNodes = [];
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
  async function loadFonts(fonts) {
    await Promise.all(fonts.map(figma.loadFontAsync));
  }
  function applyToNode(node, operations) {
    for (let i = operations.length - 1; i >= 0; i--) {
      const op = operations[i];
      node.insertCharacters(op.deleteEnd, op.replacement, "BEFORE");
      node.deleteCharacters(op.deleteStart, op.deleteEnd);
    }
  }
  function groomText() {
    const startTime = Date.now();
    figma.skipInvisibleInstanceChildren = true;
    const { textNodes, fonts } = getOperableTextNodesAndFonts();
    console.log(`Finding nodes: ${Date.now() - startTime}ms \u2014 found ${textNodes.length}, ${fonts.length} unique fonts`);
    if (textNodes.length === 0) {
      figma.closePlugin("\u26A0\uFE0F \u041D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E \u0442\u0435\u043A\u0441\u0442\u043E\u0432\u044B\u0445 \u0441\u043B\u043E\u0451\u0432");
      return;
    }
    loadFonts(fonts).then(() => {
      console.log(`Loading fonts: ${Date.now() - startTime}ms`);
      let successCount = 0;
      let errorCount = 0;
      for (const node of textNodes) {
        try {
          applyToNode(node, findLonelyHyphens(node.characters));
          applyToNode(node, findInWordHyphens(node.characters));
          applyToNode(node, findNbspAfterWords(node.characters));
          applyToNode(node, findNbspBeforeWords(node.characters));
          successCount++;
        } catch (err) {
          errorCount++;
          console.error(`Failed to groom node "${node.name}":`, err);
        }
      }
      console.log(`Grooming took ${Date.now() - startTime}ms \u2014 ${successCount} nodes`);
      if (errorCount === 0) {
        figma.closePlugin("\u2705 \u041F\u0440\u0438\u0447\u0435\u0441\u0430\u043D\u043E");
      } else {
        figma.closePlugin(`\u26A0\uFE0F \u041F\u0440\u0438\u0447\u0435\u0441\u0430\u043D\u043E ${successCount}, \u043E\u0448\u0438\u0431\u043E\u043A: ${errorCount}`);
      }
    }).catch((err) => {
      console.error("Font loading failed:", err);
      figma.closePlugin("\u274C \u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0448\u0440\u0438\u0444\u0442\u043E\u0432");
    });
  }
  groomText();
})();
