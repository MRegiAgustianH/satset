import React from 'react';
import { Check, Loader2, MessageCircle, Send, Sparkles } from 'lucide-react';

export default function AiAssistantPanel({
  show,
  mode = 'assistant',
  apiKey,
  aiInputs,
  loadingSuggestions,
  suggestedTitles,
  chatMessages,
  chatInput,
  chatLoading,
  onApiKeyChange,
  onAiInputsChange,
  onFetchTitleRecommendations,
  onApplySuggestedTitle,
  onChatInputChange,
  onSendChatMessage,
}) {
  if (!show) return null;
  const showAssistantTools = mode === 'assistant';
  const showChat = mode === 'chat';

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
          onPaste={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const pastedText = event.clipboardData.getData('text/plain').trim();
            if (pastedText) onApiKeyChange(pastedText);
          }}
          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg"
        />
      </div>

      {showAssistantTools && <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-3">
        <h3 className="font-bold text-slate-400 uppercase text-[10px]">Rekomendasi Judul & Metode</h3>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Asisten memahami laporan lintas jurusan, dengan fokus teknik: Informatika, Sipil, Industri, dan bidang teknik terkait.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
      </div>}

      {showAssistantTools && suggestedTitles.map((item, index) => (
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

      {showChat && <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-3">
        <h3 className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1">
          <MessageCircle className="h-4 w-4 text-indigo-500" />
          AI Chat Laporan
        </h3>
        <div className="h-64 overflow-y-auto space-y-2 pr-1">
          {chatMessages.map((message, index) => (
            <div
              key={index}
              className={`p-2 rounded-lg text-[11px] leading-relaxed whitespace-pre-wrap ${message.role === 'user'
                ? 'bg-indigo-600 text-white ml-8'
                : 'bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 mr-8'}`}
            >
              {message.content}
            </div>
          ))}
          {chatLoading && (
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-[11px] text-slate-400 mr-8 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Menyusun jawaban...
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <textarea
            value={chatInput}
            onChange={(event) => onChatInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSendChatMessage();
              }
            }}
            rows={2}
            placeholder="Tanya struktur bab, metode, UML/ERD, atau revisi dosen..."
            className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-xs resize-none"
          />
          <button
            type="button"
            onClick={onSendChatMessage}
            disabled={chatLoading || !chatInput.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3 rounded-lg font-bold"
            title="Kirim chat"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[9px] text-slate-500">Chat dibatasi untuk penyusunan laporan agar jawaban tidak keluar topik.</p>
      </div>}
    </div>
  );
}
