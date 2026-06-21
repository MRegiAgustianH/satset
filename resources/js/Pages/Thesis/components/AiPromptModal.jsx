import React from 'react';
import { Sparkles } from 'lucide-react';

export default function AiPromptModal({
  show,
  target,
  promptInput,
  onPromptInputChange,
  onClose,
  onGenerateDirect,
  onGenerateWithPrompt,
}) {
  if (!show || !target) return null;
  const isRevision = target.mode === 'revision';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 no-print text-slate-100 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-[480px] flex flex-col shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
          <h3 className="font-bold flex items-center gap-2 text-sm text-slate-200">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            {isRevision ? 'Revisi Konten dengan AI' : 'Tulis Konten dengan AI'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xs"
          >
            Batal
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Bagian:</span>
            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-850 text-xs font-bold text-slate-350">
              {target.displayTitle}
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
              {isRevision ? 'Komentar Revisi Dosen' : 'Instruksi Tambahan (Opsional)'}
            </label>
            <textarea
              value={promptInput}
              onChange={(e) => onPromptInputChange(e.target.value)}
              placeholder={isRevision ? 'Contoh: latar belakang kurang fokus ke masalah utama, tambahkan gap penelitian dan perjelas objek penelitian.' : 'Contoh: sertakan tabel perbandingan metode, tulis dalam 2 paragraf, gunakan nada akademis formal, dll.'}
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span className="block text-[9px] text-slate-500 mt-1 leading-normal">
              {isRevision ? '*Masukkan komentar dosen apa adanya. AI akan menulis ulang bagian ini sesuai revisi dan tetap menjaga urutan laporan.' : '*Jika Anda meminta tabel, AI akan otomatis menghasilkan data tabel dan menambahkannya sebagai bagian tabel dinamis baru tepat di bawah paragraf ini.'}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4 mt-5 flex justify-end gap-2 text-xs">
          <button
            onClick={onGenerateDirect}
            className="px-4 py-2 border border-slate-800 hover:bg-slate-850 rounded-lg font-bold text-slate-350 hover:text-slate-200"
          >
            {isRevision ? 'Revisi Umum' : 'Tulis Langsung'}
          </button>
          <button
            onClick={onGenerateWithPrompt}
            className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg font-bold text-white flex items-center gap-1.5 shadow-md shadow-indigo-650/10"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isRevision ? 'Revisi dari Komentar' : 'Tulis dengan Prompt'}
          </button>
        </div>
      </div>
    </div>
  );
}
