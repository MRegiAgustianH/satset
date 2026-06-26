export const repeatPageIds = (prefix, count) => (
  Array.from({ length: Math.max(0, count) }, (_, index) => `${prefix}-${index + 1}`)
);

export const computeVisiblePageIds = ({
  layout = {},
  references = [],
  babSections = {},
  babPagesMap = {},
  renderableBabKeys = [],
  tocPageCount = 0,
  tableListPageCount = 0,
  figureListPageCount = 0,
  equationListPageCount = 0,
  referencesPageCount = 0,
}) => {
  const blank = !!layout.blankMode;
  const pages = ['cover'];

  if (layout.showPersetujuan) pages.push('persetujuan');
  if (layout.showPengesahan) pages.push('pengesahan');
  if (layout.showPernyataan) pages.push('pernyataan');
  if (layout.showAbstractIndo) pages.push('abstrak-indo');
  if (layout.showAbstractEng) pages.push('abstrak-eng');

  if (!blank) {
    pages.push(...repeatPageIds('daftar-isi', tocPageCount));
    pages.push(...repeatPageIds('daftar-tabel', tableListPageCount));
    pages.push(...repeatPageIds('daftar-gambar', figureListPageCount));
    if (layout.showDaftarRumus) {
      pages.push(...repeatPageIds('daftar-rumus', equationListPageCount));
    }
  }

  const skipEmptyBab = blank || !!layout.hideEmptyChapters;
  renderableBabKeys.forEach((babKey) => {
    if (skipEmptyBab && (!babSections[babKey] || babSections[babKey].length === 0)) return;
    const pageCount = babPagesMap[babKey] ? babPagesMap[babKey].length : 1;
    pages.push(...repeatPageIds(babKey, pageCount));
  });

  if (!blank || (references && references.length > 0)) {
    pages.push(...repeatPageIds('daftar-pustaka', referencesPageCount));
  }

  return pages;
};
