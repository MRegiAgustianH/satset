import React, { useMemo, useRef } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  FolderOpen,
  GraduationCap,
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

const markerButtonClass = 'absolute h-0 w-0 -translate-x-1/2 cursor-ew-resize border-x-[5px] border-x-transparent';

function AlignmentButton({ active, title, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-6 w-6 inline-flex items-center justify-center rounded-sm border transition-colors ${
        active
          ? 'border-indigo-500 bg-indigo-600 text-white'
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
}) {
  const rulerRef = useRef(null);
  const marginLeftCm = clamp(toNumber(layout?.marginLeft, 4), 0, PAGE_WIDTH_CM - 1);
  const marginRightCm = clamp(toNumber(layout?.marginRight, 3), 0, PAGE_WIDTH_CM - marginLeftCm - 1);
  const contentStartCm = marginLeftCm;
  const contentEndCm = PAGE_WIDTH_CM - marginRightCm;
  const contentWidthCm = Math.max(1, contentEndCm - contentStartCm);
  const leftIndentCm = clamp(toNumber(activeSection?.leftIndentCm, 0), 0, contentWidthCm);
  const rightIndentCm = clamp(toNumber(activeSection?.rightIndentCm, 0), 0, contentWidthCm);
  const maxLeftPosition = Math.max(0, contentWidthCm - rightIndentCm);
  const firstLineIndentCm = clamp(
    toNumber(activeSection?.firstLineIndentCm, getDefaultFirstLineIndent(layout)),
    0,
    maxLeftPosition
  );
  const textAlign = activeSection?.textAlign || layout?.textAlign || 'justify';

  const ticks = useMemo(() => {
    const count = Math.floor(PAGE_WIDTH_CM);
    return Array.from({ length: count + 1 }, (_, index) => index);
  }, []);

  const updateField = (field, value) => {
    if (!activeBabKey || !activeSection) return;
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

      <div ref={rulerRef} className="relative h-8 overflow-hidden border border-slate-400 bg-white shadow-sm">
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
              className={`${markerButtonClass} top-[17px] border-t-[9px] border-t-indigo-600`}
              style={{ left: contentPositionPercent(firstLineIndentCm) }}
              title={`First line indent: ${firstLineIndentCm.toFixed(2)} cm`}
              onMouseDown={startDrag('firstLineIndentCm')}
            />
            <button
              type="button"
              className={`${markerButtonClass} bottom-[1px] border-b-[9px] border-b-indigo-600`}
              style={{ left: contentPositionPercent(leftIndentCm) }}
              title={`Left indent: ${leftIndentCm.toFixed(2)} cm`}
              onMouseDown={startDrag('leftIndentCm')}
            />
            <button
              type="button"
              className={`${markerButtonClass} bottom-[1px] border-b-[9px] border-b-indigo-600`}
              style={{ left: positionPercent(contentEndCm - rightIndentCm) }}
              title={`Right indent: ${rightIndentCm.toFixed(2)} cm`}
              onMouseDown={startDrag('rightIndentCm')}
            />
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
  toolbar,
  onBackgroundClick,
  children,
}) {
  const isUnsaved = !saveFilename || saveFilename === 'Draft_Skripsi';
  const zoomScale = zoomLevel / 100;
  const scaledPageWidth = `${PAGE_WIDTH_CM * zoomScale}cm`;

  return (
    <main className="flex-1 overflow-auto flex flex-col items-center p-8 bg-slate-300 dark:bg-slate-950/60 relative">
      <div className="sticky top-0 mb-6 bg-slate-900/85 border border-slate-700 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-4 text-slate-100 shadow-xl no-print z-30">
        <div className="flex items-center gap-2 border-r border-slate-700 pr-4 text-xs font-semibold text-slate-300">
          <GraduationCap className="h-4 w-4 text-indigo-400" />
          <span>{title}</span>
        </div>

        <div
          className="flex items-center gap-1.5 border-r border-slate-700 pr-4 text-[11px]"
          title={isUnsaved ? 'Draft belum disimpan ke database' : `Draft aktif: ${saveFilename}`}
        >
          <FolderOpen className={`h-3.5 w-3.5 ${isUnsaved ? 'text-amber-400' : 'text-emerald-400'}`} />
          {isUnsaved ? (
            <span className="text-amber-400 font-semibold">Belum disimpan</span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="text-slate-200 font-semibold max-w-[180px] truncate">{saveFilename}</span>
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide ${autosaveEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                {autosaveEnabled ? 'Autosave' : 'Manual'}
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button type="button" onClick={onZoomOut} className="hover:bg-slate-800 p-1.5 rounded-full" title="Perkecil zoom">
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="font-mono text-xs w-10 text-center">{zoomLevel}%</span>
          <button type="button" onClick={onZoomIn} className="hover:bg-slate-800 p-1.5 rounded-full" title="Perbesar zoom">
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onToggleRuler}
            className={`p-1.5 rounded-full transition-colors ${showRuler ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
            title={showRuler ? 'Sembunyikan ruler dan garis margin' : 'Tampilkan ruler dan garis margin'}
            aria-pressed={showRuler}
          >
            <Ruler className="h-4 w-4" />
          </button>
        </div>
      </div>

      {toolbar}

      <div className="relative flex w-full justify-center gap-6">
        {showRuler && (
          <div className="no-print sticky top-[10rem] z-10 hidden h-fit self-start lg:block">
            <VerticalPageRuler layout={layout} zoomScale={zoomScale} />
          </div>
        )}

        <div className="flex flex-col items-center">
          {showRuler && (
            <div
              className="no-print sticky top-[6.25rem] z-20 mb-5 max-w-full rounded-sm bg-slate-950/80 p-1 shadow-xl backdrop-blur"
              style={{ width: scaledPageWidth }}
            >
              <ParagraphRuler
                activeBabKey={activeBabKey}
                activeSection={activeSection}
                layout={layout}
                onUpdateSectionField={onUpdateSectionField}
                onApplyParagraphAlignment={onApplyParagraphAlignment}
              />
            </div>
          )}

          <div style={{ width: scaledPageWidth }} onClick={onBackgroundClick}>
            <div
              className="origin-top-left transition-transform duration-200"
              style={{ transform: `scale(${zoomScale})` }}
            >
              <div
                className={`flex flex-col gap-8 pb-32 ${showRuler ? 'show-margin-guide' : ''}`}
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
      </div>
    </main>
  );
}
