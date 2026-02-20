import { describe, it, expect } from 'vitest';
import {
  nbsp,
  hyphen,
  nonBreakingHyphen,
  emDash,
  numberSign,
  nbspAfterWords,
  nbspBeforeWords,
  collectMatchPositions,
  findNbspAfterWords,
  findNbspBeforeWords,
  findLonelyHyphens,
  findInWordHyphens,
  applyOperations,
  groomString,
} from '../src/typography';


// ── collectMatchPositions ──

describe('collectMatchPositions', () => {
  it('returns empty array for no matches', () => {
    expect(collectMatchPositions(/xyz/g, 'hello')).toEqual([]);
  });

  it('returns correct positions for multiple matches', () => {
    const positions = collectMatchPositions(/ab/g, 'ab cd ab');
    expect(positions).toEqual([2, 8]);
  });

  it('returns correct position for single match', () => {
    const positions = collectMatchPositions(/cd/g, 'ab cd ef');
    expect(positions).toEqual([5]);
  });
});


// ── findNbspAfterWords ──

describe('findNbspAfterWords', () => {
  it('finds space after preposition "в"', () => {
    const ops = findNbspAfterWords(' в магазин');
    expect(ops.length).toBe(1);
    expect(ops[0].replacement).toBe(nbsp);
  });

  it('result applies correctly: space after "в" becomes nbsp', () => {
    const text = ' в магазин';
    const result = applyOperations(text, findNbspAfterWords(text));
    expect(result).toBe(` в${nbsp}магазин`);
  });

  it('handles multiple words in one string', () => {
    const text = ' в лес и на реку';
    const result = applyOperations(text, findNbspAfterWords(text));
    expect(result).toContain(`в${nbsp}`);
    expect(result).toContain(`и${nbsp}`);
    expect(result).toContain(`на${nbsp}`);
  });

  it('replaces space after a number', () => {
    const text = ' 5 рублей';
    const result = applyOperations(text, findNbspAfterWords(text));
    expect(result).toBe(` 5${nbsp}рублей`);
  });

  it('replaces space after № symbol', () => {
    const text = ` ${numberSign} 5`;
    const result = applyOperations(text, findNbspAfterWords(text));
    expect(result).toBe(` ${numberSign}${nbsp}5`);
  });

  it('is case-insensitive', () => {
    const text = ' В магазин';
    const result = applyOperations(text, findNbspAfterWords(text));
    expect(result).toBe(` В${nbsp}магазин`);
  });

  it('does not match words not in the list', () => {
    const ops = findNbspAfterWords(' привет мир');
    expect(ops.length).toBe(0);
  });

  it('handles ё variants', () => {
    const text = ' ещё раз';
    const result = applyOperations(text, findNbspAfterWords(text));
    expect(result).toBe(` ещё${nbsp}раз`);
  });

  it('handles её variant', () => {
    const text = ' её дом';
    const result = applyOperations(text, findNbspAfterWords(text));
    expect(result).toBe(` её${nbsp}дом`);
  });

  it('handles conjunction "но"', () => {
    const text = ' но потом';
    const result = applyOperations(text, findNbspAfterWords(text));
    expect(result).toBe(` но${nbsp}потом`);
  });

  it('handles pronoun "я"', () => {
    const text = ' я хочу';
    const result = applyOperations(text, findNbspAfterWords(text));
    expect(result).toBe(` я${nbsp}хочу`);
  });

  it('handles negative particle "не"', () => {
    const text = ' не надо';
    const result = applyOperations(text, findNbspAfterWords(text));
    expect(result).toBe(` не${nbsp}надо`);
  });

  it('handles numeral "два"', () => {
    const text = ' два раза';
    const result = applyOperations(text, findNbspAfterWords(text));
    expect(result).toBe(` два${nbsp}раза`);
  });

  it('handles short word "код"', () => {
    const text = ' код работает';
    const result = applyOperations(text, findNbspAfterWords(text));
    expect(result).toBe(` код${nbsp}работает`);
  });

  it('handles preposition "из-за"', () => {
    const text = ' из-за дождя';
    const result = applyOperations(text, findNbspAfterWords(text));
    expect(result).toBe(` из-за${nbsp}дождя`);
  });

  it('does not replace if no trailing space (end of string)', () => {
    const ops = findNbspAfterWords(' в');
    expect(ops.length).toBe(0);
  });
});


// ── findNbspBeforeWords ──

describe('findNbspBeforeWords', () => {
  it('finds space before particle "бы"', () => {
    const ops = findNbspBeforeWords('хотел бы');
    expect(ops.length).toBe(1);
    expect(ops[0].replacement).toBe(nbsp);
  });

  it('result applies correctly: space before "бы" becomes nbsp', () => {
    const text = 'хотел бы';
    const result = applyOperations(text, findNbspBeforeWords(text));
    expect(result).toBe(`хотел${nbsp}бы`);
  });

  it('replaces space before particle "ли"', () => {
    const text = 'есть ли';
    const result = applyOperations(text, findNbspBeforeWords(text));
    expect(result).toBe(`есть${nbsp}ли`);
  });

  it('replaces space before particle "же"', () => {
    const text = 'так же';
    const result = applyOperations(text, findNbspBeforeWords(text));
    expect(result).toBe(`так${nbsp}же`);
  });

  it('replaces space before em dash', () => {
    const text = `слово ${emDash} другое`;
    const result = applyOperations(text, findNbspBeforeWords(text));
    expect(result).toContain(`${nbsp}${emDash}`);
  });

  it('does not match regular words', () => {
    const ops = findNbspBeforeWords('привет мир');
    expect(ops.length).toBe(0);
  });
});


// ── findLonelyHyphens ──

describe('findLonelyHyphens', () => {
  it('finds lonely hyphen (space-hyphen-space)', () => {
    const ops = findLonelyHyphens('Лана - хорошая');
    expect(ops.length).toBe(1);
    expect(ops[0].replacement).toBe(emDash);
  });

  it('result applies correctly: lonely hyphen becomes em dash', () => {
    const text = 'Лана - хорошая дочь';
    const result = applyOperations(text, findLonelyHyphens(text));
    expect(result).toBe(`Лана ${emDash} хорошая дочь`);
  });

  it('does not match hyphens inside words', () => {
    const ops = findLonelyHyphens('Т-Банк');
    expect(ops.length).toBe(0);
  });

  it('handles multiple lonely hyphens', () => {
    const text = 'а - б - в';
    const result = applyOperations(text, findLonelyHyphens(text));
    expect(result).toBe(`а ${emDash} б ${emDash} в`);
  });

  it('handles nbsp around hyphen', () => {
    const text = `слово${nbsp}-${nbsp}слово`;
    const result = applyOperations(text, findLonelyHyphens(text));
    expect(result).toBe(`слово${nbsp}${emDash}${nbsp}слово`);
  });
});


// ── findInWordHyphens ──

describe('findInWordHyphens', () => {
  it('finds in-word hyphen', () => {
    const ops = findInWordHyphens('T-Bank');
    expect(ops.length).toBe(1);
    expect(ops[0].replacement).toBe(nonBreakingHyphen);
  });

  it('result applies correctly: in-word hyphen becomes non-breaking', () => {
    const text = 'T-Bank';
    const result = applyOperations(text, findInWordHyphens(text));
    expect(result).toBe(`T${nonBreakingHyphen}Bank`);
  });

  it('does not match lonely hyphens', () => {
    const ops = findInWordHyphens('a - b');
    expect(ops.length).toBe(0);
  });

  it('handles из-за', () => {
    const text = 'из-за';
    const result = applyOperations(text, findInWordHyphens(text));
    expect(result).toBe(`из${nonBreakingHyphen}за`);
  });

  it('handles multiple in-word hyphens', () => {
    const text = 'какой-то кто-нибудь';
    const result = applyOperations(text, findInWordHyphens(text));
    expect(result).toBe(`какой${nonBreakingHyphen}то кто${nonBreakingHyphen}нибудь`);
  });
});


// ── applyOperations ──

describe('applyOperations', () => {
  it('returns original string for empty operations', () => {
    expect(applyOperations('hello', [])).toBe('hello');
  });

  it('applies single operation', () => {
    const result = applyOperations('abc', [{ deleteStart: 1, deleteEnd: 2, replacement: 'X' }]);
    expect(result).toBe('aXc');
  });

  it('applies multiple operations from end to start', () => {
    const result = applyOperations('abcde', [
      { deleteStart: 1, deleteEnd: 2, replacement: 'X' },
      { deleteStart: 3, deleteEnd: 4, replacement: 'Y' },
    ]);
    expect(result).toBe('aXcYe');
  });
});


// ── groomString (full pipeline) ──

describe('groomString', () => {
  it('handles empty string', () => {
    expect(groomString('')).toBe('');
  });

  it('returns unchanged string when no patterns match', () => {
    expect(groomString('просто текст')).toBe('просто текст');
  });

  it('applies all transforms together', () => {
    const input = ' в лес - и на T-Bank';
    const result = groomString(input);
    // lonely hyphen → em dash
    expect(result).toContain(emDash);
    // T-Bank hyphen → non-breaking
    expect(result).toContain(nonBreakingHyphen);
    // spaces after в/и/на → nbsp
    expect(result).toContain(nbsp);
    // no lonely hyphens left
    expect(result).not.toContain(` ${hyphen} `);
  });

  it('handles real-world sentence', () => {
    const input = ' я хотел бы в T-Bank - он хорош';
    const result = groomString(input);
    // "я" followed by nbsp
    expect(result).toContain(`я${nbsp}`);
    // "бы" preceded by nbsp
    expect(result).toContain(`${nbsp}бы`);
    // "в" followed by nbsp
    expect(result).toContain(`в${nbsp}`);
    // lonely hyphen → em dash
    expect(result).toContain(emDash);
    // T-Bank → non-breaking hyphen
    expect(result).toContain(`T${nonBreakingHyphen}Bank`);
  });

  it('handles multiple spaces and prepositions', () => {
    const text = ' из магазина в дом';
    const result = groomString(text);
    expect(result).toBe(` из${nbsp}магазина в${nbsp}дом`);
  });
});


// ── word lists (sanity checks) ──

describe('word lists', () => {
  it('nbspAfterWords contains expected prepositions', () => {
    expect(nbspAfterWords).toContain('в');
    expect(nbspAfterWords).toContain('из-за');
    expect(nbspAfterWords).toContain('между');
  });

  it('nbspAfterWords contains ё variants', () => {
    expect(nbspAfterWords).toContain('её');
    expect(nbspAfterWords).toContain('чьё');
    expect(nbspAfterWords).toContain('ещё');
  });

  it('nbspBeforeWords contains particles', () => {
    expect(nbspBeforeWords).toContain('бы');
    expect(nbspBeforeWords).toContain('ли');
    expect(nbspBeforeWords).toContain('же');
  });

  it('nbspAfterWords has no duplicates', () => {
    const unique = new Set(nbspAfterWords);
    expect(unique.size).toBe(nbspAfterWords.length);
  });

  it('nbspBeforeWords has no duplicates', () => {
    const unique = new Set(nbspBeforeWords);
    expect(unique.size).toBe(nbspBeforeWords.length);
  });
});
