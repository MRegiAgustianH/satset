import React from 'react';
import { Check, Loader2, MessageCircle, Send, Sparkles } from 'lucide-react';

export default function AiAssistantPanel({
  show,
  mode = 'assistant',
  apiKey,
  aiConfig = {},
  aiInputs,
  loadingSuggestions,
  suggestedTitles,
  chatMessages,
  chatInput,
  chatLoading,
  onApiKeyChange,
  onAiConfigChange,
  testingAiConnection = false,
  onTestAiConnection,
  onAiInputsChange,
  onFetchTitleRecommendations,
  onApplySuggestedTitle,
  onChatInputChange,
  onSendChatMessage,
}) {
  if (!show) return null;
  const showAssistantTools = mode === 'assistant';
  const showChat = mode === 'chat';
  const isLocalCustomEndpoint = aiConfig.provider === 'custom' && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(aiConfig.baseUrl || '');
  const canTestConnection = Boolean(apiKey || isLocalCustomEndpoint);

  return (
    <div className="space-y-4">
      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
        <h3 className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1">
          <Sparkles className="h-4 w-4 text-teal-700 dark:text-teal-200" />
          Kredensial API
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-slate-400 mb-0.5 block">Provider AI</label>
            <select
              value={aiConfig.provider || 'gemini'}
              onChange={(event) => {
                const provider = event.target.value;
                const defaultModel = provider === 'gemini'
                  ? 'gemini-2.5-flash'
                  : provider === 'openai'
                    ? 'gpt-4o-mini'
                    : provider === 'custom'
                      ? 'cx/gpt-5.5'
                      : 'openai/gpt-4o-mini';
                const defaultBaseUrl = provider === 'openrouter' ? 'https://openrouter.ai/api/v1' : '';
                onAiConfigChange?.({ provider, model: defaultModel, baseUrl: defaultBaseUrl });
              }}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-xs"
            >
              <option value="gemini">Gemini</option>
              <option value="openrouter">OpenRouter / 9Router</option>
              <option value="openai">OpenAI API</option>
              <option value="custom">Custom OpenAI-Compatible</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] text-slate-400 mb-0.5 block">Nama Model</label>
            <input
              type="text"
              placeholder={aiConfig.provider === 'gemini' ? 'gemini-2.5-flash' : aiConfig.provider === 'custom' ? 'cx/gpt-5.5' : 'openai/gpt-4o-mini atau qwen/...'}
              value={aiConfig.model || ''}
              onChange={(event) => onAiConfigChange?.({ model: event.target.value })}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-xs"
            />
          </div>
        </div>
        <div>
          <label className="text-[9px] text-slate-400 mb-0.5 block">API Key</label>
          <input
          type="password"
          placeholder={isLocalCustomEndpoint ? 'Opsional untuk proxy lokal' : 'API Key AI...'}
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
        {(aiConfig.provider === 'openrouter' || aiConfig.provider === 'custom') && <div>
          <label className="text-[9px] text-slate-400 mb-0.5 block">Base URL Endpoint</label>
          <input
          type="text"
          placeholder={aiConfig.provider === 'openrouter' ? 'Base URL opsional: https://openrouter.ai/api/v1' : 'Contoh: http://localhost:20128/v1'}
          value={aiConfig.baseUrl || ''}
          onChange={(event) => onAiConfigChange?.({ baseUrl: event.target.value })}
          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-xs"
        />
        </div>}
        <button
          type="button"
          onClick={onTestAiConnection}
          disabled={testingAiConnection || !canTestConnection}
          className="w-full border border-teal-300 dark:border-teal-700 bg-teal-500/10 hover:bg-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-teal-300 py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 text-xs"
        >
          {testingAiConnection ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Cek Koneksi API
        </button>
        <p className="text-[9px] text-slate-500 leading-relaxed">
          Untuk 9Router lokal: pilih Custom OpenAI-Compatible, model cx/gpt-5.5, Base URL http://localhost:20128/v1. API key opsional jika proxy lokal tidak memerlukannya.
        </p>
      </div>

      {showAssistantTools && <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-3">
        <h3 className="font-bold text-slate-700 dark:text-slate-200 uppercase text-[10px]">Rekomendasi Judul & Metode</h3>
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
          className="w-full bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 py-2 rounded-lg font-bold text-white flex items-center justify-center gap-1.5"
        >
          {loadingSuggestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Cari Judul & Metode AI
        </button>
      </div>}

      {showAssistantTools && suggestedTitles.map((item, index) => (
        <div key={index} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800/80 rounded-xl flex flex-col gap-1.5 hover:border-teal-500 transition-colors">
          <h5 className="font-black text-slate-950 dark:text-white leading-normal break-words">"{item.judul}"</h5>
          <div className="flex flex-wrap gap-1.5">
            {item.metode && <div className="bg-teal-500/10 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-300 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
              Metode utama: {item.metode}
            </div>}
            {item.metode_pengembangan && <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
              Pengembangan: {item.metode_pengembangan}
            </div>}
            {item.metode_pengujian && <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
              Pengujian: {item.metode_pengujian}
            </div>}
          </div>
          <p className="text-[10px] text-slate-700 dark:text-slate-300">{item.penjelasan_metode}</p>
          <button
            onClick={() => onApplySuggestedTitle(item)}
            className="mt-1 border border-slate-300 dark:border-slate-700 py-1.5 rounded-lg font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-850 flex items-center justify-center gap-1"
          >
            <Check className="h-3.5 w-3.5 text-teal-700 dark:text-teal-200" />
            Terapkan Judul
          </button>
        </div>
      ))}

      {showChat && <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-3">
        <h3 className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1">
          <MessageCircle className="h-4 w-4 text-teal-700 dark:text-teal-200" />
          AI Chat Laporan
        </h3>
        <div className="h-64 overflow-y-auto space-y-2 pr-1">
          {chatMessages.map((message, index) => (
            <div
              key={index}
              className={`p-2 rounded-lg text-[11px] leading-relaxed whitespace-pre-wrap ${message.role === 'user'
                ? 'bg-teal-700 dark:bg-teal-600 text-white ml-8'
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
            className="bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:bg-teal-500 disabled:opacity-40 text-white px-3 rounded-lg font-bold"
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


