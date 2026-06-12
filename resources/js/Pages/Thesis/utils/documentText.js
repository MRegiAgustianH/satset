export const cleanLineBreaks = (text) => {
  if (!text) return '';
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const paragraphs = normalized.split(/\n\n+/);

  const cleanedParagraphs = paragraphs.map((p) => {
    let cleaned = p.replace(/\n/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
  });

  return cleanedParagraphs.join('\n\n');
};

export const splitParagraphText = (text, linesFit, widthPx, layout, isList) => {
  const words = text.split(/\s+/);
  const charWidth = getFontSizePx(layout.fontSize || '12pt') * 0.46;
  const textWidthPx = isList ? (widthPx - 32) : widthPx;
  const textIndentPx = (!isList && layout.paragraphIndent === 'indented') ? 47 : 0;

  let currentLineIdx = 0;
  let currentLineWidth = 0;
  let part1Words = [];
  let part2Words = [];
  let currentLineWidthLimit = Math.max(1, textWidthPx - textIndentPx);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordWidth = Math.max(charWidth, word.length * charWidth);
    const spaceWidth = currentLineWidth === 0 ? 0 : charWidth;

    if (currentLineWidth > 0 && currentLineWidth + spaceWidth + wordWidth > currentLineWidthLimit) {
      currentLineIdx++;
      currentLineWidth = 0;
      currentLineWidthLimit = Math.max(1, textWidthPx);
    }

    if (currentLineIdx < linesFit) {
      part1Words.push(word);
      currentLineWidth += (currentLineWidth === 0 ? 0 : charWidth) + wordWidth;
    } else {
      part2Words.push(word);
    }
  }

  return {
    part1: part1Words.join(' '),
    part2: part2Words.join(' '),
  };
};
import { getFontSizePx } from '../features/document-preview/pagination';
