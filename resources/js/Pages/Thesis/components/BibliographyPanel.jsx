import React from 'react';
import { ClipboardPaste, ExternalLink, Loader2, Plus, ScanSearch, Search, Trash2, Wand2 } from 'lucide-react';

export default function BibliographyPanel({
  show,
  scholarQuery,
  searchingScholar,
  scholarYearStart,
  scholarYearEnd,
  scholarResults,
  refInput,
  manualReferencesText,
  detectedCitations,
  references,
  refStyle,
  onScholarQueryChange,
  onScholarYearStartChange,
  onScholarYearEndChange,
  onScholarSearch,
  onImportCitation,
  onRefInputChange,
  onManualReferencesTextChange,
  onAddReference,
  onImportManualReferences,
  onDetectCitations,
  onGenerateReferencesFromDetectedCitations,
  onRefStyleChange,
  onReferencesChange,
}) {
  if (!show) return null;

  return (
    <div className="space-y-4">
      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
        <h3 className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1">
          <Search className="h-3.5 w-3.5 text-teal-700 dark:text-teal-200" />
          Cari di Google Scholar / ResearchGate
        </h3>
        <form onSubmit={onScholarSearch} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={scholarQuery}
              onChange={(event) => onScholarQueryChange(event.target.value)}
              placeholder="Kata kunci: Sugiyono 2018 / DeLone McLean"
              className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-100"
            />
            <button type="submit" disabled={searchingScholar} className="bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:bg-teal-500 text-white p-2 rounded-lg disabled:opacity-50">
              {searchingScholar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex gap-2 items-center text-[10px] text-slate-500 dark:text-slate-400">
            <span className="shrink-0 font-bold">Rentang Tahun:</span>
            <input
              type="number"
              min="1950"
              max="2030"
              value={scholarYearStart}
              onChange={(event) => onScholarYearStartChange(parseInt(event.target.value, 10) || new Date().getFullYear() - 10)}
              className="w-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-1 text-center text-xs text-slate-850 dark:text-slate-250 font-bold"
            />
            <span>s/d</span>
            <input
              type="number"
              min="1950"
              max="2030"
              value={scholarYearEnd}
              onChange={(event) => onScholarYearEndChange(parseInt(event.target.value, 10) || new Date().getFullYear())}
              className="w-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-1 text-center text-xs text-slate-850 dark:text-slate-250 font-bold"
            />
          </div>
        </form>

        {scholarResults.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            {scholarResults.map((citation, index) => (
              <div key={index} className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col gap-1 text-[10px]">
                <div className="flex justify-between items-center mb-1">
                  <span className="bg-teal-500/10 text-teal-600 dark:text-teal-300 px-1 py-0.5 rounded text-[8px] font-bold uppercase">{citation.source}</span>
                  <div className="flex gap-1.5 items-center">
                    {citation.url && (
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-700 dark:text-teal-200 hover:text-teal-800 dark:hover:text-teal-300 font-semibold flex items-center gap-0.5 text-[8.5px] border border-teal-200 dark:border-teal-800 px-1.5 py-0.5 rounded bg-teal-500/5 hover:bg-teal-500/10"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        PDF
                      </a>
                    )}
                    <button onClick={() => onImportCitation(citation)} className="text-teal-700 dark:text-teal-200 hover:text-teal-700 dark:hover:text-teal-300 font-bold flex items-center gap-0.5 text-[9px]">
                      <Plus className="h-3 w-3" />
                      Tambah
                    </button>
                  </div>
                </div>
                <div className="font-semibold">"{citation.title}"</div>
                <div className="text-slate-400">{citation.author} ({citation.year}) - {citation.publisher}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-3">
        <h3 className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1">
          <ClipboardPaste className="h-3.5 w-3.5 text-teal-700 dark:text-teal-200" />
          Paste Daftar Pustaka Manual
        </h3>
        <textarea
          value={manualReferencesText}
          onChange={(event) => onManualReferencesTextChange(event.target.value)}
          rows={5}
          placeholder={'Paste satu referensi per baris. Contoh:\nSugiyono. (2018). Metode Penelitian Kuantitatif, Kualitatif, dan R&D. Alfabeta, Bandung.\nPratama, A. (2022). Analisis Kepuasan Pengguna E-Learning. Jurnal Teknologi Informasi, 10(2), 145-156.'}
          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-100 resize-y"
        />
        <button
          type="button"
          onClick={onImportManualReferences}
          className="w-full bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:bg-teal-500 py-1.5 text-white font-bold rounded-lg flex items-center justify-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Tambahkan dari Paste
        </button>
        <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Parser membaca pola umum APA: Penulis. (Tahun). Judul. Penerbit/Jurnal. Data yang kurang lengkap tetap bisa diedit manual setelah masuk daftar.
        </p>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-3">
        <h3 className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1">
          <ScanSearch className="h-3.5 w-3.5 text-teal-700 dark:text-teal-200" />
          Auto Detect Sitasi Paragraf
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDetectCitations}
            className="border border-teal-300 dark:border-teal-700 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-200 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1"
          >
            <ScanSearch className="h-3.5 w-3.5" />
            Deteksi Sitasi
          </button>
          <button
            type="button"
            onClick={onGenerateReferencesFromDetectedCitations}
            className="border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 py-1.5 rounded-lg font-bold flex items-center justify-center gap-1"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Buat Pustaka
          </button>
        </div>
        {detectedCitations.length > 0 && (
          <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
            {detectedCitations.map((citation) => (
              <div key={`${citation.author}-${citation.year}`} className="flex justify-between gap-2 text-[10px] bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-2 py-1">
                <span className="truncate">{citation.author}</span>
                <span className="font-bold text-teal-700 dark:text-teal-200">{citation.year}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Deteksi mendukung pola seperti <b>(Sugiyono, 2018)</b> dan <b>Sugiyono (2018)</b>. Jika referensi lengkap belum ada, sistem membuat placeholder untuk dilengkapi.
        </p>
      </div>

      <form onSubmit={onAddReference} className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-3">
        <h3 className="font-bold text-slate-400 uppercase text-[10px]">Tambah Citasi Manual</h3>
        <div>
          <label className="text-[10px] text-slate-400 block mb-0.5">Penulis (Author)</label>
          <input
            type="text"
            value={refInput.author}
            onChange={(event) => onRefInputChange((prev) => ({ ...prev, author: event.target.value }))}
            placeholder="Sugiyono, A. atau DeLone, W."
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 p-1.5 rounded-lg text-xs"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Tahun</label>
            <input
              type="text"
              value={refInput.year}
              onChange={(event) => onRefInputChange((prev) => ({ ...prev, year: event.target.value }))}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 p-1.5 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Tipe</label>
            <select
              value={refInput.type}
              onChange={(event) => onRefInputChange((prev) => ({ ...prev, type: event.target.value }))}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 p-1.5 rounded-lg text-xs"
            >
              <option value="book">Buku</option>
              <option value="journal">Jurnal</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 block mb-0.5">Judul</label>
          <input
            type="text"
            value={refInput.title}
            onChange={(event) => onRefInputChange((prev) => ({ ...prev, title: event.target.value }))}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 p-1.5 rounded-lg text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] text-slate-400 block mb-0.5">Penerbit & Kota / Nama Jurnal Vol(No) Hal</label>
          <input
            type="text"
            value={refInput.publisher}
            onChange={(event) => onRefInputChange((prev) => ({ ...prev, publisher: event.target.value }))}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 p-1.5 rounded-lg text-xs"
          />
        </div>
        <button type="submit" className="w-full bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:bg-teal-500 py-1.5 text-white font-bold rounded-lg flex items-center justify-center gap-1">
          <Plus className="h-4 w-4" />
          Tambah Pustaka
        </button>
      </form>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
        <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
          <span className="font-bold text-slate-400 text-[10px]">Daftar Sitasi ({references.length})</span>
          <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 gap-0.5 rounded text-[9px] font-bold">
            <button onClick={() => onRefStyleChange('apa')} className={`px-1.5 py-0.5 rounded ${refStyle === 'apa' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-200' : 'text-slate-400'}`}>APA</button>
            <button onClick={() => onRefStyleChange('ieee')} className={`px-1.5 py-0.5 rounded ${refStyle === 'ieee' ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-200' : 'text-slate-400'}`}>IEEE</button>
          </div>
        </div>
        <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
          {references.map((reference) => (
            <div key={reference.id} className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800/50 rounded flex justify-between text-[9px] gap-2">
              <span className="truncate">{reference.author} ({reference.year})</span>
              <button onClick={() => onReferencesChange(references.filter((item) => item.id !== reference.id))} className="text-slate-400 hover:text-red-500">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

