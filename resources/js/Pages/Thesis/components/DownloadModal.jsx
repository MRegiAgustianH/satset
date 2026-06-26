import React from 'react';
import { FileText, Printer } from 'lucide-react';

export default function DownloadModal({
  show,
  format,
  range,
  split,
  selectedSections,
  sectionGroups,
  layout,
  babTitles,
  onClose,
  onFormatChange,
  onRangeChange,
  onSplitChange,
  onSelectedSectionsChange,
  onStartExport,
}) {
  if (!show) return null;

  const visibleSectionGroups = sectionGroups.filter((group) => {
    if (group.id === 'persetujuan') return layout.showPersetujuan;
    if (group.id === 'pengesahan') return layout.showPengesahan;
    if (group.id === 'pernyataan') return layout.showPernyataan;
    if (group.id === 'abstrak-indo') return layout.showAbstractIndo;
    if (group.id === 'abstrak-eng') return layout.showAbstractEng;
    if (group.id === 'daftar-rumus') return layout.showDaftarRumus;
    return true;
  });

  const toggleSection = (sectionId, checked) => {
    if (checked) {
      onSelectedSectionsChange([...selectedSections, sectionId]);
    } else {
      onSelectedSectionsChange(selectedSections.filter((id) => id !== sectionId));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 text-slate-100 backdrop-blur-sm sm:p-4 no-print">
      <div className="flex max-h-[92dvh] w-full max-w-[550px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl sm:p-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
          <h3 className="font-bold flex items-center gap-2 text-sm text-slate-200">
            <Printer className="h-5 w-5 text-indigo-500" />
            Unduh & Cetak Dokumen
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xs">Tutup</button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-5 text-xs text-slate-350">
          <div className="space-y-2">
            <label className="font-bold text-slate-400 block">Format Dokumen</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => onFormatChange('pdf')}
                className={`p-3 border rounded-xl text-left transition-all flex flex-col gap-1 ${format === 'pdf' ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 shadow-sm' : 'bg-slate-950 border-slate-850 hover:bg-slate-850'}`}
              >
                <span className="font-bold text-xs flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  PDF Document
                </span>
                <span className="text-[10px] text-slate-500 leading-tight">Cocok untuk cetak langsung dengan tata letak & page-number presisi.</span>
              </button>
              <button
                type="button"
                disabled
                className="p-3 border rounded-xl text-left transition-all flex flex-col gap-1 bg-slate-950/60 border-slate-850 text-slate-600 cursor-not-allowed opacity-60"
                title="DOCX dinonaktifkan sementara; fokus unduh PDF dulu."
              >
                <span className="font-bold text-xs flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  Microsoft Word (.docx)
                </span>
                <span className="text-[10px] text-slate-500 leading-tight">Dinonaktifkan sementara supaya hasil unduhan difokuskan dan distabilkan ke PDF.</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="font-bold text-slate-400 block">Rentang Halaman / Bagian</label>
            <div className="flex gap-2 p-1 bg-slate-950 rounded-lg border border-slate-850">
              <button
                onClick={() => onRangeChange('all')}
                className={`flex-1 py-2 text-center rounded-md font-bold transition-all ${range === 'all' ? 'bg-slate-850 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Semua Halaman
              </button>
              <button
                onClick={() => onRangeChange('custom')}
                className={`flex-1 py-2 text-center rounded-md font-bold transition-all ${range === 'custom' ? 'bg-slate-850 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Kustom Halaman / Bab
              </button>
            </div>

            {range === 'custom' && (
              <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-3">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-semibold">Pilih bagian yang ingin diunduh:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectedSectionsChange(sectionGroups.map((group) => group.id))}
                      className="text-indigo-400 hover:underline"
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectedSectionsChange([])}
                      className="text-slate-500 hover:text-slate-350 hover:underline"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-[10.5px] sm:grid-cols-2">
                  {visibleSectionGroups.map((group) => {
                    const checked = selectedSections.includes(group.id);
                    return (
                      <label key={group.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleSection(group.id, e.target.checked)}
                          className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500/25 focus:ring-offset-0"
                        />
                        <span className={checked ? 'text-slate-200 font-medium' : 'text-slate-400'}>
                          {group.id.startsWith('bab') ? `${babTitles[group.id].prefix} ${babTitles[group.id].title}` : group.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="font-bold text-slate-400 block">Metode Pengemasan File</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => onSplitChange(false)}
                className={`p-3 border rounded-xl text-left transition-all flex flex-col gap-1 ${!split ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 shadow-sm' : 'bg-slate-950 border-slate-850 hover:bg-slate-850'}`}
              >
                <span className="font-bold text-xs flex items-center gap-1">
                  Gabung Semua
                </span>
                <span className="text-[10px] text-slate-500 leading-tight">Mengunduh satu file lengkap berisi semua halaman yang dipilih secara berurutan.</span>
              </button>
              <button
                onClick={() => onSplitChange(true)}
                className={`p-3 border rounded-xl text-left transition-all flex flex-col gap-1 ${split ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 shadow-sm' : 'bg-slate-950 border-slate-850 hover:bg-slate-850'}`}
              >
                <span className="font-bold text-xs flex items-center gap-1">
                  Pisah per Bab / Bagian
                </span>
                <span className="text-[10px] text-slate-500 leading-tight">Men-split & mengunduh dokumen secara otomatis menjadi file-file terpisah per bab/heading 1.</span>
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-3 mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-800 hover:bg-slate-850 rounded-lg font-bold text-xs"
          >
            Batal
          </button>
          <button
            onClick={onStartExport}
            className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg font-bold text-white flex items-center gap-1.5 text-xs shadow-md shadow-indigo-650/10"
          >
            {format === 'pdf' ? <Printer className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            Mulai {format === 'pdf' ? 'Cetak PDF' : 'Unduh DOCX'}
          </button>
        </div>
      </div>
    </div>
  );
}
