import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  FolderOpen,
  GraduationCap,
  NotebookPen,
  FileText,
  Ruler,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

const PAGE_WIDTH_CM = 21;
const PAGE_HEIGHT_CM = 29.7;
const RULER_STEP_CM = 0.25;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const snapToRulerStep = (value) => Math.round(value / RULER_STEP_CM) * RULER_STEP_CM;

const toNumber = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getDefaultFirstLineIndent = (layout) => (
  layout?.paragraphIndent === 'indented' ? 1.25 : 0
);

const markerButtonClass = 'absolute h-0 w-0 -translate-x-1/2 cursor-ew-resize border-x-[8px] border-x-transparent drop-shadow-md transition-transform hover:scale-125 focus:scale-125 focus:outline-none';

function AlignmentButton({ active, title, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-6 w-6 inline-flex items-center justify-center rounded-sm border transition-colors ${
        active
          ? 'border-teal-500 bg-teal-700 dark:bg-teal-600 text-white'
          : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-200 hover:text-slate-900'
      }`}
      title={title}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

function ParagraphRuler({
  activeBabKey,
  activeSection,
  layout,
  onUpdateSectionField,
  onApplyParagraphAlignment,
  onApplyParagraphIndent,
}) {
  const rulerRef = useRef(null);
  const [dragPreview, setDragPreview] = useState(null);
  const marginLeftCm = clamp(toNumber(layout?.marginLeft, 4), 0, PAGE_WIDTH_CM - 1);
  const marginRightCm = clamp(toNumber(layout?.marginRight, 3), 0, PAGE_WIDTH_CM - marginLeftCm - 1);
  const contentStartCm = marginLeftCm;
  const contentEndCm = PAGE_WIDTH_CM - marginRightCm;
  const contentWidthCm = Math.max(1, contentEndCm - contentStartCm);
  const previewFor = (field, fallback) => (
    dragPreview?.field === field ? dragPreview.value : fallback
  );
  const leftIndentCm = clamp(previewFor('leftIndentCm', toNumber(activeSection?.leftIndentCm, 0)), 0, contentWidthCm);
  const rightIndentCm = clamp(previewFor('rightIndentCm', toNumber(activeSection?.rightIndentCm, 0)), 0, contentWidthCm);
  const maxLeftPosition = Math.max(0, contentWidthCm - rightIndentCm);
  const firstLineIndentCm = clamp(
    previewFor('firstLineIndentCm', toNumber(activeSection?.firstLineIndentCm, getDefaultFirstLineIndent(layout))),
    0,
    maxLeftPosition
  );
  const textAlign = activeSection?.textAlign || layout?.textAlign || 'justify';

  useEffect(() => {
    setDragPreview(null);
  }, [activeSection?.id, activeBabKey]);

  const ticks = useMemo(() => {
    const count = Math.floor(PAGE_WIDTH_CM);
    return Array.from({ length: count + 1 }, (_, index) => index);
  }, []);

  const updateField = (field, value) => {
    if (!activeBabKey || !activeSection) return;
    setDragPreview({ field, value: Number(value.toFixed(2)) });
    if (onApplyParagraphIndent) {
      onApplyParagraphIndent(activeBabKey, activeSection, field, Number(value.toFixed(2)));
      return;
    }
    onUpdateSectionField(activeBabKey, activeSection.id, field, Number(value.toFixed(2)));
  };

  const updateAlignment = (align) => {
    if (!activeBabKey || !activeSection) return;
    if (onApplyParagraphAlignment) {
      onApplyParagraphAlignment(activeBabKey, activeSection, align);
      return;
    }
    onUpdateSectionField(activeBabKey, activeSection.id, 'textAlign', align);
  };

  const startDrag = (field) => (event) => {
    if (!activeBabKey || !activeSection || !rulerRef.current) return;
    event.preventDefault();
    document.body.classList.add('select-none', 'cursor-ew-resize');
    const rect = rulerRef.current.getBoundingClientRect();

    const move = (moveEvent) => {
      const pageCm = ((moveEvent.clientX - rect.left) / rect.width) * PAGE_WIDTH_CM;
      const contentCm = pageCm - contentStartCm;
      if (field === 'rightIndentCm') {
        updateField('rightIndentCm', snapToRulerStep(clamp(contentEndCm - pageCm, 0, contentWidthCm - leftIndentCm)));
        return;
      }

      if (field === 'leftIndentCm') {
        updateField('leftIndentCm', snapToRulerStep(clamp(contentCm, 0, contentWidthCm - rightIndentCm)));
        return;
      }

      updateField('firstLineIndentCm', snapToRulerStep(clamp(contentCm, 0, contentWidthCm - rightIndentCm)));
    };

    const stop = () => {
      document.body.classList.remove('select-none', 'cursor-ew-resize');
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
  };

  const positionPercent = (value) => `${(value / PAGE_WIDTH_CM) * 100}%`;
  const contentPositionPercent = (value) => positionPercent(contentStartCm + value);

  return (
    <div className="no-print mb-1 w-full text-slate-700" onClick={(event) => event.stopPropagation()}>
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
          <Ruler className="h-3 w-3 text-slate-500" />
          <span>{activeSection ? 'Paragraf aktif' : 'Pilih paragraf untuk mengatur indent'}</span>
        </div>

        <div className="flex items-center gap-1 rounded border border-slate-300 bg-slate-100 p-0.5 shadow-sm">
          <AlignmentButton active={textAlign === 'left'} title="Rata kiri" onClick={() => updateAlignment('left')}>
            <AlignLeft className="h-3.5 w-3.5" />
          </AlignmentButton>
          <AlignmentButton active={textAlign === 'center'} title="Rata tengah" onClick={() => updateAlignment('center')}>
            <AlignCenter className="h-3.5 w-3.5" />
          </AlignmentButton>
          <AlignmentButton active={textAlign === 'right'} title="Rata kanan" onClick={() => updateAlignment('right')}>
            <AlignRight className="h-3.5 w-3.5" />
          </AlignmentButton>
          <AlignmentButton active={textAlign === 'justify'} title="Rata kiri-kanan" onClick={() => updateAlignment('justify')}>
            <AlignJustify className="h-3.5 w-3.5" />
          </AlignmentButton>
        </div>
      </div>

      <div ref={rulerRef} className="relative h-11 overflow-visible rounded-md border border-slate-400 bg-white shadow-sm">
        <div
          className="absolute inset-y-0 bg-slate-200"
          style={{ left: 0, width: positionPercent(marginLeftCm) }}
        />
        <div
          className="absolute inset-y-0 bg-slate-200"
          style={{ left: positionPercent(contentEndCm), right: 0 }}
        />
        <div
          className="absolute inset-y-0 border-x border-slate-400 bg-white"
          style={{ left: positionPercent(contentStartCm), width: positionPercent(contentWidthCm) }}
        />
        <div className="absolute inset-x-0 top-0 h-full">
          {ticks.map((tick) => (
            <div
              key={tick}
              className="absolute top-0 flex h-full -translate-x-px flex-col items-center"
              style={{ left: positionPercent(tick) }}
            >
              <span className="h-2 w-px bg-slate-500" />
              <span className="text-[8px] leading-none text-slate-600">{tick}</span>
              <span className="mt-auto h-2 w-px bg-slate-400" />
            </div>
          ))}
          {Array.from({ length: PAGE_WIDTH_CM * 2 }, (_, index) => {
            const value = index * 0.5;
            if (Number.isInteger(value)) return null;
            return (
              <span
                key={value}
                className="absolute top-0 h-1.5 w-px -translate-x-px bg-slate-400"
                style={{ left: positionPercent(value) }}
              />
            );
          })}
        </div>

        {activeSection && (
          <>
            <button
              type="button"
              className={`${markerButtonClass} top-[22px] border-t-[13px] border-t-teal-700`}
              style={{ left: contentPositionPercent(firstLineIndentCm) }}
              title={`First line indent: ${firstLineIndentCm.toFixed(2)} cm`}
              onMouseDown={startDrag('firstLineIndentCm')}
            />
            <button
              type="button"
              className={`${markerButtonClass} bottom-[2px] border-b-[13px] border-b-emerald-600`}
              style={{ left: contentPositionPercent(leftIndentCm) }}
              title={`Left indent: ${leftIndentCm.toFixed(2)} cm`}
              onMouseDown={startDrag('leftIndentCm')}
            />
            <button
              type="button"
              className={`${markerButtonClass} bottom-[2px] border-b-[13px] border-b-rose-600`}
              style={{ left: positionPercent(contentEndCm - rightIndentCm) }}
              title={`Right indent: ${rightIndentCm.toFixed(2)} cm`}
              onMouseDown={startDrag('rightIndentCm')}
            />
            {dragPreview && (
              <div
                className="pointer-events-none absolute -top-7 z-20 -translate-x-1/2 rounded bg-teal-700 dark:bg-teal-600 px-2 py-1 text-[10px] font-bold text-white shadow-lg"
                style={{
                  left: dragPreview.field === 'rightIndentCm'
                    ? positionPercent(contentEndCm - dragPreview.value)
                    : contentPositionPercent(dragPreview.value),
                }}
              >
                {dragPreview.field === 'firstLineIndentCm' ? 'First' : dragPreview.field === 'leftIndentCm' ? 'Left' : 'Right'} {dragPreview.value.toFixed(2)} cm
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-slate-500">
        <span>First line: {firstLineIndentCm.toFixed(2)} cm</span>
        <span>Left: {leftIndentCm.toFixed(2)} cm</span>
        <span>Right: {rightIndentCm.toFixed(2)} cm</span>
      </div>
    </div>
  );
}

function VerticalPageRuler({ layout, zoomScale }) {
  const marginTopCm = clamp(toNumber(layout?.marginTop, 4), 0, PAGE_HEIGHT_CM - 1);
  const marginBottomCm = clamp(toNumber(layout?.marginBottom, 3), 0, PAGE_HEIGHT_CM - marginTopCm - 1);
  const contentEndCm = PAGE_HEIGHT_CM - marginBottomCm;
  const ticks = useMemo(() => (
    Array.from({ length: Math.floor(PAGE_HEIGHT_CM) + 1 }, (_, index) => index)
  ), []);
  const positionPercent = (value) => `${(value / PAGE_HEIGHT_CM) * 100}%`;

  return (
    <div
      className="no-print relative h-[29.7cm] w-[0.7cm] overflow-hidden border border-slate-400 bg-white shadow-sm"
      style={{ height: `${PAGE_HEIGHT_CM * zoomScale}cm` }}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        className="absolute inset-x-0 bg-slate-200"
        style={{ top: 0, height: positionPercent(marginTopCm) }}
      />
      <div
        className="absolute inset-x-0 bg-slate-200"
        style={{ top: positionPercent(contentEndCm), bottom: 0 }}
      />
      <div
        className="absolute inset-x-0 border-y border-slate-400 bg-white"
        style={{ top: positionPercent(marginTopCm), height: positionPercent(contentEndCm - marginTopCm) }}
      />
      {ticks.map((tick) => (
        <div
          key={tick}
          className="absolute left-0 flex w-full -translate-y-px items-start"
          style={{ top: positionPercent(tick) }}
        >
          <span className="h-px w-2 bg-slate-500" />
          <span className="ml-0.5 -translate-y-1/2 text-[7px] leading-none text-slate-600">{tick}</span>
        </div>
      ))}
      {Array.from({ length: Math.floor(PAGE_HEIGHT_CM * 2) }, (_, index) => {
        const value = index * 0.5;
        if (Number.isInteger(value)) return null;
        return (
          <span
            key={value}
            className="absolute left-0 h-px w-1.5 bg-slate-400"
            style={{ top: positionPercent(value) }}
          />
        );
      })}
    </div>
  );
}

export default function DocumentCanvas({
  title,
  saveFilename,
  autosaveEnabled,
  zoomLevel,
  onZoomOut,
  onZoomIn,
  showRuler,
  onToggleRuler,
  layout,
  activeBabKey,
  activeSection,
  onUpdateSectionField,
  onApplyParagraphAlignment,
  onApplyParagraphIndent,
  canvasMode = 'write',
  onCanvasModeChange,
  writeContent,
  toolbar,
  onBackgroundClick,
  children,
}) {
  const isUnsaved = !saveFilename || saveFilename === 'Draft_Skripsi';
  const isPreviewMode = canvasMode === 'preview';
  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window === 'undefined' ? 1024 : window.innerWidth
  ));
  const zoomScale = zoomLevel / 100;
  const pageWidthPx = PAGE_WIDTH_CM * 37.795;
  const mobileFitScale = Math.max(0.36, Math.min(1, (viewportWidth - 32) / pageWidthPx));
  const effectiveZoomScale = isPreviewMode && viewportWidth < 768
    ? Math.min(zoomScale, mobileFitScale)
    : zoomScale;
  const scaledPageWidth = isPreviewMode ? `${PAGE_WIDTH_CM * effectiveZoomScale}cm` : 'min(100%, 980px)';

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <main className={`relative flex flex-1 flex-col items-center overflow-auto p-3 sm:p-5 lg:p-8 ${isPreviewMode ? 'bg-slate-300 dark:bg-slate-950/60' : 'bg-slate-100 dark:bg-slate-950/80'}`}>
      <div className="sticky top-0 z-30 mb-4 flex w-full max-w-5xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-slate-100 shadow-xl backdrop-blur-md sm:mb-6 sm:gap-3 sm:rounded-full sm:px-4 no-print">
        <div className="flex min-w-0 items-center gap-2 border-slate-700 text-xs font-semibold text-slate-300 sm:border-r sm:pr-4">
          <GraduationCap className="h-4 w-4 text-teal-600 dark:text-teal-300" />
          <span className="max-w-[150px] truncate sm:max-w-[220px]">{title}</span>
        </div>

        <div
          className="flex min-w-0 items-center gap-1.5 border-slate-700 text-[11px] sm:border-r sm:pr-4"
          title={isUnsaved ? 'Draft belum disimpan ke database' : `Draft aktif: ${saveFilename}`}
        >
          <FolderOpen className={`h-3.5 w-3.5 ${isUnsaved ? 'text-amber-400' : 'text-emerald-400'}`} />
          {isUnsaved ? (
            <span className="text-amber-400 font-semibold">Belum disimpan</span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="max-w-[120px] truncate font-semibold text-slate-200 sm:max-w-[180px]">{saveFilename}</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide ${autosaveEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                {autosaveEnabled ? 'Autosave' : 'Manual'}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/60 p-1">
          <button
            type="button"
            onClick={() => onCanvasModeChange?.('write')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${!isPreviewMode ? 'bg-teal-700 dark:bg-teal-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'}`}
            title="Mode menulis seperti notepad"
            aria-pressed={!isPreviewMode}
          >
            <NotebookPen className="h-3.5 w-3.5" />
            Tulis
          </button>
          <button
            type="button"
            onClick={() => onCanvasModeChange?.('preview')}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-colors ${isPreviewMode ? 'bg-teal-700 dark:bg-teal-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'}`}
            title="Lihat dalam format laporan A4"
            aria-pressed={isPreviewMode}
          >
            <FileText className="h-3.5 w-3.5" />
            Preview A4
          </button>
        </div>

        <div className={`flex items-center gap-2 sm:gap-3 ${!isPreviewMode ? 'opacity-45' : ''}`}>
          <button type="button" onClick={onZoomOut} className="hover:bg-slate-800 p-1.5 rounded-full" title="Perkecil zoom">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-9 text-center font-mono text-xs sm:w-10">{zoomLevel}%</span>
          <button type="button" onClick={onZoomIn} className="hover:bg-slate-800 p-1.5 rounded-full" title="Perbesar zoom">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleRuler}
            className={`p-1.5 rounded-full transition-colors ${showRuler ? 'bg-teal-700 dark:bg-teal-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
            disabled={!isPreviewMode}
            title={isPreviewMode ? (showRuler ? 'Sembunyikan ruler dan garis margin' : 'Tampilkan ruler dan garis margin') : 'Ruler tersedia di Preview A4'}
            aria-pressed={showRuler}
          >
            <Ruler className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isPreviewMode && toolbar}

      {!isPreviewMode && (
        <div className="w-full max-w-5xl pb-24 sm:pb-32" onClick={onBackgroundClick}>
          {writeContent}
        </div>
      )}

      {isPreviewMode && <div className="relative flex w-full justify-center gap-4 overflow-x-auto pb-6 lg:overflow-visible lg:gap-6">
        {isPreviewMode && showRuler && (
          <div className="no-print sticky top-[10rem] z-10 hidden h-fit self-start lg:block">
            <VerticalPageRuler layout={layout} zoomScale={zoomScale} />
          </div>
        )}

        <div className="flex min-w-fit flex-col items-center">
          {isPreviewMode && showRuler && (
            <div
              className="no-print sticky top-[6.25rem] z-20 mb-5 max-w-full rounded-lg border border-slate-300 bg-white/95 p-2 shadow-xl backdrop-blur"
              style={{ width: scaledPageWidth }}
            >
              <ParagraphRuler
                activeBabKey={activeBabKey}
                activeSection={activeSection}
                layout={layout}
                onUpdateSectionField={onUpdateSectionField}
                onApplyParagraphAlignment={onApplyParagraphAlignment}
                onApplyParagraphIndent={onApplyParagraphIndent}
              />
            </div>
          )}

          <div className="document-print-width" style={{ width: scaledPageWidth }} onClick={onBackgroundClick}>
            <div
              className="document-print-transform origin-top-left transition-transform duration-200"
              style={{ transform: isPreviewMode ? `scale(${effectiveZoomScale})` : 'none' }}
            >
              <div
                className={`document-print-stack flex flex-col pb-32 ${isPreviewMode ? 'gap-8' : 'gap-4 notepad-mode'} ${isPreviewMode && showRuler ? 'show-margin-guide' : ''}`}
                style={{
                  '--doc-margin-top': `${layout.marginTop}cm`,
                  '--doc-margin-left': `${layout.marginLeft}cm`,
                  '--doc-margin-bottom': `${layout.marginBottom}cm`,
                  '--doc-margin-right': `${layout.marginRight}cm`,
                  '--doc-font-family': layout.fontFamily,
                  '--doc-font-size': layout.fontSize,
                  '--doc-line-spacing': layout.lineSpacing,
                  '--doc-text-align': layout.textAlign,
                  '--doc-text-indent': layout.paragraphIndent === 'indented' ? '1.25cm' : '0cm',
                }}
              >
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>}
    </main>
  );
}


