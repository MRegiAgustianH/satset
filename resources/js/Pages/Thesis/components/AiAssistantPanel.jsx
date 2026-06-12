import React from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';

export default function AiAssistantPanel({
  show,
  apiKey,
  aiInputs,
  loadingSuggestions,
  suggestedTitles,
  onApiKeyChange,
  onAiInputsChange,
  onFetchTitleRecommendations,
  onApplySuggestedTitle,
}) {
  if (!show) return null;

  return (
    <div className="space-y-4">
      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
        <h3 className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          Kredensial API
        </h3>
        <input
          type="password"
          placeholder="API Key Gemini..."
          value={apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg"
        />
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-3">
        <h3 className="font-bold text-slate-400 uppercase text-[10px]">Rekomendasi Judul & Metode</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-slate-400 mb-0.5 block">Fakultas</label>
            <input
              type="text"
              value={aiInputs.fakultas}
              onChange={(event) => onAiInputsChange((prev) => ({ ...prev, fakultas: event.target.value }))}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 p-1.5 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-[9px] text-slate-400 mb-0.5 block">Prodi</label>
            <input
              type="text"
              value={aiInputs.prodi}
              onChange={(event) => onAiInputsChange((prev) => ({ ...prev, prodi: event.target.value }))}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 p-1.5 rounded-lg text-xs"
            />
          </div>
        </div>
        <div>
          <label className="text-[9px] text-slate-400 mb-0.5 block">Topik Kasar</label>
          <textarea
            value={aiInputs.topik}
            onChange={(event) => onAiInputsChange((prev) => ({ ...prev, topik: event.target.value }))}
            rows={2}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 p-1.5 rounded-lg text-xs"
          />
        </div>
        <button
          onClick={onFetchTitleRecommendations}
          disabled={loadingSuggestions}
          className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded-lg font-bold text-white flex items-center justify-center gap-1.5"
        >
          {loadingSuggestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Cari Judul & Metode AI
        </button>
      </div>

      {suggestedTitles.map((item, index) => (
        <div key={index} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl flex flex-col gap-1.5 hover:border-indigo-500 transition-colors">
          <h5 className="font-bold text-slate-200 leading-normal">"{item.judul}"</h5>
          <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded text-[9px] font-bold self-start uppercase">
            Metode: {item.metode}
          </div>
          <p className="text-[10px] text-slate-400">{item.penjelasan_metode}</p>
          <button
            onClick={() => onApplySuggestedTitle(item)}
            className="mt-1 border border-slate-200 dark:border-slate-700 py-1.5 rounded-lg font-bold hover:bg-slate-100 dark:hover:bg-slate-850 flex items-center justify-center gap-1"
          >
            <Check className="h-3.5 w-3.5 text-indigo-500" />
            Terapkan Judul
          </button>
        </div>
      ))}
    </div>
  );
}
