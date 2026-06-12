import React from 'react';
import { Image as ImageIcon, Plus, Table, Trash2 } from 'lucide-react';

export default function TablesFiguresPanel({
  show,
  babTitles,
  tableInput,
  figureInput,
  editingElementId,
  editingElementData,
  tables,
  figures,
  onTableInputChange,
  onFigureInputChange,
  onEditingElementIdChange,
  onEditingElementDataChange,
  onAddTable,
  onAddFigure,
  onSaveTableEdit,
  onSaveFigureEdit,
  onDeleteTable,
  onDeleteFigure,
}) {
  if (!show) return null;

  return (
    <div className="space-y-4">
      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
        <h4 className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1">
          <Table className="h-3.5 w-3.5 text-indigo-500" />
          Sisipkan Tabel Baru
        </h4>
        <div>
          <label className="text-[9px] text-slate-400 block mb-0.5">Judul Tabel (Caption)</label>
          <input
            type="text"
            value={tableInput.title}
            onChange={(event) => onTableInputChange((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Contoh: Tabel 3.1 Profil Kuesioner"
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[9px] text-slate-400 block mb-0.5">Letak Bab</label>
            <select
              value={tableInput.bab}
              onChange={(event) => onTableInputChange((prev) => ({ ...prev, bab: event.target.value }))}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs"
            >
              <option value="bab1">{babTitles.bab1.prefix}</option>
              <option value="bab3">{babTitles.bab3.prefix}</option>
              <option value="bab4">{babTitles.bab4.prefix}</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] text-slate-400 block mb-0.5">Header (Koma Sbg Pembatas)</label>
            <input
              type="text"
              value={tableInput.headers}
              onChange={(event) => onTableInputChange((prev) => ({ ...prev, headers: event.target.value }))}
              placeholder="No, Nama, Akurasi"
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs"
            />
          </div>
        </div>
        <div>
          <label className="text-[9px] text-slate-400 block mb-0.5">Baris Data (Koma Pembatas Kolom, Newline Pembatas Baris)</label>
          <textarea
            value={tableInput.rowsText}
            onChange={(event) => onTableInputChange((prev) => ({ ...prev, rowsText: event.target.value }))}
            rows={2}
            placeholder={"1, Pengujian A, 90%\n2, Pengujian B, 95%"}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs"
          />
        </div>
        <button onClick={onAddTable} className="w-full bg-indigo-600 hover:bg-indigo-700 py-1.5 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1">
          <Plus className="h-4 w-4" />
          Tambah Tabel
        </button>
      </div>

      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
        <h4 className="font-bold text-slate-400 uppercase text-[10px] flex items-center gap-1">
          <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
          Sisipkan Gambar Baru
        </h4>
        <div>
          <label className="text-[9px] text-slate-400 block mb-0.5">Judul Gambar (Caption)</label>
          <input
            type="text"
            value={figureInput.title}
            onChange={(event) => onFigureInputChange((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Contoh: Gambar 3.1 Flowchart"
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs"
          />
        </div>
        <div>
          <label className="text-[9px] text-slate-400 block mb-0.5">Letak Bab</label>
          <select
            value={figureInput.bab}
            onChange={(event) => onFigureInputChange((prev) => ({ ...prev, bab: event.target.value }))}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs"
          >
            <option value="bab1">{babTitles.bab1.prefix}</option>
            <option value="bab3">{babTitles.bab3.prefix}</option>
            <option value="bab4">{babTitles.bab4.prefix}</option>
          </select>
        </div>
        <button onClick={onAddFigure} className="w-full bg-indigo-600 hover:bg-indigo-700 py-1.5 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1">
          <Plus className="h-4 w-4" />
          Tambah Gambar
        </button>
      </div>

      <div className="p-2 bg-slate-100 dark:bg-slate-950 rounded-xl space-y-1.5 mb-3">
        <span className="font-bold text-slate-400 text-[10px] block mb-1">Daftar Tabel Terpasang ({tables.length})</span>
        {tables.map((tableItem) => (
          <div key={tableItem.id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-2 text-[10px]">
            {editingElementId === tableItem.id ? (
              <div className="space-y-2">
                <div>
                  <label className="text-[8px] text-slate-400 block mb-0.5">Judul Tabel (Caption)</label>
                  <input
                    type="text"
                    value={editingElementData.title}
                    onChange={(event) => onEditingElementDataChange((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[8px] text-slate-400 block mb-0.5">Letak Bab</label>
                    <select
                      value={editingElementData.bab}
                      onChange={(event) => onEditingElementDataChange((prev) => ({ ...prev, bab: event.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs"
                    >
                      <option value="bab1">{babTitles.bab1.prefix}</option>
                      <option value="bab3">{babTitles.bab3.prefix}</option>
                      <option value="bab4">{babTitles.bab4.prefix}</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] text-slate-400 block mb-0.5">Header (Koma Pembatas)</label>
                    <input
                      type="text"
                      value={editingElementData.headers}
                      onChange={(event) => onEditingElementDataChange((prev) => ({ ...prev, headers: event.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[8px] text-slate-400 block mb-0.5">Baris Data (Koma/Newline Pembatas)</label>
                  <textarea
                    value={editingElementData.rowsText}
                    onChange={(event) => onEditingElementDataChange((prev) => ({ ...prev, rowsText: event.target.value }))}
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => onEditingElementIdChange(null)} className="px-2 py-1 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 rounded-lg text-[9px]">Batal</button>
                  <button onClick={onSaveTableEdit} className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-bold">Simpan</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center gap-2">
                <span className="truncate font-semibold text-slate-700 dark:text-slate-350">{tableItem.title} ({tableItem.bab.toUpperCase()})</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onEditingElementIdChange(tableItem.id);
                      onEditingElementDataChange({
                        title: tableItem.title,
                        bab: tableItem.bab,
                        headers: tableItem.headers,
                        rowsText: tableItem.rowsText || (tableItem.rows ? tableItem.rows.map((row) => row.join(', ')).join('\n') : ''),
                      });
                    }}
                    className="text-indigo-500 hover:text-indigo-400 text-[9px]"
                  >
                    Edit
                  </button>
                  <button onClick={() => onDeleteTable(tableItem.id)} className="text-slate-450 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="p-2 bg-slate-100 dark:bg-slate-950 rounded-xl space-y-1.5">
        <span className="font-bold text-slate-400 text-[10px] block mb-1">Daftar Gambar Terpasang ({figures.length})</span>
        {figures.map((figureItem) => (
          <div key={figureItem.id} className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col gap-2 text-[10px]">
            {editingElementId === figureItem.id ? (
              <div className="space-y-2">
                <div>
                  <label className="text-[8px] text-slate-400 block mb-0.5">Judul Gambar (Caption)</label>
                  <input
                    type="text"
                    value={editingElementData.title}
                    onChange={(event) => onEditingElementDataChange((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-[8px] text-slate-400 block mb-0.5">Letak Bab</label>
                  <select
                    value={editingElementData.bab}
                    onChange={(event) => onEditingElementDataChange((prev) => ({ ...prev, bab: event.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs"
                  >
                    <option value="bab1">{babTitles.bab1.prefix}</option>
                    <option value="bab3">{babTitles.bab3.prefix}</option>
                    <option value="bab4">{babTitles.bab4.prefix}</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => onEditingElementIdChange(null)} className="px-2 py-1 bg-slate-100 hover:bg-slate-250 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 rounded-lg text-[9px]">Batal</button>
                  <button onClick={onSaveFigureEdit} className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-[9px] font-bold">Simpan</button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center gap-2">
                <span className="truncate font-semibold text-slate-700 dark:text-slate-350">{figureItem.title} ({figureItem.bab.toUpperCase()})</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onEditingElementIdChange(figureItem.id);
                      onEditingElementDataChange({
                        title: figureItem.title,
                        bab: figureItem.bab,
                      });
                    }}
                    className="text-indigo-500 hover:text-indigo-400 text-[9px]"
                  >
                    Edit
                  </button>
                  <button onClick={() => onDeleteFigure(figureItem.id)} className="text-slate-450 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
