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
  const sourceLines = String(text || '').split('\n');
  const charWidth = getFontSizePx(layout.fontSize || '12pt') * 0.425;
  const textWidthPx = isList ? (widthPx - 42) : widthPx;
  const textIndentPx = (!isList && layout.paragraphIndent === 'indented') ? 47 : 0;

  let currentLineIdx = 0;
  let part1Words = [];
  let part2Words = [];
  let part1Lines = [];
  let part2Lines = [];
  let targetPart = 1;

  sourceLines.forEach((line, lineIndex) => {
    const words = line.split(/\s+/).filter(Boolean);
    let currentLineWidth = 0;
    let currentLineWidthLimit = Math.max(1, textWidthPx - textIndentPx);
    const linePart1 = [];
    const linePart2 = [];

    if (words.length === 0) {
      if (currentLineIdx < linesFit && targetPart === 1) {
        part1Lines.push('');
      } else {
        part2Lines.push('');
      }
      currentLineIdx++;
      return;
    }

    words.forEach((word) => {
      const wordWidth = Math.max(charWidth, word.length * charWidth);
      const spaceWidth = currentLineWidth === 0 ? 0 : charWidth;

      if (currentLineWidth > 0 && currentLineWidth + spaceWidth + wordWidth > currentLineWidthLimit) {
        currentLineIdx++;
        currentLineWidth = 0;
        currentLineWidthLimit = Math.max(1, textWidthPx);
      }

      if (currentLineIdx < linesFit && targetPart === 1) {
        linePart1.push(word);
        part1Words.push(word);
      } else {
        targetPart = 2;
        linePart2.push(word);
        part2Words.push(word);
      }

      currentLineWidth += (currentLineWidth === 0 ? 0 : charWidth) + wordWidth;
    });

    if (linePart1.length > 0) part1Lines.push(linePart1.join(' '));
    if (linePart2.length > 0) part2Lines.push(linePart2.join(' '));
    if (lineIndex < sourceLines.length - 1 && targetPart === 1) currentLineIdx++;
  });

  const part1 = part1Lines.join('\n').trim() || part1Words.join(' ');
  const part2 = part2Lines.join('\n').trim() || part2Words.join(' ');

  return {
    part1,
    part2,
  };
};
import { getFontSizePx } from '../features/document-preview/pagination';

