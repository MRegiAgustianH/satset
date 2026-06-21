import React from 'react';
import { FolderOpen, List } from 'lucide-react';

export default function LayoutSettingsPanel({
  show,
  layout,
  autosaveEnabled,
  selectedHeadingToStyle,
  headingStyles,
  onFileUpload,
  onApplyPreset,
  onLayoutChange,
  onSelectedHeadingToStyleChange,
  onHeadingStylesChange,
  onAutosaveEnabledChange,
}) {
  if (!show) return null;

  const updateHeadingStyle = (key, value) => {
    const updated = {
      ...headingStyles,
      [selectedHeadingToStyle]: {
        ...headingStyles[selectedHeadingToStyle],
        [key]: value,
      },
    };
    onHeadingStylesChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
        <h3 className="font-bold text-slate-400 mb-1 uppercase text-[10px] flex items-center gap-1.5">
          <FolderOpen className="h-3.5 w-3.5 text-indigo-500" />
          Unggah Panduan Format (.pdf/.docx/.doc/.txt)
        </h3>
        <p className="text-[9px] text-slate-400">Pindai panduan kampus secara otomatis untuk menyesuaikan margin, spasi, dan font.</p>
        <input
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          onChange={onFileUpload}
          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-[10px]"
        />
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
        <h3 className="font-bold text-slate-400 mb-2 uppercase text-[10px]">Preset Panduan Jurusan</h3>
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={() => onApplyPreset('informatika')}
            className={`w-full py-2 border rounded-lg text-center ${layout.preset === 'informatika' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500' : 'bg-white dark:bg-slate-950 border-slate-250'}`}
          >
            Teknik Informatika
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onApplyPreset('sipil')}
              className="py-2 border rounded-lg text-center bg-white dark:bg-slate-950 border-slate-250 text-slate-400"
            >
              Sipil <span className="text-[9px]">(segera)</span>
            </button>
            <button
              onClick={() => onApplyPreset('industri')}
              className={`py-2 border rounded-lg text-center ${layout.preset === 'industri' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500' : 'bg-white dark:bg-slate-950 border-slate-250 text-slate-700 dark:text-slate-350'}`}
            >
              Industri
            </button>
          </div>
        </div>

        <h3 className="font-bold text-slate-400 pt-2 mb-2 uppercase text-[10px]">Preset Umum</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onApplyPreset('dikti')}
            className={`flex-1 py-2 border rounded-lg text-center ${layout.preset === 'dikti' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500' : 'bg-white dark:bg-slate-950 border-slate-250'}`}
          >
            DIKTI 4-4-3-3
          </button>
          <button
            onClick={() => onApplyPreset('ringkas')}
            className={`flex-1 py-2 border rounded-lg text-center ${layout.preset === 'ringkas' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500' : 'bg-white dark:bg-slate-950 border-slate-250'}`}
          >
            Ringkas 3-3-3-3
          </button>
        </div>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-3">
        <h3 className="font-bold text-slate-400 uppercase text-[10px]">Margin Kertas A4 (cm)</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Atas</label>
            <input type="number" step="0.5" value={layout.marginTop} onChange={(event) => onLayoutChange('marginTop', parseFloat(event.target.value) || 0)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Kiri</label>
            <input type="number" step="0.5" value={layout.marginLeft} onChange={(event) => onLayoutChange('marginLeft', parseFloat(event.target.value) || 0)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Bawah</label>
            <input type="number" step="0.5" value={layout.marginBottom} onChange={(event) => onLayoutChange('marginBottom', parseFloat(event.target.value) || 0)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg" />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Kanan</label>
            <input type="number" step="0.5" value={layout.marginRight} onChange={(event) => onLayoutChange('marginRight', parseFloat(event.target.value) || 0)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-3">
        <h3 className="font-bold text-slate-400 uppercase text-[10px]">Penomoran & Tipografi</h3>

        <div>
          <label className="text-[10px] text-slate-400 block mb-1">Metode Letak Halaman</label>
          <select value={layout.pageNumPosition} onChange={(event) => onLayoutChange('pageNumPosition', event.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg">
            <option value="flexible">Standar Akademik (Bab Bawah Tengah, Lainnya Atas Kanan)</option>
            <option value="bottom-center">Tetap Bawah Tengah</option>
            <option value="bottom-right">Tetap Bawah Kanan</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Font Utama</label>
            <select value={layout.fontFamily} onChange={(event) => onLayoutChange('fontFamily', event.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg">
              <option value="'Times New Roman', Times, serif">Times New Roman</option>
              <option value="Arial, Helvetica, sans-serif">Arial</option>
              <option value="Georgia, serif">Georgia</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Spasi</label>
            <select value={layout.lineSpacing} onChange={(event) => onLayoutChange('lineSpacing', event.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg">
              <option value="1.5">1.5</option>
              <option value="2.0">2.0 (Double)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Spasi Tabel</label>
            <select value={layout.tableLineSpacing || '1.0'} onChange={(event) => onLayoutChange('tableLineSpacing', event.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-xs">
              <option value="1.0">1.0 (Single)</option>
              <option value="1.15">1.15</option>
              <option value="1.5">1.5</option>
              <option value="2.0">2.0</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Rata Teks Tabel</label>
            <select value={layout.tableTextAlign || 'left'} onChange={(event) => onLayoutChange('tableTextAlign', event.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-xs">
              <option value="left">Rata Kiri</option>
              <option value="center">Rata Tengah</option>
              <option value="right">Rata Kanan</option>
              <option value="justify">Rata Kiri-Kanan</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 block mb-1">Format Indentasi Paragraf</label>
          <select value={layout.paragraphIndent} onChange={(event) => onLayoutChange('paragraphIndent', event.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg">
            <option value="indented">Menjorok Kedalam (1.25cm)</option>
            <option value="flush">Rata Kiri Penuh (0cm - Tanpa Indent)</option>
          </select>
        </div>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-3">
        <h3 className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1.5">
          <List className="h-3.5 w-3.5 text-indigo-500" />
          Gaya Heading / Sub-Bab
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Heading</label>
            <select value={selectedHeadingToStyle} onChange={(event) => onSelectedHeadingToStyleChange(event.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs">
              <option value="h1">Heading 1 (Bab)</option>
              <option value="h2">Heading 2 (Sub-Bab 1)</option>
              <option value="h3">Heading 3 (Sub-Bab 2)</option>
              <option value="h4">Heading 4 (Sub-Bab 3)</option>
              <option value="h5">Heading 5 (Sub-Bab 4)</option>
              <option value="h6">Heading 6 (Sub-Bab 5)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Ukuran Font</label>
            <select value={headingStyles[selectedHeadingToStyle]?.fontSize || '12pt'} onChange={(event) => updateHeadingStyle('fontSize', event.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs">
              <option value="9pt">9 pt</option>
              <option value="10pt">10 pt</option>
              <option value="11pt">11 pt</option>
              <option value="12pt">12 pt</option>
              <option value="13pt">13 pt</option>
              <option value="14pt">14 pt</option>
              <option value="15pt">15 pt</option>
              <option value="16pt">16 pt</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Ketebalan</label>
            <select value={headingStyles[selectedHeadingToStyle]?.fontWeight || 'bold'} onChange={(event) => updateHeadingStyle('fontWeight', event.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs">
              <option value="bold">Tebal</option>
              <option value="normal">Normal</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Gaya Font</label>
            <select value={headingStyles[selectedHeadingToStyle]?.fontStyle || 'normal'} onChange={(event) => updateHeadingStyle('fontStyle', event.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs">
              <option value="normal">Tegak</option>
              <option value="italic">Miring</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Kapital</label>
            <select value={headingStyles[selectedHeadingToStyle]?.uppercase ? 'true' : 'false'} onChange={(event) => updateHeadingStyle('uppercase', event.target.value === 'true')} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs">
              <option value="true">Kapital</option>
              <option value="false">Normal</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 block mb-1">Perataan Teks</label>
          <select value={headingStyles[selectedHeadingToStyle]?.textAlign || 'left'} onChange={(event) => updateHeadingStyle('textAlign', event.target.value)} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs">
            <option value="left">Rata Kiri</option>
            <option value="center">Rata Tengah</option>
            <option value="right">Rata Kanan</option>
            <option value="justify">Rata Kiri Kanan</option>
          </select>
        </div>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
        <h3 className="font-bold text-slate-400 uppercase text-[10px]">Halaman Administratif & Abstrak</h3>
        <div className="flex flex-col gap-1.5 text-[10px] text-slate-300">
          {[
            ['showPersetujuan', 'Lembar Persetujuan Pembimbing'],
            ['showPengesahan', 'Lembar Pengesahan Sidang'],
            ['showPernyataan', 'Pernyataan Orisinalitas'],
            ['showAbstractIndo', 'Abstrak Bahasa Indonesia'],
            ['showAbstractEng', 'Abstract English'],
            ['showDaftarRumus', 'Daftar Rumus (Persamaan)'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
              <input
                type="checkbox"
                checked={layout[key]}
                onChange={(event) => onLayoutChange(key, event.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
        <h3 className="font-bold text-slate-400 uppercase text-[10px]">Penyimpanan & Auto Save</h3>
        <div className="flex flex-col gap-1.5 text-[10px] text-slate-350">
          <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-850">
            <input
              type="checkbox"
              checked={autosaveEnabled}
              onChange={(event) => onAutosaveEnabledChange(event.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Aktifkan Simpan Otomatis (Auto Save) ke Server</span>
          </label>
          <p className="text-[8.5px] text-slate-400 pl-6 leading-snug">
            Menyimpan perubahan draf ke database setiap 2 detik secara otomatis jika terdeteksi adanya perubahan.
          </p>
        </div>
      </div>
    </div>
  );
}
