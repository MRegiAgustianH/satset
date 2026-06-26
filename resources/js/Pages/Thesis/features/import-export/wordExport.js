import { downloadHtmlAsDocx } from './docxExport';
import { buildCoverWordHtml } from './wordHtmlBuilders';
import { getCleanFontFamily, getWordLineHeightPercent } from '../document-preview/documentStyles';

export async function exportWordDocument({
  pageIds,
  filename,
  layout,
  headingStyles,
  cover,
  coverElements,
  babSections,
  babTitles,
  references,
  refStyle,
  abstrakIndo,
  abstrakIndoKeywords,
  abstrakEng,
  abstrakEngKeywords,
  getSectionParagraphIndent,
  getParagraphAlignment,
  italicizeEnglishWordsText,
  renderFormula,
}) {
    let combinedHtml = '';
    
    const cleanFontFamily = getCleanFontFamily(layout.fontFamily);
    const wordLineHeight = getWordLineHeightPercent(layout.lineSpacing);

    // Build a map of figure blockId -> natural pixel dimensions from the rendered DOM,
    // so exported images can be scaled to match the on-screen (web) display size.
    const figureDims = {};
    document.querySelectorAll('img[data-fig-id]').forEach(img => {
      const id = img.getAttribute('data-fig-id');
      if (id && img.naturalWidth && img.naturalHeight) {
        figureDims[id] = { w: img.naturalWidth, h: img.naturalHeight };
      }
    });



    const copyComputedBoxStyles = (source, target, properties) => {
      if (!source || !target) return;
      const computed = window.getComputedStyle(source);
      properties.forEach((property) => {
        const value = computed.getPropertyValue(property);
        if (value) target.style.setProperty(property, value);
      });
    };


    const appendStaticPageNumber = (pageEl, contentClone) => {
      const pageNumberEl = pageEl.querySelector('.page-number');
      const pageNumber = pageNumberEl?.textContent?.trim();
      if (!pageNumber) return;

      const computed = window.getComputedStyle(pageNumberEl);
      const numberParagraph = document.createElement('p');
      numberParagraph.className = 'word-static-page-number';
      numberParagraph.textContent = pageNumber;
      numberParagraph.style.fontFamily = layout.fontFamily || 'Times New Roman, serif';
      numberParagraph.style.fontSize = layout.fontSize || '12pt';
      numberParagraph.style.lineHeight = '1';
      numberParagraph.style.textIndent = '0cm';
      numberParagraph.style.margin = '0';

      const isTopNumber = computed.top && computed.top !== 'auto';
      const isRightNumber = computed.right && computed.right !== 'auto';
      const isCenterNumber = (computed.left && computed.left !== 'auto') || pageNumberEl.className.includes('left-1/2');
      numberParagraph.style.textAlign = isRightNumber ? 'right' : (isCenterNumber ? 'center' : 'center');

      if (isTopNumber) {
        numberParagraph.style.marginBottom = '0.5cm';
        contentClone.insertBefore(numberParagraph, contentClone.firstChild);
      } else {
        numberParagraph.style.marginTop = '0.5cm';
        contentClone.appendChild(numberParagraph);
      }
    };

    const preservePreviewLayoutStyles = (pageEl, contentClone) => {
      const contentSource = pageEl.querySelector('.page-content');
      copyComputedBoxStyles(contentSource, contentClone, [
        'display', 'flex-direction', 'justify-content', 'align-items',
        'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
        'text-align', 'text-indent', 'font-family', 'font-size', 'font-weight',
        'line-height', 'box-sizing', 'width',
      ]);

      const sourceElements = Array.from(contentSource?.querySelectorAll('*') || []);
      const clonedElements = Array.from(contentClone.querySelectorAll('*'));
      clonedElements.forEach((target, index) => {
        const source = sourceElements[index];
        if (!source) return;
        copyComputedBoxStyles(source, target, [
          'display', 'flex-direction', 'justify-content', 'align-items',
          'gap', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
          'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
          'text-align', 'text-indent', 'font-family', 'font-size', 'font-weight',
          'font-style', 'line-height', 'width', 'max-width',
        ]);
      });
    };

    let currentSection = null;
    const sectionOf = (pid) => {
      if (pid === 'cover') return 'cover';
      if (/^bab\d+-\d+$/.test(pid) || pid.startsWith('daftar-pustaka')) return 'main';
      return 'prelim';
    };
    const sectionClassMap = { cover: 'WordSectionCover', prelim: 'WordSection1', main: 'WordSection2' };
    const sectionTransition = (pid) => {
      const sec = sectionOf(pid);
      let html;
      if (currentSection === null) {
        html = `<div class="${sectionClassMap[sec]}">`;
      } else if (sec !== currentSection) {
        html = `</div><br clear="all" style="page-break-before: always; mso-break-type: section-break;" /><div class="${sectionClassMap[sec]}">`;
      } else {
        html = '<br clear="all" style="page-break-before: always;" />';
      }
      currentSection = sec;
      return html;
    };

    pageIds.forEach((pageId) => {
      // Export from the already-rendered preview page so DOCX follows the same
      // pagination, manual page breaks, captions, tables, figures, and numbering
      // the user sees on screen.
      const pageEl = document.getElementById(`page-${pageId}`);
      if (pageEl) {
        const contentClone = pageEl.querySelector('.page-content').cloneNode(true);
        preservePreviewLayoutStyles(pageEl, contentClone);
        appendStaticPageNumber(pageEl, contentClone);
        
        // Remove print-only or editor helper controls
        contentClone.querySelectorAll('.no-print').forEach(el => el.remove());
        
        // Unwrap heading elements (h1-h6) from nested div wrappers so Word recognizes them as outline headings
        contentClone.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
          let parent = heading.parentElement;
          // Keep unwrapping if parent div only contains this heading (after no-print removal)
          while (parent && parent.tagName === 'DIV' && parent !== contentClone) {
            const siblings = Array.from(parent.childNodes).filter(n => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim()));
            if (siblings.length === 1 && siblings[0] === heading) {
              const grandparent = parent.parentElement;
              grandparent.replaceChild(heading, parent);
              parent = heading.parentElement;
            } else {
              break;
            }
          }
        });
        
        // Find empty spacing elements and insert non-breaking spaces so Word doesn't collapse them
        contentClone.querySelectorAll('div').forEach(div => {
          if (div.style.height && !div.innerHTML.trim()) {
            div.innerHTML = '&nbsp;';
            div.style.fontSize = '1pt';
            div.style.lineHeight = '1';
          }
        });
        
        // Preserve image dimensions from the rendered preview. This is crucial
        // for cover logos because CSS max-width/max-height is otherwise lost when
        // Word imports the cloned HTML and would fall back to oversized images.
        const sourceImages = Array.from(pageEl.querySelectorAll('.page-content img'));
        contentClone.querySelectorAll('img').forEach((img, imageIndex) => {
          const sourceImage = sourceImages[imageIndex];
          const rect = sourceImage?.getBoundingClientRect();
          const width = rect && rect.width > 0 ? Math.round(rect.width) : null;
          const height = rect && rect.height > 0 ? Math.round(rect.height) : null;

          if (width) {
            img.setAttribute('width', String(width));
            img.style.width = `${width}px`;
          }
          if (height) {
            img.setAttribute('height', String(height));
            img.style.height = `${height}px`;
          }
          img.style.maxWidth = '100%';
          img.style.objectFit = 'contain';
        });

        // Transform only direct list rows from the preview into Word-friendly
        // hanging-indent paragraphs. Avoid querying nested flex nodes because that
        // can accidentally consume TOC/table/equation layouts and scramble points.
        contentClone.querySelectorAll('.flex').forEach(flexEl => {
          const directChildren = Array.from(flexEl.children);
          const bulletSpan = directChildren.find((child) => child.classList?.contains('shrink-0') && (child.classList.contains('w-8') || child.classList.contains('w-6')));
          const textSpan = directChildren.find((child) => child.classList?.contains('flex-1'));
          const bulletText = bulletSpan?.textContent?.trim() || '';
          const isListBullet = /^[0-9A-Za-z]+[.)]$/.test(bulletText);
          if (bulletSpan && textSpan && isListBullet) {
            const p = document.createElement('p');
            p.style.margin = '0';
            const listMarginLeft = flexEl.style.marginLeft || '0cm';
            const listMarginRight = flexEl.style.marginRight || '0cm';
            const hangingIndent = bulletSpan.classList.contains('w-6') ? '0.65cm' : '1cm';
            p.style.marginLeft = `calc(${listMarginLeft} + ${hangingIndent})`;
            p.style.marginRight = listMarginRight;
            p.style.textIndent = `-${hangingIndent}`;
            p.style.textAlign = flexEl.style.textAlign || textSpan.style.textAlign || 'justify';
            p.setAttribute('style', (p.getAttribute('style') || '') + `; mso-tab-stops:${hangingIndent};`);
            
            p.innerHTML = `<span style="font-weight:bold;">${bulletSpan.innerHTML.trim()}</span><span style="mso-tab-count:1">&#9;</span>${textSpan.innerHTML.trim()}`;
            
            flexEl.parentNode.replaceChild(p, flexEl);
          } else if (flexEl.classList.contains('justify-between') && flexEl.classList.contains('items-baseline')) {
            const titleContainer = flexEl.children[0];
            const pageNumContainer = flexEl.children[1];
            
            if (titleContainer && pageNumContainer) {
              const p = document.createElement('p');
              p.style.margin = '0';
              p.style.marginBottom = '2pt';
              p.style.textAlign = 'left';
              
              if (flexEl.style.paddingLeft) {
                p.style.marginLeft = flexEl.style.paddingLeft;
              }
              if (flexEl.classList.contains('mt-3')) {
                p.style.marginTop = '12pt';
              }
              if (flexEl.classList.contains('font-bold')) {
                p.style.fontWeight = 'bold';
              }
              
              const contentWidth = 21.0 - (parseFloat(layout.marginLeft) || 4.0) - (parseFloat(layout.marginRight) || 3.0);
              // NATIVE WORD DOT LEADER (relies on .toc-item class in <style> block)
              p.classList.add('toc-item');
              
              const titleSpan = titleContainer.querySelector('.pr-2');
              const titleHtml = titleSpan ? titleSpan.innerHTML : titleContainer.innerHTML;
              const pageHtml = pageNumContainer.innerHTML;
              
              p.innerHTML = `${titleHtml}<span style="mso-tab-count:1">&#9;</span>${pageHtml}`;
              
              flexEl.parentNode.replaceChild(p, flexEl);
            }
          }
        });

        // Transform dynamic flex equation containers to borderless tables for Word
        contentClone.querySelectorAll('.equation-block').forEach(eqEl => {
          // Find components
          const titleDiv = eqEl.querySelector('.font-bold.text-xs.text-left');
          const titleText = titleDiv ? titleDiv.innerHTML : '';
          
          // Formula and prefix
          const formulaContainer = eqEl.querySelector('.flex.items-center.justify-between');
          const formulaText = formulaContainer?.querySelector('.flex-1')?.innerHTML || '';
          const prefixText = formulaContainer?.querySelector('.shrink-0')?.innerHTML || '';
          
          // Keterangan lines
          const descContainer = eqEl.querySelector('.text-\\[10pt\\]');
          const descLines = [];
          if (descContainer) {
            descContainer.querySelectorAll('div > div').forEach(lineEl => {
              descLines.push(lineEl.innerHTML);
            });
          }
          
          // Construct Word-friendly HTML replacement
          const newContainer = document.createElement('div');
          newContainer.style.marginTop = '12pt';
          newContainer.style.marginBottom = '12pt';
          newContainer.style.textIndent = '0cm';
          
          if (titleText.trim()) {
            const titleP = document.createElement('p');
            titleP.style.margin = '0';
            titleP.style.marginBottom = '6pt';
            titleP.style.fontWeight = 'bold';
            titleP.style.fontSize = '12pt';
            titleP.style.textAlign = 'left';
            titleP.style.fontFamily = cleanFontFamily;
            titleP.innerHTML = titleText;
            newContainer.appendChild(titleP);
          }
          
          // Create the borderless table for centered formula and right-aligned numbering
          const table = document.createElement('table');
          table.setAttribute('border', '0');
          table.setAttribute('cellspacing', '0');
          table.setAttribute('cellpadding', '0');
          table.style.borderCollapse = 'collapse';
          table.style.width = '100%';
          table.style.border = 'none';
          table.style.marginTop = '6pt';
          table.style.marginBottom = '6pt';
          table.classList.add('border-none'); 
          table.classList.add('equation-table'); 
          
          const tr = document.createElement('tr');
          tr.style.border = 'none';
          
          const tdFormula = document.createElement('td');
          tdFormula.style.width = '90%';
          tdFormula.style.textAlign = 'center';
          tdFormula.style.fontFamily = cleanFontFamily;
          tdFormula.style.fontSize = '12pt';
          tdFormula.style.fontWeight = 'bold';
          tdFormula.style.fontStyle = 'italic';
          tdFormula.style.border = 'none';
          tdFormula.style.padding = '0';
          tdFormula.innerHTML = formulaText;
          
          const tdPrefix = document.createElement('td');
          tdPrefix.style.width = '10%';
          tdPrefix.style.textAlign = 'right';
          tdPrefix.style.fontFamily = cleanFontFamily;
          tdPrefix.style.fontSize = '12pt';
          tdPrefix.style.fontWeight = 'bold';
          tdPrefix.style.border = 'none';
          tdPrefix.style.padding = '0';
          tdPrefix.innerHTML = prefixText;
          
          tr.appendChild(tdFormula);
          tr.appendChild(tdPrefix);
          table.appendChild(tr);
          newContainer.appendChild(table);
          
          // Keterangan if exists
          if (descLines.length > 0) {
            const descP = document.createElement('p');
            descP.style.margin = '0';
            descP.style.marginTop = '6pt';
            descP.style.marginBottom = '0pt';
            descP.style.marginLeft = '1cm';
            descP.style.textIndent = '0cm';
            descP.style.fontFamily = cleanFontFamily;
            descP.style.fontSize = '11pt';
            descP.style.lineHeight = '1.2';
            
            let descHtml = '<span style="font-weight:bold;">Keterangan:</span><br/>';
            descLines.forEach((line, lIdx) => {
              descHtml += `<span style="font-style:italic;">${line}</span>`;
              if (lIdx < descLines.length - 1) {
                descHtml += '<br/>';
              }
            });
            descP.innerHTML = descHtml;
            newContainer.appendChild(descP);
          }
          
          eqEl.parentNode.replaceChild(newContainer, eqEl);
        });

        // Ensure mock diagrams / empty image cards render nicely with borders in Word instead of collapsing
        contentClone.querySelectorAll('div').forEach(div => {
          if (div.classList.contains('bg-slate-50') && !div.querySelector('img')) {
            div.style.border = '1px dashed #777';
            div.style.backgroundColor = '#f3f4f6';
            div.style.width = '100%';
            div.style.height = '120px';
            div.style.padding = '20px';
            div.style.textAlign = 'center';
            div.innerHTML = `<p style="font-family: monospace; font-size: 9pt; color: #555; text-align: center; text-indent: 0cm; margin-top: 20px;">[Skema / Diagram Model]</p>`;
          }
        });

        // Translate Tailwind alignment, weight, and border classes to direct CSS attributes
        contentClone.querySelectorAll('*').forEach(el => {
          let style = '';
          if (el.classList.contains('text-center') || el.style.textAlign === 'center') {
            style += 'text-align: center; ';
            el.setAttribute('align', 'center');
          } else if (el.classList.contains('text-justify') || el.style.textAlign === 'justify') {
            style += 'text-align: justify; ';
          } else if (el.classList.contains('text-right') || el.style.textAlign === 'right') {
            style += 'text-align: right; ';
            el.setAttribute('align', 'right');
          }
          
          if (el.classList.contains('font-bold') || el.tagName === 'H1' || el.tagName === 'H2' || el.tagName === 'H3' || el.tagName === 'H4') {
            style += 'font-weight: bold; ';
          }
          if (el.classList.contains('underline')) {
            style += 'text-decoration: underline; ';
          }
          if (el.classList.contains('italic')) {
            style += 'font-style: italic; ';
          }
          if (el.classList.contains('uppercase')) {
            style += 'text-transform: uppercase; ';
          }
          
          style += `font-family: ${cleanFontFamily}; `;
          
          // Style headings dynamically from headingStyles if matched
          const tagNameLower = el.tagName.toLowerCase();
          if (headingStyles[tagNameLower]) {
            const hStyle = headingStyles[tagNameLower];
            style += `font-size: ${hStyle.fontSize || '12pt'}; `;
            style += `font-weight: ${hStyle.fontWeight || 'bold'}; `;
            style += `font-style: ${hStyle.fontStyle || 'normal'}; `;
            style += `text-align: ${hStyle.textAlign || 'center'}; `;
            el.setAttribute('align', hStyle.textAlign || 'center');
            if (hStyle.uppercase) {
              style += `text-transform: uppercase; `;
            }
            // Add mso-outline-level for Word navigation pane
            const hLevel = parseInt(tagNameLower.replace('h', ''));
            if (hLevel >= 1 && hLevel <= 6) {
              style += `mso-outline-level: ${hLevel}; `;
              el.classList.add(`MsoHeading${hLevel}`);
            }
          } else if (/^h[1-6]$/.test(tagNameLower)) {
            // Heading tag without custom headingStyles config — still add outline level
            const hLevel = parseInt(tagNameLower.replace('h', ''));
            style += `mso-outline-level: ${hLevel}; `;
            el.classList.add(`MsoHeading${hLevel}`);
          } else {
            // Apply text sizing classes from Tailwind (e.g. text-[14pt])
            let hasCustomSize = false;
            el.classList.forEach(cls => {
              if (cls.startsWith('text-[') && cls.endsWith(']')) {
                const val = cls.substring(6, cls.length - 1);
                style += `font-size: ${val}; `;
                hasCustomSize = true;
              }
            });
            
            // Only set default line-height and font-size on text tags if they are not headings
            if (el.tagName === 'P' || el.tagName === 'SPAN' || el.tagName === 'DIV' || el.tagName === 'TD' || el.tagName === 'TH' || el.tagName === 'LI') {
              if (!hasCustomSize) {
                style += `font-size: ${layout.fontSize || '12pt'}; `;
              }
              
              // Spacing inside table cells vs body text
              if (el.tagName === 'TD' || el.tagName === 'TH') {
                style += 'line-height: 1.5; '; // Tables generally use single/1.5 spacing
              } else {
                style += `line-height: ${wordLineHeight}; `;
              }
            }
          }

          // Apply paragraph indentation to normal paragraph contents
          if (el.classList.contains('paragraph-content')) {
            if (!el.style.textIndent) {
              if (layout.paragraphIndent === 'indented') {
                style += 'text-indent: 1.25cm; ';
              } else {
                style += 'text-indent: 0cm; ';
              }
            }
            style += 'margin-bottom: 0pt; ';
            style += `line-height: ${wordLineHeight}; `;
          }
          
          // Style tables dynamically to prevent adding ugly borders to layout alignment tables (e.g. Persetujuan)
          if (el.tagName === 'TABLE') {
            const hasBorder = !el.classList.contains('border-none') && !el.style.borderWidth;
            if (hasBorder) {
              el.setAttribute('border', '1');
              el.setAttribute('cellspacing', '0');
              el.setAttribute('cellpadding', '6');
              style += 'border-collapse: collapse; width: 100%; border: 1px solid #000; margin-top: 12pt; margin-bottom: 12pt; ';
            } else {
              el.setAttribute('border', '0');
              el.setAttribute('cellspacing', '0');
              el.setAttribute('cellpadding', '6');
              style += 'border-collapse: collapse; border: none; margin-top: 12pt; margin-bottom: 12pt; ';
            }
          }
          if (el.tagName === 'TD' || el.tagName === 'TH') {
            const parentTable = el.closest('table');
            const tableHasBorder = parentTable && !parentTable.classList.contains('border-none');
            if (tableHasBorder) {
              const ths = Array.from(parentTable.querySelectorAll('thead th'));
              const cellIndex = Array.from(el.parentNode.children).indexOf(el);
              const isNoCol = ths[cellIndex] && ths[cellIndex].textContent.trim().toLowerCase() === 'no';
              style += `border: 1px solid #000; padding: 6px; vertical-align: top; text-align: ${isNoCol ? 'center' : 'left'}; `;
            } else if (parentTable && parentTable.classList.contains('equation-table')) {
              style += 'border: none; padding: 0px; ';
            } else {
              style += 'border: none; padding: 6px; ';
            }

            // Capture background color and colSpan/rowSpan for MS Word compatibility
            const bgVal = el.style.backgroundColor || el.style.background;
            if (bgVal) {
              el.setAttribute('bgcolor', bgVal);
              style += `background-color: ${bgVal}; `;
            }
            if (el.colSpan && el.colSpan > 1) {
              el.setAttribute('colspan', String(el.colSpan));
            }
            if (el.rowSpan && el.rowSpan > 1) {
              el.setAttribute('rowspan', String(el.rowSpan));
            }
          }
          
          if (style) {
            el.setAttribute('style', (el.getAttribute('style') || '') + '; ' + style);
          }
        });
        
        combinedHtml += sectionTransition(pageId);
        combinedHtml += `<div class="word-page">${contentClone.outerHTML}</div>`;
        return;
      }

      if (pageId === 'cover') {
        combinedHtml += sectionTransition(pageId);
        combinedHtml += `<div class="word-page">${buildCoverWordHtml({ coverElements, cleanFontFamily })}</div>`;
      }
    });

    if (combinedHtml) combinedHtml += '</div>';

    const docHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${filename}</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: 21cm 29.7cm; /* A4 */
            margin: ${layout.marginTop || 4}cm ${layout.marginRight || 3}cm ${layout.marginBottom || 3}cm ${layout.marginLeft || 4}cm;
          }
          @page WordSectionCover {
            size: 21cm 29.7cm; /* A4 */
            margin: ${layout.marginTop || 4}cm ${layout.marginRight || 3}cm ${layout.marginBottom || 3}cm ${layout.marginLeft || 4}cm;
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
            mso-header: hc;
            mso-footer: fc;
            mso-paper-source: 0;
          }
          div.WordSectionCover { page: WordSectionCover; }

          @page WordSection1 {
            size: 21cm 29.7cm; /* A4 */
            margin: ${layout.marginTop || 4}cm ${layout.marginRight || 3}cm ${layout.marginBottom || 3}cm ${layout.marginLeft || 4}cm;
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
            mso-header: h1;
            mso-footer: f1;
            mso-paper-source: 0;
          }
          div.WordSection1 { page: WordSection1; }
          
          @page WordSection2 {
            size: 21cm 29.7cm; /* A4 */
            margin: ${layout.marginTop || 4}cm ${layout.marginRight || 3}cm ${layout.marginBottom || 3}cm ${layout.marginLeft || 4}cm;
            mso-header-margin: 35.4pt;
            mso-footer-margin: 35.4pt;
            mso-header: h1;
            mso-footer: f1;
            mso-paper-source: 0;
          }
          div.WordSection2 { page: WordSection2; }
          body {
            font-family: ${cleanFontFamily};
          }
          .word-page {
            width: ${21 - (parseFloat(layout.marginLeft) || 4) - (parseFloat(layout.marginRight) || 3)}cm;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          .word-page .page-content {
            width: 100%;
            box-sizing: border-box;
            margin: 0;
          }
          h1 {
            font-size: ${headingStyles?.h1?.fontSize || '14pt'};
            font-weight: ${headingStyles?.h1?.fontWeight || 'bold'};
            text-align: ${headingStyles?.h1?.textAlign || 'center'};
            font-family: ${cleanFontFamily};
            margin-top: 12pt; margin-bottom: 6pt; page-break-after: avoid;
            mso-style-name: "heading 1";
            mso-outline-level: 1;
          }
          h2 {
            font-size: ${headingStyles?.h2?.fontSize || '12pt'};
            font-weight: ${headingStyles?.h2?.fontWeight || 'bold'};
            text-align: ${headingStyles?.h2?.textAlign || 'left'};
            font-family: ${cleanFontFamily};
            margin-top: 12pt; margin-bottom: 6pt; page-break-after: avoid;
            mso-style-name: "heading 2";
            mso-outline-level: 2;
          }
          h3 {
            font-size: 12pt;
            font-weight: ${headingStyles?.h3?.fontWeight || 'bold'};
            font-style: normal;
            text-align: ${headingStyles?.h3?.textAlign || 'left'};
            font-family: ${cleanFontFamily};
            margin-top: 12pt; margin-bottom: 6pt; page-break-after: avoid;
            mso-style-name: "heading 3";
            mso-outline-level: 3;
          }
          h4 {
            font-size: ${headingStyles?.h4?.fontSize || '11pt'};
            font-weight: ${headingStyles?.h4?.fontWeight || 'bold'};
            text-align: ${headingStyles?.h4?.textAlign || 'left'};
            font-family: ${cleanFontFamily};
            margin-top: 12pt; margin-bottom: 6pt; page-break-after: avoid;
            mso-style-name: "heading 4";
            mso-outline-level: 4;
          }
          h5 {
            font-size: ${headingStyles?.h5?.fontSize || '11pt'};
            font-weight: ${headingStyles?.h5?.fontWeight || 'normal'};
            text-align: ${headingStyles?.h5?.textAlign || 'left'};
            font-family: ${cleanFontFamily};
            margin-top: 12pt; margin-bottom: 6pt; page-break-after: avoid;
            mso-style-name: "heading 5";
            mso-outline-level: 5;
          }
          h6 {
            font-size: ${headingStyles?.h6?.fontSize || '10pt'};
            font-weight: ${headingStyles?.h6?.fontWeight || 'normal'};
            text-align: ${headingStyles?.h6?.textAlign || 'left'};
            font-family: ${cleanFontFamily};
            margin-top: 12pt; margin-bottom: 6pt; page-break-after: avoid;
            mso-style-name: "heading 6";
            mso-outline-level: 6;
          }
          .toc-item {
            tab-stops: right dotted ${21.0 - (parseFloat(layout.marginLeft) || 4) - (parseFloat(layout.marginRight) || 3)}cm;
            mso-tab-stops: right dotted ${21.0 - (parseFloat(layout.marginLeft) || 4) - (parseFloat(layout.marginRight) || 3)}cm;
          }
          .MsoHeading1 { mso-style-name: "heading 1"; mso-outline-level: 1; }
          .MsoHeading2 { mso-style-name: "heading 2"; mso-outline-level: 2; }
          .MsoHeading3 { mso-style-name: "heading 3"; mso-outline-level: 3; }
          .MsoHeading4 { mso-style-name: "heading 4"; mso-outline-level: 4; }
          .MsoHeading5 { mso-style-name: "heading 5"; mso-outline-level: 5; }
          .MsoHeading6 { mso-style-name: "heading 6"; mso-outline-level: 6; }
          p {
            margin-bottom: 6pt;
            line-height: ${wordLineHeight};
            text-align: justify;
            text-indent: 0cm;
          }
          p.paragraph-content {
            text-indent: ${layout.paragraphIndent === 'indented' ? '1.25cm' : '0cm'};
            margin-bottom: 0pt;
            line-height: ${wordLineHeight};
          }
          .word-static-page-number {
            font-family: ${cleanFontFamily};
            font-size: ${layout.fontSize || '12pt'};
            font-weight: normal;
            text-indent: 0cm;
          }
          table {
            border-collapse: collapse;
            width: 100%;
          }
          td, th {
            padding: 6px;
            font-family: ${cleanFontFamily};
            font-size: ${layout.fontSize || '12pt'};
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        ${(() => {
          // Embed a full draft snapshot so re-importing THIS file restores everything
          // (title, logo, images, page breaks, layout) with perfect fidelity.
          try {
            const snapshot = {
              __skripsi: true,
              layout, cover, coverElements, babSections, babTitles, references, refStyle,
              abstrakIndo, abstrakIndoKeywords, abstrakEng, abstrakEngKeywords, headingStyles
            };
            const json = JSON.stringify(snapshot);
            const b64 = btoa(unescape(encodeURIComponent(json)));
            return `<!--SKRIPSI_DRAFT_V2:${b64}-->`;
          } catch (e) {
            return '';
          }
        })()}
        <!-- Header and Footer definitions -->
        ${(() => {
          // Robust Word PAGE field — needs field-begin, code, field-separator, a cached
          // result value, then field-end so the number shows immediately on open.
          const pageField = ''; // static preview page numbers are embedded in each exported page
          const pos = layout.pageNumPosition || 'flexible';
          const inHeader = pos === 'top-right' || pos === 'top-center';
          const headerAlign = pos === 'top-right' ? 'right' : 'center';
          const footerAlign = pos === 'bottom-right' ? 'right' : 'center';
          return `
        <div style='mso-element:header' id='h1'>
          <p class='MsoHeader' style='text-align:${headerAlign}; margin:0;'>${inHeader ? pageField : ''}</p>
        </div>
        <div style='mso-element:footer' id='f1'>
          <p class='MsoFooter' style='text-align:${footerAlign}; margin:0;'>${!inHeader ? pageField : ''}</p>
        </div>
        <div style='mso-element:header' id='hc'>
          <p class='MsoHeader' style='margin:0;'>&nbsp;</p>
        </div>
        <div style='mso-element:footer' id='fc'>
          <p class='MsoFooter' style='margin:0;'>&nbsp;</p>
        </div>`;
        })()}
        ${combinedHtml}
      </body>
      </html>
    `;

    await downloadHtmlAsDocx(docHtml, filename, layout);
}


