import {
  computeMaskedCells,
  computeMaskedHeaders,
  normalizeHeaders,
  normalizeTableRows,
} from '../../utils/table';
import { BLOCK_SPACING } from '../document-preview/documentStyles';

const emptyIfNull = (value) => {
  if (value == null) return '';
  const text = String(value);
  return text.toLowerCase() === 'null' ? '' : text;
};

export const escapeWordHtml = (value) => emptyIfNull(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const styleToString = (style) => Object.entries(style)
  .filter(([, value]) => value !== undefined && value !== null && value !== '')
  .map(([key, value]) => {
    const cssKey = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    return `${cssKey}:${value}`;
  })
  .join(';');

export function buildCoverWordHtml({ coverElements = [], cleanFontFamily = 'Times New Roman' }) {
  const parts = coverElements.map((element) => {
    if (!element) return '';

    if (element.type === 'spacing') {
      return `<div style="height:${escapeWordHtml(element.height || '1cm')}; font-size:1pt; line-height:1;">&nbsp;</div>`;
    }

    if (element.type === 'logo') {
      const logoSize = escapeWordHtml(element.size || '5cm');
      const logoHtml = element.logoType === 'custom' && element.logoData
        ? `<img src="${escapeWordHtml(element.logoData)}" style="width:${logoSize}; max-height:${logoSize};" />`
        : `<div style="width:${logoSize}; height:${logoSize}; margin:0 auto; border:1px solid #999; text-align:center; line-height:${logoSize}; font-family:${cleanFontFamily}; font-size:10pt;">LOGO</div>`;

      return `<div style="width:100%; text-align:center; margin:6pt 0; text-indent:0cm;">${logoHtml}</div>`;
    }

    const commonStyle = {
      fontFamily: cleanFontFamily,
      fontSize: element.fontSize || '12pt',
      fontWeight: element.bold ? 'bold' : 'normal',
      fontStyle: element.italic ? 'italic' : 'normal',
      textDecoration: element.underline ? 'underline' : 'none',
      textTransform: element.uppercase ? 'uppercase' : 'none',
      lineHeight: '1.5',
      margin: '0',
      padding: '0',
      textAlign: 'center',
      textIndent: '0cm',
      width: '100%',
    };

    const content = escapeWordHtml(element.value);
    if (element.type === 'title') {
      return `<h1 style="${styleToString({ ...commonStyle, maxWidth: '15.5cm', margin: '0 auto' })}">${content}</h1>`;
    }

    return `<p style="${styleToString(commonStyle)}">${content}</p>`;
  });

  return `<div style="width:100%; text-align:center; text-indent:0cm;">${parts.join('')}</div>`;
}

export function buildTableWordHtml({
  section,
  layout,
  cleanFontFamily = 'Times New Roman',
  baseFontSize = '12pt',
  formatText = escapeWordHtml,
}) {
  const normHeaders = normalizeHeaders(section.headers);
  const normRows = normalizeTableRows(section.rows);
  const headersMask = computeMaskedHeaders(normHeaders);
  const rowsMask = computeMaskedCells(normRows);
  const tableSpacingNum = parseFloat(layout.tableLineSpacing || '1.0');
  const tableWordLineHeight = Math.round(tableSpacingNum * 100) + '%';
  const align = layout.tableTextAlign || 'left';
  const wordCellContent = (value) => {
    const html = formatText(value || '');
    return html && html.trim() ? html : '&nbsp;';
  };

  let html = `<div style="margin-top:${BLOCK_SPACING.embeddedBlockMargin}; margin-bottom:${BLOCK_SPACING.embeddedBlockMargin}; text-indent:0cm;">`;
  html += `<p style="font-weight:bold; font-size:${BLOCK_SPACING.captionFontSize}; text-align:left; text-indent:0cm; margin:0 0 ${BLOCK_SPACING.captionBottomMargin} 0; font-family:${cleanFontFamily};">${wordCellContent(section.title || 'Tabel')}</p>`;
  html += '<table border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse; width:100%; border:1px solid #000;">';
  html += '<thead><tr>';

  normHeaders.forEach((header, index) => {
    if (headersMask[index]) return;
    const isNoCol = (header.text || '').toLowerCase() === 'no';
    const bg = header.bgColor ? ` bgcolor="${header.bgColor}"` : '';
    const colspan = header.colSpan && header.colSpan > 1 ? ` colspan="${header.colSpan}"` : '';
    const rowspan = header.rowSpan && header.rowSpan > 1 ? ` rowspan="${header.rowSpan}"` : '';
    const bgStyle = header.bgColor ? `background-color:${header.bgColor};` : '';
    html += `<td${colspan}${rowspan}${bg} style="border:1px solid #000; padding:6px; font-weight:bold; vertical-align:top; text-align:${isNoCol ? 'center' : align}; font-family:${cleanFontFamily}; font-size:${baseFontSize}; line-height:${tableWordLineHeight}; ${bgStyle}">${wordCellContent(header.text)}</td>`;
  });

  html += '</tr></thead><tbody>';

  normRows.forEach((row, rowIndex) => {
    html += '<tr>';
    row.forEach((cell, cellIndex) => {
      if (rowsMask[rowIndex] && rowsMask[rowIndex][cellIndex]) return;
      const headerCell = normHeaders[cellIndex];
      const isNoCol = headerCell && (headerCell.text || '').toLowerCase() === 'no';
      const bg = cell.bgColor ? ` bgcolor="${cell.bgColor}"` : '';
      const colspan = cell.colSpan && cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : '';
      const rowspan = cell.rowSpan && cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : '';
      const bgStyle = cell.bgColor ? `background-color:${cell.bgColor};` : '';
      html += `<td${colspan}${rowspan}${bg} style="border:1px solid #000; padding:6px; vertical-align:top; text-align:${isNoCol ? 'center' : align}; font-family:${cleanFontFamily}; font-size:${baseFontSize}; line-height:${tableWordLineHeight}; ${bgStyle}">${wordCellContent(cell.text)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  return html;
}

