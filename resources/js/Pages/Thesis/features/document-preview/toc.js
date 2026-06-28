import { resolveBlockNumberingForBab } from './layout';

const getTocIndentForHeadingLevel = (headingLevel) => {
  if (headingLevel === 3) return '1.25cm';
  if (headingLevel === 4) return '1.75cm';
  if (headingLevel === 5) return '2.25cm';
  if (headingLevel === 6) return '2.75cm';
  return '0.75cm';
};

const getBlockPageIndex = (babPagesMap, babKey, blockId) => {
  const pages = babPagesMap[babKey] || [];
  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    if (pages[pageIndex].some((element) => element.blockId === blockId)) {
      return pageIndex + 1;
    }
  }
  return 1;
};

export const buildTocEntries = ({
  layout = {},
  babSections = {},
  babTitles = {},
  babPagesMap = {},
  renderableBabKeys = [],
  scanTextForHeadings = () => [],
}) => {
  const entries = [];

  if (layout.showPersetujuan) entries.push({ title: 'HALAMAN PERSETUJUAN', pageId: 'persetujuan', isBold: true });
  if (layout.showPengesahan) entries.push({ title: 'HALAMAN PENGESAHAN', pageId: 'pengesahan', isBold: true });
  if (layout.showPernyataan) entries.push({ title: 'LEMBAR PERNYATAAN KEASLIAN', pageId: 'pernyataan', isBold: true });
  if (layout.showAbstractIndo) entries.push({ title: 'ABSTRAK', pageId: 'abstrak-indo', isBold: true });
  if (layout.showAbstractEng) entries.push({ title: 'ABSTRACT', pageId: 'abstrak-eng', isBold: true });

  entries.push({ title: 'DAFTAR ISI', pageId: 'daftar-isi-1', isBold: true });
  entries.push({ title: 'DAFTAR TABEL', pageId: 'daftar-tabel-1', isBold: true });
  entries.push({ title: 'DAFTAR GAMBAR', pageId: 'daftar-gambar-1', isBold: true });
  if (layout.showDaftarRumus) entries.push({ title: 'DAFTAR RUMUS', pageId: 'daftar-rumus-1', isBold: true });

  const addChapterTocEntries = (babKey) => {
    const rawSections = babSections[babKey] || [];
    const sections = resolveBlockNumberingForBab(babKey, rawSections);
    sections.forEach((section) => {
      const dynamicPageIdx = getBlockPageIndex(babPagesMap, babKey, section.id);
      if (section.headingLevel > 0) {
        entries.push({
          title: `${section.resolvedPrefix || ''}${section.title}`,
          pageId: `${babKey}-${dynamicPageIdx}`,
          babKey,
          blockId: section.id,
          indent: getTocIndentForHeadingLevel(section.headingLevel),
          isBold: section.headingLevel === 2,
        });
      }
      entries.push(...scanTextForHeadings(section.content, `${babKey}-${dynamicPageIdx}`));
    });
  };

  renderableBabKeys.forEach((babKey) => {
    const title = babTitles[babKey];
    if (!title) return;
    entries.push({ title: `${title.prefix} ${title.title}`, pageId: `${babKey}-1`, isBold: true, isChapter: true });
    addChapterTocEntries(babKey);
  });

  entries.push({ title: 'DAFTAR PUSTAKA', pageId: 'daftar-pustaka-1', isBold: true, isChapter: true });
  return entries;
};

export const paginateTocEntries = ({ entries = [], layout = {} }) => {
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

  entries.forEach((entry) => {
    const indentCm = entry.indent ? parseFloat(entry.indent) : 0;
    const printableWidthCm = 21.0 - marginLeft - marginRight - indentCm;
    const charsPerLine = Math.max(30, Math.floor(printableWidthCm / 0.18));
    const lines = entry.title.length > charsPerLine ? Math.ceil(entry.title.length / charsPerLine) : 1;
    let entryHeight = (lines * lineHeightCm) + 0.21;
    if (entry.isChapter) entryHeight += 0.32;

    const maxHeight = isFirstPage ? firstPageAvailableHeight : nextPageAvailableHeight;
    if (currentHeight + entryHeight > maxHeight && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [entry];
      currentHeight = entryHeight;
      isFirstPage = false;
      return;
    }

    currentPage.push(entry);
    currentHeight += entryHeight;
  });

  if (currentPage.length > 0) pages.push(currentPage);
  return pages;
};

