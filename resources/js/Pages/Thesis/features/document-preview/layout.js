import { splitParagraphText } from '../../utils/documentText';
import {
  estimateParagraphHeight,
  estimateParagraphLines,
  getContentWidthPx,
  getFontSizePx,
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
const PAGE_BOTTOM_SAFETY_PX = 10;

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

const getCellText = (cell) => {
  if (cell == null) return '';
  if (typeof cell === 'object') return String(cell.text ?? cell.value ?? '');
  return String(cell);
};

const estimateTableRowHeight = (cells, layout, widthPx, columnCount) => {
  const safeColumnCount = Math.max(1, columnCount || cells.length || 1);
  const cellWidthPx = Math.max(36, (widthPx / safeColumnCount) + 10);
  const lineHeightPx = Math.max(10, getFontSizePx(layout.fontSize || '12pt') * getLayoutNumber(layout.tableLineSpacing, 1) * 0.78);
  const maxLines = Math.max(
    1,
    ...cells.map((cell) => estimateParagraphLines(getCellText(cell), cellWidthPx, layout, true))
  );
  return (maxLines * lineHeightPx) + 8;
};

const estimateTableHeight = (el, layout) => {
  const widthPx = getContentWidthPx(layout);
  const headers = Array.isArray(el.headers) ? el.headers : String(el.headers || '').split(',').map(text => text.trim()).filter(Boolean);
  const rows = Array.isArray(el.rows) ? el.rows : [];
  const columnCount = Math.max(headers.length, ...rows.map(row => Array.isArray(row) ? row.length : 1), 1);
  const captionHeight = 20;
  const headerHeight = estimateTableRowHeight(headers, layout, widthPx, columnCount);
  const bodyHeight = rows.reduce((total, row) => total + estimateTableRowHeight(Array.isArray(row) ? row : [row], layout, widthPx, columnCount), 0);
  return captionHeight + headerHeight + bodyHeight + 12;
};

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
    const isList = /^(?:\d+|[a-zA-Z])[\.\)]\s+/.test(el.text);
    return estimateParagraphHeight(el.text, widthPx, layout, isList);
  }

  if (el.type === 'table') {
    return estimateTableHeight(el, layout);
  }

  if (el.type === 'figure') {
    return 18 + getFigureHeightPx(el, layout) + 30 + 64;
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
              firstLineIndentCm: section.paragraphIndents?.[paragraphIndex]?.firstLineIndentCm ?? section.firstLineIndentCm ?? null,
              leftIndentCm: section.paragraphIndents?.[paragraphIndex]?.leftIndentCm ?? section.leftIndentCm ?? null,
              rightIndentCm: section.paragraphIndents?.[paragraphIndex]?.rightIndentCm ?? section.rightIndentCm ?? null,
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
  ) * CM_TO_PX - PAGE_BOTTOM_SAFETY_PX;

  ['bab1', 'bab2', 'bab3', 'bab4', 'bab5', 'bab6'].forEach((babKey) => {
    const subElements = buildBabSubElements(babKey, sections[babKey] || []);
    const pages = [];
    let currentPage = [];
    const firstPageTopReserve = 80;
    let currentHeight = firstPageTopReserve;
    let elIdx = 0;

    const resetPageHeight = () => {
      currentHeight = pages.length === 0 ? firstPageTopReserve : 0;
    };

    while (elIdx < subElements.length) {
      const el = subElements[elIdx];

      if (el.type === 'pagebreak') {
        if (currentPage.length > 0) {
          pages.push(currentPage);
          currentPage = [];
          resetPageHeight();
        }
        elIdx++;
        continue;
      }

      const h = estimateElementHeight(el, layout);

      if ((el.type === 'figure' || el.type === 'equation') && currentHeight + h > maxPageHeight && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        resetPageHeight();
        continue;
      }

      if (el.type === 'table') {
        const isFirstPageOfTable = !el.isContinuation;
        const headers = Array.isArray(el.headers) ? el.headers : String(el.headers || '').split(',').map(text => text.trim()).filter(Boolean);
        const rows = Array.isArray(el.rows) ? el.rows : [];
        const columnCount = Math.max(headers.length, ...rows.map(row => Array.isArray(row) ? row.length : 1), 1);
        const widthPx = getContentWidthPx(layout);
        const captionHeight = isFirstPageOfTable ? 20 : 0;
        const headerHeight = estimateTableRowHeight(headers, layout, widthPx, columnCount);
        const rowHeights = rows.map(row => estimateTableRowHeight(Array.isArray(row) ? row : [row], layout, widthPx, columnCount));
        const tableTailHeight = el.isContinuation ? 6 : 12;
        const hFresh = captionHeight + headerHeight + rowHeights.reduce((sum, rowHeight) => sum + rowHeight, 0) + tableTailHeight;

        if (currentHeight + h > maxPageHeight) {
          if (hFresh <= maxPageHeight && currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            resetPageHeight();
            continue;
          }

          const availableHeight = maxPageHeight - currentHeight;
          const minH = captionHeight + headerHeight + Math.min(...rowHeights, 24) + tableTailHeight;

          if (availableHeight >= minH) {
            let usedHeight = captionHeight + headerHeight + tableTailHeight;
            let rowsFit = 0;
            for (let rowIndex = 0; rowIndex < rowHeights.length; rowIndex++) {
              if (usedHeight + rowHeights[rowIndex] > availableHeight) break;
              usedHeight += rowHeights[rowIndex];
              rowsFit++;
            }
            rowsFit = Math.max(1, rowsFit);

            if (rowsFit < rows.length) {
              const elPart1 = { ...el, rows: rows.slice(0, rowsFit) };
              const continuationTitle = el.title.endsWith(' (Lanjutan)') ? el.title : `${el.title} (Lanjutan)`;
              const elPart2 = {
                ...el,
                title: continuationTitle,
                rows: rows.slice(rowsFit),
                isContinuation: true,
              };

              currentPage.push(elPart1);
              pages.push(currentPage);
              currentPage = [];
              resetPageHeight();
              subElements.splice(elIdx + 1, 0, elPart2);
              elIdx++;
              continue;
            }
          } else if (currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            resetPageHeight();
            continue;
          }
        }
      }

      let totalH = h;
      if (el.type === 'heading' && subElements[elIdx + 1]) {
        totalH += estimateElementHeight(subElements[elIdx + 1], layout);
      }

      if (
        el.type === 'paragraph' &&
        currentPage.length > 0 &&
        (currentPage[currentPage.length - 1]?.type === 'table' || currentPage[currentPage.length - 1]?.type === 'figure') &&
        currentHeight + totalH > maxPageHeight - 36
      ) {
        pages.push(currentPage);
        currentPage = [];
        resetPageHeight();
        continue;
      }

      if (el.type === 'paragraph' && el.blockId !== inlineEditingBlockId && currentHeight + h > maxPageHeight) {
        const availableHeight = maxPageHeight - currentHeight;
        const lineGapPx = getLineHeightPx(layout);
        const linesFit = Math.floor((availableHeight - 8) / lineGapPx);
        const isList = /^(?:\d+|[a-zA-Z])[\.\)]\s+/.test(el.text);
        const widthPx = getContentWidthPx(layout);
        const totalLines = estimateParagraphLines(el.text, widthPx, layout, isList);

        if (linesFit >= 1 && totalLines > linesFit) {
          const { part1, part2 } = splitParagraphText(el.text, linesFit, widthPx, layout, isList);
          if (part1.trim() && part2.trim()) {
            currentPage.push({ ...el, text: part1 });
            pages.push(currentPage);
            currentPage = [];
            resetPageHeight();
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
          const isList = /^(?:\d+|[a-zA-Z])[\.\)]\s+/.test(el.text);
          const widthPx = getContentWidthPx(layout);
          const totalLines = estimateParagraphLines(el.text, widthPx, layout, isList);

          if (linesFit >= 1 && totalLines > linesFit) {
            const { part1, part2 } = splitParagraphText(el.text, linesFit, widthPx, layout, isList);
            if (part1.trim() && part2.trim()) {
              currentPage.push({ ...el, text: part1 });
              pages.push(currentPage);
              currentPage = [];
              resetPageHeight();
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

