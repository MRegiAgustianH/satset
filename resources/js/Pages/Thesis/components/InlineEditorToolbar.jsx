import React from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ClipboardPaste,
  Copy,
  FilePlus,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Loader2,
  RemoveFormatting,
  Scissors,
  Sparkles,
  SplitSquareHorizontal,
  Strikethrough,
  Table,
  Trash2,
  Underline,
} from 'lucide-react';
import { getDefaultNumberingStyleForHeading } from '../features/document-preview/layout';

const iconButtonClass = 'hover:bg-slate-800 p-1.5 rounded text-slate-200 hover:text-white transition-colors';
const textButtonClass = 'hover:bg-slate-800 p-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors';
const dividerClass = 'h-5 w-[1px] bg-slate-700/80 mx-1';

function Divider() {
  return <div className={dividerClass} />;
}

function AlignmentButton({ active, title, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${iconButtonClass} ${active ? 'bg-teal-700 dark:bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-600' : ''}`}
      title={title}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export default function InlineEditorToolbar({
  babKey,
  section,
  activeIndex,
  isFirst,
  isLast,
  legacyKey,
  displayTitle,
  isGenerating,
  hasGeneratingSection,
  cleanLineBreaks,
  onUpdateSectionField,
  onClipboard,
  onWrapSelection,
  onClearFormatting,
  onApplyParagraphAlignment,
  onApplyLinePrefix,
  onSplitTextAndInsert,
  onMoveSection,
  onDeleteSection,
  onTriggerAIGenerate,
  onDone,
  showToast,
}) {
  if (!section) return null;

  const textAlign = section.textAlign || 'justify';
  const applyAlignment = (align) => {
    if (onApplyParagraphAlignment) {
      onApplyParagraphAlignment(babKey, section, align);
      return;
    }
    onUpdateSectionField(babKey, section.id, 'textAlign', align);
  };

  const updateContentAtCursor = (insertText) => {
    const textarea = document.getElementById(`inline-textarea-${section.id}`);
    const content = section.content || '';
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextContent = content.substring(0, start) + insertText + content.substring(end);
      onUpdateSectionField(babKey, section.id, 'content', nextContent);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + insertText.length, start + insertText.length);
      }, 50);
      return;
    }

    onUpdateSectionField(babKey, section.id, 'content', content + insertText);
  };

  return (
    <div
      className="sticky top-16 z-30 mb-3 flex max-w-[calc(100vw-1rem)] flex-nowrap items-center gap-2 overflow-x-auto rounded-2xl border border-slate-700/80 bg-slate-900/95 px-3 py-2 text-slate-100 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 dark:bg-slate-950/95 sm:top-14 sm:mb-4 lg:max-w-none lg:flex-wrap lg:overflow-visible lg:rounded-full lg:px-4 no-print inline-editor-toolbar"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex shrink-0 items-center gap-1">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1">Teks:</span>
        <select
          value={section.headingLevel}
          onChange={(event) => {
            const level = parseInt(event.target.value, 10);
            onUpdateSectionField(babKey, section.id, 'headingLevel', level);
            onUpdateSectionField(babKey, section.id, 'numberingStyle', getDefaultNumberingStyleForHeading(level));
          }}
          className="max-w-[170px] cursor-pointer rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-teal-500 dark:bg-slate-900 lg:max-w-none"
        >
          <option value={0}>Paragraf Biasa</option>
          <option value={2}>Heading 2 (Sub-Bab)</option>
          <option value={3}>Heading 3 (Suku Bab)</option>
          <option value={4}>Heading 4 (Sub Heading 4)</option>
        </select>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1">Nomor:</span>
        <select
          value={section.numberingStyle || 'none'}
          onChange={(event) => onUpdateSectionField(babKey, section.id, 'numberingStyle', event.target.value)}
          className="max-w-[210px] cursor-pointer rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[11px] font-bold text-white focus:outline-none focus:ring-1 focus:ring-teal-500 dark:bg-slate-900 lg:max-w-none"
        >
          <option value="none">Tanpa Nomor</option>
          <option value="bab_prefix_dot">Bertingkat sesuai heading (1.1)</option>
          <option value="bab_roman_prefix_dot">Bertingkat Romawi BAB (I.1 / II.1)</option>
          <option value="bab_prefix_double_dot">Bertingkat sesuai heading (1.1.1 / 1.1.1.1)</option>
          <option value="arabic_dot">1. 2. 3.</option>
          <option value="arabic_paren">1) 2) 3)</option>
          <option value="alpha_dot_lower">a. b. c.</option>
          <option value="alpha_paren_lower">a) b) c)</option>
        </select>
      </div>

      <Divider />

      <div className="flex items-center gap-0.5">
        <button type="button" onClick={() => onClipboard(babKey, section, 'cut')} className="hover:bg-slate-800 p-1.5 rounded text-slate-300 hover:text-white transition-colors" title="Potong (Cut)"><Scissors className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => onClipboard(babKey, section, 'copy')} className="hover:bg-slate-800 p-1.5 rounded text-slate-300 hover:text-white transition-colors" title="Salin (Copy)"><Copy className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => onClipboard(babKey, section, 'paste')} className="hover:bg-slate-800 p-1.5 rounded text-slate-300 hover:text-white transition-colors" title="Tempel (Paste)"><ClipboardPaste className="h-3.5 w-3.5" /></button>
      </div>

      <Divider />

      <div className="flex items-center gap-0.5">
        <button type="button" onClick={() => onWrapSelection(babKey, section, '**')} className={`${iconButtonClass} font-bold`} title="Tebal (Bold)"><Bold className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => onWrapSelection(babKey, section, '*')} className={iconButtonClass} title="Miring (Italic)"><Italic className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => onWrapSelection(babKey, section, '__')} className={iconButtonClass} title="Garis Bawah (Underline)"><Underline className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => onWrapSelection(babKey, section, '~~')} className={iconButtonClass} title="Coret (Strikethrough)"><Strikethrough className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => onClearFormatting(babKey, section)} className="hover:bg-slate-800 p-1.5 rounded text-slate-400 hover:text-white transition-colors" title="Hapus Format"><RemoveFormatting className="h-3.5 w-3.5" /></button>
      </div>

      <Divider />

      <div className="flex items-center gap-0.5">
        <AlignmentButton active={textAlign === 'left'} title="Rata kiri" onClick={() => applyAlignment('left')}><AlignLeft className="h-3.5 w-3.5" /></AlignmentButton>
        <AlignmentButton active={textAlign === 'center'} title="Rata tengah" onClick={() => applyAlignment('center')}><AlignCenter className="h-3.5 w-3.5" /></AlignmentButton>
        <AlignmentButton active={textAlign === 'right'} title="Rata kanan" onClick={() => applyAlignment('right')}><AlignRight className="h-3.5 w-3.5" /></AlignmentButton>
        <AlignmentButton active={textAlign === 'justify'} title="Rata kiri-kanan" onClick={() => applyAlignment('justify')}><AlignJustify className="h-3.5 w-3.5" /></AlignmentButton>
      </div>

      <Divider />

      <div className="flex items-center gap-0.5">
        <button type="button" onClick={() => onApplyLinePrefix(babKey, section, 'bullet')} className={iconButtonClass} title="Daftar Berpoin (-)"><List className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => onApplyLinePrefix(babKey, section, 'numbered')} className={iconButtonClass} title="Daftar Bernomor (1. 2. 3.)"><ListOrdered className="h-3.5 w-3.5" /></button>
        <button type="button" onClick={() => onApplyLinePrefix(babKey, section, 'alpha')} className={`${iconButtonClass} text-[11px] font-bold leading-none`} title="Daftar Huruf (a. b. c.)">a.</button>
      </div>

      <Divider />

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => updateContentAtCursor('\n[pagebreak]\n')}
          className={`${textButtonClass} text-teal-600 dark:text-teal-300 hover:text-teal-300`}
          title="Buat halaman baru dari titik kursor"
        >
          <FilePlus className="h-3.5 w-3.5" />
          Halaman Baru
        </button>

        <button
          type="button"
          onClick={() => {
            const cleaned = cleanLineBreaks(section.content);
            onUpdateSectionField(babKey, section.id, 'content', cleaned);
            showToast('Paragraf berhasil dirapikan!');
          }}
          className={`${textButtonClass} text-emerald-400 hover:text-emerald-350`}
          title="Menghapus spasi dan enter berlebih akibat copy-paste PDF"
        >
          Rapikan Spasi
        </button>

        <button
          type="button"
          disabled={hasGeneratingSection}
          onClick={() => onTriggerAIGenerate({ babKey, id: section.id, displayTitle, legacyKey })}
          className={`${textButtonClass} text-amber-400 hover:text-amber-350 disabled:opacity-40`}
          title="Tulis otomatis isi konten menggunakan AI"
        >
          {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          AI Tulis
        </button>

        {section.type === 'text' && (
          <>
            <div className="h-4 w-[1px] bg-slate-800 mx-1 inline-block" />
            <button
              type="button"
              onClick={() => onSplitTextAndInsert(babKey, section.id, 'figure')}
              className={`${textButtonClass} text-sky-400 hover:text-sky-350`}
              title="Pecah paragraf di kursor dan sisipkan gambar"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Gambar (Kursor)
            </button>
            <button
              type="button"
              onClick={() => onSplitTextAndInsert(babKey, section.id, 'table')}
              className={`${textButtonClass} text-sky-400 hover:text-sky-350`}
              title="Pecah paragraf di kursor dan sisipkan tabel"
            >
              <Table className="h-3.5 w-3.5" />
              Tabel (Kursor)
            </button>
            <button
              type="button"
              onClick={() => onSplitTextAndInsert(babKey, section.id, 'split')}
              className={`${textButtonClass} text-teal-400 hover:text-teal-350`}
              title="Pecah paragraf menjadi dua di kursor"
            >
              <SplitSquareHorizontal className="h-3.5 w-3.5" />
              Pecah
            </button>
          </>
        )}
      </div>

      <Divider />

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => onMoveSection(babKey, activeIndex, -1)}
          className="p-1 px-2.5 text-[11px] hover:bg-slate-850 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          title="Naikkan posisi blok ini"
        >
          Naik
        </button>
        <button
          type="button"
          disabled={isLast}
          onClick={() => onMoveSection(babKey, activeIndex, 1)}
          className="p-1 px-2.5 text-[11px] hover:bg-slate-850 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          title="Turunkan posisi blok ini"
        >
          Turun
        </button>
        <button
          type="button"
          onClick={() => onDeleteSection(babKey, section.id)}
          className="p-1 px-2.5 text-[11px] hover:bg-slate-850 rounded text-red-400 hover:text-red-350 transition-colors inline-flex items-center gap-1"
          title="Hapus blok konten ini"
        >
          Hapus <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <Divider />

      <button
        type="button"
        onClick={onDone}
        className="bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 dark:hover:bg-teal-500 text-white font-bold py-1 px-3.5 rounded-full text-[11px] transition-colors shadow-md shadow-teal-700/10"
      >
        Selesai
      </button>
    </div>
  );
}


