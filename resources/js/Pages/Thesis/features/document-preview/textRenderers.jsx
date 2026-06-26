import React from 'react';

export const getPreviewHeadingStyle = (level, headingStyles = {}) => {
  const style = headingStyles[`h${level}`] || {};
  return {
    fontFamily: 'var(--doc-font-family)',
    fontSize: level === 3 ? '12pt' : (style.fontSize || '12pt'),
    fontWeight: style.fontWeight || 'bold',
    fontStyle: level === 3 ? 'normal' : (style.fontStyle || 'normal'),
    textAlign: style.textAlign || 'left',
    textIndent: 0,
  };
};

export const createHeadingId = (text = '') => (
  `heading-${String(text).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
);

export const renderPreviewHeading = ({ level, text, headingStyles = {}, formatInlineText }) => {
  const style = headingStyles[`h${level}`] || {};
  const className = `heading-level-${level} ${level === 1 ? 'mb-8' : 'mb-2 mt-4'}`;
  const tag = `h${level}`;
  const formatted = formatInlineText(text);
  const content = style.uppercase ? formatted.toUpperCase() : formatted;

  return React.createElement(tag, {
    id: createHeadingId(text),
    className,
    style: getPreviewHeadingStyle(level, headingStyles),
    dangerouslySetInnerHTML: { __html: content },
  });
};

export const formatPreviewParagraphs = ({ text, headingStyles = {}, formatInlineText }) => {
  if (!text || text.trim() === '') {
    return <p className="text-slate-400 italic mb-4" style={{ textIndent: 0 }}>Konten kosong. Klik tombol 'AI Tulis' untuk menulis otomatis.</p>;
  }

  return text.split(/\n+/).map((paragraph, idx) => {
    const trimmed = paragraph.trim();
    if (trimmed === '') return null;

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const titleText = headingMatch[2];
      const style = headingStyles[`h${level}`] || {};
      const inlineStyle = {
        ...getPreviewHeadingStyle(level, headingStyles),
        marginTop: '16px',
        marginBottom: '6px',
      };
      const renderedText = formatInlineText(titleText);

      return React.createElement(`h${level}`, {
        key: idx,
        id: createHeadingId(titleText),
        className: `heading-level-${level} font-sans leading-normal`,
        style: inlineStyle,
        dangerouslySetInnerHTML: { __html: style.uppercase ? renderedText.toUpperCase() : renderedText },
      });
    }

    const listMatch = trimmed.match(/^([0-9a-zA-Z]+[.)])\s+(.*)$/);
    if (listMatch) {
      return (
        <div key={idx} className="flex mb-3 pr-1 text-justify items-start" style={{ textIndent: 0 }}>
          <span className="w-8 shrink-0 font-bold text-slate-800">{listMatch[1]}</span>
          <span className="flex-1 min-w-0 text-justify text-slate-900" dangerouslySetInnerHTML={{ __html: formatInlineText(listMatch[2]) }} />
        </div>
      );
    }

    return <p key={idx} className="paragraph-content" dangerouslySetInnerHTML={{ __html: formatInlineText(trimmed) }} />;
  });
};
