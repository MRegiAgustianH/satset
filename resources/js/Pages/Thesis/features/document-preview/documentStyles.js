export const BLOCK_SPACING = {
  embeddedBlockMargin: '12pt',
  captionBottomMargin: '6pt',
  captionFontSize: '11pt',
  tableCellPaddingPx: 6,
  equationDescriptionMarginLeft: '1cm',
  equationDescriptionLineHeight: 1.2,
};

export const getWordLineHeightPercent = (lineSpacing = '1.5') => {
  const spacingNum = parseFloat(lineSpacing || '1.5');
  return `${Math.round((Number.isFinite(spacingNum) ? spacingNum : 1.5) * 100)}%`;
};

export const getCleanFontFamily = (fontFamily) => (
  fontFamily ? fontFamily.split(',')[0].replace(/["']/g, '').trim() : 'Times New Roman'
);

export const getBaseFontSize = (layout = {}) => layout.fontSize || '12pt';
