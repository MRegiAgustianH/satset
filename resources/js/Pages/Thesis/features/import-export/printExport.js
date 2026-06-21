export const getPagePrintClass = (pagesToPrint, pageId) => {
  if (pagesToPrint && !pagesToPrint.includes(pageId)) {
    return 'no-print-custom';
  }
  return '';
};

export const DEFAULT_EXPORT_SECTION_IDS = [
  'cover', 'persetujuan', 'pengesahan', 'pernyataan',
  'abstrak-indo', 'abstrak-eng',
  'daftar-isi', 'daftar-tabel', 'daftar-gambar', 'daftar-rumus',
  'bab1', 'bab2', 'bab3', 'bab4', 'bab5', 'bab6',
  'daftar-pustaka',
];

export const getSectionsToExport = (downloadRange, selectedSections) => (
  downloadRange === 'all' ? DEFAULT_EXPORT_SECTION_IDS : selectedSections
);

export const resolveSelectedPageIds = (getVisiblePages, sectionsToExport) => {
  const allVisiblePages = getVisiblePages();
  return allVisiblePages.filter(pageId => {
    if (pageId === 'cover') return sectionsToExport.includes('cover');
    if (pageId === 'persetujuan') return sectionsToExport.includes('persetujuan');
    if (pageId === 'pengesahan') return sectionsToExport.includes('pengesahan');
    if (pageId === 'pernyataan') return sectionsToExport.includes('pernyataan');
    if (pageId === 'abstrak-indo') return sectionsToExport.includes('abstrak-indo');
    if (pageId === 'abstrak-eng') return sectionsToExport.includes('abstrak-eng');
    if (pageId.startsWith('daftar-isi-')) return sectionsToExport.includes('daftar-isi');
    if (pageId.startsWith('daftar-tabel')) return sectionsToExport.includes('daftar-tabel');
    if (pageId.startsWith('daftar-gambar')) return sectionsToExport.includes('daftar-gambar');
    if (pageId.startsWith('daftar-rumus')) return sectionsToExport.includes('daftar-rumus');
    if (pageId.startsWith('bab1-')) return sectionsToExport.includes('bab1');
    if (pageId.startsWith('bab2-')) return sectionsToExport.includes('bab2');
    if (pageId.startsWith('bab3-')) return sectionsToExport.includes('bab3');
    if (pageId.startsWith('bab4-')) return sectionsToExport.includes('bab4');
    if (pageId.startsWith('bab5-')) return sectionsToExport.includes('bab5');
    if (pageId.startsWith('bab6-')) return sectionsToExport.includes('bab6');
    if (pageId.startsWith('daftar-pustaka-')) return sectionsToExport.includes('daftar-pustaka');
    return false;
  });
};

export const executePrintPdf = ({ pageIds, getVisiblePages, setPagesToPrint }) => {
  const allPages = getVisiblePages();
  if (pageIds.length === allPages.length) {
    window.print();
    return;
  }

  setPagesToPrint(pageIds);
  setTimeout(() => {
    window.print();
    setPagesToPrint(null);
  }, 350);
};

export const executeSplitPrintPdf = ({ sectionsToExport, getVisiblePages, setPagesToPrint, resolveSelectedPageIdsFn = resolveSelectedPageIds }) => {
  let delay = 0;

  sectionsToExport.forEach((sectionId) => {
    const sectionPages = resolveSelectedPageIdsFn(getVisiblePages, [sectionId]);
    if (!sectionPages.length) return;

    setTimeout(() => {
      setPagesToPrint(sectionPages);
      setTimeout(() => window.print(), 350);
    }, delay);

    delay += 1500;
  });

  setTimeout(() => {
    setPagesToPrint(null);
  }, delay + 600);
};
