import React from 'react';
import { FileText, FolderOpen, Printer, Save } from 'lucide-react';

export default function SidebarFooter({
  saveFilename,
  autosaveEnabled,
  onSaveFilenameChange,
  onSaveDraft,
  onOpenDraftManager,
  onPrint,
  onImportDocx,
}) {
  const isUnsaved = !saveFilename || saveFilename === 'Draft_Skripsi';

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
