import React from 'react';
import { Check, ListChecks } from 'lucide-react';

export default function OutlineBuilderModal({
  show,
  outlineText,
  onOutlineTextChange,
  onClose,
  onCreate,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-[60] no-print text-slate-100 p-4">
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl w-[560px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
              <ListChecks className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-100">Atur Outline Dokumen</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xs">Tutup</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Tulis kerangka dokumen Anda. <span className="text-slate-200 font-semibold">Baris tanpa indentasi</span> menjadi judul BAB,
            dan <span className="text-slate-200 font-semibold">baris yang diawali spasi atau tanda "-"</span> menjadi sub-bab di bawahnya. Maksimal 5 BAB.
          </p>
          <textarea
            value={outlineText}
            onChange={(e) => onOutlineTextChange(e.target.value)}
            rows={12}
            spellCheck={false}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-amber-500/60"
            placeholder={'BAB I PENDAHULUAN\n  Latar Belakang\n  Rumusan Masalah\nBAB II TINJAUAN PUSTAKA\n  Landasan Teori'}
          />
          <div className="text-[10px] text-slate-500 bg-slate-950/60 border border-slate-850 rounded-lg p-2.5 leading-relaxed">
            Contoh:
            <pre className="mt-1 text-slate-400 whitespace-pre-wrap">{`BAB I PENDAHULUAN
  Latar Belakang
  Rumusan Masalah
BAB II TINJAUAN PUSTAKA
  Landasan Teori`}</pre>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800/60 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={onCreate}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-amber-950 transition-colors flex items-center gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            Buat Dokumen
          </button>
        </div>
      </div>
    </div>
  );
}
