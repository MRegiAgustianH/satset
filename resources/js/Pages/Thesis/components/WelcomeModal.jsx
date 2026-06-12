import React from 'react';
import {
  Database,
  FileText,
  FolderOpen,
  GraduationCap,
  Loader2,
  ListChecks,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';

export default function WelcomeModal({
  show,
  hasLocalDraft,
  loadingDrafts,
  draftsList,
  onClose,
  onCreateTemplate,
  onCreateBlank,
  onOpenOutline,
  onImportDocx,
  onLoadDraft,
  onDeleteDraft,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-50 no-print text-slate-100 p-4">
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl w-[680px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-8 border-b border-slate-800/60 text-center relative bg-gradient-to-b from-indigo-500/10 to-transparent">
          <div className="inline-flex p-3 bg-indigo-500/10 rounded-2xl mb-3 text-indigo-400 border border-indigo-500/20">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">SatSet Thesis Builder v2.0</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            Platform penataan format tugas akhir dan skripsi otomatis berbasis standar akademik nasional Indonesia.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              onClick={onCreateTemplate}
              className="group relative p-5 bg-slate-950 border border-slate-850 hover:border-indigo-500/80 rounded-xl cursor-pointer transition-all flex flex-col justify-between hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-50 group-hover:text-white transition-all">
                    <Plus className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-xs text-slate-200 group-hover:text-indigo-400 transition-colors">Template Skripsi Standar</h3>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Mulai dengan struktur lengkap BAB I-V beserta sub-bab standar (Latar Belakang, Rumusan Masalah, dll.) sesuai format akademik nasional.
                </p>
              </div>
              <div className="mt-4 text-[9px] font-bold text-indigo-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Gunakan Template →
              </div>
            </div>

            <div
              onClick={onCreateBlank}
              className="group relative p-5 bg-slate-950 border border-slate-850 hover:border-indigo-500/80 rounded-xl cursor-pointer transition-all flex flex-col justify-between hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-500/10 rounded-lg text-slate-300 group-hover:bg-slate-50 group-hover:text-slate-900 transition-all">
                    <FileText className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-xs text-slate-200 group-hover:text-indigo-400 transition-colors">Dokumen Kosong</h3>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Satu halaman kosong tanpa outline, daftar isi, atau struktur BAB apa pun. Cocok untuk menulis bebas dari nol.
                </p>
              </div>
              <div className="mt-4 text-[9px] font-bold text-indigo-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Mulai Kosong →
              </div>
            </div>

            <div
              onClick={onOpenOutline}
              className="group relative p-5 bg-slate-950 border border-slate-850 hover:border-indigo-500/80 rounded-xl cursor-pointer transition-all flex flex-col justify-between hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 group-hover:bg-amber-50 group-hover:text-amber-900 transition-all">
                    <ListChecks className="h-4 w-4" />
                  </div>
                  <h3 className="font-bold text-xs text-slate-200 group-hover:text-amber-400 transition-colors">Dengan Outline</h3>
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Tentukan sendiri struktur BAB dan sub-bab yang diinginkan, lalu sistem membuat kerangka dokumen sesuai outline Anda.
                </p>
              </div>
              <div className="mt-4 text-[9px] font-bold text-amber-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                Atur Outline →
              </div>
            </div>

            {hasLocalDraft ? (
              <div
                onClick={onClose}
                className="group relative p-5 bg-slate-950 border border-slate-850 hover:border-indigo-500/80 rounded-xl cursor-pointer transition-all flex flex-col justify-between hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-50 group-hover:text-white transition-all">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-xs text-slate-200 group-hover:text-emerald-400 transition-colors">Lanjutkan Sesi Terakhir</h3>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Lanjutkan pengerjaan dokumen dari sesi terakhir Anda yang tersimpan secara lokal di browser Anda saat ini.
                  </p>
                </div>
                <div className="mt-4 text-[9px] font-bold text-emerald-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Lanjutkan Kerja →
                </div>
              </div>
            ) : (
              <label className="group relative p-5 bg-slate-950 border border-slate-850 hover:border-indigo-500/80 rounded-xl cursor-pointer transition-all flex flex-col justify-between hover:shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-50 group-hover:text-white transition-all">
                      <FolderOpen className="h-4 w-4" />
                    </div>
                    <h3 className="font-bold text-xs text-slate-200 group-hover:text-indigo-400 transition-colors">Impor dari file Word</h3>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Unggah file dokumen Microsoft Word (.docx) Anda. Sistem akan memindai isi halaman dan memetakan struktur bab secara otomatis.
                  </p>
                </div>
                <div className="mt-4 text-[9px] font-bold text-indigo-500 flex items-center gap-1">
                  Pilih File DOCX...
                </div>
                <input type="file" accept=".docx,.doc" className="hidden" onChange={onImportDocx} />
              </label>
            )}
          </div>

          <div className="border-t border-slate-800/60 pt-5 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-xs text-slate-400 flex items-center gap-1.5">
                <Database className="h-4 w-4 text-indigo-400" />
                Buka Draft dari Database
              </h4>
              {hasLocalDraft && (
                <label className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer flex items-center gap-1">
                  <FolderOpen className="h-3 w-3" />
                  Upload DOCX
                  <input type="file" accept=".docx,.doc" className="hidden" onChange={onImportDocx} />
                </label>
              )}
            </div>

            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
              {loadingDrafts ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                  <span className="text-[10px]">Memuat daftar draft...</span>
                </div>
              ) : draftsList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 italic text-[10px] bg-slate-950/40 border border-slate-850 rounded-xl">
                  Belum ada draft tersimpan di database.
                </div>
              ) : (
                draftsList.map((item) => (
                  <div
                    key={item.key}
                    onClick={() => onLoadDraft(item)}
                    className="p-3 rounded-lg border border-slate-850 hover:border-indigo-500 bg-slate-950/40 hover:bg-slate-950 flex justify-between items-center cursor-pointer transition-all text-xs"
                  >
                    <div className="flex-1 min-w-0 pr-4">
                      <h5 className="font-bold text-[11px] truncate text-slate-200">"{item.title}"</h5>
                      <p className="text-[9px] text-slate-400 mt-0.5">Penulis: {item.author} • {item.updated_at}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${item.source === 'database' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {item.source}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDraft(e, item);
                        }}
                        className="p-1 hover:bg-slate-850 text-slate-500 hover:text-red-500 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
