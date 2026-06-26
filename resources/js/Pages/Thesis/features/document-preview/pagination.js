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
  const rawLines = String(text || '').split('\n');
  const logicalLines = rawLines.length > 0 ? rawLines : [''];

  const fontSizePx = getFontSizePx(layout.fontSize || '12pt');
  const charWidth = fontSizePx * 0.425;
  const textIndentPx = (!isList && layout.paragraphIndent === 'indented') ? 47 : 0;
  const availableWidth = Math.max(1, isList ? widthPx - 42 : widthPx);
  let totalLines = 0;

  logicalLines.forEach((line) => {
    const words = String(line || '').split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      totalLines += 1;
      return;
    }

    let lineWidth = Math.max(1, availableWidth - textIndentPx);
    let currentWidth = 0;
    let lines = 1;

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

    totalLines += lines;
  });

  return Math.max(1, totalLines);
};

export const estimateParagraphHeight = (text, widthPx, layout, isList = false) => {
  const lines = estimateParagraphLines(text, widthPx, layout, isList);
  return (lines * getLineHeightPx(layout)) + 6;
};
export const paginateReferences = ({ references = [], refStyle = 'apa', layout = {} }) => {
  const pages = [];
  const marginTop = parseFloat(layout.marginTop) || 4;
  const marginBottom = parseFloat(layout.marginBottom) || 3;
  const marginLeft = parseFloat(layout.marginLeft) || 4;
  const marginRight = parseFloat(layout.marginRight) || 3;
  const contentHeightCm = 29.7 - marginTop - marginBottom;
  const isDoubleSpacing = layout.lineSpacing === '2.0';
  const lineHeightCm = isDoubleSpacing ? 0.85 : 0.65;
  const firstPageAvailableHeight = contentHeightCm - 2.2;
  const nextPageAvailableHeight = contentHeightCm;

  let currentPage = [];
  let currentHeight = 0;
  let isFirstPage = true;

  references.forEach((ref) => {
    const refText = refStyle === 'apa'
      ? `${ref.author || ''}. (${ref.year || ''}). ${ref.title || ''}. ${ref.publisher || ''}.`
      : `[99] ${ref.author || ''}, "${ref.title || ''}," ${ref.publisher || ''}, ${ref.year || ''}.`;

    const indentCm = refStyle === 'apa' ? 1.25 : 0.8;
    const printableWidthCm = 21.0 - marginLeft - marginRight - indentCm;
    const charsPerLine = Math.max(30, Math.floor(printableWidthCm / 0.18));
    const lines = refText.length > charsPerLine ? Math.ceil(refText.length / charsPerLine) : 1;
    const refHeight = (lines * lineHeightCm) + 0.32;
    const maxHeight = isFirstPage ? firstPageAvailableHeight : nextPageAvailableHeight;

    if (currentHeight + refHeight > maxHeight && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [ref];
      currentHeight = refHeight;
      isFirstPage = false;
      return;
    }

    currentPage.push(ref);
    currentHeight += refHeight;
  });

  if (currentPage.length > 0) pages.push(currentPage);
  if (pages.length === 0) pages.push([]);
  return pages;
};
