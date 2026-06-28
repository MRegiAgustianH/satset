export const normalizeHeaders = (headers) => {
  if (!headers) return [];
  if (typeof headers === 'string') {
    return headers.split(',').map((h) => ({
      text: h == null || h.trim().toLowerCase() === 'null' ? '' : h.trim(),
      colSpan: 1,
      rowSpan: 1,
      bgColor: '',
    }));
  }
  if (Array.isArray(headers)) {
    return headers.map((h) => {
      if (h && typeof h === 'object') {
        return {
          text: h.text == null || String(h.text).toLowerCase() === 'null' ? '' : String(h.text),
          colSpan: h.colSpan ? parseInt(h.colSpan) : 1,
          rowSpan: h.rowSpan ? parseInt(h.rowSpan) : 1,
          bgColor: h.bgColor || '',
        };
      }
      return {
        text: h == null || String(h).toLowerCase() === 'null' ? '' : String(h),
        colSpan: 1,
        rowSpan: 1,
        bgColor: '',
      };
    });
  }
  return [];
};

export const normalizeTableRows = (rows) => {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    if (!Array.isArray(row)) return [];
    return row.map((cell) => {
      if (cell && typeof cell === 'object') {
        return {
          text: cell.text == null || String(cell.text).toLowerCase() === 'null' ? '' : String(cell.text),
          colSpan: cell.colSpan ? parseInt(cell.colSpan) : 1,
          rowSpan: cell.rowSpan ? parseInt(cell.rowSpan) : 1,
          bgColor: cell.bgColor || '',
        };
      }
      return {
        text: cell == null || String(cell).toLowerCase() === 'null' ? '' : String(cell),
        colSpan: 1,
        rowSpan: 1,
        bgColor: '',
      };
    });
  });
};

export const computeMaskedHeaders = (headers) => {
  if (!Array.isArray(headers)) return [];
  const masked = Array(headers.length).fill(false);
  for (let i = 0; i < headers.length; i++) {
    if (masked[i]) continue;
    const cell = headers[i];
    const cSpan = cell ? (cell.colSpan || 1) : 1;
    for (let dc = 1; dc < cSpan; dc++) {
      if (i + dc < headers.length) {
        masked[i + dc] = true;
      }
    }
  }
  return masked;
};

export const computeMaskedCells = (rows) => {
  const R = rows.length;
  if (R === 0) return [];
  const C = Math.max(...rows.map((row) => row.length));

  const masked = Array(R).fill(null).map(() => Array(C).fill(false));
  for (let r = 0; r < R; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      if (masked[r][c]) continue;
      const cell = row[c];
      if (!cell) continue;
      const rSpan = cell.rowSpan || 1;
      const cSpan = cell.colSpan || 1;
      for (let dr = 0; dr < rSpan; dr++) {
        for (let dc = 0; dc < cSpan; dc++) {
          if (dr === 0 && dc === 0) continue;
          if (r + dr < R && c + dc < rows[r + dr].length) {
            masked[r + dr][c + dc] = true;
          }
        }
      }
    }
  }
  return masked;
};

