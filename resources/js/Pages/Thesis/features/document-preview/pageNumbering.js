import { convertToRoman } from './numbering';

export const getPageNumberForPageId = ({ pageId, visiblePages, romanPrelims = true }) => {
  const idx = visiblePages.indexOf(pageId);
  if (idx === -1 || pageId === 'cover') return '';

  const firstMainPageIndex = visiblePages.findIndex((id) => /^bab\d+-1$/.test(id));
  const mainStartIndex = firstMainPageIndex !== -1
    ? firstMainPageIndex
    : visiblePages.findIndex((id) => /^bab\d+-\d+$/.test(id) || id.startsWith('daftar-pustaka-'));

  if (mainStartIndex === -1) {
    // 1-based index for prelims (cover is index 0 and has no number)
    return romanPrelims ? convertToRoman(idx).toLowerCase() : String(idx);
  }

  if (idx < mainStartIndex) {
    return romanPrelims ? convertToRoman(idx).toLowerCase() : String(idx);
  }

  return String(idx - mainStartIndex + 1);
};

export const isChapterStartPage = (pageId, renderableBabKeys = []) => {
  const preliminaryPrefixes = [
    'persetujuan',
    'pengesahan',
    'pernyataan',
    'abstrak-',
    'daftar-isi-',
    'daftar-tabel',
    'daftar-gambar',
    'daftar-rumus',
  ];

  if (preliminaryPrefixes.some((prefix) => pageId === prefix || pageId.startsWith(prefix))) {
    return true;
  }

  const chapterStartPages = [
    'bab1-1',
    'bab2-1',
    'bab3-1',
    'bab4-1',
    'bab5-1',
    ...(renderableBabKeys.includes('bab6') ? ['bab6-1'] : []),
    'daftar-pustaka-1',
  ];

  return chapterStartPages.includes(pageId);
};

export const getPageNumberClassName = ({ pageId, pageNumPosition = 'flexible', renderableBabKeys = [] }) => {
  const base = 'page-number text-xs text-slate-800';

  if (pageNumPosition === 'flexible') {
    return isChapterStartPage(pageId, renderableBabKeys)
      ? `absolute bottom-[1.5cm] left-1/2 -translate-x-1/2 ${base}`
      : `absolute top-[1.5cm] right-[var(--doc-margin-right)] ${base}`;
  }

  if (pageNumPosition === 'bottom-right') return `absolute bottom-[1.5cm] right-[var(--doc-margin-right)] ${base}`;
  if (pageNumPosition === 'top-right') return `absolute top-[1.5cm] right-[var(--doc-margin-right)] ${base}`;
  return `absolute bottom-[1.5cm] left-1/2 -translate-x-1/2 ${base}`;
};

export const getPageNumberStyle = ({ pageId, pageNumPosition = 'flexible', renderableBabKeys = [], layout = {} }) => {
  const marginRight = layout.marginRight || 3;
  const style = {
    position: 'absolute',
    fontFamily: layout.fontFamily || "'Times New Roman', Times, serif",
    fontSize: layout.fontSize || '12pt',
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#000000',
    zIndex: 60,
    pointerEvents: 'none',
    lineHeight: '1',
  };

  const isStart = isChapterStartPage(pageId, renderableBabKeys);

  if (pageNumPosition === 'flexible') {
    if (isStart) {
      style.bottom = '1.5cm';
      style.left = '50%';
      style.transform = 'translateX(-50%)';
    } else {
      style.top = '1.5cm';
      style.right = `${marginRight}cm`;
    }
    return style;
  }

  if (pageNumPosition === 'bottom-right') {
    style.bottom = '1.5cm';
    style.right = `${marginRight}cm`;
  } else if (pageNumPosition === 'top-right') {
    style.top = '1.5cm';
    style.right = `${marginRight}cm`;
  } else {
    // bottom-center
    style.bottom = '1.5cm';
    style.left = '50%';
    style.transform = 'translateX(-50%)';
  }

  return style;
};
