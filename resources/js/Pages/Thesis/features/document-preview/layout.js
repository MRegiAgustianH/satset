import { splitParagraphText } from '../../utils/documentText';
import {
  estimateParagraphHeight,
  estimateParagraphLines,
  getContentWidthPx,
  getLineHeightPx,
  getLayoutNumber,
} from './pagination';
export {
  convertToAlpha,
  convertToRoman,
  getDefaultNumberingStyleForHeading,
  resolveBlockNumberingForBab,
} from './numbering';
import { resolveBlockNumberingForBab } from './numbering';

const CM_TO_PX = 37.795;
const PAGE_WIDTH_CM = 21;
const PAGE_HEIGHT_CM = 29.7;
const DEFAULT_FIGURE_WIDTH_CM = 12;
const DEFAULT_FIGURE_HEIGHT_CM = 8;

const getFigureAspectRatio = (figure) => {
  const storedRatio = parseFloat(figure.imgAspectRatio);
  if (Number.isFinite(storedRatio) && storedRatio > 0) return storedRatio;

  const width = parseFloat(figure.imgNaturalWidth);
  const height = parseFloat(figure.imgNaturalHeight);
  if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
    return width / height;
  }

  return null;
};

const getFigureHeightPx = (figure, layout) => {
  if (!figure.imageData) {
    return 4 * CM_TO_PX;
  }

  const contentWidthCm = PAGE_WIDTH_CM - (
    getLayoutNumber(layout.marginLeft, 4) + getLayoutNumber(layout.marginRight, 3)
  );
  const widthCm = Math.min(
    getLayoutNumber(figure.imgWidth, DEFAULT_FIGURE_WIDTH_CM),
    Math.max(1, contentWidthCm)
  );
  const aspectRatio = getFigureAspectRatio(figure);
  const heightCm = aspectRatio ? widthCm / aspectRatio : DEFAULT_FIGURE_HEIGHT_CM;

  return Math.max(2, heightCm) * CM_TO_PX;
};

const getParagraphAlignment = (section, paragraphIndex) => (
  section.paragraphAlignments?.[paragraphIndex] || section.textAlign || null
);

const estimateElementHeight = (el, layout) => {
  const widthPx = getContentWidthPx(layout);
  const lineGapPx = getLineHeightPx(layout);

  if (el.type === 'heading') {
    const charCount = el.title.length;
    const charsPerLine = Math.max(1, Math.floor(widthPx / 7.5));
    const lines = Math.ceil(charCount / charsPerLine) || 1;
    return lines * lineGapPx + 24;
  }

  if (el.type === 'paragraph') {
    const isList = /^[0-9a-zA-Z]+[\.\)]\s+/.test(el.text);
    return estimateParagraphHeight(el.text, widthPx, layout, isList);
  }

  if (el.type === 'table') {
    const rowsCount = el.rows ? el.rows.length : 0;
    const tableLineSpacing = getLayoutNumber(layout.tableLineSpacing, 1);
    const rowHeight = 20 + Math.round(tableLineSpacing * 10);
    return 25 + 35 + (rowsCount * rowHeight) + 40;
  }

  if (el.type === 'figure') {
    return 16 + getFigureHeightPx(el, layout) + 25 + 40;
  }

  if (el.type === 'equation') {
    const descLines = el.description ? el.description.split('\n').length : 0;
    return 40 + (descLines * 20) + 40;
  }

  return 50;
};

const buildBabSubElements = (babKey, rawSections) => {
  const subElements = [];
  const resolved = resolveBlockNumberingForBab(babKey, rawSections);

  resolved.forEach((section) => {
    if (section.type === 'table') {
      subElements.push({
        type: 'table',
        blockId: section.id,
        title: section.title,
        headers: section.headers,
        rows: section.rows,
      });
      return;
    }

    if (section.type === 'figure') {
      subElements.push({
        type: 'figure',
        blockId: section.id,
        title: section.title,
        imageData: section.imageData,
        imgWidth: section.imgWidth,
        imgAspectRatio: section.imgAspectRatio,
        imgNaturalWidth: section.imgNaturalWidth,
        imgNaturalHeight: section.imgNaturalHeight,
      });
      return;
    }

    if (section.type === 'equation') {
      subElements.push({
        type: 'equation',
        blockId: section.id,
        title: section.title,
        content: section.content,
        description: section.description,
      });
      return;
    }

    if (section.headingLevel > 0) {
      subElements.push({
        type: 'heading',
        blockId: section.id,
        headingLevel: section.headingLevel,
        title: `${section.resolvedPrefix || ''}${section.title}`,
      });
    }

    if (section.content && section.content.trim()) {
      const paragraphs = section.content.split(/\n+/).filter((p) => p.trim());
      paragraphs.forEach((paragraph, paragraphIndex) => {
        const cleanedText = paragraph.trim();
        if (cleanedText === '---') {
          subElements.push({ type: 'pagebreak', blockId: section.id });
          return;
        }

        const parts = paragraph.split(/\[\s*(?:page[-_\s]*)?br[ea]{1,2}ke?\s*\]/gi);
        parts.forEach((part, index) => {
          const cleanedPart = part.trim();
          if (cleanedPart) {
            subElements.push({
              type: 'paragraph',
              blockId: section.id,
              text: cleanedPart,
              paragraphIndex,
              textAlign: getParagraphAlignment(section, paragraphIndex),
              firstLineIndentCm: section.firstLineIndentCm ?? null,
              leftIndentCm: section.leftIndentCm ?? null,
              rightIndentCm: section.rightIndentCm ?? null,
            });
          }
          if (index < parts.length - 1) {
            subElements.push({ type: 'pagebreak', blockId: section.id });
          }
        });
      });
    }
  });

  return subElements;
};

export const buildBabPagesMap = ({ sections, layout, inlineEditingBlockId }) => {
  const map = {};
  const maxPageHeight = (
    PAGE_HEIGHT_CM - (getLayoutNumber(layout.marginTop, 4) + getLayoutNumber(layout.marginBottom, 3))
  ) * CM_TO_PX - 4;

  ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'].forEach((babKey) => {
    const subElements = buildBabSubElements(babKey, sections[babKey] || []);
    const pages = [];
    let currentPage = [];
    let currentHeight = 120;
    let elIdx = 0;

    while (elIdx < subElements.length) {
      const el = subElements[elIdx];

      if (el.type === 'pagebreak') {
        if (currentPage.length > 0) {
          pages.push(currentPage);
          currentPage = [];
          currentHeight = 0;
        }
        elIdx++;
        continue;
      }

      const h = estimateElementHeight(el, layout);

      if (el.type === 'table') {
        const isFirstPageOfTable = !el.isContinuation;
        const tableLineSpacing = getLayoutNumber(layout.tableLineSpacing, 1);
        const rowHeight = 20 + Math.round(tableLineSpacing * 10);
        const hFresh = (isFirstPageOfTable ? 25 : 0) + 35 + (el.rows.length * rowHeight) + 40;

        if (currentHeight + h > maxPageHeight) {
          if (hFresh <= maxPageHeight && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            currentHeight = 0;
            continue;
          }

          const availableHeight = maxPageHeight - currentHeight;
          const minH = (isFirstPageOfTable ? 25 : 0) + 35 + rowHeight + 40;

          if (availableHeight >= minH) {
            const k = Math.floor((availableHeight - (isFirstPageOfTable ? 25 : 0) - 75) / rowHeight);
            const rowsFit = Math.max(1, k);

            if (rowsFit < el.rows.length) {
              const elPart1 = { ...el, rows: el.rows.slice(0, rowsFit) };
              const continuationTitle = el.title.endsWith(' (Lanjutan)') ? el.title : `${el.title} (Lanjutan)`;
              const elPart2 = {
                ...el,
                title: continuationTitle,
                rows: el.rows.slice(rowsFit),
                isContinuation: true,
              };

              currentPage.push(elPart1);
              pages.push(currentPage);
              currentPage = [];
              currentHeight = 0;
              subElements.splice(elIdx + 1, 0, elPart2);
              elIdx++;
              continue;
            }
          } else if (currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            currentHeight = 0;
            continue;
          }
        }
      }

      let totalH = h;
      if (el.type === 'heading' && subElements[elIdx + 1]) {
        totalH += estimateElementHeight(subElements[elIdx + 1], layout);
      }

      if (el.type === 'paragraph' && el.blockId !== inlineEditingBlockId && currentHeight + h > maxPageHeight) {
        const availableHeight = maxPageHeight - currentHeight;
        const lineGapPx = getLineHeightPx(layout);
        const linesFit = Math.floor((availableHeight - 8) / lineGapPx);
        const isList = /^[0-9a-zA-Z]+[\.\)]\s+/.test(el.text);
        const widthPx = getContentWidthPx(layout);
        const totalLines = estimateParagraphLines(el.text, widthPx, layout, isList);

        if (linesFit >= 1 && totalLines > linesFit) {
          const { part1, part2 } = splitParagraphText(el.text, linesFit, widthPx, layout, isList);
          if (part1.trim() && part2.trim()) {
            currentPage.push({ ...el, text: part1 });
            pages.push(currentPage);
            currentPage = [];
            currentHeight = 0;
            subElements.splice(elIdx + 1, 0, { ...el, text: part2, noIndent: true, isListContinuation: isList });
            elIdx++;
            continue;
          }
        }
      }

      if (currentHeight + totalH > maxPageHeight && currentPage.length > 0) {
        if (el.type === 'paragraph' && el.blockId !== inlineEditingBlockId) {
          const availableHeight = maxPageHeight - currentHeight;
          const lineGapPx = getLineHeightPx(layout);
          const linesFit = Math.floor((availableHeight - 8) / lineGapPx);
          const isList = /^[0-9a-zA-Z]+[\.\)]\s+/.test(el.text);
          const widthPx = getContentWidthPx(layout);
          const totalLines = estimateParagraphLines(el.text, widthPx, layout, isList);

          if (linesFit >= 1 && totalLines > linesFit) {
            const { part1, part2 } = splitParagraphText(el.text, linesFit, widthPx, layout, isList);
            if (part1.trim() && part2.trim()) {
              currentPage.push({ ...el, text: part1 });
              pages.push(currentPage);
              currentPage = [];
              currentHeight = 0;
              subElements.splice(elIdx + 1, 0, { ...el, text: part2, noIndent: true, isListContinuation: isList });
              elIdx++;
              continue;
            }
          }
        }

        pages.push(currentPage);
        currentPage = [el];
        currentHeight = h;
      } else {
        currentPage.push(el);
        currentHeight += h;
      }

      elIdx++;
    }

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }
    if (pages.length === 0) {
      pages.push([]);
    }

    map[babKey] = pages;
  });

  return map;
};

export const paginateListEntries = (entries, layout) => {
  const pages = [];
  const contentHeightCm = PAGE_HEIGHT_CM
    - getLayoutNumber(layout.marginTop, 4)
    - getLayoutNumber(layout.marginBottom, 3);
  const isDoubleSpacing = layout.lineSpacing === '2.0';
  const lineHeightCm = isDoubleSpacing ? 0.85 : 0.65;
  const firstPageAvailableHeight = contentHeightCm - 2.2;
  const nextPageAvailableHeight = contentHeightCm;
  let currentPage = [];
  let currentHeight = 0;
  let isFirstPage = true;

  entries.forEach((entry) => {
    let lines = 1;
    const titleLen = (entry.title || '').length;
    const printableWidthCm = PAGE_WIDTH_CM
      - getLayoutNumber(layout.marginLeft, 4)
      - getLayoutNumber(layout.marginRight, 3);
    const charsPerLine = Math.max(30, Math.floor(printableWidthCm / 0.18));
    if (titleLen > charsPerLine) lines = Math.ceil(titleLen / charsPerLine);

    const entryHeight = (lines * lineHeightCm) + 0.21;
    const maxHeight = isFirstPage ? firstPageAvailableHeight : nextPageAvailableHeight;
    if (currentHeight + entryHeight > maxHeight && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [entry];
      currentHeight = entryHeight;
      isFirstPage = false;
    } else {
      currentPage.push(entry);
      currentHeight += entryHeight;
    }
  });

  if (currentPage.length > 0) pages.push(currentPage);
  if (pages.length === 0) pages.push([]);
  return pages;
};
