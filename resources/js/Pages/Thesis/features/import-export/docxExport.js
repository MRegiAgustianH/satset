const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const TWIPS_PER_CM = 566.929;

const stripWordExtension = (filename = 'dokumen') => {
  const cleaned = filename.replace(/\.(docx|doc)$/i, '').trim();
  return cleaned || 'dokumen';
};

const downloadBlob = (blob, filename) => {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const cmToTwips = (value, fallback) => {
  const numeric = parseFloat(value);
  const cm = Number.isFinite(numeric) ? numeric : fallback;
  return Math.round(cm * TWIPS_PER_CM);
};

const cmValue = (value, fallback) => {
  const numeric = parseFloat(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const injectWordMarginCss = (html, layout) => {
  const top = cmValue(layout.marginTop, 4);
  const right = cmValue(layout.marginRight, 3);
  const bottom = cmValue(layout.marginBottom, 3);
  const left = cmValue(layout.marginLeft, 4);
  const marginCss = `<style>
@page { size: 21cm 29.7cm; margin: ${top}cm ${right}cm ${bottom}cm ${left}cm; }
@page WordSectionCover { size: 21cm 29.7cm; margin: ${top}cm ${right}cm ${bottom}cm ${left}cm; mso-header-margin: 35.4pt; mso-footer-margin: 35.4pt; }
@page WordSection1 { size: 21cm 29.7cm; margin: ${top}cm ${right}cm ${bottom}cm ${left}cm; mso-header-margin: 35.4pt; mso-footer-margin: 35.4pt; }
@page WordSection2 { size: 21cm 29.7cm; margin: ${top}cm ${right}cm ${bottom}cm ${left}cm; mso-header-margin: 35.4pt; mso-footer-margin: 35.4pt; }
body { margin: 0; }
div.WordSectionCover { page: WordSectionCover; }
div.WordSection1 { page: WordSection1; }
div.WordSection2 { page: WordSection2; }
</style>`;

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${marginCss}</head>`);
  }

  return `${marginCss}${html}`;
};

export async function downloadHtmlAsDocx(html, filename, layout = {}) {
  const { default: JSZip } = await import('jszip');
  const safeName = stripWordExtension(filename);
  const zip = new JSZip();
  const marginTop = cmToTwips(layout.marginTop, 4);
  const marginRight = cmToTwips(layout.marginRight, 3);
  const marginBottom = cmToTwips(layout.marginBottom, 3);
  const marginLeft = cmToTwips(layout.marginLeft, 4);

  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="html" ContentType="text/html"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);

  zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);

  const word = zip.folder('word');
  word.file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:altChunk r:id="htmlChunk"/>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="${marginTop}" w:right="${marginRight}" w:bottom="${marginBottom}" w:left="${marginLeft}" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`);

  word.folder('_rels').file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="htmlChunk" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="afchunk.html"/>
</Relationships>`);

  word.file('afchunk.html', `\ufeff${injectWordMarginCss(html, layout)}`);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: DOCX_MIME,
  });

  downloadBlob(blob, `${safeName}.docx`);
}

