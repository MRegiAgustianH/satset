import {
  DOCX_MAMMOTH_STYLE_MAP,
  extractDocxLayout,
  extractDocxMetadata,
  extractDocxSnapshot,
  extractDraftSnapshotFromHtml,
} from './docxLayout';
import { getDefaultNumberingStyleForHeading } from '../document-preview/layout';

export const createWordImportHandler = (context) => {
  const {
    babTitles,
    layout,
    cover,
    coverElements,
    babSections,
    references,
    refStyle,
    abstrakIndo,
    abstrakIndoKeywords,
    abstrakEng,
    abstrakEngKeywords,
    headingStyles,
    defaultCoverElements,
    setLayout,
    setCover,
    setCoverElements,
    setBabSections,
    setBabTitles,
    setReferences,
    setRefStyle,
    setAbstrakIndo,
    setAbstrakIndoKeywords,
    setAbstrakEng,
    setAbstrakEngKeywords,
    setHeadingStyles,
    setHasLocalDraft,
    setShowWelcomeModal,
    setShowDraftManager,
    setSaveFilename,
    setActiveDraftSlug,
    autosaveConfirmedRef,
    lastSavedPayloadRef,
    getAllTables,
    getAllFigures,
    saveLocalDraft,
    saveDraftToServer,
    fetchDraftsList,
    showToast,
  } = context;

  const createEmptyBabSections = () => ({
    bab1: [],
    bab2: [],
    bab3: [],
    bab4: [],
    bab5: [],
    bab6: [],
  });

  const normalizeBabSections = (input) => {
    const base = createEmptyBabSections();
    if (!input || typeof input !== 'object') return base;

    Object.keys(base).forEach((key) => {
      base[key] = Array.isArray(input[key]) ? input[key] : [];
    });

    return base;
  };

  const createPlainTextSection = () => ({
    id: 'import_intro_' + Date.now() + Math.random(),
    type: 'text',
    title: '',
    content: '',
    headingLevel: 0,
    numberingStyle: 'none',
  });

  const createImportSummary = ({ sourceMeta, docLayoutSettings, hasExplicitChapters, hasContentFallback }) => {
    const messages = [];
    if (sourceMeta?.pageCount) {
      messages.push(`Sumber Word terdeteksi ${sourceMeta.pageCount} halaman`);
    }
    if (sourceMeta?.manualPageBreakCount > 0) {
      messages.push(`${sourceMeta.manualPageBreakCount} page break manual ditemukan di dokumen sumber`);
    }
    if (Object.keys(docLayoutSettings || {}).length > 0) {
      messages.push('layout dasar diterapkan dari DOCX');
    }
    if (!hasExplicitChapters || hasContentFallback) {
      messages.push('struktur BAB/sub-bab masih bisa disesuaikan di panel konten');
    }
    messages.push('preview dipaginasi ulang oleh layout aplikasi');
    return messages.join('; ') + '.';
  };

  const restoreDraftSnapshot = async (snapshot, filename, isCreateNew) => {
    if (!snapshot || !snapshot.__skripsi) return false;

    if (snapshot.layout) setLayout(snapshot.layout);
    if (snapshot.cover) setCover(snapshot.cover);
    if (snapshot.coverElements) setCoverElements(snapshot.coverElements);
    const safeBabSections = normalizeBabSections(snapshot.babSections || babSections);
    if (snapshot.babSections) setBabSections(safeBabSections);
    if (snapshot.babTitles) setBabTitles(snapshot.babTitles);
    if (Array.isArray(snapshot.references)) setReferences(snapshot.references);
    if (snapshot.refStyle) setRefStyle(snapshot.refStyle);
    if (typeof snapshot.abstrakIndo === 'string') setAbstrakIndo(snapshot.abstrakIndo);
    if (typeof snapshot.abstrakIndoKeywords === 'string') setAbstrakIndoKeywords(snapshot.abstrakIndoKeywords);
    if (typeof snapshot.abstrakEng === 'string') setAbstrakEng(snapshot.abstrakEng);
    if (typeof snapshot.abstrakEngKeywords === 'string') setAbstrakEngKeywords(snapshot.abstrakEngKeywords);
    if (snapshot.headingStyles) setHeadingStyles(snapshot.headingStyles);

    const restoredState = {
      layout: snapshot.layout || layout,
      cover: snapshot.cover || cover,
      coverElements: snapshot.coverElements || coverElements,
      babSections: safeBabSections,
      babTitles: snapshot.babTitles || babTitles,
      references: Array.isArray(snapshot.references) ? snapshot.references : [],
      refStyle: snapshot.refStyle || refStyle,
      tables: getAllTables(snapshot.babSections || babSections),
      figures: getAllFigures(snapshot.babSections || babSections),
      abstrakIndo: snapshot.abstrakIndo || '',
      abstrakIndoKeywords: snapshot.abstrakIndoKeywords || '',
      abstrakEng: snapshot.abstrakEng || '',
      abstrakEngKeywords: snapshot.abstrakEngKeywords || '',
      headingStyles: snapshot.headingStyles || headingStyles
    };

    saveLocalDraft(restoredState);
    setHasLocalDraft(true);
    setShowWelcomeModal(false);
    setShowDraftManager(false);

    if (isCreateNew) {
      try {
        const { response, result, payloadString } = await saveDraftToServer(filename, restoredState, { source: 'manual' });
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Gagal menyimpan draft impor ke database.');
        }
        setSaveFilename(filename);
        autosaveConfirmedRef.current = filename;
        lastSavedPayloadRef.current = payloadString;
        fetchDraftsList();
      } catch (dbErr) {
        console.warn('Snapshot imported locally, but DB draft save failed:', dbErr);
      }
    } else {
      setSaveFilename('Draft_Skripsi');
      setActiveDraftSlug(null);
      autosaveConfirmedRef.current = null;
    }

    lastSavedPayloadRef.current = '';
    return true;
  };

  const handleDocxImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let isCreateNew = false;
    let newFilename = file.name.replace(/\.[^/.]+$/, "");

    const wantNewDraft = confirm(
      'Apakah Anda ingin menyimpan hasil impor ini sebagai DRAFT BARU?\n\n' +
      'Klik OK untuk membuat DRAFT BARU.\n' +
      'Klik Batal (Cancel) untuk MENIMPA draft aktif saat ini.'
    );

    if (wantNewDraft) {
      const customName = prompt("Masukkan nama draft baru:", newFilename);
      if (customName === null) {
        e.target.value = ''; // User cancelled
        return;
      }
      newFilename = customName.trim() || newFilename;
      isCreateNew = true;
    } else {
      if (!confirm('Peringatan: Pilihan ini akan menimpa seluruh konten BAB yang ada saat ini. Lanjutkan?')) {
        e.target.value = ''; // Reset input
        return;
      }
    }

    showToast('Sedang memproses dokumen Word...');
    
    try {
      const newBabTitles = { ...babTitles };

      const isChapterTitle = (text) => {
        const clean = text.replace(/^\s*(?:\par|\(?\d+(?:\.\d+)*[.)]?|[A-Za-z][.)]|\([A-Za-z0-9]+\))\s*/, '').trim();
        const cleanLower = clean.toLowerCase();
        
        // If it starts with list numbering (like 1., a., etc.), it's a list item, not a chapter!
        if (/^\s*(?:\par|\(?\d+(?:\.\d+)*[.)]|[A-Za-z][.)]|\([A-Za-z0-9]+\))\s/i.test(text)) return false;

        // If the title contains "BAB" followed by roman/arabic numbers, it's definitely a chapter title
        if (/\bBAB\s*(I{1,3}|IV|V|VI|\d+)\b/i.test(text)) return true;
        
        // If it starts with a double-level numbering prefix (e.g., 1.1, 1.2, 2.1) and does NOT contain "BAB", it is a sub-chapter, not a chapter!
        const hasDoubleLevelPrefix = /^\s*\d+\.\d+/.test(text);
        if (hasDoubleLevelPrefix) return false;
        
        // Or if it matches a standard Indonesian chapter title exactly
        const standardChapters = [
          'pendahuluan',
          'tinjauan pustaka',
          'landasan teori',
          'metode penelitian',
          'metodologi penelitian',
          'hasil penelitian',
          'hasil dan pembahasan',
          'kesimpulan dan saran',
          'penutup',
          'analisis dan perancangan',
          'analisis sistem',
          'perancangan sistem',
          'tinjauan teoritis',
          'landasan teoritis',
          'gambaran umum',
          'gambaran umum perusahaan',
          'deskripsi sistem',
          'implementasi',
          'implementasi sistem',
          'pengujian',
          'pengujian sistem',
          'kesimpulan',
          'saran'
        ];
        return standardChapters.includes(cleanLower);
      };

      const getBabIndexFromMarker = (marker) => {
        const numStr = String(marker || '').toUpperCase();
        if (numStr === 'I' || numStr === '1') return 0;
        if (numStr === 'II' || numStr === '2') return 1;
        if (numStr === 'III' || numStr === '3') return 2;
        if (numStr === 'IV' || numStr === '4') return 3;
        if (numStr === 'V' || numStr === '5') return 4;
        return -1;
      };

      const arrayBuffer = await file.arrayBuffer();

      // Detect file format: real .docx is a ZIP archive (starts with "PK" = 0x50 0x4B),
      // while our exported .doc is an HTML-based Word file (plain text/HTML).
      const headerBytes = new Uint8Array(arrayBuffer.slice(0, 4));
      const isZipDocx = headerBytes[0] === 0x50 && headerBytes[1] === 0x4B; // "PK"

      let html;
      let docLayoutSettings = {};
      let docHeadingStyles = {};
      let sourceMeta = { pageCount: null, manualPageBreakCount: 0, renderedPageBreakCount: 0 };
      if (isZipDocx) {
        const snapshot = await extractDocxSnapshot(arrayBuffer);
        if (snapshot) {
          const restored = await restoreDraftSnapshot(snapshot, newFilename, isCreateNew);
          if (restored) {
            showToast('Impor berhasil - seluruh format & isi draft dipulihkan dari snapshot DOCX!');
            e.target.value = '';
            return;
          }
        }

        sourceMeta = await extractDocxMetadata(arrayBuffer);
        const extractedDocxLayout = await extractDocxLayout(arrayBuffer);
        docLayoutSettings = extractedDocxLayout.layout || {};
        docHeadingStyles = extractedDocxLayout.headingStyles || {};

        // Real .docx (OOXML) — parse with mammoth.
        // Loaded on demand so the ~1MB mammoth library stays out of the main bundle.
        const { default: mammoth } = await import('mammoth');
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            styleMap: DOCX_MAMMOTH_STYLE_MAP,
            includeDefaultStyleMap: true,
            ignoreEmptyParagraphs: false,
          }
        );
        html = result.value;
      } else {
        // HTML-based .doc (our own export) — decode the text and use its HTML directly
        const decoder = new TextDecoder('utf-8');
        let rawHtml = decoder.decode(arrayBuffer);
        // Strip BOM if present
        rawHtml = rawHtml.replace(/^\ufeff/, '');

        // FAST PATH: our exports embed a full draft snapshot. If present, restore the
        // entire draft (title, logo, images, page breaks, layout) with perfect fidelity.
        const snapshot = extractDraftSnapshotFromHtml(rawHtml);
        if (snapshot) {
          const restored = await restoreDraftSnapshot(snapshot, newFilename, isCreateNew);
          if (restored) {
            showToast('Impor berhasil - seluruh format & isi draft dipulihkan dari snapshot!');
            e.target.value = '';
            return;
          }
        }

        const snapMatch = rawHtml.match(/<!--SKRIPSI_DRAFT_V2:([A-Za-z0-9+/=]+)-->/);
        if (snapMatch) {
          try {
            const json = decodeURIComponent(escape(atob(snapMatch[1])));
            const snap = JSON.parse(json);
            if (snap && snap.__skripsi) {
              if (snap.layout) setLayout(snap.layout);
              if (snap.cover) setCover(snap.cover);
              if (snap.coverElements) setCoverElements(snap.coverElements);
              const safeSnapBabSections = normalizeBabSections(snap.babSections || babSections);
              if (snap.babSections) setBabSections(safeSnapBabSections);
              if (snap.babTitles) setBabTitles(snap.babTitles);
              if (Array.isArray(snap.references)) setReferences(snap.references);
              if (snap.refStyle) setRefStyle(snap.refStyle);
              if (typeof snap.abstrakIndo === 'string') setAbstrakIndo(snap.abstrakIndo);
              if (typeof snap.abstrakIndoKeywords === 'string') setAbstrakIndoKeywords(snap.abstrakIndoKeywords);
              if (typeof snap.abstrakEng === 'string') setAbstrakEng(snap.abstrakEng);
              if (typeof snap.abstrakEngKeywords === 'string') setAbstrakEngKeywords(snap.abstrakEngKeywords);
              if (snap.headingStyles) setHeadingStyles(snap.headingStyles);

              const restoredState = {
                layout: snap.layout || layout,
                cover: snap.cover || cover,
                coverElements: snap.coverElements || coverElements,
                babSections: safeSnapBabSections,
                babTitles: snap.babTitles || babTitles,
                references: Array.isArray(snap.references) ? snap.references : [],
                refStyle: snap.refStyle || refStyle,
                tables: getAllTables(snap.babSections || babSections),
                figures: getAllFigures(snap.babSections || babSections),
                abstrakIndo: snap.abstrakIndo || '',
                abstrakIndoKeywords: snap.abstrakIndoKeywords || '',
                abstrakEng: snap.abstrakEng || '',
                abstrakEngKeywords: snap.abstrakEngKeywords || '',
                headingStyles: snap.headingStyles || headingStyles
              };
              saveLocalDraft(restoredState);
              setHasLocalDraft(true);
              setShowWelcomeModal(false);
              setShowDraftManager(false);

              if (isCreateNew) {
                try {
                  const { response, result, payloadString } = await saveDraftToServer(newFilename, restoredState, { source: 'manual' });
                  if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Gagal menyimpan draft impor ke database.');
                  }
                  setSaveFilename(newFilename);
                  autosaveConfirmedRef.current = newFilename;
                  lastSavedPayloadRef.current = payloadString;
                  fetchDraftsList();
                } catch (dbErr) {
                  console.warn('Snapshot imported locally, but DB draft save failed:', dbErr);
                }
              } else {
                setSaveFilename('Draft_Skripsi');
                setActiveDraftSlug(null);
                autosaveConfirmedRef.current = null;
              }
              lastSavedPayloadRef.current = '';
              showToast('Impor berhasil — seluruh format & isi draft dipulihkan dari snapshot!');
              e.target.value = '';
              return;
            }
          } catch (err) {
            console.warn('Snapshot restore failed, falling back to HTML parsing:', err);
          }
        }

        // Try to parse layout/formatting settings embedded in the style sheet of our HTML-based .doc export
        try {
          // Parse Margins
          const marginMatch = rawHtml.match(/@page\s*WordSection[12]\s*\{\s*[^}]*margin:\s*([\d\.]+)cm\s+([\d\.]+)cm\s+([\d\.]+)cm\s+([\d\.]+)cm/i)
                           || rawHtml.match(/@page\s*\{\s*[^}]*margin:\s*([\d\.]+)cm\s+([\d\.]+)cm\s+([\d\.]+)cm\s+([\d\.]+)cm/i);
          if (marginMatch) {
            docLayoutSettings.marginTop = parseFloat(marginMatch[1]);
            docLayoutSettings.marginRight = parseFloat(marginMatch[2]);
            docLayoutSettings.marginBottom = parseFloat(marginMatch[3]);
            docLayoutSettings.marginLeft = parseFloat(marginMatch[4]);
            
            // Deduce preset
            if (docLayoutSettings.marginTop === 4.0 && docLayoutSettings.marginLeft === 4.0 && docLayoutSettings.marginBottom === 3.0 && docLayoutSettings.marginRight === 3.0) {
              docLayoutSettings.preset = 'dikti';
            } else if (docLayoutSettings.marginTop === 3.0 && docLayoutSettings.marginLeft === 3.0 && docLayoutSettings.marginBottom === 3.0 && docLayoutSettings.marginRight === 3.0) {
              docLayoutSettings.preset = 'ringkas';
            } else {
              docLayoutSettings.preset = 'custom';
            }
          }

          // Parse Font Family
          const fontMatch = rawHtml.match(/body\s*\{\s*[^}]*font-family:\s*([^;'}]+)/i)
                         || rawHtml.match(/font-family:\s*([^;'}]+)/i);
          if (fontMatch) {
            const fontName = fontMatch[1].replace(/['"]/g, '').trim();
            if (fontName.toLowerCase().includes('times new roman') || fontName.toLowerCase().includes('times')) {
              docLayoutSettings.fontFamily = "'Times New Roman', Times, serif";
            } else if (fontName.toLowerCase().includes('arial')) {
              docLayoutSettings.fontFamily = "Arial, Helvetica, sans-serif";
            } else if (fontName.toLowerCase().includes('georgia')) {
              docLayoutSettings.fontFamily = "Georgia, serif";
            }
          }

          // Parse Paragraph Indent style
          const indentMatch = rawHtml.match(/p\.paragraph-content\s*\{\s*[^}]*text-indent:\s*([^;'}]+)/i)
                           || rawHtml.match(/text-indent:\s*([^;'}]+)/i);
          if (indentMatch) {
            const indentVal = indentMatch[1].trim();
            if (indentVal === '0cm' || indentVal === '0') {
              docLayoutSettings.paragraphIndent = 'flush';
            } else {
              docLayoutSettings.paragraphIndent = 'indented';
            }
          }

          // Parse Line Spacing / Line height
          const lineSpacingMatch = rawHtml.match(/p\.paragraph-content\s*\{\s*[^}]*line-height:\s*([^;'}]+)/i)
                                || rawHtml.match(/line-height:\s*([^;'}%]+%)/i);
          if (lineSpacingMatch) {
            const lhVal = lineSpacingMatch[1].trim();
            if (lhVal.endsWith('%')) {
              const percent = parseFloat(lhVal);
              docLayoutSettings.lineSpacing = (percent / 100).toFixed(1);
            } else if (!isNaN(lhVal)) {
              docLayoutSettings.lineSpacing = parseFloat(lhVal).toFixed(1);
            }
          }

          // Parse show/hide config states based on presence of key pages in document
          docLayoutSettings.showPersetujuan = rawHtml.includes('id="persetujuan"') || rawHtml.includes('id=\'persetujuan\'');
          docLayoutSettings.showPengesahan = rawHtml.includes('id="pengesahan"') || rawHtml.includes('id=\'pengesahan\'');
          docLayoutSettings.showPernyataan = rawHtml.includes('id="pernyataan"') || rawHtml.includes('id=\'pernyataan\'');
          docLayoutSettings.showAbstractIndo = rawHtml.includes('id="abstrak-indo"') || rawHtml.includes('id=\'abstrak-indo\'');
          docLayoutSettings.showAbstractEng = rawHtml.includes('id="abstrak-eng"') || rawHtml.includes('id=\'abstrak-eng\'');
        } catch (e) {
          console.warn('Failed to parse styling from exported document: ', e);
        }

        const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
        html = bodyMatch ? bodyMatch[1] : rawHtml;
      }

      // Create a temporary div to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Preserve line boundaries from Word. Several DOCX files use <br> inside
      // one paragraph for headings and outline items; collapsing them to spaces
      // makes the import parser read unrelated blocks as one paragraph.
      tempDiv.querySelectorAll('br').forEach(br => {
        br.parentNode.replaceChild(document.createTextNode('\n'), br);
      });

      // If this is our own HTML-based export, the content is wrapped in
      // WordSection/word-page divs with header/footer definitions. Flatten these
      // so the import scanner sees headings/paragraphs as top-level elements.
      if (!isZipDocx) {
        // Remove Word header/footer field definitions
        tempDiv.querySelectorAll('div[style*="mso-element:header"], div[style*="mso-element:footer"]').forEach(el => el.remove());
        
        // Unwrap structural wrapper divs repeatedly until none remain.
        // We unwrap a div if:
        // 1. It contains nested divs (which means it is a structural wrapper)
        // 2. It contains heading elements (h1-h6) which need to be at the top level
        // 3. It doesn't contain a table, image, or diagram (meaning it is not a block-level container like table/figure)
        let didUnwrap = true;
        let guard = 0;
        while (didUnwrap && guard < 50) {
          didUnwrap = false;
          guard++;
          
          const divs = Array.from(tempDiv.querySelectorAll('div'));
          for (let div of divs) {
            const hasHeading = div.querySelector('h1, h2, h3, h4, h5, h6') !== null;
            const hasNestedDiv = div.querySelector('div') !== null;
            const hasTable = div.querySelector('table') !== null;
            const hasImg = div.querySelector('img') !== null;
            const hasDiagramText = /\[Skema|Diagram/i.test(div.textContent || '');
            
            if (hasHeading || hasNestedDiv || (!hasTable && !hasImg && !hasDiagramText)) {
              while (div.firstChild) {
                div.parentNode.insertBefore(div.firstChild, div);
              }
              div.remove();
              didUnwrap = true;
              break; // Break inner loop to re-query
            }
          }
        }
      }

      const splitImportedTextBlocks = () => {
        const textOnlyTags = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
        const shouldSplitText = (text) => {
          const babCount = (text.match(/\bBAB\s*(?:I{1,3}|IV|V|VI|1|2|3|4|5|6)\b/gi) || []).length;
          return text.includes('\n') ||
            (/\bsistematika\b/i.test(text) && babCount >= 2) ||
            babCount >= 2 ||
            /\b\d+\s*\.\s*\d+(?:\s*\.\s*\d+)?\s+[A-ZÀ-Ÿ]/.test(text);
        };
        const splitText = (text) => {
          let normalized = text.replace(/\r/g, '\n').replace(/\u00a0/g, ' ');
          normalized = normalized.replace(/\s+(?=BAB\s*(?:I{1,3}|IV|V|VI|1|2|3|4|5|6)\b)/gi, '\n');
          normalized = normalized.replace(/\s+(?=\d+\s*\.\s*\d+(?:\s*\.\s*\d+)?\s+[A-ZÀ-Ÿ])/g, '\n');
          normalized = normalized.replace(/\n{2,}/g, '\n');
          return normalized.split('\n').map(line => line.trim()).filter(Boolean);
        };

        Array.from(tempDiv.childNodes).forEach(node => {
          if (node.nodeType !== Node.ELEMENT_NODE) return;
          const tagName = node.tagName.toLowerCase();
          if (!textOnlyTags.has(tagName)) return;
          if (node.querySelector && node.querySelector('table, img, ul, ol')) return;

          const text = node.textContent.trim();
          if (!text || !shouldSplitText(text)) return;

          const lines = splitText(text);
          if (lines.length <= 1) return;

          const fragment = document.createDocumentFragment();
          lines.forEach(line => {
            const replacement = document.createElement(tagName.startsWith('h') ? tagName : 'p');
            replacement.textContent = line;
            fragment.appendChild(replacement);
          });
          node.parentNode.replaceChild(fragment, node);
        });
      };

      splitImportedTextBlocks();

      // Pre-scan elements to see if there are explicit "BAB I", "BAB II", etc.
      let hasExplicitChapters = false;
      Array.from(tempDiv.childNodes).forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const textContent = node.textContent.trim();
        const babMatch = textContent.match(/^BAB\s*(I{1,3}|IV|V|VI|1|2|3|4|5|6)\b/i);
        if (babMatch && textContent.length < 100) {
          hasExplicitChapters = true;
        }
      });

      const newBabSections = createEmptyBabSections();

      let currentBabIndex = 0; // 0 = bab1, 1 = bab2... up to 4
      const babKeys = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5', 'bab6'];
      
      let currentSectionId = null;
      let currentContent = [];
      let hasContentFallback = false;

      const flushSection = () => {
        if (currentSectionId && currentContent.length > 0) {
          const bKey = babKeys[currentBabIndex];
          if (bKey) {
            const sec = newBabSections[bKey].find(s => s.id === currentSectionId);
            if (sec) {
              sec.content = currentContent.join('\n\n');
            }
          }
        }
        currentContent = [];
      };

      // Parse an HTML <table> element into headers string + rows array
      const parseImportedTable = (tableEl) => {
        const trs = Array.from(tableEl.querySelectorAll('tr'));
        if (trs.length === 0) return { headers: '', rows: [] };
        const cellText = (tr) => Array.from(tr.children)
          .filter(c => /^(td|th)$/i.test(c.tagName))
          .map(c => c.textContent.trim());
        const headers = cellText(trs[0]).join(', ');
        const rows = trs.slice(1).map(tr => cellText(tr));
        return { headers, rows };
      };

      // Start a fresh continuation paragraph section (used after a table/figure/equation block)
      const startContinuationSection = (bKey) => {
        const section = createPlainTextSection();
        section.id = 'import_' + Date.now() + Math.random();
        currentSectionId = section.id;
        newBabSections[bKey].push(section);
      };

      const ensureWritableSection = () => {
        const bKey = babKeys[currentBabIndex];
        if (!currentSectionId) {
          const section = createPlainTextSection();
          currentSectionId = section.id;
          newBabSections[bKey].push(section);
        }
        return bKey;
      };

      const getCurrentSection = () => {
        const bKey = babKeys[currentBabIndex];
        return (newBabSections[bKey] || []).find(section => section.id === currentSectionId) || null;
      };

      const isCurrentSistematikaSection = () => {
        const section = getCurrentSection();
        const title = (section?.title || '').toLowerCase();
        return /\bsistematika\b/.test(title);
      };

      const allowContentBeforeBab = () => {
        if (hasHitFirstBab) return true;
        if (hasExplicitChapters) return false;
        hasContentFallback = true;
        return true;
      };

      // Pick the most likely caption inside a content wrapper element.
      // Considers <p>, <div>, and <span> leaf text nodes; skips placeholder text
      // ("[Skema ...]") and the "Keterangan" legend.
      const pickCaption = (wrapperEl) => {
        const candidates = Array.from(wrapperEl.querySelectorAll('p, div, span'));
        for (let i = candidates.length - 1; i >= 0; i--) {
          const elx = candidates[i];
          // Only consider leaf-ish elements (no nested block children with their own text)
          if (elx.querySelector('p, div, table, img')) continue;
          const t = elx.textContent.trim();
          if (t && !t.startsWith('[') && !/^keterangan/i.test(t)) return t;
        }
        return '';
      };

      const parseCaptionText = (text) => {
        const clean = (text || '').replace(/\s+/g, ' ').trim();
        if (!clean || clean.length > 180) return null;
        const match = clean.match(/^(gambar|tabel|table|figure|rumus|persamaan|equation)\s*(?:\(?\s*(?:\d+|[ivxlcdm]+)\s*(?:[.\-]\s*(?:\d+|[ivxlcdm]+))*\s*\)?)?[\s.:;-]*(.*)$/i);
        if (!match) return null;
        const rawKind = match[1].toLowerCase();
        const kind = rawKind === 'gambar' || rawKind === 'figure'
          ? 'figure'
          : rawKind === 'tabel' || rawKind === 'table'
            ? 'table'
            : 'equation';
        return { kind, text: clean };
      };

      const attachCaptionToNearestBlock = (captionInfo) => {
        if (!captionInfo) return false;
        const bKey = babKeys[currentBabIndex];
        const sections = newBabSections[bKey] || [];
        for (let i = sections.length - 1; i >= 0; i--) {
          const section = sections[i];
          if (section.type === 'text') {
            if ((section.title || '').trim() || (section.content || '').trim()) break;
            continue;
          }
          if (section.type !== captionInfo.kind) break;
          const hasDefaultTitle = !section.title || section.title === 'Gambar' || section.title === 'Tabel' || section.title === 'Rumus';
          if (hasDefaultTitle || section.title === captionInfo.text) {
            section.title = captionInfo.text;
            return true;
          }
          return false;
        }
        return false;
      };

      // Initialize currentSectionId as null (we will dynamically create it when text/lists are found)
      currentSectionId = null;

      const frontMatterTexts = [];
      let isSkipMode = false;
      let hasHitFirstBab = false;
      let hasHitExplicitBab = false;
      let sistematikaOutlineMaxBabIndex = -1;
      let sistematikaOutlineComplete = false;
      let inSistematikaSection = false;
      let pendingChapterTitleKey = null;
      let pendingBlock = null; // { section, kind } of a just-created figure/table to capture a trailing caption
      let pendingCaption = null; // caption that appears before the related block (common for tables)

      Array.from(tempDiv.childNodes).forEach(node => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        
        const tagName = node.tagName.toLowerCase();
        const textContent = node.textContent.trim();
        const hasImg = !!(node.querySelector && node.querySelector('img'));
        
        if (!textContent && tagName !== 'img' && !hasImg) return;

        // If a figure/table was just created, a following short caption-like paragraph
        // (e.g. "Gambar MySQL", "Tabel 2.1 ...") belongs to that block — capture & swallow it
        // so it doesn't become a stray paragraph.
        if (pendingBlock) {
          const pb = pendingBlock;
          pendingBlock = null;
          const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
          if ((tagName === 'p' || tagName === 'div' || tagName === 'h1' || tagName === 'h2' || tagName === 'h3') && !hasImg && !(node.querySelector && node.querySelector('table'))) {
            const captionInfo = parseCaptionText(textContent);
            const isMatchingCaption = captionInfo && captionInfo.kind === pb.kind;
            const isDup = pb.section.title && norm(textContent) === norm(pb.section.title);
            const hasDefaultTitle = !pb.section.title || pb.section.title === 'Gambar' || pb.section.title === 'Tabel' || pb.section.title === 'Rumus';

            if (isDup || isMatchingCaption) {
              if (isMatchingCaption && hasDefaultTitle) {
                pb.section.title = captionInfo.text;
              }
              return; // caption belongs to the imported media/equation block
            }
            // otherwise fall through and treat as normal content
          }
        }

        // Skip Table of Contents entries entirely (contain dot leaders or page numbers at the end)
        // Check this immediately at the start to prevent triggering false chapter starts on TOC entries
        const isLikelyTocEntry = 
          (node.classList && node.classList.contains('toc-item')) ||
          /\t\s*(?:[0-9]{1,3}|[ivxldcm]+)\s*$/i.test(textContent) ||
          /[\.\s_]{2,}(?:[0-9]{1,3}|[ivxldcm]+)\s*$/i.test(textContent) ||
          (!hasHitFirstBab && /\s+(?:[0-9]{1,3}|[ivxldcm]+)\s*$/i.test(textContent)) ||
          /\.{4,}/.test(textContent);
        
        // Smart TOC block detection
        const lowerText = textContent.toLowerCase();
        const standaloneCaption = parseCaptionText(textContent);
        if (standaloneCaption && (tagName === 'p' || tagName === 'h1' || tagName === 'h2' || tagName === 'h3')) {
          const attached = attachCaptionToNearestBlock(standaloneCaption);
          if (!attached) pendingCaption = standaloneCaption;
          return;
        }

        const containsDaftarIsi = lowerText.includes('daftar isi') || lowerText.includes('daftar tabel') || lowerText.includes('daftar gambar') || lowerText.includes('daftar rumus');
        const containsBabI = /\bbab\s*(i|1)\b/i.test(lowerText);
        const containsBabII = /\bbab\s*(ii|2)\b/i.test(lowerText);
        const containsBabIII = /\bbab\s*(iii|3)\b/i.test(lowerText);
        const matchesMultipleBab = [containsBabI, containsBabII, containsBabIII].filter(Boolean).length >= 2;
        const isTocBlock = (containsDaftarIsi && (containsBabI || containsBabII || containsBabIII)) || matchesMultipleBab || (textContent.length > 500 && containsDaftarIsi);
        const textLines = textContent.split(/\n+/).map(line => line.trim()).filter(Boolean);
        const firstTextLine = textLines[0] || textContent;
        const sistematikaHeadingMatch = firstTextLine.match(/^(?:(\d+)\s*\.\s*(\d+)(?:\s*\.\s*\d+)?\s+)?(sistematika(?:\s+penulisan)?(?:\s+laporan)?(?:\s+tugas\s+akhir)?)/i);
        const isSistematikaHeading = sistematikaHeadingMatch &&
          (sistematikaHeadingMatch[1] || tagName === 'h1' || tagName === 'h2' || tagName === 'h3') &&
          firstTextLine.length < 160;

        if (isSistematikaHeading && allowContentBeforeBab()) {
          const chapterNo = sistematikaHeadingMatch[1] ? parseInt(sistematikaHeadingMatch[1], 10) : currentBabIndex + 1;
          if (chapterNo >= 1 && chapterNo <= babKeys.length) {
            isSkipMode = false;
            flushSection();
            currentBabIndex = chapterNo - 1;
            inSistematikaSection = true;
            currentSectionId = 'import_' + Date.now() + Math.random();
            newBabSections[babKeys[currentBabIndex]].push({
              id: currentSectionId,
              type: 'text',
              title: firstTextLine.replace(/^\d+\s*\.\s*\d+(?:\s*\.\s*\d+)?\s+/, '').trim(),
              content: '',
              headingLevel: 2,
              numberingStyle: getDefaultNumberingStyleForHeading(2)
            });

            const restContent = textLines.slice(1).join('\n\n').trim();
            if (restContent) {
              currentContent.push(restContent);
              const outlineIndexes = Array.from(restContent.matchAll(/\bBAB\s*(I{1,3}|IV|V|VI|1|2|3|4|5|6)\b/gi))
                .map(match => getBabIndexFromMarker(match[1]))
                .filter(index => index !== -1);
              if (outlineIndexes.length > 0) {
                sistematikaOutlineMaxBabIndex = Math.max(sistematikaOutlineMaxBabIndex, ...outlineIndexes);
                if (sistematikaOutlineMaxBabIndex >= 4) {
                  sistematikaOutlineComplete = true;
                }
              }
            }
            return;
          }
        }

        if (isLikelyTocEntry || isTocBlock) {
          if ((inSistematikaSection || isCurrentSistematikaSection()) && /\bBAB\s*(I{1,3}|IV|V|VI|1|2|3|4|5|6)\b/i.test(textContent)) {
            const outlineIndexes = Array.from(textContent.matchAll(/\bBAB\s*(I{1,3}|IV|V|VI|1|2|3|4|5|6)\b/gi))
              .map(match => getBabIndexFromMarker(match[1]))
              .filter(index => index !== -1);
            ensureWritableSection();
            currentContent.push(textContent);
            sistematikaOutlineMaxBabIndex = Math.max(sistematikaOutlineMaxBabIndex, ...outlineIndexes);
            if (sistematikaOutlineMaxBabIndex >= 4) {
              sistematikaOutlineComplete = true;
            }
            return;
          }
          if (isTocBlock && !hasHitFirstBab) {
            isSkipMode = true;
          }
          return;
        }

        const isFrontMatterHeading = (tagName === 'h1' || tagName === 'h2' || tagName === 'p') && 
                                     textContent.length < 100 &&
                                     /^(kata pengantar|ucapan terima kasih|daftar isi|daftar tabel|daftar gambar|daftar rumus|daftar lampiran|daftar simbol|daftar lambang|daftar singkatan|daftar istilah|abstrak|abstract|halaman pengesahan|halaman persetujuan|lembar pengesahan|lembar persetujuan|pernyataan|motto|persembahan)/i.test(textContent);

        // Smart BAB Detection: looks for "BAB I", "BAB 1", etc.
        const babMatch = textContent.match(/^BAB\s*(I{1,3}|IV|V|VI|1|2|3|4|5|6)\b/i);
        let explicitBabIndex = -1;

        if (babMatch && textContent.length < 100) {
          explicitBabIndex = getBabIndexFromMarker(babMatch[1]);
        }

        const isStyledHeadingTag = tagName === 'h1' || tagName === 'h2' || tagName === 'h3';
        const containedBabIndexes = Array.from(textContent.matchAll(/\bBAB\s*(I{1,3}|IV|V|VI|1|2|3|4|5|6)\b/gi))
          .map(match => getBabIndexFromMarker(match[1]))
          .filter(index => index !== -1);
        const numberedSubchapterMatch = textContent.match(/^(\d+)\s*\.\s*(\d+)(?:\s*\.\s*(\d+))?\s+(.+)$/);
        const isNumberedSubchapterParagraph = tagName === 'p' &&
          numberedSubchapterMatch &&
          textContent.length < 140 &&
          !/[.!?]\s*$/.test(textContent);

        if (isNumberedSubchapterParagraph && allowContentBeforeBab()) {
          const chapterNo = parseInt(numberedSubchapterMatch[1], 10);
          const subLevel = numberedSubchapterMatch[3] ? 3 : 2;
          const cleanTitle = numberedSubchapterMatch[4].trim();
          if (chapterNo >= 1 && chapterNo <= babKeys.length) {
            isSkipMode = false;
            flushSection();
            currentBabIndex = chapterNo - 1;
            inSistematikaSection = /\bsistematika\b/i.test(cleanTitle);
            currentSectionId = 'import_' + Date.now() + Math.random();
            newBabSections[babKeys[currentBabIndex]].push({
              id: currentSectionId,
              type: 'text',
              title: cleanTitle,
              content: '',
              headingLevel: subLevel,
              numberingStyle: getDefaultNumberingStyleForHeading(subLevel)
            });
            return;
          }
        }

        const isSistematikaOutlineCandidate = !isStyledHeadingTag &&
          (containedBabIndexes.length >= 2 || sistematikaOutlineMaxBabIndex !== -1 || explicitBabIndex === currentBabIndex);

        if (babMatch && explicitBabIndex !== -1 && (inSistematikaSection || isCurrentSistematikaSection()) && !sistematikaOutlineComplete && isSistematikaOutlineCandidate) {
          const isSequentialOutlineItem = explicitBabIndex >= sistematikaOutlineMaxBabIndex;
          if (isSequentialOutlineItem) {
            ensureWritableSection();
            currentContent.push(textContent);
            sistematikaOutlineMaxBabIndex = Math.max(sistematikaOutlineMaxBabIndex, ...containedBabIndexes, explicitBabIndex);
            if (sistematikaOutlineMaxBabIndex >= 4) {
              sistematikaOutlineComplete = true;
            }
            return;
          }
        }

        const isSemanticChapterHeading = tagName === 'h1' && isChapterTitle(textContent);
        const isChapter = explicitBabIndex !== -1 || isSemanticChapterHeading;

        const hadHitFirstBabBeforeThisNode = hasHitFirstBab;

        // Set hasHitFirstBab if it's an explicit bab or a chapter title
        if (isChapter) {
          hasHitFirstBab = true;
        }

        // Collect front matter text for cover parsing (excluding front matter section headers, TOC lines, tables, and lists)
        const isStructuralOrComplex = tagName === 'table' || tagName === 'ul' || tagName === 'ol' || 
                                      (node.querySelector && node.querySelector('table, ul, ol')) ||
                                      isTocBlock;
        if (!hasHitFirstBab && !isSkipMode && tagName !== 'script' && tagName !== 'style' && !isStructuralOrComplex) {
          const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 2);
          lines.forEach(line => {
            const lineLower = line.toLowerCase();
            const isLineHeader = line.length < 100 && /^(kata pengantar|ucapan terima kasih|daftar isi|daftar tabel|daftar gambar|daftar rumus|daftar lampiran|daftar simbol|daftar lambang|daftar singkatan|daftar istilah|abstrak|abstract|halaman pengesahan|halaman persetujuan|lembar pengesahan|lembar persetujuan|pernyataan|motto|persembahan)/i.test(line);
            const isLineToc = isLikelyTocEntry || /[\.\s_]{3,}\d+$/m.test(line);
            const isLineChapter = isChapterTitle(line);
            const isLineSubChapter = /^\s*\d+\.\d+/.test(line);
            if (!isLineHeader && !isLineToc && !isLineChapter && !isLineSubChapter) {
              frontMatterTexts.push({ text: line, tag: tagName });
            }
          });
        }

        if (isFrontMatterHeading && hasExplicitChapters) {
           isSkipMode = true;
           return;
        }

        if (isChapter) {
          isSkipMode = false;
          flushSection();
          inSistematikaSection = false;
          
          const cleanTitle = textContent.replace(/^\s*(?:\par|\(?\d+(?:\.\d+)*[.)]?|[A-Za-z][.)]|\([A-Za-z0-9]+\))\s*/, '').trim();
          const babMatchInner = cleanTitle.match(/^BAB\s*(I{1,3}|IV|V|VI|1|2|3|4|5|6)\b/i);
          let explicitIndex = -1;
          if (babMatchInner) {
            explicitIndex = getBabIndexFromMarker(babMatchInner[1]);
          }

          if (explicitIndex !== -1) {
            currentBabIndex = explicitIndex;
            hasHitExplicitBab = true;
          } else if (explicitBabIndex !== -1) {
            currentBabIndex = explicitBabIndex;
            hasHitExplicitBab = true;
          } else if (hadHitFirstBabBeforeThisNode && currentBabIndex < 4) {
            currentBabIndex++;
          } else if (!hasExplicitChapters && currentBabIndex < 4 && newBabSections[babKeys[currentBabIndex]].length > 0 && 
              (newBabSections[babKeys[currentBabIndex]][0].content !== '' || newBabSections[babKeys[currentBabIndex]].length > 1)) {
            currentBabIndex++;
          }

          const bKey = babKeys[currentBabIndex];
          let parsedPrefix = babTitles[bKey]?.prefix || `BAB ${currentBabIndex + 1}`;
          let parsedTitle = cleanTitle;
          if (babMatchInner) {
            parsedPrefix = babMatchInner[0].toUpperCase();
            parsedTitle = cleanTitle.substring(babMatchInner[0].length).trim();
          }
          const hasTitleInBabLine = !!parsedTitle;
          if (!parsedTitle) {
            parsedTitle = babTitles[bKey]?.title || '';
          }

          newBabTitles[bKey] = {
            prefix: parsedPrefix.toUpperCase(),
            title: parsedTitle.toUpperCase()
          };
          pendingChapterTitleKey = hasTitleInBabLine ? null : bKey;

          // Reset currentSectionId to null so any following text starts a new block
          currentSectionId = null;
        } 
        else if (pendingChapterTitleKey && (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || tagName === 'p') && textContent.length < 120) {
          const titleCandidate = textContent.replace(/^\s*(?:\par|\(?\d+(?:\.\d+)*[.)]?|[A-Za-z][.)]|\([A-Za-z0-9]+\))\s*/, '').trim();
          if (titleCandidate && !/[\.\?!]\s*$/.test(titleCandidate)) {
            newBabTitles[pendingChapterTitleKey] = {
              ...newBabTitles[pendingChapterTitleKey],
              title: titleCandidate.toUpperCase()
            };
            pendingChapterTitleKey = null;
            return;
          }
        }
        else if (tagName === 'h1') {
          // Treat this H1 as a Sub-Bab (level 2) instead of a Bab (level 0)
          if (!allowContentBeforeBab()) return;
          isSkipMode = false;
          flushSection();

          let cleanTitle = textContent.replace(/^\s*(?:\par|\(?\d+(?:\.\d+)*[.)]?|[A-Za-z][.)]|\([A-Za-z0-9]+\))\s*/, '').trim();
          if (!cleanTitle) cleanTitle = textContent;
          inSistematikaSection = /\bsistematika\b/i.test(cleanTitle);

          currentSectionId = 'import_' + Date.now() + Math.random();
          newBabSections[babKeys[currentBabIndex]].push({
            id: currentSectionId,
            type: 'text',
            title: cleanTitle,
            content: '',
            headingLevel: 2,
            numberingStyle: 'bab_prefix_dot'
          });
        } 
        else if (tagName === 'h2' || tagName === 'h3') {
          // Treat this H2/H3 as a Sub-chapter/Sub-sub-chapter
          if (!allowContentBeforeBab()) return;
          isSkipMode = false;
          flushSection();

          // Strip leading numbering from H2/H3
          let cleanTitle = textContent.replace(/^\s*(?:\par|\(?\d+(?:\.\d+)*[.)]?|[A-Za-z][.)]|\([A-Za-z0-9]+\))\s*/, '').trim();
          if (!cleanTitle) cleanTitle = textContent;
          inSistematikaSection = /\bsistematika\b/i.test(cleanTitle);

          currentSectionId = 'import_' + Date.now() + Math.random();
          
          // Classify level and numbering style based on Indonesian thesis structure
          const isH2 = tagName === 'h2';
          const titleLower = cleanTitle.toLowerCase();
          const isMainSub = /^(latar belakang|identifikasi masalah|batasan masalah|rumusan masalah|tujuan|manfaat|keaslian|sistematika|penelitian terdahulu|kajian pustaka|landasan teori|tinjauan pustaka|kerangka|hipotesis|desain|pendekatan|variabel|populasi|sampel|instrumen|pengumpulan data|analisis data|deskripsi data|pembahasan|kesimpulan|saran)/i.test(titleLower);
          
          const level = (isH2 || isMainSub) ? 2 : 3;
          newBabSections[babKeys[currentBabIndex]].push({
            id: currentSectionId,
            type: 'text',
            title: cleanTitle,
            content: '',
            headingLevel: level,
            numberingStyle: getDefaultNumberingStyleForHeading(level)
          });
        } 
        else if (tagName === 'table' || (tagName === 'div' && node.querySelector && node.querySelector('table'))) {
          if (isSkipMode || !allowContentBeforeBab()) return;
          const tableEl = tagName === 'table' ? node : node.querySelector('table');
          if (!tableEl) return;
          flushSection();
          const bKey = babKeys[currentBabIndex];
          const border = tableEl.getAttribute('border');
          const isEquation = border === '0' || tableEl.classList.contains('equation-table');

          if (isEquation) {
            // Equation: formula in first cell, optional title <p>, optional "Keterangan" <p>
            const cells = Array.from(tableEl.querySelectorAll('td, th'));
            const formula = cells[0] ? cells[0].textContent.trim() : '';
            let title = '';
            let description = '';
            if (tagName === 'div') {
              const ps = Array.from(node.querySelectorAll('p'));
              const titleP = ps.find(p => p.textContent.trim() && !/^keterangan/i.test(p.textContent.trim()));
              if (titleP) title = titleP.textContent.trim();
              const ketP = ps.find(p => /keterangan/i.test(p.textContent));
              if (ketP) description = ketP.textContent.replace(/keterangan\s*:?/i, '').trim();
            }
            const eqSection = {
              id: 'import_eq_' + Date.now() + Math.random(),
              type: 'equation',
              title: (pendingCaption?.kind === 'equation' && pendingCaption.text) || title || 'Rumus',
              content: formula || 'y = f(x)',
              description: description,
              page: 1
            };
            if (pendingCaption?.kind === 'equation') pendingCaption = null;
            newBabSections[bKey].push(eqSection);
            pendingBlock = { section: eqSection, kind: 'equation' };
          } else {
            const parsed = parseImportedTable(tableEl);
            const caption = tagName === 'div' ? pickCaption(node) : '';
            const tabSection = {
              id: 'import_tab_' + Date.now() + Math.random(),
              type: 'table',
              title: (pendingCaption?.kind === 'table' && pendingCaption.text) || caption || 'Tabel',
              page: 1,
              headers: parsed.headers,
              rows: parsed.rows,
              rowsText: parsed.rows.map(r => r.join(', ')).join('\n')
            };
            if (pendingCaption?.kind === 'table') pendingCaption = null;
            newBabSections[bKey].push(tabSection);
            pendingBlock = { section: tabSection, kind: 'table' };
          }
          startContinuationSection(bKey);
        }
        else if (tagName === 'img' || (node.querySelector && node.querySelector('img')) || (tagName === 'div' && /\[Skema|Diagram/i.test(textContent))) {
          if (isSkipMode || !allowContentBeforeBab()) return;
          flushSection();
          const bKey = babKeys[currentBabIndex];
          const imgEl = tagName === 'img' ? node : (node.querySelector ? node.querySelector('img') : null);
          const caption = (tagName === 'div' || hasImg) ? pickCaption(node) : '';
          const figSection = {
            id: 'import_fig_' + Date.now() + Math.random(),
            type: 'figure',
            title: (pendingCaption?.kind === 'figure' && pendingCaption.text) || caption || 'Gambar',
            page: 1,
            imageData: imgEl && imgEl.getAttribute('src') ? imgEl.getAttribute('src') : null
          };
          if (pendingCaption?.kind === 'figure') pendingCaption = null;
          newBabSections[bKey].push(figSection);
          pendingBlock = { section: figSection, kind: 'figure' };
          startContinuationSection(bKey);
        }
        else if (tagName === 'p') {
          if (isSkipMode || !allowContentBeforeBab()) return;
          
          ensureWritableSection();
          currentContent.push(textContent);
        } 
        else if (tagName === 'ul' || tagName === 'ol') {
          if (isSkipMode || !allowContentBeforeBab()) return;
          
          ensureWritableSection();
          const listItems = Array.from(node.querySelectorAll('li')).map(li => '- ' + li.textContent.trim());
          currentContent.push(listItems.join('\n'));
        }
      });
      
      flushSection();

      // Clean up empty sections
      babKeys.forEach(k => {
        newBabSections[k] = newBabSections[k].filter(s => {
          if (s.type !== 'text') return true; // keep tables/figures/equations
          return (s.title || '').trim() !== '' || (s.content || '').trim() !== '';
        });
      });

      if (hasContentFallback && !hasExplicitChapters) {
        newBabTitles.bab1 = {
          prefix: 'DOKUMEN IMPORT',
          title: newFilename.toUpperCase(),
        };
      }

      // Heuristically extract cover information from front matter
      const nonEmptyFront = frontMatterTexts.filter(x => x.text.length > 2);
      let extTitle = '';
      let extSubtitle = '';
      let extAuthor = '';
      let extNim = '';
      let extProdi = '';
      let extFakultas = '';
      let extUniv = '';
      let extCity = '';
      let extYear = '';

      // First pass: extract author name, NIM, prodi, fakultas, university, etc.
      // to identify their line indices and avoid treating them as part of the title candidates
      let authorLineIdx = -1;
      let nimLineIdx = -1;

      nonEmptyFront.forEach((item, index) => {
        const text = item.text.trim();
        
        // NIM/NPM detection
        const nimMatch = text.match(/(?:nim|npm)\s*:?\s*([0-9]{7,15})/i);
        if (nimMatch) {
          extNim = nimMatch[1];
          nimLineIdx = index;
        }

        // Author name detection via Disusun Oleh / Oleh / Nama (flexible with/without colon)
        if (/^(?:nama|disusun oleh|oleh)\b/i.test(text)) {
          const afterColon = text.replace(/^(?:nama|disusun oleh|oleh)\s*:?\s*/i, '').trim();
          if (afterColon && afterColon.length > 2) {
            extAuthor = afterColon;
          } else if (index + 1 < nonEmptyFront.length) {
            extAuthor = nonEmptyFront[index + 1].text.trim();
            authorLineIdx = index + 1;
          }
        }

        // Prodi detection
        if (/(?:program studi|prodi|jurusan)\s*:?\s*(.+)/i.test(text)) {
          extProdi = text.replace(/(?:program studi|prodi|jurusan)\s*:?\s*/i, '').trim();
        }

        // Fakultas detection
        if (/(?:fakultas)\s*:?\s*(.+)/i.test(text)) {
          extFakultas = text.replace(/(?:fakultas)\s*:?\s*/i, '').trim();
        }

        // Universitas detection
        if (/(?:universitas|institut|sekolah tinggi)\s*(.+)/i.test(text)) {
          extUniv = text.trim();
        }

        // City & Year
        const cityYearMatch = text.match(/^([A-Za-z\s]+),\s*(\d{4})$/);
        if (cityYearMatch) {
          extCity = cityYearMatch[1].trim();
          extYear = cityYearMatch[2].trim();
        } else {
          const yearMatch = text.match(/\b(202\d|201\d|199\d)\b/);
          if (yearMatch) {
            extYear = yearMatch[1];
          }
        }
      });

      // Heuristic fallback for NIM and Author
      if (!extNim || !extAuthor) {
        nonEmptyFront.forEach((item, index) => {
          const text = item.text.trim();
          const isOnlyDigits = /^[0-9]{7,15}$/.test(text);
          if (isOnlyDigits) {
            extNim = text;
            nimLineIdx = index;
            if (index > 0 && !extAuthor) {
              const prevText = nonEmptyFront[index - 1].text.trim();
              if (prevText.length > 2 && prevText.length < 50 && !/^(oleh|disusun|nim|npm|skripsi|tesis|proposal|tugas|program|prodi|fakultas|universitas)/i.test(prevText)) {
                extAuthor = prevText;
                authorLineIdx = index - 1;
              }
            }
          }
        });
      }

      // City fallback
      if (!extCity && nonEmptyFront.length > 0) {
        for (let i = nonEmptyFront.length - 1; i >= Math.max(0, nonEmptyFront.length - 3); i--) {
          const text = nonEmptyFront[i].text.trim();
          if (/^[A-Za-z\s]+$/.test(text) && text.length > 3 && text.length < 30 && !/^(universitas|fakultas|prodi|program)/i.test(text)) {
            extCity = text;
            break;
          }
        }
      }

      // Second pass: extract Title & Subtitle via smart candidates selection, excluding identified metadata lines
      const titleCandidates = [];
      const subtitleCandidates = [];
      
      nonEmptyFront.slice(0, 25).forEach((item, index) => {
        // Exclude lines identified as author or NIM
        if (index === authorLineIdx || index === nimLineIdx) {
          return;
        }

        const text = item.text.trim();
        const lower = text.toLowerCase();
        
        // Skip lines that contain metadata keywords directly
        if (/(?:oleh|disusun|nim|npm|program studi|prodi|jurusan|fakultas|universitas|institut|sekolah tinggi)/i.test(text)) {
          return;
        }
        // Also skip digits only (looks like NIM or Year)
        if (/^\d+$/.test(text)) {
          return;
        }
        // Skip city/year lines like "CIANJUR, 2026", "Jakarta 2026", or a bare year
        if (/^[A-Za-z.\s]+,?\s*(?:19|20)\d{2}\.?$/.test(text)) {
          return;
        }
        if (/^(?:19|20)\d{2}$/.test(text)) {
          return;
        }
        // Skip if it matches the detected city
        if (extCity && text.toLowerCase().includes(extCity.toLowerCase()) && text.length < 30) {
          return;
        }

        // Skip if it matches the detected author name directly
        if (extAuthor && text.toLowerCase() === extAuthor.toLowerCase()) {
          return;
        }

        // If it looks like a document type label (skripsi, proposal, tesis, etc.)
        if (/^(skripsi|tesis|tugas akhir|laporan tugas akhir|proposal|usulan penelitian|laporan)/i.test(lower) && text.length < 50) {
          subtitleCandidates.push(text);
        } else if (text.length > 10 && text.length < 250) {
          titleCandidates.push(text);
        }
      });

      if (titleCandidates.length > 0) {
        extTitle = titleCandidates.join(' ');
      }
      if (subtitleCandidates.length > 0) {
        extSubtitle = subtitleCandidates[0];
      }

      // If we extracted title/author, set them
      const updatedCover = {
        title: extTitle || cover.title,
        subtitle: extSubtitle || cover.subtitle,
        author: extAuthor || cover.author,
        nim: extNim || cover.nim,
        prodi: extProdi || cover.prodi,
        fakultas: extFakultas || cover.fakultas,
        univ: extUniv || cover.univ,
        city: extCity || cover.city,
        year: extYear || cover.year,
        logoType: cover.logoType,
        logoData: cover.logoData
      };

      setCover(updatedCover);

      const importedCoverElements = defaultCoverElements.map(el => {
        if (el.field === 'title' && updatedCover.title) return { ...el, value: updatedCover.title.toUpperCase() };
        if (el.field === 'subtitle' && updatedCover.subtitle) return { ...el, value: updatedCover.subtitle.toUpperCase() };
        if (el.field === 'author' && updatedCover.author) return { ...el, value: updatedCover.author.toUpperCase() };
        if (el.field === 'nim' && updatedCover.nim) return { ...el, value: updatedCover.nim };
        if (el.field === 'prodi' && updatedCover.prodi) return { ...el, value: `PROGRAM STUDI ${updatedCover.prodi.toUpperCase()}` };
        if (el.field === 'fakultas' && updatedCover.fakultas) return { ...el, value: updatedCover.fakultas.toUpperCase().startsWith('FAKULTAS') ? updatedCover.fakultas.toUpperCase() : `FAKULTAS ${updatedCover.fakultas.toUpperCase()}` };
        if (el.field === 'univ' && updatedCover.univ) return { ...el, value: updatedCover.univ.toUpperCase() };
        if (el.field === 'city_year') {
          const cityStr = updatedCover.city || 'JAKARTA';
          const yearStr = updatedCover.year || '2026';
          return { ...el, value: `${cityStr.toUpperCase()}, ${yearStr}` };
        }
        return el;
      });

      setCoverElements(importedCoverElements);

      setBabSections(newBabSections);
      setBabTitles(newBabTitles);
      
      const updatedLayout = {
        ...layout,
        ...docLayoutSettings,
        blankMode: false,
        hideEmptyChapters: true,
      };
      setLayout(updatedLayout);
      const updatedHeadingStyles = Object.keys(docHeadingStyles).length > 0
        ? {
            ...headingStyles,
            ...Object.fromEntries(
              Object.entries(docHeadingStyles).map(([key, value]) => [
                key,
                { ...(headingStyles[key] || {}), ...value },
              ])
            ),
          }
        : headingStyles;
      if (updatedHeadingStyles !== headingStyles) {
        setHeadingStyles(updatedHeadingStyles);
      }
      
      if (isCreateNew) {
        saveLocalDraft({ 
          babSections: newBabSections, 
          saveFilename: newFilename,
          cover: updatedCover,
          coverElements: importedCoverElements,
          babTitles: newBabTitles,
          layout: updatedLayout,
          headingStyles: updatedHeadingStyles
        });
      } else {
        saveLocalDraft({ 
          babSections: newBabSections,
          cover: updatedCover,
          coverElements: importedCoverElements,
          babTitles: newBabTitles,
          layout: updatedLayout,
          headingStyles: updatedHeadingStyles
        });
      }
      setHasLocalDraft(true);
      setShowWelcomeModal(false);
      const importSummary = createImportSummary({
        sourceMeta,
        docLayoutSettings,
        hasExplicitChapters,
        hasContentFallback,
      });
      showToast(`Impor dokumen Word berhasil. ${importSummary}`);

      if (isCreateNew) {
        showToast("Sedang membuat draft baru di database...");
        const draftPayload = {
          layout: updatedLayout, 
          cover: updatedCover, 
          coverElements: importedCoverElements, 
          babSections: newBabSections, 
          babTitles: newBabTitles, 
          references, 
          refStyle, 
          tables: getAllTables(newBabSections), 
          figures: getAllFigures(newBabSections),
          abstrakIndo, 
          abstrakIndoKeywords, 
          abstrakEng, 
          abstrakEngKeywords, 
          headingStyles: updatedHeadingStyles
        };
        try {
          const { response, result, payloadString } = await saveDraftToServer(newFilename, draftPayload, { source: 'manual' });
          if (response.ok && result.success) {
            setSaveFilename(newFilename);
            autosaveConfirmedRef.current = newFilename;
            lastSavedPayloadRef.current = payloadString;
            showToast(`Draft baru "${newFilename}" berhasil dibuat!`);
            fetchDraftsList();
          } else {
            showToast(result.message || "Gagal membuat draft baru di database.", true);
          }
        } catch (dbErr) {
          console.error(dbErr);
          showToast("Gagal menyimpan draft baru ke database: " + dbErr.message, true);
        }
      }
    } catch (err) {
      console.error('DOCX import failed:', err);
      showToast('Gagal memproses dokumen: ' + err.message, true);
    }
    
    e.target.value = ''; // Reset
  };



  return handleDocxImport;
};

