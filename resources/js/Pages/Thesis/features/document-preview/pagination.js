const CM_TO_PX = 37.795;

export const getLayoutNumber = (value, fallback) => {
  const numeric = parseFloat(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const getContentWidthPx = (layout) => {
  const contentWidthCm = 21 - (getLayoutNumber(layout.marginLeft, 4) + getLayoutNumber(layout.marginRight, 3));
  return Math.max(1, contentWidthCm * CM_TO_PX);
};

export const getFontSizePx = (fontSize = '12pt') => {
  const numeric = parseFloat(fontSize);
  if (!Number.isFinite(numeric)) return 16;
  return fontSize.includes('px') ? numeric : numeric * (4 / 3);
};

export const getLineHeightPx = (layout) => {
  const fontSizePx = getFontSizePx(layout.fontSize || '12pt');
  const lineSpacing = getLayoutNumber(layout.lineSpacing, 2);
  return fontSizePx * lineSpacing;
};

export const estimateParagraphLines = (text, widthPx, layout, isList = false) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 1;

  const fontSizePx = getFontSizePx(layout.fontSize || '12pt');
  const charWidth = fontSizePx * 0.46;
  const textIndentPx = (!isList && layout.paragraphIndent === 'indented') ? 47 : 0;
  const availableWidth = Math.max(1, isList ? widthPx - 32 : widthPx);
  let lineWidth = Math.max(1, availableWidth - textIndentPx);
  let lines = 1;
  let currentWidth = 0;

  words.forEach((word, index) => {
    const wordWidth = Math.max(charWidth, word.length * charWidth);
    const spaceWidth = index === 0 || currentWidth === 0 ? 0 : charWidth;

    if (currentWidth > 0 && currentWidth + spaceWidth + wordWidth > lineWidth) {
      lines++;
      currentWidth = wordWidth;
      lineWidth = availableWidth;
      return;
    }

    currentWidth += spaceWidth + wordWidth;
  });

  return lines;
};

export const estimateParagraphHeight = (text, widthPx, layout, isList = false) => {
  const lines = estimateParagraphLines(text, widthPx, layout, isList);
  return (lines * getLineHeightPx(layout)) + 8;
};
