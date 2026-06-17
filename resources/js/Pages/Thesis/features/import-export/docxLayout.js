const TWIPS_PER_CM = 566.929;
const HALF_POINTS_PER_PT = 2;
const DRAFT_SNAPSHOT_REGEX = /<!--SKRIPSI_DRAFT_V2:([A-Za-z0-9+/=]+)-->/;

const decodeXmlEntities = (value = '') => value
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&');

const attr = (xml, name) => {
  const match = xml.match(new RegExp(`(?:w:)?${name}="([^"]+)"`, 'i'));
  return match ? decodeXmlEntities(match[1]) : '';
};

const twipsToCm = (value) => {
  const numeric = parseFloat(value);
  if (!Number.isFinite(numeric)) return null;
  return Number((numeric / TWIPS_PER_CM).toFixed(2));
};

const halfPointsToPt = (value) => {
  const numeric = parseFloat(value);
  if (!Number.isFinite(numeric)) return null;
  return `${Number((numeric / HALF_POINTS_PER_PT).toFixed(1))}pt`;
};

const lineValueToSpacing = (value) => {
  const numeric = parseFloat(value);
  if (!Number.isFinite(numeric)) return null;
  return Number((numeric / 240).toFixed(1)).toString();
};

const normalizeFontFamily = (fontName = '') => {
  const lower = fontName.toLowerCase();
  if (lower.includes('times')) return "'Times New Roman', Times, serif";
  if (lower.includes('arial')) return 'Arial, Helvetica, sans-serif';
  if (lower.includes('georgia')) return 'Georgia, serif';
  return fontName ? `${fontName}, serif` : null;
};

const findDefaultRunProperties = (stylesXml) => {
  const docDefaults = stylesXml.match(/<w:docDefaults[\s\S]*?<\/w:docDefaults>/i)?.[0] || '';
  const rPrDefault = docDefaults.match(/<w:rPrDefault[\s\S]*?<\/w:rPrDefault>/i)?.[0] || '';
  return rPrDefault.match(/<w:rPr[\s\S]*?<\/w:rPr>/i)?.[0] || '';
};

const findDefaultParagraphProperties = (stylesXml) => {
  const docDefaults = stylesXml.match(/<w:docDefaults[\s\S]*?<\/w:docDefaults>/i)?.[0] || '';
  const pPrDefault = docDefaults.match(/<w:pPrDefault[\s\S]*?<\/w:pPrDefault>/i)?.[0] || '';
  return pPrDefault.match(/<w:pPr[\s\S]*?<\/w:pPr>/i)?.[0] || '';
};

const getStyleBlockByName = (stylesXml, names) => {
  const styleBlocks = stylesXml.match(/<w:style\b[\s\S]*?<\/w:style>/gi) || [];
  return styleBlocks.find((block) => {
    const styleId = attr(block.match(/<w:style\b[^>]*>/i)?.[0] || '', 'styleId').toLowerCase();
    const name = attr(block.match(/<w:name\b[^>]*>/i)?.[0] || '', 'val').toLowerCase();
    return names.some((candidate) => {
      const normalized = candidate.toLowerCase();
      return styleId === normalized || name === normalized;
    });
  }) || '';
};

const readRunStyle = (styleBlock) => {
  const rPr = styleBlock.match(/<w:rPr[\s\S]*?<\/w:rPr>/i)?.[0] || '';
  const sizeTag = rPr.match(/<w:sz\b[^>]*>/i)?.[0] || '';
  const fontTag = rPr.match(/<w:rFonts\b[^>]*>/i)?.[0] || '';
  const hasItalic = /<w:i\b/i.test(rPr);
  const hasBold = /<w:b\b/i.test(rPr);
  const fontSize = sizeTag ? halfPointsToPt(attr(sizeTag, 'val')) : null;
  const fontFamily = fontTag ? normalizeFontFamily(attr(fontTag, 'ascii') || attr(fontTag, 'hAnsi')) : null;

  return {
    ...(fontSize ? { fontSize } : {}),
    ...(fontFamily ? { fontFamily } : {}),
    ...(hasItalic ? { fontStyle: 'italic' } : {}),
    ...(hasBold ? { fontWeight: 'bold' } : {}),
  };
};

export function extractDraftSnapshotFromHtml(html = '') {
  const match = html.match(DRAFT_SNAPSHOT_REGEX);
  if (!match) return null;

  try {
    const json = decodeURIComponent(escape(atob(match[1])));
    const snapshot = JSON.parse(json);
    return snapshot && snapshot.__skripsi ? snapshot : null;
  } catch (error) {
    console.warn('Failed to decode draft snapshot:', error);
    return null;
  }
}

export async function extractDocxSnapshot(arrayBuffer) {
  try {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(arrayBuffer);
    const htmlFiles = Object.keys(zip.files).filter((name) => /^word\/.+\.html?$/i.test(name));

    for (const name of htmlFiles) {
      const html = await zip.file(name)?.async('string');
      const snapshot = extractDraftSnapshotFromHtml(html || '');
      if (snapshot) return snapshot;
    }

    return null;
  } catch (error) {
    console.warn('Failed to extract DOCX snapshot:', error);
    return null;
  }
}

export async function extractDocxLayout(arrayBuffer) {
  try {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(arrayBuffer);
    const documentXml = await zip.file('word/document.xml')?.async('string');
    const stylesXml = await zip.file('word/styles.xml')?.async('string');
    if (!documentXml && !stylesXml) return { layout: {}, headingStyles: {} };

    const layout = {};
    const headingStyles = {};

    if (documentXml) {
      const sectPr = documentXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/i)?.[0] || '';
      const pgMar = sectPr.match(/<w:pgMar\b[^>]*>/i)?.[0] || '';
      if (pgMar) {
        const top = twipsToCm(attr(pgMar, 'top'));
        const right = twipsToCm(attr(pgMar, 'right'));
        const bottom = twipsToCm(attr(pgMar, 'bottom'));
        const left = twipsToCm(attr(pgMar, 'left'));
        if (top !== null) layout.marginTop = top;
        if (right !== null) layout.marginRight = right;
        if (bottom !== null) layout.marginBottom = bottom;
        if (left !== null) layout.marginLeft = left;
        layout.preset = 'custom';
      }
    }

    if (stylesXml) {
      const defaultRun = findDefaultRunProperties(stylesXml);
      const defaultParagraph = findDefaultParagraphProperties(stylesXml);
      const defaultFontTag = defaultRun.match(/<w:rFonts\b[^>]*>/i)?.[0] || '';
      const defaultSizeTag = defaultRun.match(/<w:sz\b[^>]*>/i)?.[0] || '';
      const defaultLineTag = defaultParagraph.match(/<w:spacing\b[^>]*>/i)?.[0] || '';
      const defaultIndentTag = defaultParagraph.match(/<w:ind\b[^>]*>/i)?.[0] || '';

      if (defaultFontTag) {
        const family = normalizeFontFamily(attr(defaultFontTag, 'ascii') || attr(defaultFontTag, 'hAnsi'));
        if (family) layout.fontFamily = family;
      }
      if (defaultSizeTag) {
        const fontSize = halfPointsToPt(attr(defaultSizeTag, 'val'));
        if (fontSize) layout.fontSize = fontSize;
      }
      if (defaultLineTag) {
        const lineSpacing = lineValueToSpacing(attr(defaultLineTag, 'line'));
        if (lineSpacing) layout.lineSpacing = lineSpacing;
      }
      if (defaultIndentTag) {
        const firstLine = parseFloat(attr(defaultIndentTag, 'firstLine'));
        layout.paragraphIndent = Number.isFinite(firstLine) && firstLine > 0 ? 'indented' : 'flush';
      }

      [
        ['h1', ['Heading1', 'Heading 1', 'heading 1']],
        ['h2', ['Heading2', 'Heading 2', 'heading 2']],
        ['h3', ['Heading3', 'Heading 3', 'heading 3']],
        ['h4', ['Heading4', 'Heading 4', 'heading 4']],
        ['h5', ['Heading5', 'Heading 5', 'heading 5']],
        ['h6', ['Heading6', 'Heading 6', 'heading 6']],
      ].forEach(([key, names]) => {
        const block = getStyleBlockByName(stylesXml, names);
        if (block) {
          const style = readRunStyle(block);
          if (Object.keys(style).length > 0) {
            headingStyles[key] = style;
          }
        }
      });
    }

    return { layout, headingStyles };
  } catch (error) {
    console.warn('Failed to extract DOCX layout:', error);
    return { layout: {}, headingStyles: {} };
  }
}

export async function extractDocxMetadata(arrayBuffer) {
  try {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(arrayBuffer);
    const appXml = await zip.file('docProps/app.xml')?.async('string');
    const documentXml = await zip.file('word/document.xml')?.async('string');

    const pagesMatch = appXml?.match(/<Pages>(\d+)<\/Pages>/i);
    const pageCount = pagesMatch ? parseInt(pagesMatch[1], 10) : null;
    const manualPageBreakCount = documentXml
      ? (documentXml.match(/<w:br\b[^>]*(?:w:)?type="page"[^>]*>/gi) || []).length
      : 0;
    const renderedPageBreakCount = documentXml
      ? (documentXml.match(/<w:lastRenderedPageBreak\b/gi) || []).length
      : 0;

    return {
      pageCount: Number.isFinite(pageCount) ? pageCount : null,
      manualPageBreakCount,
      renderedPageBreakCount,
    };
  } catch (error) {
    console.warn('Failed to extract DOCX metadata:', error);
    return { pageCount: null, manualPageBreakCount: 0, renderedPageBreakCount: 0 };
  }
}

export const DOCX_MAMMOTH_STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Judul'] => h1:fresh",
  "p[style-name='Subtitle'] => p:fresh",
  "p[style-name='Subjudul'] => p:fresh",
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h4:fresh",
  "p[style-name='Heading 5'] => h5:fresh",
  "p[style-name='Heading 6'] => h6:fresh",
  "p[style-name='heading 1'] => h1:fresh",
  "p[style-name='heading 2'] => h2:fresh",
  "p[style-name='heading 3'] => h3:fresh",
  "p[style-name='BAB'] => h1:fresh",
  "p[style-name='Bab'] => h1:fresh",
  "p[style-name='Sub Bab'] => h2:fresh",
  "p[style-name='SubBab'] => h2:fresh",
];
