import React from 'react';
import {
  ArrowLeft,
  Clock,
  FileText,
  FolderOpen,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';

export default function DraftManager({
  show,
  draftsList,
  loadingDrafts,
  draftSearch,
  saveFilename,
  onClose,
  onSearchChange,
  onRefresh,
  onImportDocx,
  onOpenNewDraftChooser,
  onLoadDraft,
  onDeleteDraft,
}) {
  if (!show) return null;

  const activeSlug = (saveFilename || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  const filteredDrafts = draftsList.filter((item) => (
    !draftSearch.trim() ||
    (item.title || '').toLowerCase().includes(draftSearch.toLowerCase()) ||
    (item.author || '').toLowerCase().includes(draftSearch.toLowerCase())
  ));

  const loadAndClose = (item) => {
    onLoadDraft(item);
    onClose();
  };

  const importAndClose = (event) => {
    onClose();
    onImportDocx(event);
  };

  return (
    <div className="fixed inset-0 z-[55] bg-slate-950 text-slate-100 flex flex-col no-print animate-in fade-in duration-150">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300"
            title="Kembali ke editor"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
              <FolderOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-base tracking-tight">Draft Manager</h2>
              <p className="text-[11px] text-slate-400">{draftsList.length} dokumen tersimpan</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={draftSearch}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Cari draft..."
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs w-56 focus:outline-none focus:border-indigo-500/60"
            />
          </div>
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300"
            title="Muat ulang"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4" />
            Impor Word
            <input type="file" accept=".docx,.doc" className="hidden" onChange={importAndClose} />
          </label>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loadingDrafts ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <span className="text-sm">Memuat daftar draft...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <button
              onClick={onOpenNewDraftChooser}
              className="group bg-slate-900/40 border-2 border-dashed border-slate-700 hover:border-indigo-500/70 rounded-xl p-4 cursor-pointer transition-all flex flex-col items-center justify-center gap-2 min-h-[170px] text-slate-400 hover:text-indigo-300"
            >
              <div className="p-3 bg-slate-800/60 group-hover:bg-indigo-500/15 rounded-full transition-colors">
                <Plus className="h-7 w-7" />
              </div>
              <span className="text-xs font-bold">Draft Baru</span>
              <span className="text-[9px] text-slate-500">Kosong, outline, atau template</span>
            </button>

            {filteredDrafts.map((item) => {
              const isActive = item.slug && item.slug === activeSlug && saveFilename !== 'Draft_Skripsi';

              return (
                <div
                  key={item.key}
                  onClick={() => loadAndClose(item)}
                  className={`group relative bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all hover:shadow-[0_0_18px_-4px_rgba(99,102,241,0.35)] flex flex-col gap-3 ${isActive ? 'border-emerald-500 ring-1 ring-emerald-500/50' : 'border-slate-800 hover:border-indigo-500/70'}`}
                >
                  {isActive && (
                    <span className="absolute -top-2 left-3 bg-emerald-500 text-emerald-950 text-[8px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shadow">
                      Sedang Dibuka
                    </span>
                  )}
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl transition-colors ${isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20'}`}>
                      <FileText className="h-7 w-7" />
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${item.source === 'database' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                      {item.source}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-xs text-slate-100 truncate" title={item.title}>{item.title || '(Tanpa Judul)'}</h3>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.author || 'Tanpa penulis'}</p>
                    {item.slug && (
                      <p className="text-[9px] text-indigo-400 font-mono truncate mt-0.5" title={`slug / nama file: ${item.slug}`}>
                        {item.slug}
                      </p>
                    )}
                    <p className="text-[9px] text-slate-500 flex items-center gap-1 mt-1.5">
                      <Clock className="h-2.5 w-2.5" />
                      {item.updated_at}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/70">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        loadAndClose(item);
                      }}
                      className="flex-1 bg-indigo-600/15 hover:bg-indigo-600/30 text-indigo-300 py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1"
                    >
                      <FolderOpen className="h-3 w-3" /> Buka
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        onDeleteDraft(event, item);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition-colors"
                      title="Hapus draft"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredDrafts.length === 0 && draftSearch.trim() && (
              <div className="col-span-full text-center py-12 text-slate-500 italic text-sm">
                Tidak ada draft yang cocok dengan "{draftSearch}".
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
