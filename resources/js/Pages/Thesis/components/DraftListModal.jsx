import React from 'react';
import { Database, Loader2, Trash2 } from 'lucide-react';

export default function DraftListModal({
  show,
  loadingDrafts,
  draftsList,
  onClose,
  onLoadDraft,
  onDeleteDraft,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 no-print text-slate-100">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-[500px] max-h-[500px] flex flex-col shadow-2xl p-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
          <h3 className="font-bold flex items-center gap-2 text-sm text-slate-200">
            <Database className="h-5 w-5 text-indigo-500" />
            Daftar Draft Tersimpan
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xs">Tutup</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loadingDrafts ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span>Sedang memuat data...</span>
            </div>
          ) : draftsList.length === 0 ? (
            <div className="text-center py-12 text-slate-500 italic text-xs">Belum ada draft tersimpan.</div>
          ) : (
            draftsList.map((item) => (
              <div
                key={item.key}
                onClick={() => onLoadDraft(item)}
                className="p-3 rounded-lg border border-slate-850 hover:border-indigo-500 bg-slate-950/50 hover:bg-slate-950 flex justify-between items-center cursor-pointer transition-all"
              >
                <div className="flex-1 min-w-0 pr-4">
                  <h4 className="font-bold text-xs truncate text-slate-200">"{item.title}"</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Penulis: {item.author} - {item.updated_at}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${item.source === 'database' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                    {item.source}
                  </span>
                  <button onClick={(event) => onDeleteDraft(event, item)} className="p-1 hover:bg-slate-850 text-slate-500 hover:text-red-500 rounded">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
