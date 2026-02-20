/* global figma, console, setTimeout */
"use strict";
(() => {
  // src/typography.ts
  var nbsp = String.fromCharCode(160);
  var hyphen = String.fromCharCode(45);
  var nonBreakingHyphen = String.fromCharCode(8209);
  var emDash = String.fromCharCode(8212);
  var numberSign = String.fromCharCode(8470);
  var groupPrepositions = /* @__PURE__ */ new Set([
    "в",
    "без",
    "до",
    "для",
    "за",
    "от",
    "через",
    "над",
    "по",
    "из",
    "из-за",
    "у",
    "около",
    "под",
    "о",
    "про",
    "на",
    "к",
    "перед",
    "при",
    "с",
    "со",
    "между"
  ]);
  var groupConjunctions = /* @__PURE__ */ new Set([
    "а",
    "и",
    "но",
    "или",
    "что",
    "чтобы"
  ]);
  var groupPronouns = /* @__PURE__ */ new Set([
    "я",
    "ты",
    "вы",
    "мы",
    "вас",
    "нас",
    "он",
    "она",
    "оно",
    "они",
    "все",
    "его",
    "ее",
    "её",
    "их",
    "мой",
    "наш",
    "чем",
    "чей",
    "чья",
    "чье",
    "чьё",
    "это"
  ]);
  var groupNegativeParticles = /* @__PURE__ */ new Set([
    "не",
    "нет"
  ]);
  var groupAdverbs = /* @__PURE__ */ new Set([
    "уже",
    "еще",
    "ещё",
    "как",
    "так",
    "вне",
    "где",
    "там",
    "тут"
  ]);
  var groupNumerals = /* @__PURE__ */ new Set([
    "один",
    "два",
    "три",
    "оба"
  ]);
  var groupShortWords = /* @__PURE__ */ new Set([
    "акт",
    "бот",
    "вид",
    "вес",
    "год",
    "дом",
    "зал",
    "иск",
    "имя",
    "код",
    "пол",
    "ряд",
    "чек",
    "щит"
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
    "бы",
    "ли",
    "же"
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
  async function groomText() {
    const startTime = Date.now();
    const notification = figma.notify("💈 Причесываю...", { timeout: Infinity });
    await new Promise((resolve) => setTimeout(resolve, 0));
    figma.skipInvisibleInstanceChildren = true;
    const { textNodes, fonts } = getOperableTextNodesAndFonts();
    console.log(`Finding nodes: ${Date.now() - startTime}ms — found ${textNodes.length}, ${fonts.length} unique fonts`);
    if (textNodes.length === 0) {
      notification.cancel();
      figma.closePlugin("⚠️ Выделите зону с текстами и запустите плагин");
      return;
    }
    try {
      await loadFonts(fonts);
      console.log(`Loading fonts: ${Date.now() - startTime}ms`);
      let successCount = 0;
      let errorCount = 0;
      for (const node of textNodes) {
        try {
          const text1 = node.characters;
          applyToNode(node, [...findLonelyHyphens(text1), ...findInWordHyphens(text1)]);
          const text2 = node.characters;
          applyToNode(node, [...findNbspAfterWords(text2), ...findNbspBeforeWords(text2)]);
          successCount++;
        } catch (err) {
          errorCount++;
          console.error(`Failed to groom node "${node.name}":`, err);
        }
      }
      console.log(`Grooming took ${Date.now() - startTime}ms — ${successCount} nodes`);
      notification.cancel();
      if (errorCount === 0) {
        figma.closePlugin("✅ Причесано");
      } else {
        figma.closePlugin(`⚠️ Причесано ${successCount}, ошибок: ${errorCount}`);
      }
    } catch (err) {
      console.error("Font loading failed:", err);
      notification.cancel();
      figma.closePlugin("❌ Не получилось загрузить шрифты");
    }
  }
  groomText();
})();
