import React from 'react';
import { FileText, FolderOpen, ListChecks, Plus } from 'lucide-react';

export default function NewDraftChooser({
  show,
  onClose,
  onCreateTemplate,
  onCreateBlank,
  onCreateWithOutline,
  onImportDocx,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 no-print text-slate-100 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl w-[620px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-teal-500/10 rounded-lg text-teal-600 dark:text-teal-300">
              <Plus className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-100">Buat Draft Baru</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xs">Tutup</button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={onCreateTemplate}
            className="group p-5 bg-slate-950 border border-slate-850 hover:border-teal-500/80 rounded-xl cursor-pointer transition-all flex flex-col gap-2"
          >
            <div className="p-1.5 bg-teal-500/10 rounded-lg text-teal-600 dark:text-teal-300 w-fit">
              <Plus className="h-4 w-4" />
            </div>
            <h4 className="font-bold text-xs text-slate-200 group-hover:text-teal-600 dark:text-teal-300 transition-colors">Template Skripsi Standar</h4>
            <p className="text-[10px] text-slate-400 leading-normal">Struktur lengkap BAB I-V dengan sub-bab standar sesuai format akademik.</p>
          </div>

          <div
            onClick={onCreateBlank}
            className="group p-5 bg-slate-950 border border-slate-850 hover:border-teal-500/80 rounded-xl cursor-pointer transition-all flex flex-col gap-2"
          >
            <div className="p-1.5 bg-slate-500/10 rounded-lg text-slate-300 w-fit">
              <FileText className="h-4 w-4" />
            </div>
            <h4 className="font-bold text-xs text-slate-200 group-hover:text-teal-600 dark:text-teal-300 transition-colors">Dokumen Kosong</h4>
            <p className="text-[10px] text-slate-400 leading-normal">Satu halaman kosong tanpa outline, daftar isi, atau struktur BAB.</p>
          </div>

          <div
            onClick={onCreateWithOutline}
            className="group p-5 bg-slate-950 border border-slate-850 hover:border-amber-500/80 rounded-xl cursor-pointer transition-all flex flex-col gap-2"
          >
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 w-fit">
              <ListChecks className="h-4 w-4" />
            </div>
            <h4 className="font-bold text-xs text-slate-200 group-hover:text-amber-400 transition-colors">Dengan Outline</h4>
            <p className="text-[10px] text-slate-400 leading-normal">Tentukan sendiri struktur BAB dan sub-bab yang diinginkan.</p>
          </div>
        </div>

        <div className="px-6 pb-5 -mt-2">
          <label className="text-[11px] text-teal-600 dark:text-teal-300 hover:text-teal-300 font-semibold cursor-pointer flex items-center gap-1.5 w-fit">
            <FolderOpen className="h-3.5 w-3.5" /> atau Impor dari file Word (.doc/.docx)
            <input type="file" accept=".docx,.doc" className="hidden" onChange={onImportDocx} />
          </label>
        </div>
      </div>
    </div>
  );
}

