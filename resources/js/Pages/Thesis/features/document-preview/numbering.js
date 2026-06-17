export const convertToAlpha = (num) => {
  let s = '';
  let temp = num;
  while (temp > 0) {
    const t = (temp - 1) % 26;
    s = String.fromCharCode(97 + t) + s;
    temp = Math.floor((temp - t) / 26);
  }
  return s || 'a';
};

export const convertToRoman = (num) => {
  const romanMap = [
    { value: 1000, symbol: 'M' },
    { value: 900, symbol: 'CM' },
    { value: 500, symbol: 'D' },
    { value: 400, symbol: 'CD' },
    { value: 100, symbol: 'C' },
    { value: 90, symbol: 'XC' },
    { value: 50, symbol: 'L' },
    { value: 40, symbol: 'XL' },
    { value: 10, symbol: 'X' },
    { value: 9, symbol: 'IX' },
    { value: 5, symbol: 'V' },
    { value: 4, symbol: 'IV' },
    { value: 1, symbol: 'I' },
  ];

  let s = '';
  let temp = num;
  for (let i = 0; i < romanMap.length; i++) {
    while (temp >= romanMap[i].value) {
      s += romanMap[i].symbol;
      temp -= romanMap[i].value;
    }
  }
  return s || 'I';
};

export const getDefaultNumberingStyleForHeading = (level) => {
  if (level === 0) return 'none';
  if (level >= 2 && level <= 6) return 'bab_prefix_double_dot';
  return 'none';
};

const isHierarchicalBabStyle = (style) => (
  style === 'bab_prefix_dot' ||
  style === 'bab_prefix_double_dot'
);

const resetDeeperHeadingCounters = (headingCounters, level) => {
  for (let i = level + 1; i <= 6; i++) {
    headingCounters[i] = 0;
  }
};

const buildHierarchicalPrefix = (babNum, headingCounters, level) => {
  const parts = [babNum];
  const normalizedLevel = Math.min(Math.max(level || 2, 2), 6);

  for (let currentLevel = 2; currentLevel <= normalizedLevel; currentLevel++) {
    if (!headingCounters[currentLevel]) {
      headingCounters[currentLevel] = 1;
    }
    parts.push(headingCounters[currentLevel]);
  }

  return `${parts.join('.')} `;
};

export const resolveBlockNumberingForBab = (babKey, sections) => {
  if (!sections) return [];
  const babMatch = babKey.match(/\d+/);
  const babNum = babMatch ? parseInt(babMatch[0], 10) : 1;

  const headingCounters = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  let arabicDotVal = 0;
  let arabicParenVal = 0;
  let arabicBothParenVal = 0;
  let alphaDotLowerVal = 0;
  let alphaDotUpperVal = 0;
  let alphaParenLowerVal = 0;
  let alphaBothParenLowerVal = 0;
  let romanDotUpperVal = 0;
  let romanDotLowerVal = 0;

  return sections.map((section) => {
    if (section.type !== 'text') {
      return { ...section, resolvedPrefix: '' };
    }

    let prefix = '';
    const style = section.numberingStyle || 'none';
    const headingLevel = parseInt(section.headingLevel || 0, 10);

    if (isHierarchicalBabStyle(style) && headingLevel >= 2) {
      headingCounters[headingLevel] = (headingCounters[headingLevel] || 0) + 1;
      resetDeeperHeadingCounters(headingCounters, headingLevel);
      prefix = buildHierarchicalPrefix(babNum, headingCounters, headingLevel);
    } else if (style === 'arabic_dot') {
      arabicDotVal++;
      prefix = `${arabicDotVal}. `;
    } else if (style === 'arabic_paren') {
      arabicParenVal++;
      prefix = `${arabicParenVal}) `;
    } else if (style === 'arabic_both_paren') {
      arabicBothParenVal++;
      prefix = `(${arabicBothParenVal}) `;
    } else if (style === 'alpha_dot_lower') {
      alphaDotLowerVal++;
      prefix = `${convertToAlpha(alphaDotLowerVal)}. `;
    } else if (style === 'alpha_dot_upper') {
      alphaDotUpperVal++;
      prefix = `${convertToAlpha(alphaDotUpperVal).toUpperCase()}. `;
    } else if (style === 'alpha_paren_lower') {
      alphaParenLowerVal++;
      prefix = `${convertToAlpha(alphaParenLowerVal)}) `;
    } else if (style === 'alpha_both_paren_lower') {
      alphaBothParenLowerVal++;
      prefix = `(${convertToAlpha(alphaBothParenLowerVal)}) `;
    } else if (style === 'roman_dot_upper') {
      romanDotUpperVal++;
      prefix = `${convertToRoman(romanDotUpperVal)}. `;
    } else if (style === 'roman_dot_lower') {
      romanDotLowerVal++;
      prefix = `${convertToRoman(romanDotLowerVal).toLowerCase()}. `;
    }

    return {
      ...section,
      resolvedPrefix: prefix,
    };
  });
};
