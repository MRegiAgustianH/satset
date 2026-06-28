export const getDefaultFirstLineIndentCm = (layout = {}) => (
  layout.paragraphIndent === 'indented' ? 1.25 : 0
);

const toFiniteNumber = (value, fallback = 0) => {
  const numeric = parseFloat(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const getSectionParagraphIndent = (section = {}, layout = {}) => {
  const defaultFirstLineIndent = getDefaultFirstLineIndentCm(layout);
  const leftIndent = toFiniteNumber(section.leftIndentCm, 0);
  const rightIndent = toFiniteNumber(section.rightIndentCm, 0);
  const firstLineIndent = toFiniteNumber(section.firstLineIndentCm, defaultFirstLineIndent);

  return {
    leftIndent,
    rightIndent,
    firstLineIndent,
    textIndent: firstLineIndent - leftIndent,
  };
};

export const getSectionParagraphStyle = (section = {}, layout = {}) => {
  const { leftIndent, rightIndent, textIndent } = getSectionParagraphIndent(section, layout);
  return {
    marginLeft: `${leftIndent}cm`,
    marginRight: `${rightIndent}cm`,
    textIndent: `${textIndent}cm`,
  };
};

