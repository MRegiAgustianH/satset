import React from 'react';
import { Compass } from 'lucide-react';

function getPageTitle(pageId) {
  let pageTitle = pageId.replace('-', ' ').toUpperCase();

  if (pageId === 'cover') pageTitle = 'SAMPUL / COVER';
  else if (pageId.startsWith('daftar-isi')) {
    const pageNumPart = pageId.split('-')[2] || '1';
    pageTitle = `DAFTAR ISI (Bagian ${pageNumPart})`;
  } else if (pageId.startsWith('daftar-tabel')) {
    const part = pageId.split('-')[2] || '1';
    pageTitle = `DAFTAR TABEL (Bagian ${part})`;
  } else if (pageId.startsWith('daftar-gambar')) {
    const part = pageId.split('-')[2] || '1';
    pageTitle = `DAFTAR GAMBAR (Bagian ${part})`;
  } else if (pageId.startsWith('daftar-rumus')) {
    const part = pageId.split('-')[2] || '1';
    pageTitle = `DAFTAR RUMUS (Bagian ${part})`;
  } else if (pageId.startsWith('bab')) {
    const parts = pageId.split('-');
    const babNum = parts[0].replace('bab', '');
    const pagePart = parts[1];
    pageTitle = `BAB ${babNum.toUpperCase()} - Halaman ${pagePart}`;
  }

  return pageTitle;
}

function scrollToElement(id) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  return Boolean(element);
}

export default function NavigationPanel({
  show,
  activeNavTab,
  visiblePages,
  tocEntries,
  getPageNumber,
  formatTocTitle,
  onActiveNavTabChange,
  onNavigatePage,
  onNavigateHeading,
}) {
  if (!show) return null;

  return (
    <div className="space-y-4">
      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
        <h3 className="font-bold text-slate-400 uppercase text-[10px] mb-2 flex items-center gap-1.5">
          <Compass className="h-3.5 w-3.5 text-teal-700 dark:text-teal-200" />
          Navigasi Dokumen
        </h3>

        <div className="flex bg-slate-100 dark:bg-slate-950 p-1 gap-1 rounded-lg text-[10px] font-bold">
          <button
            onClick={() => onActiveNavTabChange('pages')}
            className={`flex-1 py-1.5 rounded-md text-center transition-all ${activeNavTab === 'pages' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-200 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Halaman
          </button>
          <button
            onClick={() => onActiveNavTabChange('headings')}
            className={`flex-1 py-1.5 rounded-md text-center transition-all ${activeNavTab === 'headings' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-200 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Daftar Bab & Judul
          </button>
        </div>
      </div>

      {activeNavTab === 'pages' && (
        <div className="space-y-1.5 max-h-[55vh] overflow-y-auto pr-1">
          {visiblePages.map((pageId, index) => {
            const pageNum = getPageNumber(pageId);

            return (
              <button
                key={pageId}
                onClick={() => {
                  if (onNavigatePage?.(pageId)) return;
                  scrollToElement(`page-${pageId}`);
                }}
                className="w-full text-left p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-teal-500 hover:bg-teal-50/10 transition-all flex justify-between items-center text-[11px]"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-350 truncate">
                  {index + 1}. {getPageTitle(pageId)}
                </span>
                {pageNum && (
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[9px] font-bold">
                    Hal. {pageNum}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {activeNavTab === 'headings' && (
        <div className="p-2 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 max-h-[55vh] overflow-y-auto pr-1">
          {tocEntries.map((entry, index) => {
            const pageNum = getPageNumber(entry.pageId);
            const isChapter = entry.isChapter || entry.isBold;
            const indentStyle = entry.indent ? { paddingLeft: `${parseFloat(entry.indent) * 0.8}cm` } : {};

            return (
              <button
                key={index}
                onClick={() => {
                  if (onNavigateHeading?.(entry)) return;
                  const headingId = `heading-${entry.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                  if (!scrollToElement(headingId)) {
                    scrollToElement(`page-${entry.pageId}`);
                  }
                }}
                style={indentStyle}
                className={`w-full text-left p-1 rounded hover:bg-teal-500/10 hover:text-teal-600 dark:text-teal-300 transition-colors flex justify-between items-baseline text-[11px] ${isChapter ? 'font-bold text-slate-800 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}
              >
                <span className="truncate flex-1 mr-2" dangerouslySetInnerHTML={{ __html: formatTocTitle(entry.title) }} />
                {pageNum && (
                  <span className="text-[9px] text-slate-400 font-mono">
                    ({pageNum})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}


