import React from 'react';
import { FileText, FolderOpen, Printer, Save } from 'lucide-react';

export default function SidebarFooter({
  saveFilename,
  activeDraftSlug,
  targetDraftSlug,
  saveStatus,
  autosaveEnabled,
  onSaveFilenameChange,
  onSaveDraft,
  onOpenDraftManager,
  onPrint,
  onImportDocx,
}) {
  const isUnsaved = !saveFilename || saveFilename === 'Draft_Skripsi';
  const formatBytes = (bytes) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };
  const statusTone = saveStatus?.state === 'error'
    ? 'text-red-600 dark:text-red-400'
    : saveStatus?.state === 'saving'
      ? 'text-teal-700 dark:text-teal-200'
      : saveStatus?.state === 'saved'
        ? 'text-emerald-700 dark:text-emerald-300'
        : 'text-slate-600 dark:text-slate-400';

  return (
    <div className="border-t border-stone-200 bg-stone-50/95 p-2.5 text-[10px] dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mb-2 flex items-center gap-2 overflow-hidden rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-950">
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-300" />
        <span className="min-w-0 flex-1 truncate font-semibold text-slate-800 dark:text-slate-200" title={saveFilename}>
          {isUnsaved ? 'Draft baru' : saveFilename}
        </span>
        <span className="shrink-0 rounded bg-emerald-50 px-1.5 py-0.5 font-black uppercase text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          {isUnsaved ? 'Manual' : (autosaveEnabled ? 'Autosave' : 'Manual')}
        </span>
      </div>

      <div className="mb-2 grid grid-cols-[1fr_auto_auto] gap-1.5">
        <input
          type="text"
          value={saveFilename}
          onChange={(event) => onSaveFilenameChange(event.target.value)}
          placeholder="Nama draft..."
          className="min-w-0 rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          onClick={onSaveDraft}
          title="Simpan draft"
          className="rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 font-bold text-teal-800 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-900"
        >
          <Save className="h-4 w-4" />
        </button>
        <label
          title="Import DOCX (Word)"
          className="cursor-pointer rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 font-bold text-teal-800 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-100 dark:hover:bg-teal-900"
        >
          <FileText className="h-4 w-4" />
          <input type="file" accept=".docx,.doc" className="hidden" onChange={onImportDocx} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={onOpenDraftManager} className="flex items-center justify-center gap-1 rounded-lg border border-stone-300 bg-white py-1.5 font-bold text-slate-700 hover:bg-stone-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
          <FolderOpen className="h-3.5 w-3.5" />
          Drafts
        </button>
        <button onClick={onPrint} className="flex items-center justify-center gap-1 rounded-lg bg-teal-700 py-1.5 font-bold text-white shadow-sm shadow-teal-700/10 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500">
          <Printer className="h-3.5 w-3.5" />
          Unduh
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-stone-200 pt-1.5 dark:border-slate-800">
        <span className={`min-w-0 flex-1 truncate font-semibold ${statusTone}`} title={saveStatus?.message || 'Belum disimpan ke server'}>
          {saveStatus?.message || 'Belum disimpan'}
        </span>
        <span className="shrink-0 font-mono text-slate-600 dark:text-slate-400" title={`Aktif: ${activeDraftSlug || '-'} | Target: ${targetDraftSlug}`}>
          {targetDraftSlug || '-'}{saveStatus?.bytes > 0 ? ` · ${formatBytes(saveStatus.bytes)}` : ''}
        </span>
      </div>
      {saveStatus?.progress != null && (
        <div className="mt-1 h-1 rounded-full bg-slate-100 dark:bg-slate-850">
          <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${saveStatus.progress}%` }} />
        </div>
      )}
    </div>
  );
}
