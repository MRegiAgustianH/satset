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
    ? 'text-red-500'
    : saveStatus?.state === 'saving'
      ? 'text-indigo-500'
      : saveStatus?.state === 'saved'
        ? 'text-emerald-500'
        : 'text-slate-400';

  return (
    <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-3">
      <div className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[10px] ${isUnsaved ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
        <span className="flex items-center gap-1.5 min-w-0">
          <FolderOpen className="h-3 w-3 shrink-0" />
          <span className="truncate font-semibold">
            {isUnsaved ? 'Draft baru (belum disimpan)' : saveFilename}
          </span>
        </span>
        <span className="shrink-0 font-bold uppercase tracking-wide">
          {isUnsaved ? 'Manual' : (autosaveEnabled ? 'Autosave' : 'Manual')}
        </span>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-2 text-[10px] space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Slug aktif</span>
          <span className="font-mono text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={activeDraftSlug || 'Belum ada slug server'}>
            {activeDraftSlug || '-'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-400">Slug target</span>
          <span className={`font-mono truncate max-w-[150px] ${activeDraftSlug && activeDraftSlug !== targetDraftSlug ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`} title={targetDraftSlug}>
            {targetDraftSlug}
          </span>
        </div>
        <div className={`flex items-center justify-between gap-2 ${statusTone}`}>
          <span className="font-semibold truncate">{saveStatus?.message || 'Belum disimpan ke server'}</span>
          {saveStatus?.bytes > 0 && (
            <span className="font-mono shrink-0">{formatBytes(saveStatus.bytes)}</span>
          )}
        </div>
        {saveStatus?.progress != null && (
          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-850 overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${saveStatus.progress}%` }} />
          </div>
        )}
        <div className="text-[9px] leading-snug text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-850 pt-1.5">
          Manual: tombol Simpan menulis ke slug target. Autosave: setelah save/load dikonfirmasi, perubahan menimpa slug aktif yang sama.
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={saveFilename}
          onChange={(event) => onSaveFilenameChange(event.target.value)}
          placeholder="Nama draft..."
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-3 py-1.5 rounded-lg text-xs"
        />
        <button onClick={onSaveDraft} className="border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 text-xs">
          <Save className="h-4 w-4 text-slate-300" />
          Simpan
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={onOpenDraftManager} className="border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5">
          <FolderOpen className="h-4 w-4" />
          Drafts
        </button>
        <button onClick={onPrint} className="bg-indigo-600 hover:bg-indigo-700 py-2 rounded-lg font-bold text-white flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10">
          <Printer className="h-4 w-4" />
          Unduh / Cetak
        </button>
      </div>

      <div>
        <label className="w-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-sm">
          <FileText className="h-4 w-4" />
          Import DOCX (Word)
          <input
            type="file"
            accept=".docx,.doc"
            className="hidden"
            onChange={onImportDocx}
          />
        </label>
      </div>
    </div>
  );
}
