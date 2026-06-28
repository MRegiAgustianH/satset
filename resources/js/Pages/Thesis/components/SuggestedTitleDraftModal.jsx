import React, { useEffect, useState } from 'react';
import { FileText, X } from 'lucide-react';

const getInitialForm = (aiInputs = {}) => ({
  author: '',
  nim: '',
  university: '',
  city: '',
  year: new Date().getFullYear().toString(),
  subtitle: 'SKRIPSI',
  faculty: aiInputs.fakultas || '',
  studyProgram: aiInputs.prodi || '',
});

export default function SuggestedTitleDraftModal({
  show,
  suggestedTitle,
  aiInputs,
  onClose,
  onCreate,
}) {
  const [form, setForm] = useState(() => getInitialForm(aiInputs));

  useEffect(() => {
    if (show) {
      setForm((prev) => ({
        ...getInitialForm(aiInputs),
        author: prev.author,
        nim: prev.nim,
        university: prev.university,
        city: prev.city,
        year: prev.year || new Date().getFullYear().toString(),
        subtitle: prev.subtitle || 'SKRIPSI',
      }));
    }
  }, [show, aiInputs]);

  if (!show || !suggestedTitle) return null;

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    onCreate({
      ...form,
      faculty: aiInputs.fakultas || form.faculty,
      studyProgram: aiInputs.prodi || form.studyProgram,
    });
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-teal-700 dark:text-teal-200">Draft dari Rekomendasi AI</p>
            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">Lengkapi Identitas Laporan</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Sistem akan membuat draft baru berisi cover, identitas, outline BAB, dan struktur laporan dari judul terpilih.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
          <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 dark:border-teal-500/20 dark:bg-teal-500/10">
            <p className="text-[9px] font-black uppercase text-teal-700 dark:text-teal-200">Judul Dipilih</p>
            <h3 className="mt-1 text-sm font-black leading-relaxed text-slate-900 dark:text-white">{suggestedTitle.judul}</h3>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
              {suggestedTitle.metode && <span className="text-teal-700 dark:text-teal-300">Metode utama: {suggestedTitle.metode}</span>}
              {suggestedTitle.metode_pengembangan && <span className="text-emerald-600 dark:text-emerald-300">Pengembangan: {suggestedTitle.metode_pengembangan}</span>}
              {suggestedTitle.metode_pengujian && <span className="text-amber-600 dark:text-amber-300">Pengujian: {suggestedTitle.metode_pengujian}</span>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Nama Mahasiswa</label>
              <input value={form.author} onChange={(event) => updateField('author', event.target.value)} placeholder="Nama lengkap" className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-800 dark:bg-slate-900" autoFocus />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">NPM / NIM</label>
              <input value={form.nim} onChange={(event) => updateField('nim', event.target.value)} placeholder="Nomor mahasiswa" className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Nama Kampus</label>
              <input value={form.university} onChange={(event) => updateField('university', event.target.value)} placeholder="Contoh: Universitas ..." className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Kota</label>
              <input value={form.city} onChange={(event) => updateField('city', event.target.value)} placeholder="Contoh: Cianjur" className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Jenis Laporan</label>
              <input value={form.subtitle} onChange={(event) => updateField('subtitle', event.target.value)} placeholder="SKRIPSI / TUGAS AKHIR" className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400">Tahun</label>
              <input value={form.year} onChange={(event) => updateField('year', event.target.value)} placeholder="2026" className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm dark:border-slate-800 dark:bg-slate-900" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-[10px] font-bold uppercase text-slate-400">Fakultas dari AI</p>
              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{aiInputs.fakultas || '-'}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="text-[10px] font-bold uppercase text-slate-400">Prodi dari AI</p>
              <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">{aiInputs.prodi || '-'}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 p-5 dark:border-slate-800 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900">
            Batal
          </button>
          <button type="submit" className="flex items-center justify-center gap-2 rounded-lg bg-teal-700 dark:bg-teal-600 px-4 py-2 text-sm font-black text-white hover:bg-teal-800 dark:hover:bg-teal-500">
            <FileText className="h-4 w-4" />
            Buat Draft dari Judul Ini
          </button>
        </div>
      </form>
    </div>
  );
}


