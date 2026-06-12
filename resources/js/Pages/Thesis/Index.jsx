import React, { useState, useEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';
import {
  GraduationCap, Moon, Sun, Sliders, FileText, BookOpen, Sparkles,
  FolderOpen, ZoomIn, ZoomOut,
  Loader2, Plus, Trash2, Search, Table, Image as ImageIcon,
  Compass, List, RotateCcw, Wand2,
  PanelLeftClose, PanelLeftOpen,
  Bold, Italic, Underline, Strikethrough, RemoveFormatting,
  ListOrdered, Scissors, Copy, ClipboardPaste, Ruler
} from 'lucide-react';
import { SECTION_GROUPS } from './constants/sectionGroups';
import { cleanLineBreaks } from './utils/documentText';
import {
  computeMaskedCells,
  computeMaskedHeaders,
  normalizeHeaders,
  normalizeTableRows,
} from './utils/table';
import { DOCX_MAMMOTH_STYLE_MAP, extractDocxLayout, extractDocxSnapshot, extractDraftSnapshotFromHtml } from './features/import-export/docxLayout';
import { downloadHtmlAsDocx } from './features/import-export/docxExport';
import { buildCoverWordHtml, buildTableWordHtml as buildWordTableHtml } from './features/import-export/wordHtmlBuilders';
import { buildBabPagesMap, paginateListEntries, resolveBlockNumberingForBab } from './features/document-preview/layout';
import {
  deleteDraftRequest,
  listDraftsRequest,
  loadDraftRequest,
  saveDraftRequest,
} from './services/draftApi';
import {
  generateSectionRequest,
  parseGuideRequest,
  recommendTitlesRequest,
  searchCitationRequest,
} from './services/aiApi';
import InlineAutoTextarea from './components/InlineAutoTextarea';
import OutlineBuilderModal from './components/OutlineBuilderModal';
import AiPromptModal from './components/AiPromptModal';
import DownloadModal from './components/DownloadModal';
import WelcomeModal from './components/WelcomeModal';
import DraftManager from './components/DraftManager';
import NewDraftChooser from './components/NewDraftChooser';
import DraftListModal from './components/DraftListModal';
import TablesFiguresPanel from './components/TablesFiguresPanel';
import AiAssistantPanel from './components/AiAssistantPanel';
import BibliographyPanel from './components/BibliographyPanel';
import SidebarFooter from './components/SidebarFooter';
import NavigationPanel from './components/NavigationPanel';
import LayoutSettingsPanel from './components/LayoutSettingsPanel';
import ToastNotification from './components/ToastNotification';

const escapeHtml = (unsafe) => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Lightweight memoization for pure (string -> string) renderers.
// These functions are called inline inside dangerouslySetInnerHTML for every
// paragraph/cell/heading on every render, so caching their output by input
// string avoids re-running expensive regexes when the text hasn't changed.
const createStringMemo = (fn, maxSize = 2000) => {
  const cache = new Map();
  return (input) => {
    const key = input == null ? '' : String(input);
    const cached = cache.get(key);
    if (cached !== undefined) return cached;
    const result = fn(input);
    // Simple bounded cache: drop the oldest entry when full.
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    cache.set(key, result);
    return result;
  };
};

const ENGLISH_WORDS_LIST = [
  // Multi-word technical and academic phrases
  "machine learning", "deep learning", "neural network", "neural networks", "fuzzy logic", "artificial intelligence",
  "use case", "use case diagram", "activity diagram", "sequence diagram", "class diagram",
  "entity relationship diagram", "data mining", "decision support system", "expert system",
  "software engineering", "cloud computing", "e-learning", "online learning", "offline learning",
  "smart home", "user experience", "user interface", "data warehouse", "big data", "black box",
  "white box", "gray box", "random forest", "support vector machine", "naive bayes",
  "k-nearest neighbor", "k-nearest neighbors", "q-learning", "decision tree",
  "extreme programming", "rapid application development", "agile development", "spiral model",
  "system development life cycle", "unified modeling language", "mean squared error",
  "root mean squared error", "mean absolute error", "confusion matrix", "f1 score",
  "precision and recall", "user acceptance testing", "black-box testing", "white-box testing",
  "web browser", "search engine", "hyperlink", "web site", "website", "front end", "back end",
  "full stack", "world wide web", "database management system", "relational database",
  "internet of things", "cyber security", "data science", "data scientist", "computer science",
  "mobile application", "mobile app", "web application", "web app", "desktop application",
  "response rate", "p-value", "t-test", "f-test", "alpha cronbach", "cronbach's alpha",
  "validity and reliability", "google scholar", "research gate", "line spacing", "page number",
  "grand theory", "middle theory", "applied theory", "middle range theory", "applied range theory",
  "literature review", "gap analysis", "state of the art", "focus group discussion",

  // Single word technical/academic terms
  "online", "offline", "database", "bootstrap", "usability", "user", "developer", "framework",
  "library", "plugin", "hosting", "domain", "server", "client", "hardware", "software",
  "malware", "ransomware", "phishing", "firewall", "router", "switch", "gateway", "network",
  "cookies", "cache", "session", "token", "request", "response", "header", "body", "query",
  "input", "output", "upload", "download", "install", "update", "upgrade", "delete", "remove",
  "create", "destroy", "crud", "commit", "push", "pull", "merge", "branch",
  "repository", "clone", "fork", "deploy", "cloud", "storage", "backup", "restore",
  "hacker", "cracker", "cyber", "web", "page", "site", "link", "click", "hover",
  "scroll", "drag", "drop", "zoom", "print", "preview", "editor", "canvas", "layout", "preset",
  "margin", "padding", "border", "font", "size", "style", "format", "alignment", "indent",
  "bullet", "numbering", "heading", "title", "caption", "table", "row", "cell", "column",
  "figure", "image", "chart", "graph", "diagram", "citation", "reference", "source", "author",
  "publisher", "year", "volume", "number", "page", "abstract", "keyword", "thesis", "draft",
  "controller", "route", "view", "model", "migration", "seed", "factory", "middleware",
  "authentication", "authorization", "login", "logout", "register", "signup", "signin",
  "signout", "dashboard", "profile", "setting", "toast", "modal", "tab", "button", "checkbox",
  "radio", "select", "option", "textarea", "form", "submit", "reset", "cancel", "save", "load",
  "clear", "search", "filter", "sort", "pagination", "limit", "offset", "count", "sum",
  "average", "mean", "median", "mode", "variance", "deviation", "standard", "accuracy",
  "error", "loss", "epoch", "batch", "dataset", "train", "test", "validation", "predict",
  "forecast", "classify", "cluster", "regress", "optimize", "algorithm", "code", "programming",
  "programmer", "engineer", "designer", "tester", "analyst", "manager", "admin", "administrator",
  "guest", "member", "role", "permission", "access", "deny", "allow", "enable", "disable",
  "active", "inactive", "status", "state", "props", "hook", "effect", "ref", "context",
  "memo", "callback", "component", "element", "node", "tag", "attribute", "event", "handler",
  "listener", "method", "function", "class", "object", "array", "string", "boolean",
  "null", "undefined", "symbol", "bigint", "json", "xml", "html", "css", "js", "ts",
  "php", "sql", "nosql", "api", "rest", "graphql", "soap", "http", "https", "ftp",
  "ssh", "ssl", "tls", "dns", "ip", "tcp", "udp", "port", "socket", "websocket",
  "ajax", "fetch", "axios", "promise", "async", "await", "try", "catch", "finally",
  "throw", "exception", "bug", "debug", "lint", "build", "compile", "transpile",
  "minify", "bundle", "package", "dependency", "module", "import", "export", "require",
  "define", "use", "system", "application", "platform", "service", "process", "thread",
  "memory", "cpu", "gpu", "disk", "ram", "rom", "bios", "kernel", "shell", "terminal",
  "console", "command", "script", "binary", "compiler", "interpreter", "virtual",
  "container", "docker", "kubernetes", "pod", "registry", "security", "encryption",
  "decryption", "hash", "salt", "cipher", "key", "signature", "certificate", "auth",
  "oauth", "jwt", "indexeddb", "websql", "worker", "pwa", "responsive", "adaptive",
  "tablet", "viewport", "media", "grid", "flexbox", "flex", "box", "sizing", "radius",
  "shadow", "gradient", "color", "background", "weight", "height", "align", "justify",
  "vertical", "horizontal", "overflow", "hidden", "visible", "position", "absolute",
  "relative", "fixed", "sticky", "top", "bottom", "left", "right", "z-index", "float",
  "opacity", "transition", "animation", "transform", "scale", "rotate", "translate",
  "skew", "origin", "perspective", "filter", "blur", "brightness", "contrast", "grayscale",
  "hue", "invert", "saturate", "sepia", "cursor", "pointer", "outline", "duration",
  "timing", "delay", "iteration", "direction", "fill", "play",

  // Academic / Research (General English terms)
  "sampling", "respondent", "population", "questionnaire", "reliability", "validity",
  "hypothesis", "variable", "indicator", "construct", "empirical", "review", "plagiarism",
  "turnitin", "similarity", "index", "proceeding", "conference", "impact", "factor",
  "stem", "methodology", "analysis", "synthesis", "evaluation", "implementation",
  "maintenance", "requirement", "specification", "modelling", "prototype", "agile",
  "scrum", "kanban", "waterfall", "v-model", "rad", "sdlc", "fuzzy", "neural", "networks",
  "learning", "intelligence", "artificial", "expert", "support", "decision", "systems",
  "random", "forest", "support", "vector", "machines", "regression", "correlation",
  "coefficient", "significance", "variance", "anova", "manova", "multivariate", "univariate",
  "descriptive", "inferential", "statistics", "outlier", "sample", "census"
];

// Compile regex once outside components
const compileItalicizeRegex = () => {
  const uniqueWords = [...new Set(ENGLISH_WORDS_LIST)].sort((a, b) => b.length - a.length);
  const pattern = uniqueWords.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  return new RegExp(`\\b(${pattern})\\b`, 'gi');
};

const italicizeRegex = compileItalicizeRegex();

const italicizeEnglishWordsText = createStringMemo((text) => {
  if (!text) return '';
  // Split by <br> or <br /> to preserve HTML page breaks in headings and render correctly
  const parts = String(text).split(/<br\s*\/?>/i);
  const processedParts = parts.map(part => {
    let escaped = escapeHtml(part);
    // Inline Word-like formatting markers:
    //   **bold**  __underline__  ~~strikethrough~~  *italic*
    escaped = escaped
      .replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>')
      .replace(/__([\s\S]+?)__/g, '<u>$1</u>')
      .replace(/~~([\s\S]+?)~~/g, '<s>$1</s>');
    // Auto-italicize known English words
    escaped = escaped.replace(italicizeRegex, '<i>$1</i>');
    // Manual single-asterisk italic (remaining single * after bold handled above)
    escaped = escaped.replace(/\*([^*\n]+?)\*/g, '<i>$1</i>');
    return escaped;
  });
  return processedParts.join('<br />');
});

// ============================================================================
// FORMULA / MATH RENDERER
// Converts a LaTeX-ish / plain math syntax into HTML for both web preview and
// Word export: proper stacked fractions (not "/"), superscripts (powers),
// subscripts, roots, and common math symbols.
// ============================================================================
const MATH_SYMBOL_RULES = [
  // escaped comparison operators (escapeHtml turned < > into entities)
  [/&lt;=/g, '≤'], [/&gt;=/g, '≥'], [/!=/g, '≠'], [/&lt;-&gt;/g, '↔'],
  // LaTeX-style commands
  [/\\times\b/g, '×'], [/\\cdot\b/g, '·'], [/\\div\b/g, '÷'],
  [/\\pm\b/g, '±'], [/\\mp\b/g, '∓'], [/\\leq\b/g, '≤'], [/\\geq\b/g, '≥'],
  [/\\neq\b/g, '≠'], [/\\approx\b/g, '≈'], [/\\infty\b/g, '∞'],
  [/\\sum\b/g, '∑'], [/\\prod\b/g, '∏'], [/\\int\b/g, '∫'],
  [/\\partial\b/g, '∂'], [/\\nabla\b/g, '∇'], [/\\rightarrow\b/g, '→'], [/\\to\b/g, '→'],
  [/\\alpha\b/g, 'α'], [/\\beta\b/g, 'β'], [/\\gamma\b/g, 'γ'], [/\\delta\b/g, 'δ'],
  [/\\epsilon\b/g, 'ε'], [/\\theta\b/g, 'θ'], [/\\lambda\b/g, 'λ'], [/\\mu\b/g, 'μ'],
  [/\\pi\b/g, 'π'], [/\\rho\b/g, 'ρ'], [/\\sigma\b/g, 'σ'], [/\\tau\b/g, 'τ'],
  [/\\phi\b/g, 'φ'], [/\\omega\b/g, 'ω'], [/\\Sigma\b/g, 'Σ'], [/\\Delta\b/g, 'Δ'],
  [/\\Omega\b/g, 'Ω'], [/\\Phi\b/g, 'Φ'],
  // bare word symbols (whole word)
  [/\bsum\b/g, '∑'], [/\binfty\b/g, '∞'], [/\binf\b/g, '∞'],
  [/\bpi\b/g, 'π'], [/\balpha\b/g, 'α'], [/\bbeta\b/g, 'β'], [/\bgamma\b/g, 'γ'],
  [/\bdelta\b/g, 'δ'], [/\btheta\b/g, 'θ'], [/\blambda\b/g, 'λ'], [/\bmu\b/g, 'μ'],
  [/\bsigma\b/g, 'σ'], [/\bomega\b/g, 'ω'], [/\bsqrt\b/g, '√'],
  // plain operators
  [/\+\/-/g, '±'], [/\*/g, '×'],
];

const fracHtmlMarkup = (num, den) =>
  `<span style="display:inline-block;vertical-align:middle;text-align:center;margin:0 2px;">` +
  `<span style="display:block;border-bottom:1px solid currentColor;padding:0 4px;line-height:1.3;">${num}</span>` +
  `<span style="display:block;padding:0 4px;line-height:1.3;">${den}</span></span>`;

const renderFormula = createStringMemo((raw) => {
  if (!raw && raw !== 0) return '';
  let s = escapeHtml(String(raw));
  const frags = [];
  const stash = (html) => { frags.push(html); return `\u0000${frags.length - 1}\u0000`; };

  // Inline transforms applied to operands and the remaining expression
  const renderInline = (txt) => {
    let t = txt;
    // Superscript (powers): x^{...} or x^2
    t = t.replace(/\^\{([^{}]*)\}/g, (m, g) => `<sup>${g}</sup>`);
    t = t.replace(/\^([A-Za-z0-9]+)/g, (m, g) => `<sup>${g}</sup>`);
    // Subscript: x_{...} or x_i
    t = t.replace(/_\{([^{}]*)\}/g, (m, g) => `<sub>${g}</sub>`);
    t = t.replace(/_([A-Za-z0-9]+)/g, (m, g) => `<sub>${g}</sub>`);
    // Symbols
    MATH_SYMBOL_RULES.forEach(([re, rep]) => { t = t.replace(re, rep); });
    return t;
  };

  // \frac{A}{B} (and bare frac{A}{B}) — repeat to resolve multiple/nested
  let prev, guard = 0;
  do {
    prev = s;
    s = s.replace(/\\?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/, (m, a, b) =>
      stash(fracHtmlMarkup(renderInline(a), renderInline(b))));
    guard++;
  } while (s !== prev && guard < 50);

  // Slash division: (A)/(B), {A}/{B}, or A/B  →  stacked fraction
  s = s.replace(/(\([^()]*\)|\{[^{}]*\}|[A-Za-z0-9.]+)\s*\/\s*(\([^()]*\)|\{[^{}]*\}|[A-Za-z0-9.]+)/g,
    (m, a, b) => {
      const strip = (x) => x.replace(/^[({]/, '').replace(/[)}]$/, '');
      return stash(fracHtmlMarkup(renderInline(strip(a)), renderInline(strip(b))));
    });

  // Process remaining expression, then restore fraction fragments
  s = renderInline(s);
  s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => frags[+i]);
  return s;
});

export default function Index() {
  // ==========================================================================
  // STATE MANAGEMENT
  // ==========================================================================
  
  const [theme, setTheme] = useState('dark');
  const [babTitles, setBabTitles] = useState({
    bab1: { prefix: "BAB I", title: "PENDAHULUAN" },
    bab2: { prefix: "BAB II", title: "TINJAUAN PUSTAKA" },
    bab3: { prefix: "BAB III", title: "METODOLOGI PENELITIAN" },
    bab4: { prefix: "BAB IV", title: "HASIL DAN PEMBAHASAN" },
    bab5: { prefix: "BAB V", title: "KESIMPULAN DAN SARAN" }
  });
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [hasLocalDraft, setHasLocalDraft] = useState(false);
  const [showOutlineBuilder, setShowOutlineBuilder] = useState(false);
  const [outlineText, setOutlineText] = useState('BAB I PENDAHULUAN\n  Latar Belakang\n  Rumusan Masalah\n  Tujuan Penelitian\nBAB II TINJAUAN PUSTAKA\n  Landasan Teori\n  Penelitian Terdahulu\nBAB III METODOLOGI PENELITIAN\n  Metode Penelitian\n  Teknik Pengumpulan Data');
  
  // Thesis Layout Config
  const [layout, setLayout] = useState({
    preset: 'dikti',
    marginTop: 4.0,
    marginLeft: 4.0,
    marginBottom: 3.0,
    marginRight: 3.0,
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: '12pt',
    lineSpacing: '2.0',
    textAlign: 'justify',
    tableLineSpacing: '1.0',
    tableTextAlign: 'left',
    pageNumPosition: 'flexible', // 'flexible' (Academic Standard) or fixed
    hideCoverNum: true,
    romanPrelims: true,
    paragraphIndent: 'indented', // 'indented' or 'flush'
    coverAuthorLabel: 'Oleh :',
    showPersetujuan: false,
    showPengesahan: false,
    showPernyataan: false,
    showAbstractIndo: false,
    showAbstractEng: false,
    showDaftarRumus: true
  });

  // Cover Page Fields — kept for backward compatibility (used by persetujuan/pengesahan pages)
  const [cover, setCover] = useState({
    title: 'ANALISIS PENGARUH PENGGUNAAN PLATFORM E-LEARNING TERHADAP KEPUASAN DAN MOTIVASI BELAJAR MAHASISWA TEKNOLOGI INFORMASI',
    subtitle: 'SKRIPSI',
    author: 'BUDI SANTOSO',
    nim: '1204220054',
    prodi: 'Sistem Informasi',
    fakultas: 'Fakultas Teknologi Informasi & Industri',
    univ: 'Universitas Indonesia Raya',
    city: 'Jakarta',
    year: '2026',
    logoType: 'default',
    logoData: null
  });

  // Flexible Cover Elements — ordered array of blocks for the cover page
  // Types: 'title' (judul besar), 'label' (teks label, e.g. SKRIPSI), 'text' (teks biasa),
  //        'logo' (gambar logo), 'spacing' (spasi kosong)
  // Each element syncs relevant fields to `cover` for backward compat.
  const defaultCoverElements = [
    { id: 'ce1', type: 'title', value: 'ANALISIS PENGARUH PENGGUNAAN PLATFORM E-LEARNING TERHADAP KEPUASAN DAN MOTIVASI BELAJAR MAHASISWA TEKNOLOGI INFORMASI', fontSize: '14pt', bold: true, uppercase: true, field: 'title' },
    { id: 'ce_sp1', type: 'spacing', height: '1.5cm' },
    { id: 'ce2', type: 'label', value: 'SKRIPSI', fontSize: '12pt', bold: true, uppercase: true, field: 'subtitle' },
    { id: 'ce_sp2', type: 'spacing', height: '1.5cm' },
    { id: 'ce3', type: 'logo', logoType: 'default', logoData: null },
    { id: 'ce_sp3', type: 'spacing', height: '1.5cm' },
    { id: 'ce4', type: 'label', value: 'Disusun Oleh :', fontSize: '12pt', bold: false, uppercase: false, field: '' },
    { id: 'ce5', type: 'text', value: 'BUDI SANTOSO', fontSize: '12pt', bold: true, uppercase: true, underline: true, field: 'author' },
    { id: 'ce6', type: 'text', value: '1204220054', fontSize: '12pt', bold: true, uppercase: false, underline: false, field: 'nim' },
    { id: 'ce7', type: 'spacing', height: '2cm' },
    { id: 'ce8', type: 'text', value: 'PROGRAM STUDI SISTEM INFORMASI', fontSize: '12pt', bold: true, uppercase: true, field: 'prodi' },
    { id: 'ce9', type: 'text', value: 'FAKULTAS TEKNOLOGI INFORMASI & INDUSTRI', fontSize: '12pt', bold: true, uppercase: true, field: 'fakultas' },
    { id: 'ce10', type: 'text', value: 'UNIVERSITAS INDONESIA RAYA', fontSize: '12pt', bold: true, uppercase: true, field: 'univ' },
    { id: 'ce11', type: 'text', value: 'JAKARTA, 2026', fontSize: '12pt', bold: true, uppercase: true, field: 'city_year' },
  ];
  const [coverElements, setCoverElements] = useState(defaultCoverElements);

  // Dynamic Block-based Chapter Content State
  const [babSections, setBabSections] = useState({
    bab1: [
      { id: 'b1s1', type: 'text', headingLevel: 2, title: 'Latar Belakang Masalah', content: 'Perkembangan teknologi informasi dan komunikasi yang sangat pesat pada era digital ini telah membawa perubahan signifikan dalam berbagai sektor kehidupan, termasuk sektor pendidikan tinggi. Salah satu transformasi terbesar adalah adopsi platform e-learning sebagai media pembelajaran utama maupun pendukung. Pembelajaran daring memberikan fleksibilitas akses materi kuliah dari mana saja dan kapan saja. Namun, efektivitasnya sangat dipengaruhi oleh tingkat kepuasan pengguna dan motivasi belajar mahasiswa itu sendiri. Kurangnya interaksi langsung antara dosen dan mahasiswa sering kali menjadi kendala yang menurunkan minat belajar. Oleh karena itu, penting untuk melakukan analisis mendalam mengenai pengaruh platform e-learning terhadap motivasi belajar.', page: 1, numberingStyle: 'bab_prefix_dot' },
      { id: 'b1s2', type: 'text', headingLevel: 2, title: 'Identifikasi Masalah', content: '1. Adanya variasi tingkat kepuasan mahasiswa dalam menggunakan fitur-fitur pembelajaran yang ada pada platform e-learning.\n2. Fluktuasi motivasi belajar mahasiswa yang disebabkan oleh kejenuhan interaksi daring secara terus-menerus tanpa adanya sesi tatap muka langsung.\n3. Kurangnya standarisasi desain antarmuka platform e-learning yang ramah pengguna (user-friendly) di kalangan akademisi.', page: 2, numberingStyle: 'bab_prefix_dot' },
      { id: 'b1s3', type: 'text', headingLevel: 2, title: 'Rumusan Masalah', content: '1. Bagaimana pengaruh kualitas sistem dan kualitas informasi platform e-learning secara parsial terhadap tingkat kepuasan mahasiswa?\n2. Sejauh mana tingkat kepuasan penggunaan platform e-learning berpengaruh secara signifikan terhadap motivasi belajar mahasiswa?\n3. Desain interaksi platform e-learning seperti apa yang paling optimal untuk mempertahankan konsistensi motivasi belajar mahasiswa?', page: 2, numberingStyle: 'bab_prefix_dot' },
      { id: 'fig1', type: 'figure', title: 'Gambar 1.1 Bagan Kerangka Alur Berpikir Penelitian', page: 2, imageData: null }
    ],
    bab2: [
      { id: 'b2s1', type: 'text', headingLevel: 2, title: 'Penelitian Terdahulu / Kajian Pustaka', content: 'Penelitian terdahulu oleh Pratama (2022) menunjukkan bahwa kualitas sistem e-learning berpengaruh positif dan signifikan terhadap kepuasan pengguna. Sementara itu, penelitian dari Lestari (2023) menyimpulkan bahwa kegunaan persepsian (perceived usefulness) merupakan faktor dominan yang mempengaruhi motivasi belajar daring. Penelitian ini mengintegrasikan kedua temuan tersebut dengan memfokuskan pada variabel kepuasan sebagai mediator antara fitur teknologi dan motivasi belajar.', page: 1, numberingStyle: 'bab_prefix_dot' },
      { id: 'b2s2', type: 'text', headingLevel: 2, title: 'Grand Theory (Teori Utama)', content: 'Landasan Grand Theory dalam penelitian ini didasarkan pada Teori Manajemen Umum dan Teori Sistem Informasi Keorganisasian. Teori ini menyatakan bahwa kesuksesan implementasi teknologi dalam sebuah institusi sangat bergantung pada keselarasan antara infrastruktur sistem dengan kesiapan sumber daya manusia yang mengoperasikannya.', page: 2, numberingStyle: 'bab_prefix_dot' },
      { id: 'b2s3', type: 'text', headingLevel: 2, title: 'Middle Range Theory (Teori Menengah)', content: 'Middle Range Theory yang digunakan untuk menjembatani grand theory dengan fenomena praktis adalah Technology Acceptance Model (TAM) yang dikembangkan oleh Davis (1989), serta DeLone & McLean Information Systems Success Model. Teori-teori ini menganalisis hubungan sebab-akibat antara persepsi kemudahan penggunaan, kegunaan nyata, kepuasan akhir, dan niat perilaku pengguna.', page: 2, numberingStyle: 'bab_prefix_dot' },
      { id: 'b2s4', type: 'text', headingLevel: 2, title: 'Applied / Micro Theory', content: 'Applied Theory yang digunakan mencakup instrumen kepuasan pengguna e-learning serta parameter motivasi intrinsik (Self-Determination Theory). Teori terapan ini digunakan secara operasional untuk menyusun kuesioner dan menganalisis korelasi data empiris mahasiswa.', page: 2, numberingStyle: 'bab_prefix_dot' }
    ],
    bab3: [
      { id: 'b3s1', type: 'text', headingLevel: 2, title: 'Desain / Pendekatan Penelitian', content: 'Penelitian ini menggunakan pendekatan kuantitatif deskriptif dengan metode survei kausalitas. Pendekatan ini bertujuan untuk menguji hipotesis mengenai pengaruh variabel independen (kualitas sistem) terhadap variabel dependen (motivasi belajar) melalui variabel mediasi (kepuasan pengguna).', page: 1, numberingStyle: 'bab_prefix_dot' },
      { id: 'b3s2', type: 'text', headingLevel: 2, title: 'Tempat dan Waktu Penelitian', content: 'Penelitian dilakukan di lingkungan Fakultas Teknologi Informasi & Industri, Universitas Indonesia Raya. Waktu pengumpulan data dilaksanakan pada semester genap tahun akademik 2025/2026, yang berlangsung mulai dari bulan Maret hingga Mei 2026.', page: 1, numberingStyle: 'bab_prefix_dot' },
      { id: 'fig2', type: 'figure', title: 'Gambar 3.1 Model Struktural Pengukuran Variabel (Inner Model)', page: 1, imageData: null },
      { id: 'b3s3', type: 'text', headingLevel: 2, title: 'Metode Pengumpulan Data', content: 'Pengumpulan data dilakukan secara daring menggunakan Google Form dengan skala Likert 1-5. Sampel diambil menggunakan teknik purposive sampling dengan jumlah responden sebanyak 150 mahasiswa aktif yang menggunakan e-learning minimal selama satu semester.', page: 2, numberingStyle: 'bab_prefix_dot' },
      { id: 'b3s4', type: 'text', headingLevel: 2, title: 'Metode Analisis Data', content: 'Data yang terkumpul dianalisis menggunakan metode Structural Equation Modeling (SEM) berbasis Partial Least Squares (PLS) dengan bantuan perangkat lunak SmartPLS versi 4.0. Tahapan analisis meliputi pengujian outer model (validitas dan reliabilitas) serta inner model (uji hipotesis).', page: 2, numberingStyle: 'bab_prefix_dot' },
      { id: 'tab1', type: 'table', title: 'Tabel 3.1 Jadwal Pelaksanaan Kegiatan Penelitian', page: 2, headers: 'No, Nama Kegiatan, Bulan 1, Bulan 2, Bulan 3', rows: [['1', 'Persiapan & Studi Literatur', '✓', '', ''], ['2', 'Pengumpulan Data Responden', '', '✓', ''], ['3', 'Analisis Data PLS-SEM', '', '', '✓']], rowsText: '1, Persiapan & Studi Literatur, ✓, , \n2, Pengumpulan Data Responden, , ✓, \n3, Analisis Data PLS-SEM, , , ✓' }
    ],
    bab4: [
      { id: 'b4s1', type: 'text', headingLevel: 2, title: 'Deskripsi dan Analisis Data', content: 'Berdasarkan hasil pengumpulan data, diperoleh total 150 kuesioner responden yang valid dan layak dianalisis. Pengujian model pengukuran (outer model) menunjukkan seluruh butir pertanyaan memiliki nilai outer loading > 0.70 dan nilai Average Variance Extracted (AVE) > 0.50. Uji reliabilitas menunjukkan nilai Composite Reliability (CR) > 0.80 untuk seluruh variabel. Hasil pengujian model struktural (inner model) membuktikan kualitas sistem berpengaruh signifikan terhadap kepuasan mahasiswa dengan nilai p-value sebesar 0.012 (< 0.05).', page: 1, numberingStyle: 'bab_prefix_dot' },
      { id: 'b4s2', type: 'text', headingLevel: 2, title: 'Pembahasan Hasil Penelitian', content: 'Hasil penelitian membuktikan bahwa kemudahan navigasi dan kecepatan respon pada platform e-learning membuat mahasiswa merasa nyaman belajar, yang pada gilirannya meningkatkan kepuasan mereka. Ketika kepuasan tersebut tercapai, mahasiswa terbukti memiliki dorongan internal (motivasi intrinsik) yang lebih kuat untuk mengeksplorasi materi perkuliahan secara mandiri.', page: 2, numberingStyle: 'bab_prefix_dot' },
      { id: 'tab2', type: 'table', title: 'Tabel 4.1 Hasil Pengujian Akurasi Kualitas Informasi', page: 2, headers: 'No, Parameter Uji, Target (%), Hasil (%), Status', rows: [['1', 'Keandalan Sistem', '90.0', '94.5', 'LULUS'], ['2', 'Kecepatan Respon', '85.0', '89.2', 'LULUS']], rowsText: '1, Keandalan Sistem, 90.0, 94.5, LULUS\n2, Kecepatan Respon, 85.0, 89.2, LULUS' }
    ],
    bab5: [
      { id: 'b5s1', type: 'text', headingLevel: 2, title: 'Kesimpulan Penelitian', content: 'Berdasarkan hasil penelitian dan pembahasan yang telah dilakukan, ditarik kesimpulan sebagai berikut:\n1. Kualitas sistem platform e-learning berpengaruh positif dan signifikan secara langsung terhadap tingkat kepuasan belajar mahasiswa.\n2. Kepuasan penggunaan e-learning terbukti menjadi mediator yang kuat dalam meningkatkan motivasi belajar mahasiswa secara berkelanjutan.', page: 1, numberingStyle: 'bab_prefix_dot' },
      { id: 'b5s2', type: 'text', headingLevel: 2, title: 'Saran', content: 'Berdasarkan kesimpulan di atas, diajukan saran sebagai berikut:\n1. Pihak universitas perlu meningkatkan performa server dan memperbarui desain antarmuka e-learning agar lebih modern dan interaktif.\n2. Dosen disarankan untuk menyajikan materi perkuliahan dalam bentuk multimedia interaktif guna mengurangi kejenuhan mahasiswa.', page: 2, numberingStyle: 'bab_prefix_dot' }
    ]
  });

  const [editingElementId, setEditingElementId] = useState(null);
  const [editingElementData, setEditingElementData] = useState(null);
  const [selectedCell, setSelectedCell] = useState(null); // { blockId, r, c }
  const [activeTableTab, setActiveTableTab] = useState('visual'); // 'visual' or 'csv'
  const [insertMenu, setInsertMenu] = useState({ blockId: null, position: null });

  const updateTableCell = (babKey, secId, r, c, field, value) => {
    setBabSections(prev => {
      const list = prev[babKey] || [];
      const updatedList = list.map(sec => {
        if (sec.id === secId) {
          if (r === -1) {
            const normHeaders = normalizeHeaders(sec.headers);
            normHeaders[c] = { ...normHeaders[c], [field]: value };
            return {
              ...sec,
              headers: normHeaders
            };
          } else {
            const normRows = normalizeTableRows(sec.rows);
            normRows[r][c] = { ...normRows[r][c], [field]: value };
            return {
              ...sec,
              rows: normRows,
              rowsText: normRows.map(row => row.map(cell => cell.text).join(', ')).join('\n')
            };
          }
        }
        return sec;
      });
      const updated = { ...prev, [babKey]: updatedList };
      saveLocalDraft({ babSections: updated });
      return updated;
    });
  };

  const mergeTableCellRight = (babKey, secId, r, c) => {
    setBabSections(prev => {
      const list = prev[babKey] || [];
      const updatedList = list.map(sec => {
        if (sec.id === secId) {
          if (r === -1) {
            const normHeaders = normalizeHeaders(sec.headers);
            const cell = normHeaders[c];
            const nextC = c + (cell.colSpan || 1);
            if (nextC < normHeaders.length) {
              const nextCell = normHeaders[nextC];
              const mergedText = (cell.text + ' ' + (nextCell.text || '')).trim();
              cell.colSpan = (cell.colSpan || 1) + (nextCell.colSpan || 1);
              cell.text = mergedText;
              return { ...sec, headers: normHeaders };
            }
          } else {
            const normRows = normalizeTableRows(sec.rows);
            const cell = normRows[r][c];
            const nextC = c + (cell.colSpan || 1);
            if (nextC < normRows[r].length) {
              const nextCell = normRows[r][nextC];
              const mergedText = (cell.text + ' ' + (nextCell.text || '')).trim();
              cell.colSpan = (cell.colSpan || 1) + (nextCell.colSpan || 1);
              cell.text = mergedText;
              return {
                ...sec,
                rows: normRows,
                rowsText: normRows.map(row => row.map(cell => cell.text).join(', ')).join('\n')
              };
            }
          }
        }
        return sec;
      });
      const updated = { ...prev, [babKey]: updatedList };
      saveLocalDraft({ babSections: updated });
      return updated;
    });
  };

  const mergeTableCellDown = (babKey, secId, r, c) => {
    if (r === -1) return;
    setBabSections(prev => {
      const list = prev[babKey] || [];
      const updatedList = list.map(sec => {
        if (sec.id === secId) {
          const normRows = normalizeTableRows(sec.rows);
          const cell = normRows[r][c];
          const nextR = r + (cell.rowSpan || 1);
          if (nextR < normRows.length) {
            const nextCell = normRows[nextR][c];
            const mergedText = (cell.text + ' ' + (nextCell.text || '')).trim();
            cell.rowSpan = (cell.rowSpan || 1) + (nextCell.rowSpan || 1);
            cell.text = mergedText;
            return {
              ...sec,
              rows: normRows,
              rowsText: normRows.map(row => row.map(cell => cell.text).join(', ')).join('\n')
            };
          }
        }
        return sec;
      });
      const updated = { ...prev, [babKey]: updatedList };
      saveLocalDraft({ babSections: updated });
      return updated;
    });
  };

  const splitTableCell = (babKey, secId, r, c) => {
    setBabSections(prev => {
      const list = prev[babKey] || [];
      const updatedList = list.map(sec => {
        if (sec.id === secId) {
          if (r === -1) {
            const normHeaders = normalizeHeaders(sec.headers);
            normHeaders[c].colSpan = 1;
            normHeaders[c].rowSpan = 1;
            return { ...sec, headers: normHeaders };
          } else {
            const normRows = normalizeTableRows(sec.rows);
            normRows[r][c].colSpan = 1;
            normRows[r][c].rowSpan = 1;
            return {
              ...sec,
              rows: normRows,
              rowsText: normRows.map(row => row.map(cell => cell.text).join(', ')).join('\n')
            };
          }
        }
        return sec;
      });
      const updated = { ...prev, [babKey]: updatedList };
      saveLocalDraft({ babSections: updated });
      return updated;
    });
  };

  const addTableRowVisual = (babKey, secId) => {
    setBabSections(prev => {
      const list = prev[babKey] || [];
      const updatedList = list.map(sec => {
        if (sec.id === secId) {
          const normHeaders = normalizeHeaders(sec.headers);
          const normRows = normalizeTableRows(sec.rows);
          const colsCount = normRows.length > 0 ? normRows[0].length : normHeaders.length;
          const newRow = Array(colsCount).fill(null).map(() => ({ text: '', colSpan: 1, rowSpan: 1, bgColor: '' }));
          const newRows = [...normRows, newRow];
          return {
            ...sec,
            rows: newRows,
            rowsText: newRows.map(row => row.map(cell => cell.text).join(', ')).join('\n')
          };
        }
        return sec;
      });
      const updated = { ...prev, [babKey]: updatedList };
      saveLocalDraft({ babSections: updated });
      return updated;
    });
  };

  const deleteTableRowVisual = (babKey, secId, targetR) => {
    setBabSections(prev => {
      const list = prev[babKey] || [];
      const updatedList = list.map(sec => {
        if (sec.id === secId) {
          const normRows = normalizeTableRows(sec.rows);
          if (normRows.length <= 1) return sec;
          const newRows = normRows.filter((_, r) => r !== targetR);
          return {
            ...sec,
            rows: newRows,
            rowsText: newRows.map(row => row.map(cell => cell.text).join(', ')).join('\n')
          };
        }
        return sec;
      });
      const updated = { ...prev, [babKey]: updatedList };
      saveLocalDraft({ babSections: updated });
      return updated;
    });
  };

  const addTableColVisual = (babKey, secId) => {
    setBabSections(prev => {
      const list = prev[babKey] || [];
      const updatedList = list.map(sec => {
        if (sec.id === secId) {
          const normHeaders = normalizeHeaders(sec.headers);
          const normRows = normalizeTableRows(sec.rows);
          const newHeaders = [...normHeaders, { text: `Kolom ${normHeaders.length + 1}`, colSpan: 1, rowSpan: 1, bgColor: '' }];
          const newRows = normRows.map(row => [...row, { text: '', colSpan: 1, rowSpan: 1, bgColor: '' }]);
          return {
            ...sec,
            headers: newHeaders,
            rows: newRows,
            rowsText: newRows.map(row => row.map(cell => cell.text).join(', ')).join('\n')
          };
        }
        return sec;
      });
      const updated = { ...prev, [babKey]: updatedList };
      saveLocalDraft({ babSections: updated });
      return updated;
    });
  };

  const deleteTableColVisual = (babKey, secId, targetC) => {
    setBabSections(prev => {
      const list = prev[babKey] || [];
      const updatedList = list.map(sec => {
        if (sec.id === secId) {
          const normHeaders = normalizeHeaders(sec.headers);
          const normRows = normalizeTableRows(sec.rows);
          if (normHeaders.length <= 1) return sec;
          const newHeaders = normHeaders.filter((_, c) => c !== targetC);
          const newRows = normRows.map(row => row.filter((_, c) => c !== targetC));
          return {
            ...sec,
            headers: newHeaders,
            rows: newRows,
            rowsText: newRows.map(row => row.map(cell => cell.text).join(', ')).join('\n')
          };
        }
        return sec;
      });
      const updated = { ...prev, [babKey]: updatedList };
      saveLocalDraft({ babSections: updated });
      return updated;
    });
  };

  const convertOldDraftToSections = (draft) => {
    const updated = {
      bab1: [
        { id: 'b1s1', type: 'text', headingLevel: 2, title: 'Latar Belakang Masalah', content: '', page: 1, numberingStyle: 'bab_prefix_dot' },
        { id: 'b1s2', type: 'text', headingLevel: 2, title: 'Identifikasi Masalah', content: '', page: 2, numberingStyle: 'bab_prefix_dot' },
        { id: 'b1s3', type: 'text', headingLevel: 2, title: 'Rumusan Masalah', content: '', page: 2, numberingStyle: 'bab_prefix_dot' }
      ],
      bab2: [
        { id: 'b2s1', type: 'text', headingLevel: 2, title: 'Penelitian Terdahulu / Kajian Pustaka', content: '', page: 1, numberingStyle: 'bab_prefix_dot' },
        { id: 'b2s2', type: 'text', headingLevel: 2, title: 'Grand Theory', content: '', page: 2, numberingStyle: 'bab_prefix_dot' },
        { id: 'b2s3', type: 'text', headingLevel: 2, title: 'Middle Range Theory', content: '', page: 2, numberingStyle: 'bab_prefix_dot' },
        { id: 'b2s4', type: 'text', headingLevel: 2, title: 'Applied / Micro Theory', content: '', page: 2, numberingStyle: 'bab_prefix_dot' }
      ],
      bab3: [
        { id: 'b3s1', type: 'text', headingLevel: 2, title: 'Desain / Pendekatan Penelitian', content: '', page: 1, numberingStyle: 'bab_prefix_dot' },
        { id: 'b3s2', type: 'text', headingLevel: 2, title: 'Tempat dan Waktu Penelitian', content: '', page: 1, numberingStyle: 'bab_prefix_dot' },
        { id: 'b3s3', type: 'text', headingLevel: 2, title: 'Metode Pengumpulan Data', content: '', page: 2, numberingStyle: 'bab_prefix_dot' },
        { id: 'b3s4', type: 'text', headingLevel: 2, title: 'Metode Analisis Data', content: '', page: 2, numberingStyle: 'bab_prefix_dot' }
      ],
      bab4: [
        { id: 'b4s1', type: 'text', headingLevel: 2, title: 'Deskripsi dan Analisis Data', content: '', page: 1, numberingStyle: 'bab_prefix_dot' },
        { id: 'b4s2', type: 'text', headingLevel: 2, title: 'Pembahasan Hasil Penelitian', content: '', page: 2, numberingStyle: 'bab_prefix_dot' }
      ],
      bab5: [
        { id: 'b5s1', type: 'text', headingLevel: 2, title: 'Kesimpulan Penelitian', content: '', page: 1, numberingStyle: 'bab_prefix_dot' },
        { id: 'b5s2', type: 'text', headingLevel: 2, title: 'Saran', content: '', page: 2, numberingStyle: 'bab_prefix_dot' }
      ]
    };
    if (draft.bab1) {
      if (typeof draft.bab1 === 'object' && !Array.isArray(draft.bab1)) {
        updated.bab1[0].content = draft.bab1.s1 || '';
        updated.bab1[1].content = draft.bab1.s2 || '';
        updated.bab1[2].content = draft.bab1.s3 || '';
      }
    }
    if (draft.bab2) {
      if (typeof draft.bab2 === 'object' && !Array.isArray(draft.bab2)) {
        updated.bab2[0].content = draft.bab2.s1 || '';
        updated.bab2[1].content = draft.bab2.s2 || '';
        updated.bab2[2].content = draft.bab2.s3 || '';
        updated.bab2[3].content = draft.bab2.s4 || '';
      }
    }
    if (draft.bab3) {
      if (typeof draft.bab3 === 'object' && !Array.isArray(draft.bab3)) {
        updated.bab3[0].content = draft.bab3.s1 || '';
        updated.bab3[1].content = draft.bab3.s2 || '';
        updated.bab3[2].content = draft.bab3.s3 || '';
        updated.bab3[3].content = draft.bab3.s4 || '';
      }
    }
    if (draft.bab4) {
      if (typeof draft.bab4 === 'object' && !Array.isArray(draft.bab4)) {
        updated.bab4[0].content = draft.bab4.s1 || '';
        updated.bab4[1].content = draft.bab4.s2 || '';
      }
    }
    if (draft.bab5) {
      if (typeof draft.bab5 === 'object' && !Array.isArray(draft.bab5)) {
        updated.bab5[0].content = draft.bab5.s1 || '';
        updated.bab5[1].content = draft.bab5.s2 || '';
      }
    }

    if (Array.isArray(draft.tables)) {
      draft.tables.forEach(t => {
        const babKey = t.bab;
        if (updated[babKey]) {
          if (!updated[babKey].some(sec => sec.id === t.id)) {
            updated[babKey].push({
              id: t.id,
              type: 'table',
              title: t.title,
              headers: t.headers,
              rows: t.rows,
              rowsText: Array.isArray(t.rows) ? t.rows.map(r => r.join(', ')).join('\n') : '',
              page: babKey === 'bab3' ? 2 : (babKey === 'bab4' ? 2 : 1)
            });
          }
        }
      });
    }

    if (Array.isArray(draft.figures)) {
      draft.figures.forEach(f => {
        const babKey = f.bab;
        if (updated[babKey]) {
          if (!updated[babKey].some(sec => sec.id === f.id)) {
            updated[babKey].push({
              id: f.id,
              type: 'figure',
              title: f.title,
              imageData: null,
              page: babKey === 'bab3' ? 1 : (babKey === 'bab1' ? 2 : 1)
            });
          }
        }
      });
    }

    return updated;
  };

  const handleUpdateSectionField = (babKey, id, key, val) => {
    setBabSections(prev => {
      const updatedList = prev[babKey].map(sec => {
        if (sec.id === id) {
          return { ...sec, [key]: val };
        }
        return sec;
      });
      const updated = { ...prev, [babKey]: updatedList };
      saveLocalDraft({ babSections: updated });
      return updated;
    });
  };

  // ==========================================================================
  // INLINE EDITOR — WORD-LIKE FORMATTING HELPERS (Font / Paragraph / Clipboard)
  // Operate on the active <textarea> selection of a section's content.
  // ==========================================================================
  const getActiveTextarea = (sec) => document.getElementById(`inline-textarea-${sec.id}`);

  // Wrap the current selection with markers (e.g. ** for bold). Toggles off if already wrapped.
  const wrapInlineSelection = (babKey, sec, before, after = before, placeholder = 'teks') => {
    const textarea = getActiveTextarea(sec);
    const content = sec.content || '';
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const hasSelection = selected.length > 0;
    const inner = hasSelection ? selected : placeholder;

    // Toggle off if the selection is already wrapped
    const alreadyWrapped = inner.startsWith(before) && inner.endsWith(after) && inner.length >= before.length + after.length;
    let newInner;
    if (alreadyWrapped) {
      newInner = inner.substring(before.length, inner.length - after.length);
    } else {
      newInner = before + inner + after;
    }
    const newContent = content.substring(0, start) + newInner + content.substring(end);
    handleUpdateSectionField(babKey, sec.id, 'content', newContent);
    setTimeout(() => {
      textarea.focus();
      const selStart = alreadyWrapped ? start : start + before.length;
      textarea.setSelectionRange(selStart, selStart + (alreadyWrapped ? newInner.length : inner.length));
    }, 40);
  };

  // Apply (or toggle) a per-line prefix over the selected lines — used for bullet/numbered lists.
  const applyLinePrefix = (babKey, sec, mode) => {
    const textarea = getActiveTextarea(sec);
    const content = sec.content || '';
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = content.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = content.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = content.length;
    const block = content.substring(lineStart, lineEnd);
    const lines = block.split('\n');
    const stripRe = /^\s*(?:[-*•]\s+|\d+[.)]\s+)/;
    // Detect if all non-empty lines already have the target prefix → toggle off
    const allBulleted = lines.filter(l => l.trim()).every(l => /^\s*[-*•]\s+/.test(l));
    const allNumbered = lines.filter(l => l.trim()).every(l => /^\s*\d+[.)]\s+/.test(l));
    let counter = 0;
    const newLines = lines.map(ln => {
      if (!ln.trim()) return ln;
      const bare = ln.replace(stripRe, '');
      if (mode === 'bullet') {
        if (allBulleted) return bare; // toggle off
        return '- ' + bare;
      } else { // numbered
        if (allNumbered) return bare; // toggle off
        counter++;
        return `${counter}. ` + bare;
      }
    });
    const newContent = content.substring(0, lineStart) + newLines.join('\n') + content.substring(lineEnd);
    handleUpdateSectionField(babKey, sec.id, 'content', newContent);
    setTimeout(() => { textarea.focus(); }, 40);
  };

  // Clipboard actions on the active textarea selection
  const inlineClipboard = async (babKey, sec, action) => {
    const textarea = getActiveTextarea(sec);
    if (!textarea) return;
    const content = sec.content || '';
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    try {
      if (action === 'copy' || action === 'cut') {
        const selected = content.substring(start, end);
        if (!selected) { showToast('Pilih teks dulu untuk disalin.', true); return; }
        await navigator.clipboard.writeText(selected);
        if (action === 'cut') {
          const newContent = content.substring(0, start) + content.substring(end);
          handleUpdateSectionField(babKey, sec.id, 'content', newContent);
          setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start, start); }, 40);
        }
        showToast(action === 'cut' ? 'Teks dipotong.' : 'Teks disalin.');
      } else if (action === 'paste') {
        const clip = await navigator.clipboard.readText();
        if (!clip) return;
        const newContent = content.substring(0, start) + clip + content.substring(end);
        handleUpdateSectionField(babKey, sec.id, 'content', newContent);
        setTimeout(() => { textarea.focus(); textarea.setSelectionRange(start + clip.length, start + clip.length); }, 40);
      }
    } catch (e) {
      showToast('Browser memblokir akses clipboard. Gunakan Ctrl+C / Ctrl+V.', true);
    }
  };

  // Clear inline formatting markers from the selection (or whole content)
  const clearInlineFormatting = (babKey, sec) => {
    const textarea = getActiveTextarea(sec);
    const content = sec.content || '';
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const target = start !== end ? content.substring(start, end) : content;
    const cleaned = target.replace(/\*\*|__|~~|\*/g, '');
    const newContent = start !== end
      ? content.substring(0, start) + cleaned + content.substring(end)
      : cleaned;
    handleUpdateSectionField(babKey, sec.id, 'content', newContent);
    setTimeout(() => { textarea.focus(); }, 40);
  };

  const handleMoveSection = (babKey, index, direction) => {
    const list = [...(babSections[babKey] || [])];
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= list.length) return;
    
    const temp = list[index];
    list[index] = list[newIdx];
    list[newIdx] = temp;
    
    setBabSections(prev => {
      const updated = { ...prev, [babKey]: list };
      saveLocalDraft({ babSections: updated });
      return updated;
    });
  };

  const handleDeleteSection = (babKey, id) => {
    if (!confirm("Hapus blok konten ini?")) return;
    setBabSections(prev => {
      const updatedList = prev[babKey].filter(sec => sec.id !== id);
      const updated = { ...prev, [babKey]: updatedList };
      saveLocalDraft({ babSections: updated });
      return updated;
    });
  };

  const handleAddSection = (babKey, type = 'text') => {
    setBabSections(prev => {
      let newBlock = {};
      if (type === 'table') {
        newBlock = {
          id: 'sec_' + Date.now(),
          type: 'table',
          title: 'Tabel Baru',
          page: 1,
          headers: 'No, Kolom 1, Kolom 2',
          rowsText: '1, Data A, Data B\n2, Data C, Data D',
          rows: [['1', 'Data A', 'Data B'], ['2', 'Data C', 'Data D']]
        };
      } else if (type === 'figure') {
        newBlock = {
          id: 'sec_' + Date.now(),
          type: 'figure',
          title: 'Gambar Baru',
          page: 1,
          imageData: null
        };
      } else if (type === 'equation') {
        newBlock = {
          id: 'sec_' + Date.now(),
          type: 'equation',
          title: 'Persamaan Baru',
          content: 'y = a + bx',
          description: 'y = Variabel Dependen\na = Konstanta\nb = Koefisien\nx = Variabel Independen',
          page: 1
        };
      } else {
        newBlock = {
          id: 'sec_' + Date.now(),
          type: 'text',
          headingLevel: 2,
          title: 'Sub-Bab Baru',
          content: '',
          page: 1,
          numberingStyle: 'bab_prefix_dot'
        };
      }
      
      const updated = {
        ...prev,
        [babKey]: [
          ...(prev[babKey] || []),
          newBlock
        ]
      };
      saveLocalDraft({ babSections: updated });
      return updated;
    });
  };

  const updateSectionContentById = (babKey, sectionId, newContent) => {
    setBabSections(prev => {
      const updatedList = prev[babKey].map(sec => {
        if (sec.id === sectionId) {
          return { ...sec, content: newContent };
        }
        return sec;
      });
      const updated = { ...prev, [babKey]: updatedList };
      saveLocalDraft({ babSections: updated });
      return updated;
    });
  };

  const handleSaveTableEdit = () => {
    const rows = editingElementData.rowsText.split('\n').map(row => row.split(',').map(c => c.trim()));
    setBabSections(prev => {
      const updated = { ...prev };
      let foundTable = null;
      
      Object.keys(updated).forEach(babKey => {
        const idx = updated[babKey].findIndex(sec => sec.id === editingElementId);
        if (idx !== -1) {
          foundTable = { ...updated[babKey][idx] };
          updated[babKey] = updated[babKey].filter(sec => sec.id !== editingElementId);
        }
      });

      if (foundTable) {
        foundTable.title = editingElementData.title;
        foundTable.headers = editingElementData.headers;
        foundTable.rows = rows;
        foundTable.rowsText = editingElementData.rowsText;
        const targetBab = editingElementData.bab;
        updated[targetBab] = [...(updated[targetBab] || []), foundTable];
      }
      
      saveLocalDraft({ babSections: updated });
      return updated;
    });

    setEditingElementId(null);
    setEditingElementData(null);
    showToast("Tabel berhasil diperbarui!");
  };

  const handleSaveFigureEdit = () => {
    setBabSections(prev => {
      const updated = { ...prev };
      let foundFigure = null;
      
      Object.keys(updated).forEach(babKey => {
        const idx = updated[babKey].findIndex(sec => sec.id === editingElementId);
        if (idx !== -1) {
          foundFigure = { ...updated[babKey][idx] };
          updated[babKey] = updated[babKey].filter(sec => sec.id !== editingElementId);
        }
      });

      if (foundFigure) {
        foundFigure.title = editingElementData.title;
        const targetBab = editingElementData.bab;
        updated[targetBab] = [...(updated[targetBab] || []), foundFigure];
      }
      
      saveLocalDraft({ babSections: updated });
      return updated;
    });

    setEditingElementId(null);
    setEditingElementData(null);
    showToast("Gambar berhasil diperbarui!");
  };

  const deleteTable = (id) => {
    if (!confirm("Hapus tabel ini?")) return;
    setBabSections(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(babKey => {
        updated[babKey] = updated[babKey].filter(sec => sec.id !== id);
      });
      saveLocalDraft({ babSections: updated });
      return updated;
    });
    showToast("Tabel berhasil dihapus.");
  };

  const deleteFigure = (id) => {
    if (!confirm("Hapus gambar ini?")) return;
    setBabSections(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(babKey => {
        updated[babKey] = updated[babKey].filter(sec => sec.id !== id);
      });
      saveLocalDraft({ babSections: updated });
      return updated;
    });
    showToast("Gambar berhasil dihapus.");
  };

  const handleImageUploadForSection = (babKey, id, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      const commitImage = (dimensions = {}) => {
        setBabSections(prev => {
          const updatedList = prev[babKey].map(sec => {
            if (sec.id === id) {
              return {
                ...sec,
                imageData: base64Data,
                ...dimensions,
              };
            }
            return sec;
          });
          const updated = { ...prev, [babKey]: updatedList };
          saveLocalDraft({ babSections: updated });
          return updated;
        });
        showToast("Gambar berhasil diunggah!");
      };

      const image = new Image();
      image.onload = () => {
        commitImage({
          imgNaturalWidth: image.naturalWidth,
          imgNaturalHeight: image.naturalHeight,
          imgAspectRatio: image.naturalWidth / image.naturalHeight,
        });
      };
      image.onerror = () => commitImage();
      image.src = base64Data;
    };
    reader.readAsDataURL(file);
  };

  const getBabHeaderTitle = (babKey) => {
    const bab = babTitles[babKey];
    if (bab) {
      return `${bab.prefix}<br />${bab.title}`;
    }
    return "";
  };

  const renderBabDynamicPageContent = (babKey, pageIdx) => {
    const babPagesMap = getBabPagesMap();
    const pageElements = (babPagesMap[babKey] && babPagesMap[babKey][pageIdx]) || [];
    
    // Check if the current page is the first page containing any element of the editing block
    const isFirstPageOfEditingBlock = (blockId) => {
      const pages = babPagesMap[babKey] || [];
      for (let pIdx = 0; pIdx < pages.length; pIdx++) {
        if (pages[pIdx].some(el => el.blockId === blockId)) {
          return pIdx === pageIdx;
        }
      }
      return false;
    };
    
    return (
      <div className="flex flex-col gap-0">
        {pageElements.map((el, idx) => {
          if (el.type === 'pagebreak') {
            return null;
          }
          
          if (inlineEditingBlockId && el.blockId === inlineEditingBlockId) {
            // Render editing interface ONLY on the page where the block starts
            if (!isFirstPageOfEditingBlock(el.blockId)) return null;
            
            // Render editing interface ONLY for the first sub-element on this starting page
            const isFirstOfBlock = pageElements.findIndex(x => x.blockId === el.blockId) === idx;
            if (!isFirstOfBlock) return null;
            
            const sec = babSections[babKey]?.find(x => x.id === el.blockId);
            if (!sec) return null;
            
            return (
              <div 
                key={idx} 
                className="inline-editor-active-block my-1 no-print animate-in fade-in duration-150"
                style={{ 
                  textIndent: 0, 
                  textAlign: 'left', 
                  lineHeight: 'normal',
                  outline: '1.5px dashed #6366f1',
                  outlineOffset: '4px',
                  backgroundColor: 'rgba(99, 102, 241, 0.03)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {sec.headingLevel > 0 && (
                  <div className="mb-2" style={{ textIndent: 0 }}>
                    <textarea
                      value={sec.title || ''}
                      rows={1}
                      onChange={(e) => handleUpdateSectionField(babKey, sec.id, 'title', e.target.value)}
                      placeholder="Judul Sub-Bab..."
                      className="w-full bg-transparent text-black border-none focus:outline-none font-bold"
                      style={{
                        ...getHeadingStyle(sec.headingLevel),
                        resize: 'none',
                        height: 'auto',
                        padding: 0,
                        margin: 0,
                        border: 'none',
                        outline: 'none',
                        color: '#000000',
                        textTransform: headingStyles[`h${sec.headingLevel}`]?.uppercase ? 'uppercase' : 'none',
                        overflow: 'hidden',
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          document.getElementById(`inline-textarea-${sec.id}`)?.focus();
                        }
                      }}
                    />
                  </div>
                )}
                
                <div style={{ textIndent: 0 }}>
                  <InlineAutoTextarea
                    id={`inline-textarea-${sec.id}`}
                    value={sec.content || ''}
                    onCommit={(text) => handleUpdateSectionField(babKey, sec.id, 'content', text)}
                    placeholder="Tulis paragraf di sini... Gunakan [pagebreak] untuk membuat halaman baru."
                    className="w-full bg-transparent text-black border-none focus:outline-none selection:bg-indigo-250/30"
                    style={{
                      fontFamily: 'var(--doc-font-family, "Times New Roman", Times, serif)',
                      fontSize: 'var(--doc-font-size, 12pt)',
                      lineHeight: 'var(--doc-line-spacing, 2.0)',
                      textAlign: 'justify',
                      textIndent: (!sec.headingLevel && layout.paragraphIndent === 'indented') ? '1.25cm' : '0px',
                      resize: 'none',
                      padding: 0,
                      margin: 0,
                      color: '#000000',
                      overflow: 'hidden',
                    }}
                    autoFocus={sec.headingLevel === 0}
                  />
                </div>
              </div>
            );
          }
          
          if (el.type === 'heading') {
            return (
              <div 
                key={idx} 
                className="cursor-pointer hover:bg-indigo-500/5 p-1 rounded transition-colors group relative animate-in fade-in duration-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditBlockInline(babKey, el.blockId);
                }}
                title="Klik untuk edit langsung"
              >
                {renderHeading(el.headingLevel, el.title)}
                <span className="absolute -top-3 right-1 bg-indigo-600 text-white text-[8px] font-bold px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity no-print">Klik untuk edit</span>
              </div>
            );
          }
          
          if (el.type === 'paragraph') {
            const listMatch = el.text.match(/^([0-9a-zA-Z]+[\.\)])\s+(.*)$/);
            if (listMatch) {
              return (
                <div 
                  key={idx} 
                  className="flex pr-1 text-justify items-start cursor-pointer hover:bg-indigo-500/5 p-1 rounded transition-colors group relative animate-in fade-in duration-100" 
                  style={{ textIndent: 0, marginBottom: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditBlockInline(babKey, el.blockId);
                  }}
                  title="Klik untuk edit langsung"
                >
                  <span className="w-8 shrink-0 font-bold text-slate-800">{listMatch[1]}</span>
                  <span className="flex-1 min-w-0 text-justify text-slate-900" dangerouslySetInnerHTML={{ __html: italicizeEnglishWordsText(listMatch[2]) }} />
                  <span className="absolute -top-3 right-1 bg-indigo-600 text-white text-[8px] font-bold px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity no-print">Klik untuk edit</span>
                </div>
              );
            }
            
            if (el.isListContinuation) {
              return (
                <div 
                  key={idx} 
                  className="flex pr-1 text-justify items-start cursor-pointer hover:bg-indigo-500/5 p-1 rounded transition-colors group relative animate-in fade-in duration-100" 
                  style={{ textIndent: 0, paddingLeft: '32px', marginBottom: 0 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditBlockInline(babKey, el.blockId);
                  }}
                  title="Klik untuk edit langsung"
                >
                  <span className="flex-1 min-w-0 text-justify text-slate-900" dangerouslySetInnerHTML={{ __html: italicizeEnglishWordsText(el.text) }} />
                  <span className="absolute -top-3 right-1 bg-indigo-600 text-white text-[8px] font-bold px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity no-print">Klik untuk edit</span>
                </div>
              );
            }
            
            return (
              <p 
                key={idx} 
                className="paragraph-content cursor-pointer hover:bg-indigo-500/5 p-1 rounded transition-colors group relative animate-in fade-in duration-100" 
                style={{
                  textIndent: el.noIndent ? 0 : undefined,
                  marginBottom: 0,
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditBlockInline(babKey, el.blockId);
                }}
                title="Klik untuk edit langsung"
                dangerouslySetInnerHTML={{ __html: italicizeEnglishWordsText(el.text) }} 
              />
            );
          }
          
          if (el.type === 'table') {
            const normHeaders = normalizeHeaders(el.headers);
            const normRows = normalizeTableRows(el.rows);
            const headersMask = computeMaskedHeaders(normHeaders);
            const rowsMask = computeMaskedCells(normRows);

            return (
              <div key={idx} className="mt-4 mb-6 leading-relaxed" style={{ textIndent: 0 }}>
                {/* Caption at the top of academic tables, styled by layout settings */}
                <div 
                  className="font-bold text-left mb-1" 
                  style={{
                    fontFamily: 'var(--doc-font-family)',
                    fontSize: 'var(--doc-font-size, 12pt)'
                  }}
                  dangerouslySetInnerHTML={{ __html: italicizeEnglishWordsText(el.title || 'Tabel') }} 
                />
                <table 
                  className="academic-table w-full border-collapse border border-black"
                  style={{
                    fontFamily: 'var(--doc-font-family)',
                    fontSize: 'var(--doc-font-size, 12pt)',
                    lineHeight: layout.tableLineSpacing || '1.0'
                  }}
                >
                  <thead>
                    <tr>
                      {normHeaders.map((h, i) => {
                        if (headersMask[i]) return null;
                        const isNoCol = h.text.toLowerCase() === 'no';
                        const style = {};
                        if (h.bgColor) {
                          style.backgroundColor = h.bgColor;
                        }
                        const headerStyle = { ...style, textAlign: isNoCol ? 'center' : (layout.tableTextAlign || 'left') };
                        return (
                          <th 
                            key={i} 
                            colSpan={h.colSpan || 1}
                            rowSpan={h.rowSpan || 1}
                            style={headerStyle}
                            className={`p-1.5 font-bold border border-black align-middle`} 
                            dangerouslySetInnerHTML={{ __html: italicizeEnglishWordsText(h.text) }} 
                          />
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {normRows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => {
                          if (rowsMask[rIdx] && rowsMask[rIdx][cIdx]) return null;
                          const headerCell = normHeaders[cIdx];
                          const isNoCol = headerCell && headerCell.text.toLowerCase() === 'no';
                          const style = {};
                          if (cell.bgColor) {
                            style.backgroundColor = cell.bgColor;
                          }
                          const cellStyle = { ...style, textAlign: isNoCol ? 'center' : (layout.tableTextAlign || 'left') };
                          return (
                            <td 
                              key={cIdx} 
                              colSpan={cell.colSpan || 1}
                              rowSpan={cell.rowSpan || 1}
                              style={cellStyle}
                              className={`p-1.5 border border-black align-top text-black`} 
                              dangerouslySetInnerHTML={{ __html: italicizeEnglishWordsText(cell.text) }} 
                            />
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          if (el.type === 'figure') {
            const figW = el.imgWidth || 12;
            return (
              <div key={idx} className="mt-4 mb-6 flex flex-col items-center justify-center gap-2" style={{ textIndent: 0 }}>
                {el.imageData ? (
                  /* Uploaded image: sized by user-defined width, height auto (preserves aspect ratio) */
                  <div className="relative group" style={{ width: `${figW}cm`, maxWidth: '100%' }}>
                    <img src={el.imageData} alt={el.title} data-fig-id={el.blockId} style={{ width: '100%', height: 'auto', display: 'block' }} />
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity text-xs font-sans no-print">
                      Ganti Gambar
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUploadForSection(babKey, el.blockId, e)} />
                    </label>
                  </div>
                ) : (
                  /* Placeholder for figures without an uploaded image */
                  <div className="w-[12cm] h-[4cm] border border-slate-350 bg-slate-50 flex items-center justify-center rounded text-slate-400 font-mono text-[9pt] p-4 text-center relative overflow-hidden group">
                    <div className="flex flex-col items-center gap-1">
                      <ImageIcon className="h-8 w-8 text-slate-300" />
                      <span>[Skema / Diagram Model - {el.title}]</span>
                    </div>
                    <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity text-xs font-sans no-print">
                      Unggah Gambar
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => handleImageUploadForSection(babKey, el.blockId, e)} 
                      />
                    </label>
                  </div>
                )}
                {/* Caption at the bottom of academic figures, styled by layout settings */}
                <div 
                  className="font-bold text-center mt-1" 
                  style={{
                    fontFamily: 'var(--doc-font-family)',
                    fontSize: 'var(--doc-font-size, 12pt)'
                  }}
                  dangerouslySetInnerHTML={{ __html: italicizeEnglishWordsText(el.title || 'Gambar') }} 
                />
              </div>
            );
          }
          if (el.type === 'equation') {
            const descLines = el.description ? el.description.split('\n').filter(l => l.trim()) : [];
            const resolvedEqPrefix = (() => {
              const babMatch = babKey.match(/\d+/);
              const babNum = babMatch ? babMatch[0] : '1';
              const babSecs = babSections[babKey] || [];
              const eqIdx = babSecs.filter(s => s.type === 'equation').findIndex(s => s.id === el.blockId);
              return `(${babNum}.${eqIdx !== -1 ? eqIdx + 1 : 1})`;
            })();
            return (
              <div key={idx} className="equation-block mt-4 mb-6 flex flex-col gap-1.5 relative cursor-pointer hover:bg-indigo-500/5 p-1 rounded transition-colors group" style={{ textIndent: 0 }} onClick={(e) => { e.stopPropagation(); handleEditBlockInline(babKey, el.blockId); }}>
                {/* Caption styled by layout settings */}
                <div 
                  className="font-bold text-left mb-1" 
                  style={{
                    fontFamily: 'var(--doc-font-family)',
                    fontSize: 'var(--doc-font-size, 12pt)'
                  }}
                  dangerouslySetInnerHTML={{ __html: italicizeEnglishWordsText(el.title || 'Rumus') }} 
                />
                
                <div 
                  className="flex items-center justify-between w-full py-1 border-t border-b border-transparent"
                  style={{
                    fontFamily: 'var(--doc-font-family)',
                    fontSize: 'var(--doc-font-size, 12pt)'
                  }}
                >
                  <div className="flex-1 text-center font-bold italic" dangerouslySetInnerHTML={{ __html: renderFormula(el.content || 'y = f(x)') }} />
                  <div className="shrink-0 pl-4 font-bold text-slate-900">
                    {resolvedEqPrefix}
                  </div>
                </div>

                {descLines.length > 0 && (
                  <div 
                    className="text-left leading-relaxed pl-8 mt-1.5"
                    style={{
                      fontFamily: 'var(--doc-font-family)',
                      fontSize: 'var(--doc-font-size, 12pt)'
                    }}
                  >
                    <div className="font-bold mb-0.5">Keterangan:</div>
                    <div className="flex flex-col gap-0.5">
                      {descLines.map((line, lIdx) => (
                        <div key={lIdx} className="italic" dangerouslySetInnerHTML={{ __html: italicizeEnglishWordsText(line) }} />
                      ))}
                    </div>
                  </div>
                )}
                <span className="absolute -top-3 right-1 bg-indigo-600 text-white text-[8px] font-bold px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity no-print">Klik untuk edit</span>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  // Legacy mapping for hardcoded section IDs
  const legacySectionKeyMapping = {
    'b1s1': 'latar_belakang',
    'b1s2': 'identifikasi_masalah',
    'b1s3': 'rumusan_masalah',
    'b2s1': 'penelitian_terdahulu',
    'b2s2': 'grand_theory',
    'b2s3': 'middle_theory',
    'b2s4': 'applied_theory',
    'b3s1': 'desain_penelitian',
    'b3s2': 'tempat_waktu',
    'b3s3': 'pengumpulan_data',
    'b3s4': 'analisis_data',
    'b4s1': 'deskripsi_data',
    'b4s2': 'pembahasan',
    'b5s1': 'kesimpulan',
    'b5s2': 'saran'
  };

  const getAIWriteButton = (id, babKey, sectionTitle) => {
    // Dynamic: works for ANY section, not just hardcoded ones
    const legacyKey = legacySectionKeyMapping[id];
    const displayTitle = sectionTitle || 'Bagian ini';
    const isGenerating = generatingSection === id;
    
    return (
      <button 
        type="button"
        disabled={!!generatingSection}
        onClick={() => triggerAIGenerateFlow({ babKey, id, displayTitle, legacyKey })} 
        className="bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-500 dark:text-indigo-400 px-2 py-1.5 rounded-lg flex items-center gap-1 font-bold text-[9px] w-full justify-center disabled:opacity-40"
      >
        {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        AI Tulis
      </button>
    );
  };

  // Reset to outline: strips paragraph content, keeps headings/titles only
  const handleResetToOutline = () => {
    if (!confirm('⚠️ Peringatan: Fitur ini akan menghapus SEMUA isi paragraf dari seluruh BAB, menyisakan hanya judul heading/sub-bab saja. Anda dapat menggunakan tombol "AI Tulis" pada tiap bagian untuk mengisi ulang konten.\n\nLanjutkan?')) return;
    
    setBabSections(prev => {
      const reset = {};
      Object.keys(prev).forEach(babKey => {
        reset[babKey] = prev[babKey].map(sec => {
          if (sec.type === 'text') {
            return { ...sec, content: '' };
          }
          return sec; // keep tables & figures intact
        });
      });
      saveLocalDraft({ babSections: reset });
      return reset;
    });
    showToast('Outline berhasil di-reset! Isi paragraf dihapus. Gunakan tombol "AI Tulis" di tiap bagian untuk generate konten.');
  };

  const handleCreateNewBlankDraft = () => {
    // Reset layout defaults
    const blankLayout = {
      preset: 'dikti',
      marginTop: 4.0,
      marginLeft: 4.0,
      marginBottom: 3.0,
      marginRight: 3.0,
      fontFamily: "'Times New Roman', Times, serif",
      fontSize: '12pt',
      lineSpacing: '2.0',
      textAlign: 'justify',
      pageNumPosition: 'flexible',
      hideCoverNum: true,
      romanPrelims: true,
      paragraphIndent: 'indented',
      coverAuthorLabel: 'Oleh :',
      showPersetujuan: false,
      showPengesahan: false,
      showPernyataan: false,
      showAbstractIndo: false,
      showAbstractEng: false,
      showDaftarRumus: true
    };
    setLayout(blankLayout);

    // Reset cover default blank fields
    const blankCover = {
      title: 'JUDUL SKRIPSI/TUGAS AKHIR MAHASISWA',
      subtitle: 'SKRIPSI',
      author: '',
      nim: '',
      prodi: '',
      fakultas: '',
      univ: '',
      city: 'JAKARTA',
      year: new Date().getFullYear().toString(),
      logoType: 'default',
      logoData: null
    };
    setCover(blankCover);

    const blankCoverElements = [
      { id: 'ce1', type: 'title', value: 'JUDUL SKRIPSI/TUGAS AKHIR MAHASISWA', fontSize: '14pt', bold: true, uppercase: true, field: 'title' },
      { id: 'ce_sp1', type: 'spacing', height: '1.5cm' },
      { id: 'ce2', type: 'label', value: 'SKRIPSI', fontSize: '12pt', bold: true, uppercase: true, field: 'subtitle' },
      { id: 'ce_sp2', type: 'spacing', height: '1.5cm' },
      { id: 'ce3', type: 'logo', logoType: 'default', logoData: null },
      { id: 'ce_sp3', type: 'spacing', height: '1.5cm' },
      { id: 'ce4', type: 'label', value: 'Disusun Oleh :', fontSize: '12pt', bold: false, uppercase: false, field: '' },
      { id: 'ce5', type: 'text', value: '', fontSize: '12pt', bold: true, uppercase: true, underline: true, field: 'author' },
      { id: 'ce6', type: 'text', value: '', fontSize: '12pt', bold: true, uppercase: false, underline: false, field: 'nim' },
      { id: 'ce7', type: 'spacing', height: '2cm' },
      { id: 'ce8', type: 'text', value: '', fontSize: '12pt', bold: true, uppercase: true, field: 'prodi' },
      { id: 'ce9', type: 'text', value: '', fontSize: '12pt', bold: true, uppercase: true, field: 'fakultas' },
      { id: 'ce10', type: 'text', value: '', fontSize: '12pt', bold: true, uppercase: true, field: 'univ' },
      { id: 'ce11', type: 'text', value: `JAKARTA, ${new Date().getFullYear()}`, fontSize: '12pt', bold: true, uppercase: true, field: 'city_year' },
    ];
    setCoverElements(blankCoverElements);

    // Reset chapters to template kosongan (empty paragraph content but keeping headings structure)
    const blankBabSections = {
      bab1: [
        { id: 'b1s1', type: 'text', headingLevel: 2, title: 'Latar Belakang Masalah', content: '', page: 1, numberingStyle: 'bab_prefix_dot' },
        { id: 'b1s2', type: 'text', headingLevel: 2, title: 'Identifikasi Masalah', content: '', page: 2, numberingStyle: 'bab_prefix_dot' },
        { id: 'b1s3', type: 'text', headingLevel: 2, title: 'Rumusan Masalah', content: '', page: 2, numberingStyle: 'bab_prefix_dot' }
      ],
      bab2: [
        { id: 'b2s1', type: 'text', headingLevel: 2, title: 'Penelitian Terdahulu / Kajian Pustaka', content: '', page: 1, numberingStyle: 'bab_prefix_dot' },
        { id: 'b2s2', type: 'text', headingLevel: 2, title: 'Grand Theory (Teori Utama)', content: '', page: 2, numberingStyle: 'bab_prefix_dot' },
        { id: 'b2s3', type: 'text', headingLevel: 2, title: 'Middle Range Theory (Teori Menengah)', content: '', page: 2, numberingStyle: 'bab_prefix_dot' },
        { id: 'b2s4', type: 'text', headingLevel: 2, title: 'Applied / Micro Theory', content: '', page: 2, numberingStyle: 'bab_prefix_dot' }
      ],
      bab3: [
        { id: 'b3s1', type: 'text', headingLevel: 2, title: 'Desain / Pendekatan Penelitian', content: '', page: 1, numberingStyle: 'bab_prefix_dot' },
        { id: 'b3s2', type: 'text', headingLevel: 2, title: 'Tempat dan Waktu Penelitian', content: '', page: 1, numberingStyle: 'bab_prefix_dot' },
        { id: 'b3s3', type: 'text', headingLevel: 2, title: 'Metode Pengumpulan Data', content: '', page: 2, numberingStyle: 'bab_prefix_dot' },
        { id: 'b3s4', type: 'text', headingLevel: 2, title: 'Metode Analisis Data', content: '', page: 2, numberingStyle: 'bab_prefix_dot' }
      ],
      bab4: [
        { id: 'b4s1', type: 'text', headingLevel: 2, title: 'Deskripsi dan Analisis Data', content: '', page: 1, numberingStyle: 'bab_prefix_dot' },
        { id: 'b4s2', type: 'text', headingLevel: 2, title: 'Pembahasan Hasil Penelitian', content: '', page: 2, numberingStyle: 'bab_prefix_dot' }
      ],
      bab5: [
        { id: 'b5s1', type: 'text', headingLevel: 2, title: 'Kesimpulan Penelitian', content: '', page: 1, numberingStyle: 'bab_prefix_dot' },
        { id: 'b5s2', type: 'text', headingLevel: 2, title: 'Saran', content: '', page: 2, numberingStyle: 'bab_prefix_dot' }
      ]
    };
    const defaultBabTitles = {
      bab1: { prefix: "BAB I", title: "PENDAHULUAN" },
      bab2: { prefix: "BAB II", title: "TINJAUAN PUSTAKA" },
      bab3: { prefix: "BAB III", title: "METODOLOGI PENELITIAN" },
      bab4: { prefix: "BAB IV", title: "HASIL DAN PEMBAHASAN" },
      bab5: { prefix: "BAB V", title: "KESIMPULAN DAN SARAN" }
    };
    setBabSections(blankBabSections);
    setBabTitles(defaultBabTitles);
    setReferences([]);
    setAbstrakIndo('');
    setAbstrakIndoKeywords('');
    setAbstrakEng('');
    setAbstrakEngKeywords('');

    // Save to local storage
    const blankState = {
      layout: blankLayout,
      cover: blankCover,
      coverElements: blankCoverElements,
      babSections: blankBabSections,
      babTitles: defaultBabTitles,
      references: [],
      refStyle: 'apa',
      tables: [],
      figures: [],
      abstrakIndo: '',
      abstrakIndoKeywords: '',
      abstrakEng: '',
      abstrakEngKeywords: '',
      headingStyles
    };
    localStorage.setItem('skripsi_laravel_draft_v2', JSON.stringify(blankState));
    setSaveFilename('Draft_Skripsi');
    lastSavedPayloadRef.current = '';
    setHasLocalDraft(true);
    setShowWelcomeModal(false);
    showToast('Dokumen baru berhasil dibuat dengan template kosong.');
  };

  // Shared blank layout/cover builder for the "Dokumen Kosong" and "Dengan Outline" options
  const buildBaseLayout = (overrides = {}) => ({
    preset: 'dikti',
    marginTop: 4.0,
    marginLeft: 4.0,
    marginBottom: 3.0,
    marginRight: 3.0,
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: '12pt',
    lineSpacing: '2.0',
    textAlign: 'justify',
    pageNumPosition: 'flexible',
    hideCoverNum: true,
    romanPrelims: true,
    paragraphIndent: 'indented',
    coverAuthorLabel: 'Oleh :',
    showPersetujuan: false,
    showPengesahan: false,
    showPernyataan: false,
    showAbstractIndo: false,
    showAbstractEng: false,
    showDaftarRumus: false,
    ...overrides
  });

  const buildBaseCover = () => ({
    title: 'JUDUL DOKUMEN',
    subtitle: '',
    author: '',
    nim: '',
    prodi: '',
    fakultas: '',
    univ: '',
    city: '',
    year: new Date().getFullYear().toString(),
    logoType: 'default',
    logoData: null
  });

  // Persist a freshly-created draft and close the modal
  const commitNewDraft = (state, toastMsg) => {
    setLayout(state.layout);
    setCover(state.cover);
    setCoverElements(state.coverElements);
    setBabSections(state.babSections);
    setBabTitles(state.babTitles);
    setReferences([]);
    setAbstrakIndo('');
    setAbstrakIndoKeywords('');
    setAbstrakEng('');
    setAbstrakEngKeywords('');
    // IMPORTANT: detach from any previously-loaded draft so autosave does NOT
    // overwrite it. Reset to the sentinel name that disables autosave until the
    // user explicitly names & saves this new draft.
    setSaveFilename('Draft_Skripsi');
    lastSavedPayloadRef.current = '';
    localStorage.setItem('skripsi_laravel_draft_v2', JSON.stringify(state));
    setHasLocalDraft(true);
    setShowWelcomeModal(false);
    setShowOutlineBuilder(false);
    showToast(toastMsg);
  };

  // OPTION: Blank document — a single empty writing page, no outline/headings, no TOC/daftar pages
  const handleCreateBlankDocument = () => {
    const layoutBlank = buildBaseLayout({ blankMode: true });
    const coverBlank = buildBaseCover();
    const coverElements = [
      { id: 'ce1', type: 'title', value: 'JUDUL DOKUMEN', fontSize: '14pt', bold: true, uppercase: true, field: 'title' },
    ];
    const babSectionsBlank = {
      bab1: [
        { id: 'blank_' + Date.now(), type: 'text', headingLevel: 0, title: '', content: '', page: 1, numberingStyle: 'none' }
      ],
      bab2: [], bab3: [], bab4: [], bab5: []
    };
    const babTitlesBlank = {
      bab1: { prefix: '', title: '' },
      bab2: { prefix: '', title: '' },
      bab3: { prefix: '', title: '' },
      bab4: { prefix: '', title: '' },
      bab5: { prefix: '', title: '' }
    };
    commitNewDraft({
      layout: layoutBlank,
      cover: coverBlank,
      coverElements,
      babSections: babSectionsBlank,
      babTitles: babTitlesBlank,
      references: [],
      refStyle: 'apa',
      tables: [],
      figures: [],
      abstrakIndo: '',
      abstrakIndoKeywords: '',
      abstrakEng: '',
      abstrakEngKeywords: '',
      headingStyles
    }, 'Dokumen kosong berhasil dibuat.');
  };

  // Parse an outline text into chapters with sub-headings.
  // Non-indented line = chapter (BAB); indented line or line starting with -, *, • = sub-bab.
  const parseOutlineText = (text) => {
    const lines = (text || '').split('\n');
    const chapters = [];
    let current = null;
    lines.forEach(raw => {
      if (!raw.trim()) return;
      const isSub = /^[\s\t]+/.test(raw) || /^[-*•]/.test(raw.trim());
      const clean = raw.trim().replace(/^[-*•]\s*/, '').replace(/^\d+(\.\d+)*\.?\s*/, '').trim();
      if (!clean) return;
      if (isSub && current) {
        current.subs.push(clean);
      } else {
        current = { title: clean, subs: [] };
        chapters.push(current);
      }
    });
    return chapters.slice(0, 5); // app supports up to 5 chapters
  };

  // OPTION: With outline — build chapters/sub-bab from the user-provided outline
  const handleCreateOutlineDocument = () => {
    const chapters = parseOutlineText(outlineText);
    if (chapters.length === 0) {
      showToast('Tuliskan minimal satu judul BAB pada outline.', true);
      return;
    }

    const romans = ['I', 'II', 'III', 'IV', 'V'];
    const babKeys = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
    const babSectionsOut = { bab1: [], bab2: [], bab3: [], bab4: [], bab5: [] };
    const babTitlesOut = {
      bab1: { prefix: '', title: '' },
      bab2: { prefix: '', title: '' },
      bab3: { prefix: '', title: '' },
      bab4: { prefix: '', title: '' },
      bab5: { prefix: '', title: '' }
    };

    chapters.forEach((ch, idx) => {
      const babKey = babKeys[idx];
      // Split "BAB I PENDAHULUAN" into prefix + title; otherwise auto-assign roman prefix
      const babHeadingMatch = ch.title.match(/^(BAB\s+[IVX\d]+)\s+(.*)$/i);
      if (babHeadingMatch) {
        babTitlesOut[babKey] = { prefix: babHeadingMatch[1].toUpperCase(), title: babHeadingMatch[2].toUpperCase() };
      } else {
        babTitlesOut[babKey] = { prefix: `BAB ${romans[idx]}`, title: ch.title.toUpperCase() };
      }
      if (ch.subs.length > 0) {
        babSectionsOut[babKey] = ch.subs.map((sub, sIdx) => ({
          id: `out_${idx}_${sIdx}_` + Date.now() + Math.random(),
          type: 'text',
          headingLevel: 2,
          title: sub,
          content: '',
          page: 1,
          numberingStyle: 'bab_prefix_dot'
        }));
      } else {
        // No sub-headings: provide a single empty paragraph to write in
        babSectionsOut[babKey] = [
          { id: `out_${idx}_p_` + Date.now() + Math.random(), type: 'text', headingLevel: 0, title: '', content: '', page: 1, numberingStyle: 'none' }
        ];
      }
    });

    const layoutOut = buildBaseLayout({ blankMode: false, hideEmptyChapters: true });
    const coverOut = buildBaseCover();
    const coverElements = [
      { id: 'ce1', type: 'title', value: 'JUDUL DOKUMEN', fontSize: '14pt', bold: true, uppercase: true, field: 'title' },
      { id: 'ce_sp1', type: 'spacing', height: '1.5cm' },
      { id: 'ce4', type: 'label', value: 'Disusun Oleh :', fontSize: '12pt', bold: false, uppercase: false, field: '' },
      { id: 'ce5', type: 'text', value: '', fontSize: '12pt', bold: true, uppercase: true, underline: true, field: 'author' },
    ];

    commitNewDraft({
      layout: layoutOut,
      cover: coverOut,
      coverElements,
      babSections: babSectionsOut,
      babTitles: babTitlesOut,
      references: [],
      refStyle: 'apa',
      tables: [],
      figures: [],
      abstrakIndo: '',
      abstrakIndoKeywords: '',
      abstrakEng: '',
      abstrakEngKeywords: '',
      headingStyles
    }, `Dokumen dengan ${chapters.length} BAB berhasil dibuat dari outline.`);
  };

  // Abstracts State (Indonesian & English)
  const [abstrakIndo, setAbstrakIndo] = useState('Pembelajaran daring (e-learning) telah berkembang pesat dan menjadi pilar penting pendidikan tinggi. Penelitian ini bertujuan untuk menganalisis pengaruh kualitas sistem dan kualitas informasi platform e-learning terhadap kepuasan mahasiswa serta implikasinya pada motivasi belajar. Penelitian menggunakan metode kuantitatif deskriptif dengan pengumpulan data melalui kuesioner kepada 150 mahasiswa. Analisis data dilakukan menggunakan Structural Equation Modeling (SEM) berbasis Partial Least Squares (PLS). Hasil penelitian menunjukkan bahwa kualitas sistem dan kualitas informasi berpengaruh positif signifikan terhadap kepuasan mahasiswa, yang pada gilirannya secara signifikan memediasi peningkatan motivasi belajar mahasiswa.');
  const [abstrakIndoKeywords, setAbstrakIndoKeywords] = useState('E-Learning, Kepuasan Pengguna, Motivasi Belajar, PLS-SEM.');
  
  const [abstrakEng, setAbstrakEng] = useState('Online learning (e-learning) has developed rapidly and become an important pillar of higher education. This study aims to analyze the influence of system quality and information quality of e-learning platforms on student satisfaction and its implications for learning motivation. The research uses a descriptive quantitative approach with data collected via questionnaires from 150 students. Data analysis was performed using Structural Equation Modeling (SEM) based on Partial Least Squares (PLS). The results indicate that system quality and information quality have a significant positive impact on student satisfaction, which in turn significantly mediates the enhancement of students\' learning motivation.');
  const [abstrakEngKeywords, setAbstrakEngKeywords] = useState('E-Learning, User Satisfaction, Learning Motivation, PLS-SEM.');

  // Bibliography Reference List
  const [references, setReferences] = useState([
    { id: 'ref1', type: 'book', author: 'Sugiyono', year: '2018', title: 'Metode Penelitian Kuantitatif, Kualitatif, dan R&D', publisher: 'Alfabeta, Bandung' },
    { id: 'ref2', type: 'journal', author: 'Pratama, A.', year: '2022', title: 'Analisis Kepuasan Pengguna E-Learning Menggunakan Metode TAM', publisher: 'Jurnal Teknologi Informasi, 10(2), 145-156' },
    { id: 'ref3', type: 'journal', author: 'Lestari, S.', year: '2023', title: 'Motivasi Belajar Mahasiswa di Era Digital', publisher: 'Penerbit Akademika, Jakarta' }
  ]);
  const [refStyle, setRefStyle] = useState('apa');

  // Input states for reference form & Google Scholar finder
  const [refInput, setRefInput] = useState({ author: '', year: '', type: 'book', title: '', publisher: '' });
  const [scholarQuery, setScholarQuery] = useState('');
  const [scholarResults, setScholarResults] = useState([]);
  const [searchingScholar, setSearchingScholar] = useState(false);

  // Gemini API key state
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem('gemini_api_key') || '';
    } catch (e) {
      return '';
    }
  });
  
  // AI Suggestions inputs
  const [aiInputs, setAiInputs] = useState({ fakultas: 'Teknologi Informasi', prodi: 'Sistem Informasi', topik: 'Platform Pembelajaran E-Learning' });
  const [suggestedTitles, setSuggestedTitles] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  // AI content draft generator state
  const [generatingSection, setGeneratingSection] = useState(null);
  const [backgroundStyle, setBackgroundStyle] = useState('structured');
  const [scholarYearStart, setScholarYearStart] = useState(() => new Date().getFullYear() - 10);
  const [scholarYearEnd, setScholarYearEnd] = useState(() => new Date().getFullYear());
  
  // Zoom & UI States
  const [zoomLevel, setZoomLevel] = useState(80);
  const [showMarginGuide, setShowMarginGuide] = useState(false);
  const [activeTab, setActiveTab] = useState('layout');
  const [activeSection, setActiveSection] = useState('cover');
  const [saveFilename, setSaveFilename] = useState('Draft_Skripsi');
  const [autosaveEnabled, setAutosaveEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('autosave_setting');
      return stored !== 'false'; // default to true
    }
    return true;
  });

  const [inlineEditingBlockId, setInlineEditingBlockId] = useState(null);
  const [inlineEditingBabKey, setInlineEditingBabKey] = useState(null);

  const handleEditBlockInline = (babKey, blockId) => {
    setInlineEditingBlockId(blockId);
    setInlineEditingBabKey(babKey);
    setActiveSection(babKey);
    setActiveTab('konten');
  };

  const handlePreviewBackgroundClick = (e) => {
    if (inlineEditingBlockId && !e.target.closest('.inline-editor-active-block') && !e.target.closest('.inline-editor-toolbar')) {
      setInlineEditingBlockId(null);
      setInlineEditingBabKey(null);
    }
  };

  // Heading Styling State (H1 to H6)
  const [headingStyles, setHeadingStyles] = useState({
    h1: { fontSize: '14pt', fontWeight: 'bold', fontStyle: 'normal', textAlign: 'center', uppercase: true },
    h2: { fontSize: '12pt', fontWeight: 'bold', fontStyle: 'normal', textAlign: 'left', uppercase: false },
    h3: { fontSize: '12pt', fontWeight: 'bold', fontStyle: 'italic', textAlign: 'left', uppercase: false },
    h4: { fontSize: '11pt', fontWeight: 'bold', fontStyle: 'normal', textAlign: 'left', uppercase: false },
    h5: { fontSize: '11pt', fontWeight: 'normal', fontStyle: 'italic', textAlign: 'left', uppercase: false },
    h6: { fontSize: '10pt', fontWeight: 'normal', fontStyle: 'italic', textAlign: 'left', uppercase: false },
  });
  const [selectedHeadingToStyle, setSelectedHeadingToStyle] = useState('h2');
  const [activeNavTab, setActiveNavTab] = useState('pages'); // 'pages' or 'headings'
  
  // Database drafts list
  const [draftsList, setDraftsList] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [showDraftManager, setShowDraftManager] = useState(false);
  const [showNewDraftChooser, setShowNewDraftChooser] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [draftSearch, setDraftSearch] = useState('');
  const [showAiPromptModal, setShowAiPromptModal] = useState(false);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [aiPromptTarget, setAiPromptTarget] = useState(null);

  // Download Modal settings
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState('pdf'); // 'pdf' or 'docx'
  const [downloadRange, setDownloadRange] = useState('all'); // 'all' or 'custom'
  const [selectedDownloadSections, setSelectedDownloadSections] = useState([
    'cover', 'persetujuan', 'pengesahan', 'pernyataan', 'abstrak-indo', 'abstrak-eng',
    'daftar-isi', 'daftar-tabel', 'daftar-gambar', 'daftar-rumus', 'bab1', 'bab2', 'bab3', 'bab4', 'bab5', 'daftar-pustaka'
  ]);
  const [downloadSplit, setDownloadSplit] = useState(false); // split by chapter/heading 1
  const [pagesToPrint, setPagesToPrint] = useState(null); // dynamic print page filter
  
  // Toast notifications
  const [toast, setToast] = useState({ show: false, message: '', isError: false });

  // Helper to extract tables and figures from babSections dynamically
  const getAllTables = (sections = babSections) => {
    const list = [];
    ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'].forEach(babKey => {
      (sections[babKey] || []).forEach(sec => {
        if (sec.type === 'table') {
          list.push({ ...sec, bab: babKey });
        }
      });
    });
    return list;
  };

  const getAllFigures = (sections = babSections) => {
    const list = [];
    ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'].forEach(babKey => {
      (sections[babKey] || []).forEach(sec => {
        if (sec.type === 'figure') {
          list.push({ ...sec, bab: babKey });
        }
      });
    });
    return list;
  };

  const getAllEquations = (sections = babSections) => {
    const list = [];
    ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'].forEach(babKey => {
      (sections[babKey] || []).forEach(sec => {
        if (sec.type === 'equation') {
          list.push({ ...sec, bab: babKey });
        }
      });
    });
    return list;
  };

  const babPagesCacheRef = useRef({ deps: null, value: null });

  // Cached wrapper around the expensive pagination engine. Because this is called
  // hundreds of times per render (via getVisiblePages/getPageNumber/TOC/etc.), we
  // memoize the result keyed by the inputs that actually affect pagination.
  const getBabPagesMap = (sections = babSections) => {
    const deps = [
      sections,
      layout.marginLeft, layout.marginRight, layout.marginTop, layout.marginBottom,
      layout.lineSpacing, layout.paragraphIndent, layout.fontSize,
      inlineEditingBlockId
    ];
    const cache = babPagesCacheRef.current;
    if (cache.deps && cache.deps.length === deps.length && cache.deps.every((d, i) => d === deps[i])) {
      return cache.value;
    }
    const value = buildBabPagesMap({ sections, layout, inlineEditingBlockId });
    babPagesCacheRef.current = { deps, value };
    return value;
  };

  const getBlockPageNumber = (babKey, blockId) => {
    const babPagesMap = getBabPagesMap();
    const pages = babPagesMap[babKey] || [];
    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const pageElements = pages[pIdx];
      if (pageElements.some(el => el.blockId === blockId)) {
        return getPageNumber(`${babKey}-${pIdx + 1}`);
      }
    }
    return '';
  };

  const tables = getAllTables();
  const figures = getAllFigures();
  const equations = getAllEquations();
  const setTables = () => {};
  const setFigures = () => {};

  const getTableListPages = () => paginateListEntries(tables, layout);
  const getFigureListPages = () => paginateListEntries(figures, layout);
  const getEquationListPages = () => paginateListEntries(equations, layout);

  // Table editor inputs
  const [tableInput, setTableInput] = useState({ title: '', bab: 'bab3', headers: '', rowsText: '' });
  // Figure editor inputs
  const [figureInput, setFigureInput] = useState({ title: '', bab: 'bab1' });

  // ==========================================================================
  // SIDE EFFECTS & CACHING
  // ==========================================================================
  
  const showToast = (message, isError = false) => {
    setToast({ show: true, message, isError });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  useEffect(() => {
    fetchDraftsList();
    // Load local storage fallback for draft
    try {
      const localDraft = localStorage.getItem('skripsi_laravel_draft_v2');
      if (localDraft) {
        const parsed = JSON.parse(localDraft);
        if (parsed && typeof parsed === 'object') {
          setHasLocalDraft(true);
          if (parsed.layout) setLayout(prev => ({ ...prev, ...parsed.layout }));
          if (parsed.cover) setCover(prev => ({ ...prev, ...parsed.cover }));
          if (parsed.coverElements) {
            setCoverElements(parsed.coverElements);
          } else if (parsed.cover) {
            const resolvedElements = defaultCoverElements.map(el => {
              if (el.field === 'title' && parsed.cover.title) return { ...el, value: parsed.cover.title };
              if (el.field === 'subtitle' && parsed.cover.subtitle) return { ...el, value: parsed.cover.subtitle };
              if (el.field === 'author' && parsed.cover.author) return { ...el, value: parsed.cover.author };
              if (el.field === 'nim' && parsed.cover.nim) return { ...el, value: parsed.cover.nim };
              if (el.field === 'prodi' && parsed.cover.prodi) return { ...el, value: `PROGRAM STUDI ${parsed.cover.prodi.toUpperCase()}` };
              if (el.field === 'fakultas' && parsed.cover.fakultas) return { ...el, value: `FAKULTAS ${parsed.cover.fakultas.toUpperCase()}` };
              if (el.field === 'univ' && parsed.cover.univ) return { ...el, value: parsed.cover.univ };
              if (el.field === 'city_year') {
                const city = parsed.cover.city || 'JAKARTA';
                const year = parsed.cover.year || '2026';
                return { ...el, value: `${city.toUpperCase()}, ${year}` };
              }
              if (el.type === 'logo') {
                return { ...el, logoType: parsed.cover.logoType || 'default', logoData: parsed.cover.logoData || null };
              }
              return el;
            });
            setCoverElements(resolvedElements);
          }
          if (parsed.babSections) {
            // Upgrade and merge if legacy tables/figures exist in parsed but not in babSections
            let incomingBabSections = parsed.babSections;
            let hasTables = false;
            let hasFigures = false;
            Object.keys(incomingBabSections).forEach(k => {
              (incomingBabSections[k] || []).forEach(sec => {
                if (sec.type === 'table') hasTables = true;
                if (sec.type === 'figure') hasFigures = true;
              });
            });
            if (!hasTables && parsed.tables && parsed.tables.length > 0) {
              parsed.tables.forEach(t => {
                const babKey = t.bab;
                if (incomingBabSections[babKey] && !incomingBabSections[babKey].some(sec => sec.id === t.id)) {
                  incomingBabSections[babKey].push({
                    id: t.id,
                    type: 'table',
                    title: t.title,
                    headers: t.headers,
                    rows: t.rows,
                    rowsText: Array.isArray(t.rows) ? t.rows.map(r => r.join(', ')).join('\n') : '',
                    page: babKey === 'bab3' ? 2 : (babKey === 'bab4' ? 2 : 1)
                  });
                }
              });
            }
            if (!hasFigures && parsed.figures && parsed.figures.length > 0) {
              parsed.figures.forEach(f => {
                const babKey = f.bab;
                if (incomingBabSections[babKey] && !incomingBabSections[babKey].some(sec => sec.id === f.id)) {
                  incomingBabSections[babKey].push({
                    id: f.id,
                    type: 'figure',
                    title: f.title,
                    imageData: null,
                    page: babKey === 'bab3' ? 1 : (babKey === 'bab1' ? 2 : 1)
                  });
                }
              });
            }
            setBabSections(incomingBabSections);
          } else {
            const upgraded = convertOldDraftToSections(parsed);
            setBabSections(upgraded);
          }
          if (parsed.references && Array.isArray(parsed.references)) setReferences(parsed.references);
          if (parsed.refStyle) setRefStyle(parsed.refStyle);
          if (parsed.abstrakIndo) setAbstrakIndo(parsed.abstrakIndo);
          if (parsed.abstrakIndoKeywords) setAbstrakIndoKeywords(parsed.abstrakIndoKeywords);
          if (parsed.abstrakEng) setAbstrakEng(parsed.abstrakEng);
          if (parsed.abstrakEngKeywords) setAbstrakEngKeywords(parsed.abstrakEngKeywords);
          if (parsed.headingStyles) setHeadingStyles(prev => ({ ...prev, ...parsed.headingStyles }));
          if (parsed.babTitles) setBabTitles(parsed.babTitles);
        }
      }
    } catch (e) {
      console.error('Error loading local draft:', e);
    }
  }, []);

  // Auto Save Implementation
  const lastSavedPayloadRef = React.useRef('');
  // Filename for which the user has confirmed autosave-overwrite this session
  const autosaveConfirmedRef = React.useRef(null);

  useEffect(() => {
    // Initialize the last saved payload ref on mount
    const initialPayload = {
      layout, cover, coverElements, babSections, babTitles, references, refStyle,
      tables: getAllTables(),
      figures: getAllFigures(),
      abstrakIndo, abstrakIndoKeywords, abstrakEng, abstrakEngKeywords, headingStyles
    };
    lastSavedPayloadRef.current = JSON.stringify(initialPayload);
  }, []);

  useEffect(() => {
    if (!autosaveEnabled || !saveFilename || saveFilename === 'Draft_Skripsi') {
      return;
    }

    const interval = setInterval(async () => {
      const draftPayload = {
        layout, cover, coverElements, babSections, babTitles, references, refStyle,
        tables: getAllTables(),
        figures: getAllFigures(),
        abstrakIndo, abstrakIndoKeywords, abstrakEng, abstrakEngKeywords, headingStyles
      };

      const payloadString = JSON.stringify(draftPayload);
      if (payloadString !== lastSavedPayloadRef.current) {
        // Confirm once per draft before autosave starts overwriting an existing draft
        if (autosaveConfirmedRef.current !== saveFilename) {
          const ok = window.confirm(
            `Simpan otomatis (autosave) akan terus menimpa draft "${saveFilename}" dengan perubahan terbaru Anda.\n\n` +
            `Klik OK untuk MENGIZINKAN autosave ke draft ini.\n` +
            `Klik Batal untuk MEMATIKAN autosave (gunakan tombol Simpan manual / simpan dengan nama lain).`
          );
          if (!ok) {
            setAutosaveEnabled(false);
            saveLocalDraftSetting(false);
            return;
          }
          autosaveConfirmedRef.current = saveFilename;
        }
        try {
          const response = await saveDraftRequest(saveFilename, draftPayload);
          const result = await response.json();
          if (response.ok && result.success) {
            lastSavedPayloadRef.current = payloadString;
            fetchDraftsList();
            console.log("Draft auto-saved successfully.");
          }
        } catch (e) {
          console.error("Auto save failed:", e);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [
    autosaveEnabled, saveFilename, layout, cover, coverElements, babSections, 
    references, refStyle, abstrakIndo, abstrakIndoKeywords, 
    abstrakEng, abstrakEngKeywords, headingStyles
  ]);

  const saveLocalDraftSetting = (enabled) => {
    localStorage.setItem('autosave_setting', enabled ? 'true' : 'false');
    showToast(`Auto Save ${enabled ? 'diaktifkan' : 'dinonaktifkan'}.`);
  };

  const localDraftTimerRef = useRef(null);
  const pendingDraftStateRef = useRef(null);

  // Build the full draft snapshot immediately (cheap), but defer the expensive
  // JSON.stringify + synchronous localStorage write until typing pauses. Writing
  // the whole document (including base64 figures) on every keystroke is what made
  // editing paragraphs feel heavy.
  const flushLocalDraft = () => {
    const state = pendingDraftStateRef.current;
    if (!state) return;
    pendingDraftStateRef.current = null;
    try {
      localStorage.setItem('skripsi_laravel_draft_v2', JSON.stringify(state));
    } catch (e) {
      console.error('Error saving local draft:', e);
    }
  };

  const saveLocalDraft = (updatedState) => {
    try {
      const currentBabSections = updatedState?.babSections || babSections;
      const currentCoverElements = updatedState?.coverElements || coverElements;
      const currentBabTitles = updatedState?.babTitles || babTitles;
      const currentState = {
        layout, cover, coverElements: currentCoverElements, babSections: currentBabSections, babTitles: currentBabTitles, references, refStyle, 
        tables: getAllTables(currentBabSections), 
        figures: getAllFigures(currentBabSections),
        abstrakIndo, abstrakIndoKeywords, abstrakEng, abstrakEngKeywords, headingStyles, ...updatedState
      };
      pendingDraftStateRef.current = currentState;
      if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current);
      localDraftTimerRef.current = setTimeout(flushLocalDraft, 600);
    } catch (e) {
      console.error('Error preparing local draft:', e);
    }
  };

  // Persist any pending draft when the component unmounts (e.g. navigating away).
  useEffect(() => {
    return () => {
      if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current);
      flushLocalDraft();
    };
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      setCover(prev => {
        const updated = { ...prev, logoType: 'custom', logoData: base64Data };
        saveLocalDraft({ cover: updated });
        return updated;
      });
      showToast("Logo sampul berhasil diunggah!");
    };
    reader.readAsDataURL(file);
  };

  // ====== COVER ELEMENTS MANAGEMENT ======

  const syncCoverFromElements = (elements) => {
    // Sync coverElements → cover object for backward compatibility
    const updates = {};
    elements.forEach(el => {
      if (el.field === 'title') updates.title = el.value;
      if (el.field === 'subtitle') updates.subtitle = el.value;
      if (el.field === 'author') updates.author = el.value;
      if (el.field === 'nim') updates.nim = el.value;
      if (el.field === 'prodi') updates.prodi = el.value?.replace(/^PROGRAM STUDI\s*/i, '');
      if (el.field === 'fakultas') updates.fakultas = el.value?.replace(/^FAKULTAS\s*/i, '');
      if (el.field === 'univ') updates.univ = el.value;
      if (el.field === 'city_year') {
        const parts = el.value.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          updates.city = parts[0];
          updates.year = parts[1];
        } else {
          updates.year = el.value;
        }
      }
      if (el.type === 'logo') {
        updates.logoType = el.logoType || 'default';
        updates.logoData = el.logoData || null;
      }
    });
    setCover(prev => {
      const merged = { ...prev, ...updates };
      saveLocalDraft({ cover: merged, coverElements: elements });
      return merged;
    });
  };

  const updateCoverElement = (id, field, value) => {
    setCoverElements(prev => {
      const updated = prev.map(el => el.id === id ? { ...el, [field]: value } : el);
      syncCoverFromElements(updated);
      return updated;
    });
  };

  const addCoverElement = (type) => {
    const newId = `ce_${Date.now()}`;
    let newEl = {};
    if (type === 'title') {
      newEl = { id: newId, type: 'title', value: 'JUDUL', fontSize: '14pt', bold: true, uppercase: true, field: '' };
    } else if (type === 'label') {
      newEl = { id: newId, type: 'label', value: 'LABEL', fontSize: '12pt', bold: true, uppercase: true, field: '' };
    } else if (type === 'text') {
      newEl = { id: newId, type: 'text', value: 'Teks', fontSize: '12pt', bold: false, uppercase: false, underline: false, field: '' };
    } else if (type === 'logo') {
      newEl = { id: newId, type: 'logo', logoType: 'default', logoData: null };
    } else if (type === 'spacing') {
      newEl = { id: newId, type: 'spacing', height: '1cm' };
    }
    setCoverElements(prev => {
      const updated = [...prev, newEl];
      saveLocalDraft({ coverElements: updated });
      return updated;
    });
  };

  const removeCoverElement = (id) => {
    setCoverElements(prev => {
      const updated = prev.filter(el => el.id !== id);
      syncCoverFromElements(updated);
      return updated;
    });
  };

  const moveCoverElement = (id, direction) => {
    setCoverElements(prev => {
      const idx = prev.findIndex(el => el.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      saveLocalDraft({ coverElements: arr });
      return arr;
    });
  };

  const handleCoverElementLogoUpload = (id, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      setCoverElements(prev => {
        const updated = prev.map(el => el.id === id ? { ...el, logoType: 'custom', logoData: base64Data } : el);
        syncCoverFromElements(updated);
        return updated;
      });
      showToast("Logo berhasil diunggah!");
    };
    reader.readAsDataURL(file);
  };

  const getHeadingStyle = (level) => {
    const style = headingStyles[`h${level}`] || {};
    return {
      fontFamily: 'var(--doc-font-family)',
      fontSize: style.fontSize || '12pt',
      fontWeight: style.fontWeight || 'bold',
      fontStyle: style.fontStyle || 'normal',
      textAlign: style.textAlign || 'left',
      textIndent: 0,
    };
  };

  const renderHeading = (level, text) => {
    const style = headingStyles[`h${level}`] || {};
    const className = `heading-level-${level} ${level === 1 ? 'mb-8' : 'mb-2 mt-4'}`;
    const tag = `h${level}`;
    const formatted = italicizeEnglishWordsText(text);
    const content = style.uppercase ? formatted.toUpperCase() : formatted;
    const headingId = `heading-${text.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    
    return React.createElement(tag, {
      id: headingId,
      className: className,
      style: getHeadingStyle(level),
      dangerouslySetInnerHTML: { __html: content }
    });
  };

  const scanTextForHeadings = (text, pageId) => {
    if (!text) return [];
    const entries = [];
    const lines = text.split('\n');
    lines.forEach(line => {
      const match = line.trim().match(/^(#{3,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length; // 3 to 6
        const titleText = match[2];
        let indent = '0.75cm';
        if (level === 3) indent = '1.25cm';
        else if (level === 4) indent = '1.75cm';
        else if (level === 5) indent = '2.25cm';
        else if (level === 6) indent = '2.75cm';
        
        entries.push({
          title: titleText,
          pageId: pageId,
          indent: indent,
          isBold: false
        });
      }
    });
    return entries;
  };

  const getTocEntries = () => {
    const entries = [];
    
    if (layout.showPersetujuan) entries.push({ title: "HALAMAN PERSETUJUAN", pageId: 'persetujuan', isBold: true });
    if (layout.showPengesahan) entries.push({ title: "HALAMAN PENGESAHAN", pageId: 'pengesahan', isBold: true });
    if (layout.showPernyataan) entries.push({ title: "PERNYATAAN ORISINALITAS", pageId: 'pernyataan', isBold: true });
    if (layout.showAbstractIndo) entries.push({ title: "ABSTRAK", pageId: 'abstrak-indo', isBold: true });
    if (layout.showAbstractEng) entries.push({ title: "ABSTRACT", pageId: 'abstrak-eng', isBold: true });
    
    entries.push({ title: "DAFTAR ISI", pageId: 'daftar-isi-1', isBold: true });
    entries.push({ title: "DAFTAR TABEL", pageId: 'daftar-tabel-1', isBold: true });
    entries.push({ title: "DAFTAR GAMBAR", pageId: 'daftar-gambar-1', isBold: true });
    if (layout.showDaftarRumus) entries.push({ title: "DAFTAR RUMUS", pageId: 'daftar-rumus-1', isBold: true });
    
    // Build a lookup: blockId -> pageIndex (1-based) from the dynamic pagination engine
    const babPagesMapForToc = getBabPagesMap();
    const getBlockPageIdx = (babKey, blockId) => {
      const pages = babPagesMapForToc[babKey] || [];
      for (let pIdx = 0; pIdx < pages.length; pIdx++) {
        if (pages[pIdx].some(el => el.blockId === blockId)) {
          return pIdx + 1;
        }
      }
      return 1;
    };

    const addChapterTocEntries = (babKey) => {
      const rawSections = babSections[babKey] || [];
      const sections = resolveBlockNumberingForBab(babKey, rawSections);
      sections.forEach(s => {
        const dynamicPageIdx = getBlockPageIdx(babKey, s.id);
        if (s.headingLevel > 0) {
          let indent = '0.75cm';
          if (s.headingLevel === 3) indent = '1.25cm';
          else if (s.headingLevel === 4) indent = '1.75cm';
          else if (s.headingLevel === 5) indent = '2.25cm';
          else if (s.headingLevel === 6) indent = '2.75cm';
          
          entries.push({
            title: `${s.resolvedPrefix || ''}${s.title}`,
            pageId: `${babKey}-${dynamicPageIdx}`,
            indent: indent,
            isBold: s.headingLevel === 2
          });
        }
        entries.push(...scanTextForHeadings(s.content, `${babKey}-${dynamicPageIdx}`));
      });
    };

    // BAB I
    entries.push({ title: `${babTitles.bab1.prefix} ${babTitles.bab1.title}`, pageId: 'bab1-1', isBold: true, isChapter: true });
    addChapterTocEntries('bab1');
    
    // BAB II
    entries.push({ title: `${babTitles.bab2.prefix} ${babTitles.bab2.title}`, pageId: 'bab2-1', isBold: true, isChapter: true });
    addChapterTocEntries('bab2');
    
    // BAB III
    entries.push({ title: `${babTitles.bab3.prefix} ${babTitles.bab3.title}`, pageId: 'bab3-1', isBold: true, isChapter: true });
    addChapterTocEntries('bab3');
    
    // BAB IV
    entries.push({ title: `${babTitles.bab4.prefix} ${babTitles.bab4.title}`, pageId: 'bab4-1', isBold: true, isChapter: true });
    addChapterTocEntries('bab4');
    
    // BAB V
    entries.push({ title: `${babTitles.bab5.prefix} ${babTitles.bab5.title}`, pageId: 'bab5-1', isBold: true, isChapter: true });
    addChapterTocEntries('bab5');
    
    entries.push({ title: "DAFTAR PUSTAKA", pageId: 'daftar-pustaka-1', isBold: true, isChapter: true });
    
    return entries;
  };

  const tocPagesCacheRef = useRef({ deps: null, value: null });
  const getTocPages = () => {
    const deps = [babSections, babTitles, layout, references];
    const cache = tocPagesCacheRef.current;
    if (cache.deps && cache.deps.length === deps.length && cache.deps.every((d, i) => d === deps[i])) {
      return cache.value;
    }
    const value = computeTocPages();
    tocPagesCacheRef.current = { deps, value };
    return value;
  };

  const computeTocPages = () => {
    const entries = getTocEntries();
    const pages = [];
    
    const contentHeightCm = 29.7 - layout.marginTop - layout.marginBottom;
    const isDoubleSpacing = layout.lineSpacing === '2.0';
    const lineHeightCm = isDoubleSpacing ? 0.85 : 0.65;
    
    // First page has the "DAFTAR ISI" title which occupies space (approx 2.2cm with spacing)
    const firstPageAvailableHeight = contentHeightCm - 2.2; 
    const nextPageAvailableHeight = contentHeightCm;
    
    let currentPage = [];
    let currentHeight = 0;
    let isFirstPage = true;
    
    entries.forEach(entry => {
      // Estimate lines occupied by this entry
      let lines = 1;
      const titleLen = entry.title.length;
      const indentCm = entry.indent ? parseFloat(entry.indent) : 0;
      // Estimate characters that fit on a single line
      const printableWidthCm = 21.0 - layout.marginLeft - layout.marginRight - indentCm;
      const charsPerLine = Math.max(30, Math.floor(printableWidthCm / 0.18));
      
      if (titleLen > charsPerLine) {
        lines = Math.ceil(titleLen / charsPerLine);
      }
      
      // Each entry has: lines * lineHeightCm + flex gap (gap-2 is 0.21cm)
      let entryHeight = (lines * lineHeightCm) + 0.21;
      if (entry.isChapter) {
        entryHeight += 0.32; // mt-3 is 0.32cm
      }
      
      const maxHeight = isFirstPage ? firstPageAvailableHeight : nextPageAvailableHeight;
      
      if (currentHeight + entryHeight > maxHeight && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [entry];
        currentHeight = entryHeight;
        isFirstPage = false;
      } else {
        currentPage.push(entry);
        currentHeight += entryHeight;
      }
    });
    
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }
    
    return pages;
  };

  const refPagesCacheRef = useRef({ deps: null, value: null });
  const getReferencesPages = () => {
    const deps = [references, refStyle, layout.marginTop, layout.marginBottom, layout.lineSpacing, layout.marginLeft, layout.marginRight];
    const cache = refPagesCacheRef.current;
    if (cache.deps && cache.deps.length === deps.length && cache.deps.every((d, i) => d === deps[i])) {
      return cache.value;
    }
    const value = computeReferencesPages();
    refPagesCacheRef.current = { deps, value };
    return value;
  };

  const computeReferencesPages = () => {
    const refs = sortedReferences();
    const pages = [];
    
    const contentHeightCm = 29.7 - layout.marginTop - layout.marginBottom;
    const isDoubleSpacing = layout.lineSpacing === '2.0';
    const lineHeightCm = isDoubleSpacing ? 0.85 : 0.65;
    
    // First page has "DAFTAR PUSTAKA" title which takes about 2.2cm with spacing
    const firstPageAvailableHeight = contentHeightCm - 2.2;
    const nextPageAvailableHeight = contentHeightCm;
    
    let currentPage = [];
    let currentHeight = 0;
    let isFirstPage = true;
    
    refs.forEach(ref => {
      let refText = '';
      if (refStyle === 'apa') {
        refText = `${ref.author || ''}. (${ref.year || ''}). ${ref.title || ''}. ${ref.publisher || ''}.`;
      } else {
        refText = `[99] ${ref.author || ''}, "${ref.title || ''}," ${ref.publisher || ''}, ${ref.year || ''}.`;
      }
      
      const titleLen = refText.length;
      const indentCm = refStyle === 'apa' ? 1.25 : 0.8;
      const printableWidthCm = 21.0 - layout.marginLeft - layout.marginRight - indentCm;
      const charsPerLine = Math.max(30, Math.floor(printableWidthCm / 0.18));
      
      let lines = 1;
      if (titleLen > charsPerLine) {
        lines = Math.ceil(titleLen / charsPerLine);
      }
      
      // Each reference has: lines * lineHeightCm + spacing (space-y-3 is 0.32cm)
      const refHeight = (lines * lineHeightCm) + 0.32;
      const maxHeight = isFirstPage ? firstPageAvailableHeight : nextPageAvailableHeight;
      
      if (currentHeight + refHeight > maxHeight && currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [ref];
        currentHeight = refHeight;
        isFirstPage = false;
      } else {
        currentPage.push(ref);
        currentHeight += refHeight;
      }
    });
    
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }
    
    if (pages.length === 0) {
      pages.push([]);
    }
    
    return pages;
  };

  const updateApiKey = (val) => {
    setApiKey(val);
    try {
      localStorage.setItem('gemini_api_key', val);
    } catch (e) {
      console.error('Error saving API Key:', e);
    }
    showToast('API Key Gemini disimpan di penyimpanan lokal browser.');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    showToast(`Mengunggah dan memindai panduan format: ${file.name}...`);
    
    const formData = new FormData();
    formData.append('file', file);
    if (apiKey) {
      formData.append('api_key', apiKey);
    }

    try {
      const response = await parseGuideRequest(formData);

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Gagal menganalisis dokumen panduan.');
      }

      if (resData.success && resData.detected) {
        const detected = resData.detected;
        let report = [];
        
        if (detected.fontFamily) {
          if (detected.fontFamily.includes('Times')) report.push("Font: Times New Roman");
          else if (detected.fontFamily.includes('Arial')) report.push("Font: Arial");
          else if (detected.fontFamily.includes('Georgia')) report.push("Font: Georgia");
        }
        if (detected.fontSize) report.push(`Ukuran: ${detected.fontSize}`);
        if (detected.lineSpacing) report.push(`Spasi: ${detected.lineSpacing}`);
        if (detected.marginTop) report.push(`Margin: ${detected.marginTop}-${detected.marginLeft}-${detected.marginBottom}-${detected.marginRight}`);
        if (detected.paragraphIndent) report.push(`Paragraf: ${detected.paragraphIndent === 'flush' ? 'Rata Kiri' : 'Menjorok'}`);
        if (detected.showPersetujuan) report.push("Halaman Persetujuan");
        if (detected.showPengesahan) report.push("Halaman Pengesahan");
        if (detected.showPernyataan) report.push("Halaman Pernyataan");
        if (detected.showAbstractIndo) report.push("Halaman Abstrak");

        setLayout(prev => {
          const updated = { ...prev, ...detected };
          saveLocalDraft({ layout: updated });
          return updated;
        });

        let methodLabel = "AI (PDF)";
        if (resData.method === 'gemini_text') methodLabel = "AI (Teks)";
        else if (resData.method === 'heuristics') methodLabel = "Heuristik";
        
        showToast(`Panduan berhasil diterapkan via ${methodLabel}: ${report.join(', ')}.`);
      } else {
        showToast("Aturan format tidak dapat diidentifikasi otomatis dari file ini.", true);
      }
    } catch (err) {
      showToast(err.message || "Gagal memproses dokumen panduan format.", true);
    }
  };

  const cleanDocTitle = () => {
    if (cover && cover.title) {
      const words = cover.title.split(' ');
      return words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    }
    return 'Draft Skripsi';
  };

  const fetchTitleRecommendations = async () => {
    if (!apiKey) {
      showToast('Masukkan API Key Gemini terlebih dahulu!', true);
      return;
    }
    setLoadingSuggestions(true);
    setSuggestedTitles([]);
    showToast('Mencari rekomendasi judul dan metode...');
    try {
      const response = await recommendTitlesRequest(apiKey, {
        fakultas: aiInputs.fakultas,
        prodi: aiInputs.prodi,
        topik: aiInputs.topik,
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Gagal mencari rekomendasi.', true);
        return;
      }
      setSuggestedTitles(data);
      showToast('Rekomendasi judul ditemukan.');
    } catch (e) {
      showToast('Kesalahan koneksi: ' + e.message, true);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const applySuggestedTitle = (item) => {
    const newTitle = item.judul.toUpperCase();
    setCover(p => {
      const updated = { ...p, title: newTitle };
      saveLocalDraft({ cover: updated });
      return updated;
    });
    // Set suggested topic and method inside the AI panel input as well
    setAiInputs(p => ({ ...p, topik: item.judul }));
    showToast('Judul rekomendasi diterapkan.');
  };

  const handleAddReference = (e) => {
    e.preventDefault();
    if (!refInput.author || !refInput.title || !refInput.year) {
      showToast('Isi nama penulis, tahun, dan judul referensi!', true);
      return;
    }
    const newRef = {
      id: 'ref_' + Date.now(),
      type: refInput.type,
      author: refInput.author,
      year: refInput.year,
      title: refInput.title,
      publisher: refInput.publisher
    };
    const updated = [...references, newRef];
    setReferences(updated);
    saveLocalDraft({ references: updated });
    setRefInput({ author: '', year: '', type: 'book', title: '', publisher: '' });
    showToast('Referensi ditambahkan.');
  };

  const getPagePrintClass = (pageId) => {
    if (pagesToPrint && !pagesToPrint.includes(pageId)) {
      return 'no-print-custom';
    }
    return '';
  };

  const resolveSelectedPageIds = (sectionsToExport) => {
    const allVisiblePages = getVisiblePages();
    return allVisiblePages.filter(pageId => {
      if (pageId === 'cover') return sectionsToExport.includes('cover');
      if (pageId === 'persetujuan') return sectionsToExport.includes('persetujuan');
      if (pageId === 'pengesahan') return sectionsToExport.includes('pengesahan');
      if (pageId === 'pernyataan') return sectionsToExport.includes('pernyataan');
      if (pageId === 'abstrak-indo') return sectionsToExport.includes('abstrak-indo');
      if (pageId === 'abstrak-eng') return sectionsToExport.includes('abstrak-eng');
      if (pageId.startsWith('daftar-isi-')) return sectionsToExport.includes('daftar-isi');
      if (pageId.startsWith('daftar-tabel')) return sectionsToExport.includes('daftar-tabel');
      if (pageId.startsWith('daftar-gambar')) return sectionsToExport.includes('daftar-gambar');
      if (pageId.startsWith('daftar-rumus')) return sectionsToExport.includes('daftar-rumus');
      if (pageId.startsWith('bab1-')) return sectionsToExport.includes('bab1');
      if (pageId.startsWith('bab2-')) return sectionsToExport.includes('bab2');
      if (pageId.startsWith('bab3-')) return sectionsToExport.includes('bab3');
      if (pageId.startsWith('bab4-')) return sectionsToExport.includes('bab4');
      if (pageId.startsWith('bab5-')) return sectionsToExport.includes('bab5');
      if (pageId.startsWith('daftar-pustaka-')) return sectionsToExport.includes('daftar-pustaka');
      return false;
    });
  };

  const executePrintPdf = (pageIds) => {
    const allPages = getVisiblePages();
    if (pageIds.length === allPages.length) {
      window.print();
      return;
    }
    setPagesToPrint(pageIds);
    setTimeout(() => {
      window.print();
      setPagesToPrint(null);
    }, 200);
  };

  const executeWordExport = async (pageIds, filename) => {
    let combinedHtml = '';
    
    const cleanFontFamily = layout.fontFamily ? layout.fontFamily.split(',')[0].replace(/['"]/g, "").trim() : 'Times New Roman';
    const spacingNum = parseFloat(layout.lineSpacing || '2.0');
    const wordLineHeight = Math.round(spacingNum * 100) + '%';
    const baseFontSize = layout.fontSize || '12pt';

    // Build a map of figure blockId -> natural pixel dimensions from the rendered DOM,
    // so exported images can be scaled to match the on-screen (web) display size.
    const figureDims = {};
    document.querySelectorAll('img[data-fig-id]').forEach(img => {
      const id = img.getAttribute('data-fig-id');
      if (id && img.naturalWidth && img.naturalHeight) {
        figureDims[id] = { w: img.naturalWidth, h: img.naturalHeight };
      }
    });

    // ==========================================================================
    // Build chapter content DIRECTLY from source data (not from paginated DOM).
    // This lets Word handle pagination naturally so text flows correctly and
    // matches the layout/format settings, instead of inheriting the web's
    // pixel-estimated page splits (which fragment paragraphs and lists).
    // ==========================================================================
    const buildTableWordHtml = (sec) => {
      return buildWordTableHtml({
        section: sec,
        layout,
        cleanFontFamily,
        baseFontSize,
        formatText: italicizeEnglishWordsText,
      });
    };

    const buildFigureWordHtml = (sec) => {
      let h = `<div style="margin-top:12pt; margin-bottom:12pt; text-align:center; text-indent:0cm;">`;
      if (sec.imageData) {
        // Use the user-defined width (cm); height follows the image's natural aspect ratio
        const dim = figureDims[sec.id];
        const PX = 37.795; // px per cm
        const wCm = sec.imgWidth || 12;
        let imgTag;
        if (dim && dim.w && dim.h) {
          const ar = dim.w / dim.h;
          const hCm = wCm / ar;
          const wPx = Math.round(wCm * PX);
          const hPx = Math.round(hCm * PX);
          imgTag = `<img src="${sec.imageData}" width="${wPx}" height="${hPx}" style="width:${wCm.toFixed(2)}cm; height:${hCm.toFixed(2)}cm;" />`;
        } else {
          // Natural dimensions unknown: set width only, Word keeps aspect ratio
          const wPx = Math.round(wCm * PX);
          imgTag = `<img src="${sec.imageData}" width="${wPx}" style="width:${wCm.toFixed(2)}cm;" />`;
        }
        h += `${imgTag}<br/>`;
      } else {
        h += `<div style="border:1px dashed #777; background-color:#f3f4f6; width:100%; height:120px; padding:20px; text-align:center;"><p style="font-family:monospace; font-size:9pt; color:#555; text-align:center; text-indent:0cm; margin-top:20px;">[Skema / Diagram Model]</p></div>`;
      }
      h += `<p style="font-weight:bold; font-size:11pt; text-align:center; text-indent:0cm; margin:6pt 0 0 0; font-family:${cleanFontFamily};">${italicizeEnglishWordsText(sec.title || 'Gambar')}</p>`;
      h += `</div>`;
      return h;
    };

    const buildEquationWordHtml = (babKey, sec) => {
      const babMatch = babKey.match(/\d+/);
      const babNum = babMatch ? babMatch[0] : '1';
      const babSecs = babSections[babKey] || [];
      const eqIdx = babSecs.filter(s => s.type === 'equation').findIndex(s => s.id === sec.id);
      const prefix = `(${babNum}.${eqIdx !== -1 ? eqIdx + 1 : 1})`;
      const descLines = sec.description ? sec.description.split('\n').filter(l => l.trim()) : [];
      let h = `<div style="margin-top:12pt; margin-bottom:12pt; text-indent:0cm;">`;
      if (sec.title && sec.title.trim()) {
        h += `<p style="margin:0 0 6pt 0; font-weight:bold; font-size:12pt; text-align:left; text-indent:0cm; font-family:${cleanFontFamily};">${italicizeEnglishWordsText(sec.title)}</p>`;
      }
      h += `<table border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse; width:100%; border:none; margin-top:6pt; margin-bottom:6pt;"><tr style="border:none;"><td style="width:90%; text-align:center; font-family:${cleanFontFamily}; font-size:12pt; font-weight:bold; font-style:italic; border:none; padding:0;">${renderFormula(sec.content || 'y = f(x)')}</td><td style="width:10%; text-align:right; font-family:${cleanFontFamily}; font-size:12pt; font-weight:bold; border:none; padding:0;">${prefix}</td></tr></table>`;
      if (descLines.length > 0) {
        let descHtml = '<span style="font-weight:bold;">Keterangan:</span><br/>';
        descLines.forEach((line, lIdx) => {
          descHtml += `<span style="font-style:italic;">${italicizeEnglishWordsText(line)}</span>`;
          if (lIdx < descLines.length - 1) descHtml += '<br/>';
        });
        h += `<p style="margin:6pt 0 0 1cm; text-indent:0cm; font-family:${cleanFontFamily}; font-size:11pt; line-height:1.2;">${descHtml}</p>`;
      }
      h += `</div>`;
      return h;
    };

    const buildChapterWordContent = (babKey) => {
      const rawSections = babSections[babKey] || [];
      const resolved = resolveBlockNumberingForBab(babKey, rawSections);
      let html = '';

      // BAB chapter heading (h1)
      const babTitle = babTitles[babKey];
      if (babTitle) {
        const h1s = headingStyles.h1 || {};
        let titleHtml = `${babTitle.prefix}<br/>${babTitle.title}`;
        if (h1s.uppercase) titleHtml = titleHtml.toUpperCase();
        html += `<h1 class="MsoHeading1" style="mso-outline-level:1; text-align:${h1s.textAlign || 'center'}; font-size:${h1s.fontSize || '14pt'}; font-weight:${h1s.fontWeight || 'bold'}; font-style:${h1s.fontStyle || 'normal'}; font-family:${cleanFontFamily};">${titleHtml}</h1>`;
      }

      const renderContentText = (rawText) => {
        let out = '';
        const paragraphs = rawText.split(/\n+/).filter(p => p.trim());
        paragraphs.forEach(p => {
          const text = p.trim();
          if (text === '---') {
            out += '<br clear="all" style="page-break-before: always;" />';
            return;
          }
          // Honor inline [pagebreak] markers by splitting into parts
          const parts = text.split(/\[\s*(?:page[-_\s]*)?br[ea]{1,2}ke?\s*\]/gi);
          parts.forEach((part, index) => {
            const cleanedPart = part.trim();
            if (cleanedPart) {
              const listMatch = cleanedPart.match(/^([0-9a-zA-Z]+[\.\)])\s+(.*)$/);
              if (listMatch) {
                out += `<p style="margin:0; margin-left:1cm; text-indent:-1cm; mso-tab-stops:1.0cm; text-align:justify; line-height:${wordLineHeight}; font-family:${cleanFontFamily}; font-size:${baseFontSize};"><span style="font-weight:bold;">${listMatch[1]}</span><span style="mso-tab-count:1">&#9;</span>${italicizeEnglishWordsText(listMatch[2].trimStart())}</p>`;
              } else {
                const indent = layout.paragraphIndent === 'indented' ? '1.25cm' : '0cm';
                out += `<p class="paragraph-content" style="text-indent:${indent}; text-align:justify; margin:0; line-height:${wordLineHeight}; font-family:${cleanFontFamily}; font-size:${baseFontSize};">${italicizeEnglishWordsText(cleanedPart)}</p>`;
              }
            }
            if (index < parts.length - 1) {
              out += '<br clear="all" style="page-break-before: always;" />';
            }
          });
        });
        return out;
      };

      resolved.forEach(sec => {
        if (sec.type === 'table') {
          html += buildTableWordHtml(sec);
        } else if (sec.type === 'figure') {
          html += buildFigureWordHtml(sec);
        } else if (sec.type === 'equation') {
          html += buildEquationWordHtml(babKey, sec);
        } else {
          // text section
          if (sec.headingLevel > 0) {
            const lvl = sec.headingLevel;
            const hs = headingStyles[`h${lvl}`] || {};
            let titleHtml = italicizeEnglishWordsText(`${sec.resolvedPrefix || ''}${sec.title || ''}`);
            if (hs.uppercase) titleHtml = titleHtml.toUpperCase();
            html += `<h${lvl} class="MsoHeading${lvl}" style="mso-outline-level:${lvl}; text-align:${hs.textAlign || 'left'}; font-size:${hs.fontSize || '12pt'}; font-weight:${hs.fontWeight || 'bold'}; font-style:${hs.fontStyle || 'normal'}; font-family:${cleanFontFamily};">${titleHtml}</h${lvl}>`;
          }
          if (sec.content && sec.content.trim()) {
            html += renderContentText(sec.content);
          }
        }
      });

      return html;
    };

    const processedBabs = new Set();

    // Section management: cover = its own section WITHOUT page numbers; prelims =
    // WordSection1 (roman); chapters + references = WordSection2 (arabic).
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

    pageIds.forEach((pageId, idx) => {
      // CHAPTER PAGES: build once per chapter from source, let Word paginate
      const babMatch = pageId.match(/^(bab\d+)-\d+$/);
      if (babMatch) {
        const babKey = babMatch[1];
        if (processedBabs.has(babKey)) return; // already built this chapter
        processedBabs.add(babKey);

        combinedHtml += sectionTransition(pageId);
        combinedHtml += `<div class="word-page">${buildChapterWordContent(babKey)}</div>`;
        return;
      }

      if (pageId === 'cover') {
        combinedHtml += sectionTransition(pageId);
        combinedHtml += `<div class="word-page">${buildCoverWordHtml({ coverElements, cleanFontFamily })}</div>`;
        return;
      }

      const pageEl = document.getElementById(`page-${pageId}`);
      if (pageEl) {
        const contentClone = pageEl.querySelector('.page-content').cloneNode(true);
        
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
        
        // Ensure image sizes are preserved in Word
        contentClone.querySelectorAll('img').forEach(img => {
          if (!img.getAttribute('width')) {
             if (img.classList.contains('max-w-[5.5cm]')) {
                 img.setAttribute('width', '200');
                 img.setAttribute('height', '200');
             } else {
                 img.setAttribute('width', '400');
             }
          }
        });

        // Transform dynamic flex lists to borderless 2-column Word-friendly tables
        contentClone.querySelectorAll('.flex').forEach(flexEl => {
          const bulletSpan = flexEl.querySelector('.w-8');
          const textSpan = flexEl.querySelector('.flex-1');
          if (bulletSpan && textSpan) {
            const p = document.createElement('p');
            p.style.margin = '0';
            p.style.marginLeft = '1cm';
            p.style.textIndent = '-1cm';
            p.style.textAlign = 'justify';
            p.setAttribute('style', (p.getAttribute('style') || '') + '; mso-tab-stops:1.0cm;');
            
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
            if (layout.paragraphIndent === 'indented') {
              style += 'text-indent: 1.25cm; ';
            } else {
              style += 'text-indent: 0cm; ';
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
              el.setAttribute('cellpadding', '5');
              style += 'border-collapse: collapse; width: 100%; border: 1px solid #000; margin-top: 12pt; margin-bottom: 12pt; ';
            } else {
              el.setAttribute('border', '0');
              el.setAttribute('cellspacing', '0');
              el.setAttribute('cellpadding', '5');
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
        combinedHtml += `<div class="word-page">${contentClone.innerHTML}</div>`;
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
            mso-page-numbers: 1;
            mso-page-number-style: ${layout.romanPrelims ? 'lower-roman' : 'arabic'};
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
            mso-page-numbers: 1;
            mso-page-number-style: arabic;
            mso-header: h1;
            mso-footer: f1;
            mso-paper-source: 0;
          }
          div.WordSection2 { page: WordSection2; }
          body {
            font-family: ${cleanFontFamily};
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
            font-size: ${headingStyles?.h3?.fontSize || '12pt'};
            font-weight: ${headingStyles?.h3?.fontWeight || 'bold'};
            text-align: ${headingStyles?.h3?.textAlign || 'left'};
            font-family: ${cleanFontFamily};
            margin-top: 12pt; margin-bottom: 6pt; page-break-after: avoid;
            mso-style-name: "heading 3";
            mso-outline-level: 3;
          }
          h4 {
            font-size: ${headingStyles?.h3?.fontSize || '12pt'};
            font-weight: ${headingStyles?.h3?.fontWeight || 'bold'};
            text-align: ${headingStyles?.h3?.textAlign || 'left'};
            font-family: ${cleanFontFamily};
            margin-top: 12pt; margin-bottom: 6pt; page-break-after: avoid;
            mso-style-name: "heading 4";
            mso-outline-level: 4;
          }
          h5 {
            font-size: ${headingStyles?.h3?.fontSize || '12pt'};
            font-weight: ${headingStyles?.h3?.fontWeight || 'bold'};
            text-align: ${headingStyles?.h3?.textAlign || 'left'};
            font-family: ${cleanFontFamily};
            margin-top: 12pt; margin-bottom: 6pt; page-break-after: avoid;
            mso-style-name: "heading 5";
            mso-outline-level: 5;
          }
          h6 {
            font-size: ${headingStyles?.h3?.fontSize || '12pt'};
            font-weight: ${headingStyles?.h3?.fontWeight || 'bold'};
            text-align: ${headingStyles?.h3?.textAlign || 'left'};
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
          const pageField = `<span style='mso-element:field-begin'></span><span style='mso-spacerun:yes'> </span>PAGE <span style='mso-element:field-separator'></span>1<span style='mso-element:field-end'></span>`;
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
  };

  const handleStartExport = () => {
    let targetPageIds = [];
    if (downloadRange === 'all') {
      targetPageIds = getVisiblePages();
    } else {
      targetPageIds = resolveSelectedPageIds(selectedDownloadSections);
    }

    if (targetPageIds.length === 0) {
      showToast("Pilih setidaknya 1 bab/bagian untuk diunduh!", true);
      return;
    }

    const docTitle = cover.title || "Dokumen_Tugas_Akhir";
    const cleanTitle = docTitle.substring(0, 30).replace(/[^a-zA-Z0-9]/g, "_");
    const docAuthor = cover.author || "Penulis";
    const cleanAuthor = docAuthor.replace(/[^a-zA-Z0-9]/g, "_");
    
    // Close modal first so it has time to unmount from DOM before window.print blocks the main thread
    setShowDownloadModal(false);

    setTimeout(() => {
      if (downloadFormat === 'docx') {
        if (downloadSplit) {
          let sectionsToDownload = downloadRange === 'all' 
            ? ['cover', 'persetujuan', 'pengesahan', 'pernyataan', 'abstrak-indo', 'abstrak-eng', 'daftar-isi', 'daftar-tabel', 'daftar-gambar', 'daftar-rumus', 'bab1', 'bab2', 'bab3', 'bab4', 'bab5', 'daftar-pustaka']
            : selectedDownloadSections;
            
          let delay = 0;
          sectionsToDownload.forEach((secId) => {
            const secPages = resolveSelectedPageIds([secId]);
            if (secPages.length > 0) {
              const secName = secId.startsWith('bab') 
                ? `${babTitles[secId].prefix} ${babTitles[secId].title}` 
                : (SECTION_GROUPS.find(g => g.id === secId)?.name || secId);
              const cleanSecName = secName.replace(/[^a-zA-Z0-9]/g, "_");
              const filename = `${cleanAuthor}_${cleanSecName}`;
              
              setTimeout(() => {
                executeWordExport(secPages, filename).catch((error) => {
                  console.error('DOCX export failed:', error);
                  showToast("Gagal membuat file DOCX.", true);
                });
              }, delay);
              delay += 250;
            }
          });
          showToast("Unduhan terpisah DOCX dimulai!");
        } else {
          const filename = `${cleanAuthor}_${cleanTitle}_Lengkap`;
          executeWordExport(targetPageIds, filename)
            .then(() => showToast("Unduhan DOCX berhasil!"))
            .catch((error) => {
              console.error('DOCX export failed:', error);
              showToast("Gagal membuat file DOCX.", true);
            });
        }
      } else {
        // PDF format
        if (downloadSplit) {
          let sectionsToDownload = downloadRange === 'all' 
            ? ['cover', 'persetujuan', 'pengesahan', 'pernyataan', 'abstrak-indo', 'abstrak-eng', 'daftar-isi', 'daftar-tabel', 'daftar-gambar', 'daftar-rumus', 'bab1', 'bab2', 'bab3', 'bab4', 'bab5', 'daftar-pustaka']
            : selectedDownloadSections;

          showToast("Mulai cetak PDF terpisah. Silakan klik simpan pada dialog cetak yang muncul.");
          
          let delay = 0;
          sectionsToDownload.forEach((secId) => {
            const secPages = resolveSelectedPageIds([secId]);
            if (secPages.length > 0) {
              setTimeout(() => {
                setPagesToPrint(secPages);
                window.print();
              }, delay);
              delay += 1200;
            }
          });
          setTimeout(() => {
            setPagesToPrint(null);
          }, delay + 500);
        } else {
          executePrintPdf(targetPageIds);
        }
      }
    }, 350);
  };

  const handlePrint = () => {
    setShowDownloadModal(true);
  };

  const sortedReferences = () => {
    if (!Array.isArray(references)) return [];
    return [...references].sort((a, b) => {
      const authorA = (a.author || '').toLowerCase();
      const authorB = (b.author || '').toLowerCase();
      if (authorA < authorB) return -1;
      if (authorA > authorB) return 1;
      return 0;
    });
  };

  const formatRefAPA = (ref) => {
    const author = ref.author || 'Unknown';
    const year = ref.year || 'n.d.';
    const title = ref.title || 'Untitled';
    const publisher = ref.publisher || '';
    const urlLink = ref.url ? ` <a href="${ref.url}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 underline font-semibold select-all text-[11px]">[URL]</a>` : '';
    if (ref.type === 'book') {
      return `${author}. (${year}). <i>${title}</i>. ${publisher}.${urlLink}`;
    } else {
      return `${author}. (${year}). ${title}. <i>${publisher}</i>.${urlLink}`;
    }
  };

  const formatRefIEEE = (ref) => {
    const author = ref.author || 'Unknown';
    const year = ref.year || 'n.d.';
    const title = ref.title || 'Untitled';
    const publisher = ref.publisher || '';
    const urlLink = ref.url ? ` <a href="${ref.url}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 underline font-semibold select-all text-[11px]">[URL]</a>` : '';
    if (ref.type === 'book') {
      return `${author}, <i>${title}</i>. ${publisher}, ${year}.${urlLink}`;
    } else {
      return `${author}, "${title}," <i>${publisher}</i>, ${year}.${urlLink}`;
    }
  };

  // ==========================================================================
  // PRESETS & LAYOUT LOGIC
  // ==========================================================================
  
  const applyPreset = (type) => {
    let newLayout = { ...layout, preset: type };
    if (type === 'dikti') {
      newLayout = {
        ...newLayout,
        marginTop: 4.0,
        marginLeft: 4.0,
        marginBottom: 3.0,
        marginRight: 3.0,
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '12pt',
        lineSpacing: '2.0',
        textAlign: 'justify',
        tableLineSpacing: '1.0',
        tableTextAlign: 'left'
      };
      showToast('Preset Standar DIKTI diterapkan (4-4-3-3)');
    } else if (type === 'ringkas') {
      newLayout = {
        ...newLayout,
        marginTop: 3.0,
        marginLeft: 3.0,
        marginBottom: 3.0,
        marginRight: 3.0,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '11pt',
        lineSpacing: '1.5',
        textAlign: 'justify',
        tableLineSpacing: '1.0',
        tableTextAlign: 'left'
      };
      showToast('Preset Format Ringkas diterapkan (3-3-3-3)');
    }
    setLayout(newLayout);
    saveLocalDraft({ layout: newLayout });
  };

  const handleLayoutChange = (key, val) => {
    const newLayout = { ...layout, [key]: val, preset: 'custom' };
    setLayout(newLayout);
    saveLocalDraft({ layout: newLayout });
  };

  const handleHeadingStylesChange = (updated) => {
    setHeadingStyles(updated);
    saveLocalDraft({ headingStyles: updated });
  };

  // Roman numeral converter (optimized & crash-safe)
  const toRoman = (num) => {
    if (num <= 0) return '';
    const romanMap = [
      { value: 10, symbol: 'x' },
      { value: 9, symbol: 'ix' },
      { value: 5, symbol: 'v' },
      { value: 4, symbol: 'iv' },
      { value: 1, symbol: 'i' }
    ];
    let roman = '';
    let n = num;
    for (const { value, symbol } of romanMap) {
      while (n >= value) {
        roman += symbol;
        n -= value;
      }
    }
    return roman;
  };

  // ==========================================================================
  // FLEXIBLE PAGE NUMBERING LOGIC
  // ==========================================================================
  
  // Page sequence index map
  const visiblePagesCacheRef = useRef({ deps: null, value: null });
  const getVisiblePages = () => {
    const deps = [babSections, babTitles, layout, references, refStyle, inlineEditingBlockId];
    const cache = visiblePagesCacheRef.current;
    if (cache.deps && cache.deps.length === deps.length && cache.deps.every((d, i) => d === deps[i])) {
      return cache.value;
    }
    const value = computeVisiblePages();
    visiblePagesCacheRef.current = { deps, value };
    return value;
  };

  const computeVisiblePages = () => {
    const blank = !!layout.blankMode;
    const pages = ['cover'];
    if (layout.showPersetujuan) pages.push('persetujuan');
    if (layout.showPengesahan) pages.push('pengesahan');
    if (layout.showPernyataan) pages.push('pernyataan');
    if (layout.showAbstractIndo) pages.push('abstrak-indo');
    if (layout.showAbstractEng) pages.push('abstrak-eng');
    
    // Dynamic Table of Contents Pages (hidden in blank mode)
    if (!blank) {
      const tocPagesCount = getTocPages().length;
      for (let i = 1; i <= tocPagesCount; i++) {
        pages.push(`daftar-isi-${i}`);
      }
      const tabCount = getTableListPages().length;
      for (let i = 1; i <= tabCount; i++) pages.push(`daftar-tabel-${i}`);
      const figCount = getFigureListPages().length;
      for (let i = 1; i <= figCount; i++) pages.push(`daftar-gambar-${i}`);
      if (layout.showDaftarRumus) {
        const eqCount = getEquationListPages().length;
        for (let i = 1; i <= eqCount; i++) pages.push(`daftar-rumus-${i}`);
      }
    }
    
    // Now, push BAB pages dynamically!
    const babPagesMap = getBabPagesMap();
    const skipEmptyBab = blank || !!layout.hideEmptyChapters;
    ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'].forEach(babKey => {
      // In blank/outline mode, skip chapters that have no sections
      if (skipEmptyBab && (!babSections[babKey] || babSections[babKey].length === 0)) return;
      const pageCount = babPagesMap[babKey] ? babPagesMap[babKey].length : 1;
      for (let i = 1; i <= pageCount; i++) {
        pages.push(`${babKey}-${i}`);
      }
    });
    
    // Dynamic References Pages (hidden in blank mode when there are no references)
    if (!blank || (references && references.length > 0)) {
      const refPagesCount = getReferencesPages().length;
      for (let i = 1; i <= refPagesCount; i++) {
        pages.push(`daftar-pustaka-${i}`);
      }
    }
    return pages;
  };

  const getPageNumber = (pageId) => {
    const visiblePages = getVisiblePages();
    const idx = visiblePages.indexOf(pageId);
    if (idx === -1 || pageId === 'cover') return '';

    const bab1StartIndex = visiblePages.indexOf('bab1-1');
    if (bab1StartIndex === -1) return '';

    // Preliminary sections (before bab1-1) get Roman numbers starting from 1 (i)
    if (idx < bab1StartIndex) {
      return layout.romanPrelims ? toRoman(idx) : String(idx);
    }

    // Chapters start from page 1 at bab1-1
    return String(idx - bab1StartIndex + 1);
  };

  // Helper to resolve the correct page number where tables/figures are rendered
  const getPageForBlock = (babKey, blockId) => {
    const babPagesMap = getBabPagesMap();
    const pages = babPagesMap[babKey] || [];
    for (let pIdx = 0; pIdx < pages.length; pIdx++) {
      const pageElements = pages[pIdx];
      if (pageElements.some(el => el.blockId === blockId)) {
        return getPageNumber(`${babKey}-${pIdx + 1}`);
      }
    }
    return '1';
  };

  const getPageForBab = (babKey) => {
    const visiblePages = getVisiblePages();
    const pageId = `${babKey}-1`;
    return getPageNumber(pageId);
  };

  const getPageForFigure = (babKey) => {
    const visiblePages = getVisiblePages();
    const pageId = `${babKey}-1`;
    return getPageNumber(pageId);
  };

  // Check if this page should use bottom-center page numbering.
  // All preliminary/front-matter pages (before BAB I) always use bottom-center.
  // BAB first pages and Daftar Pustaka first page also use bottom-center.
  // Only BAB continuation pages (bab*-2, bab*-3, etc.) use top-right.
  const isChapterStartPage = (pageId) => {
    // All preliminary/front-matter pages → bottom-center
    const preliminaryPrefixes = [
      'persetujuan', 'pengesahan', 'pernyataan', 
      'abstrak-', 'daftar-isi-', 'daftar-tabel', 'daftar-gambar', 'daftar-rumus'
    ];
    if (preliminaryPrefixes.some(prefix => pageId === prefix || pageId.startsWith(prefix))) {
      return true;
    }
    // Chapter start pages (first page of each BAB and Daftar Pustaka)
    const chapterStartPages = [
      'bab1-1', 'bab2-1', 'bab3-1', 'bab4-1', 'bab5-1', 
      'daftar-pustaka-1'
    ];
    return chapterStartPages.includes(pageId);
  };

  // Return stylesheet placement based on page type
  const getPageNumberClass = (pageId) => {
    let base = 'page-number text-xs text-slate-800';
    if (layout.pageNumPosition === 'flexible') {
      // Standard: Bottom-Center on Chapter Starts, Top-Right on subsequent pages
      return isChapterStartPage(pageId) 
        ? `absolute bottom-[1.5cm] left-1/2 -translate-x-1/2 ${base}` 
        : `absolute top-[1.5cm] right-[var(--doc-margin-right)] ${base}`;
    } else {
      // Fixed layouts
      if (layout.pageNumPosition === 'bottom-right') return `absolute bottom-[1.5cm] right-[var(--doc-margin-right)] ${base}`;
      if (layout.pageNumPosition === 'top-right') return `absolute top-[1.5cm] right-[var(--doc-margin-right)] ${base}`;
      return `absolute bottom-[1.5cm] left-1/2 -translate-x-1/2 ${base}`;
    }
  };

  // ==========================================================================
  // PARAGRAPHS & ALIGNED LISTS PARSING LOGIC
  // ==========================================================================
  
  const formatParagraphs = (text) => {
    if (!text || text.trim() === '') {
      return <p className="text-slate-400 italic mb-4" style={{ textIndent: 0 }}>Konten kosong. Klik tombol 'AI Tulis' untuk menulis otomatis.</p>;
    }
    
    return text.split(/\n+/).map((p, idx) => {
      if (p.trim() === '') return null;

      // Check for Markdown headings
      const headingMatch = p.trim().match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length; // 1 to 6
        const titleText = headingMatch[2];
        const style = headingStyles[`h${level}`] || {};
        
        const inlineStyle = {
          fontFamily: 'var(--doc-font-family)',
          fontSize: style.fontSize || '12pt',
          fontWeight: style.fontWeight || 'bold',
          fontStyle: style.fontStyle || 'normal',
          textAlign: style.textAlign || 'left',
          textIndent: 0,
          marginTop: '16px',
          marginBottom: '6px',
        };
        
        const headingTag = `h${level}`;
        const className = `heading-level-${level} font-sans leading-normal`;
        const renderedText = italicizeEnglishWordsText(titleText);
        const headingId = `heading-${titleText.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        
        return React.createElement(headingTag, {
          key: idx,
          id: headingId,
          className: className,
          style: inlineStyle,
          dangerouslySetInnerHTML: { __html: style.uppercase ? renderedText.toUpperCase() : renderedText }
        });
      }
      
      // Regex matches: "1. Text", "1) Text", "a. Text", "A) Text"
      const listMatch = p.trim().match(/^([0-9a-zA-Z]+[\.\)])\s+(.*)$/);
      if (listMatch) {
        return (
          <div key={idx} className="flex mb-3 pr-1 text-justify items-start" style={{ textIndent: 0 }}>
            {/* Parallel bullet alignment */}
            <span className="w-8 shrink-0 font-bold text-slate-800">{listMatch[1]}</span>
            <span className="flex-1 min-w-0 text-justify text-slate-900" dangerouslySetInnerHTML={{ __html: italicizeEnglishWordsText(listMatch[2]) }} />
          </div>
        );
      }
      return <p key={idx} className="paragraph-content" dangerouslySetInnerHTML={{ __html: italicizeEnglishWordsText(p.trim()) }} />;
    });
  };

  // ==========================================================================
  // GOOGLE SCHOLAR CITATION SEARCH (AI ASSISTED)
  // ==========================================================================

  // ==========================================================================
  // GOOGLE SCHOLAR CITATION SEARCH (AI ASSISTED)
  // ==========================================================================
  
  const handleScholarSearch = async (e) => {
    e.preventDefault();
    if (!scholarQuery.trim()) return;
    if (!apiKey) {
      showToast('Masukkan API Key Gemini terlebih dahulu!', true);
      return;
    }
    
    setSearchingScholar(true);
    setScholarResults([]);
    showToast('Mencari referensi di database Google Scholar / ResearchGate...');

    try {
      const response = await searchCitationRequest(apiKey, {
        query: scholarQuery,
        yearStart: scholarYearStart,
        yearEnd: scholarYearEnd,
      });

      const resData = await response.json();
      if (!response.ok) {
        showToast(resData.error || 'Gagal mencari sitasi.', true);
        return;
      }

      setScholarResults(resData);
      showToast('Hasil sitasi ditemukan.');
    } catch (e) {
      showToast('Koneksi terganggu: ' + e.message, true);
    } finally {
      setSearchingScholar(false);
    }
  };

  const importCitation = (citation) => {
    const newRef = {
      id: 'ref_' + Date.now(),
      type: citation.type,
      author: citation.author,
      year: citation.year,
      title: citation.title,
      publisher: citation.publisher,
      url: citation.url || ''
    };
    const updated = [...references, newRef];
    setReferences(updated);
    saveLocalDraft({ references: updated });
    showToast(`Referensi oleh "${citation.author}" ditambahkan ke Daftar Pustaka.`);
  };

  // ==========================================================================
  // ADDITIONAL CUSTOM COMPONENT EDITORS
  // ==========================================================================
  
  const handleAddTable = () => {
    if (!tableInput.title || !tableInput.headers || !tableInput.rowsText) {
      showToast('Isi Judul, Header, dan Baris data tabel!', true);
      return;
    }

    const rows = tableInput.rowsText.split('\n').map(row => row.split(',').map(c => c.trim()));
    const newTable = {
      id: 'tab_' + Date.now(),
      type: 'table',
      title: tableInput.title,
      headers: tableInput.headers,
      rows: rows,
      rowsText: tableInput.rowsText,
      page: 1
    };

    setBabSections(prev => {
      const babKey = tableInput.bab;
      const updated = {
        ...prev,
        [babKey]: [...(prev[babKey] || []), newTable]
      };
      saveLocalDraft({ babSections: updated });
      return updated;
    });

    setTableInput({ title: '', bab: 'bab3', headers: '', rowsText: '' });
    showToast('Tabel berhasil disematkan.');
  };

  const handleAddFigure = () => {
    if (!figureInput.title) {
      showToast('Isi Judul Caption gambar!', true);
      return;
    }

    const newFigure = {
      id: 'fig_' + Date.now(),
      type: 'figure',
      title: figureInput.title,
      imageData: null,
      page: 1
    };

    setBabSections(prev => {
      const babKey = figureInput.bab;
      const updated = {
        ...prev,
        [babKey]: [...(prev[babKey] || []), newFigure]
      };
      saveLocalDraft({ babSections: updated });
      return updated;
    });

    setFigureInput({ title: '', bab: 'bab1' });
    showToast('Gambar berhasil disematkan.');
  };

  const handleSplitTextAndInsert = (babKey, secId, insertType) => {
    const list = babSections[babKey] || [];
    const idx = list.findIndex(x => x.id === secId);
    if (idx === -1) return;

    const sec = list[idx];
    const textareaId = inlineEditingBlockId ? `inline-textarea-${sec.id}` : `textarea-content-${sec.id}`;
    const textarea = document.getElementById(textareaId);
    
    let contentBefore = sec.content || '';
    let contentAfter = '';
    
    if (textarea) {
      const start = textarea.selectionStart;
      contentBefore = (sec.content || '').substring(0, start);
      contentAfter = (sec.content || '').substring(start);
    }

    const newBlocks = [];

    if (insertType === 'figure') {
      newBlocks.push({
        id: 'sec_fig_' + Date.now(),
        type: 'figure',
        title: 'Gambar Baru',
        imageData: null,
        page: 1
      });
    } else if (insertType === 'table') {
      newBlocks.push({
        id: 'sec_tab_' + Date.now(),
        type: 'table',
        title: 'Tabel Baru',
        page: 1,
        headers: 'No, Kolom 1, Kolom 2',
        rowsText: '1, Data A, Data B\n2, Data C, Data D',
        rows: [['1', 'Data A', 'Data B'], ['2', 'Data C', 'Data D']]
      });
    }

    // Always create a headingless continuation block if there's remaining text
    // OR if we just want to split the paragraph
    if (contentAfter.trim() || insertType === 'split') {
      newBlocks.push({
        id: 'sec_para_' + (Date.now() + 1),
        type: 'text',
        headingLevel: 0,
        title: '',
        content: contentAfter.trim(),
        page: 1,
        numberingStyle: 'none'
      });
    }

    setBabSections(prev => {
      const babList = prev[babKey] || [];
      const secIndex = babList.findIndex(x => x.id === secId);
      if (secIndex === -1) return prev;

      const updatedSec = { ...babList[secIndex], content: contentBefore.trim() };
      const newList = [...babList];
      newList[secIndex] = updatedSec;
      newList.splice(secIndex + 1, 0, ...newBlocks);

      const updated = { ...prev, [babKey]: newList };
      saveLocalDraft({ babSections: updated });
      return updated;
    });

    setInlineEditingBlockId(null);
    setInlineEditingBabKey(null);

    if (insertType === 'figure') {
      showToast("Paragraf dipecah & Gambar disisipkan!");
    } else if (insertType === 'table') {
      showToast("Paragraf dipecah & Tabel disisipkan!");
    } else {
      showToast("Paragraf berhasil dipecah!");
    }
  };

  const handleInsertSection = (babKey, referenceId, position, type = 'text') => {
    setBabSections(prev => {
      const currentList = prev[babKey] || [];
      const idx = currentList.findIndex(sec => sec.id === referenceId);
      if (idx === -1) return prev;
      
      let newBlock = {};
      const timestamp = Date.now();
      if (type === 'table') {
        newBlock = {
          id: 'sec_tab_' + timestamp,
          type: 'table',
          title: 'Tabel Baru',
          page: 1,
          headers: 'No, Kolom 1, Kolom 2',
          rowsText: '1, Data A, Data B\n2, Data C, Data D',
          rows: [['1', 'Data A', 'Data B'], ['2', 'Data C', 'Data D']]
        };
      } else if (type === 'figure') {
        newBlock = {
          id: 'sec_fig_' + timestamp,
          type: 'figure',
          title: 'Gambar Baru',
          page: 1,
          imageData: null
        };
      } else if (type === 'sub-bab') {
        newBlock = {
          id: 'sec_sub_' + timestamp,
          type: 'text',
          headingLevel: 2,
          title: 'Sub-Bab Baru',
          content: '',
          page: 1,
          numberingStyle: 'bab_prefix_dot'
        };
      } else if (type === 'equation') {
        newBlock = {
          id: 'sec_eq_' + timestamp,
          type: 'equation',
          title: 'Persamaan Baru',
          content: 'y = a + bx',
          description: 'y = Variabel Dependen\na = Konstanta\nb = Koefisien\nx = Variabel Independen',
          page: 1
        };
      } else {
        newBlock = {
          id: 'sec_para_' + timestamp,
          type: 'text',
          headingLevel: 0,
          title: '',
          content: '',
          page: 1,
          numberingStyle: 'none'
        };
      }
      
      const insertIdx = position === 'above' ? idx : idx + 1;
      const updatedList = [...currentList];
      updatedList.splice(insertIdx, 0, newBlock);
      
      const updated = {
        ...prev,
        [babKey]: updatedList
      };
      saveLocalDraft({ babSections: updated });
      return updated;
    });

    const displayType = type === 'sub-bab' ? 'Sub-Bab' : type === 'text' ? 'Paragraf' : type === 'table' ? 'Tabel' : type === 'figure' ? 'Gambar' : type === 'equation' ? 'Rumus' : 'Konten';
    const displayPos = position === 'above' ? 'di atas' : 'di bawah';
    showToast(`${displayType} baru berhasil ditambahkan ${displayPos}!`);
  };

  // ==========================================================================
  // DOCX IMPORT LOGIC
  // ==========================================================================

  const restoreDraftSnapshot = async (snapshot, filename, isCreateNew) => {
    if (!snapshot || !snapshot.__skripsi) return false;

    if (snapshot.layout) setLayout(snapshot.layout);
    if (snapshot.cover) setCover(snapshot.cover);
    if (snapshot.coverElements) setCoverElements(snapshot.coverElements);
    if (snapshot.babSections) setBabSections(snapshot.babSections);
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
      babSections: snapshot.babSections || babSections,
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
        await saveDraftRequest(filename, restoredState);
        setSaveFilename(filename);
        autosaveConfirmedRef.current = filename;
        fetchDraftsList();
      } catch (dbErr) {
        console.warn('Snapshot imported locally, but DB draft save failed:', dbErr);
      }
    } else {
      setSaveFilename('Draft_Skripsi');
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

      const arrayBuffer = await file.arrayBuffer();

      // Detect file format: real .docx is a ZIP archive (starts with "PK" = 0x50 0x4B),
      // while our exported .doc is an HTML-based Word file (plain text/HTML).
      const headerBytes = new Uint8Array(arrayBuffer.slice(0, 4));
      const isZipDocx = headerBytes[0] === 0x50 && headerBytes[1] === 0x4B; // "PK"

      let html;
      let docLayoutSettings = {};
      let docHeadingStyles = {};
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
              if (snap.babSections) setBabSections(snap.babSections);
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
                babSections: snap.babSections || babSections,
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
                  await saveDraftRequest(newFilename, restoredState);
                  setSaveFilename(newFilename);
                  autosaveConfirmedRef.current = newFilename;
                  fetchDraftsList();
                } catch (dbErr) { /* ignore, local save already done */ }
              } else {
                setSaveFilename('Draft_Skripsi');
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

      // Replace all <br> / <br/> tags inside tempDiv with a space so textContent parses word boundaries correctly
      tempDiv.querySelectorAll('br').forEach(br => {
        br.parentNode.replaceChild(document.createTextNode(' '), br);
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

      const newBabSections = {
        bab1: [],
        bab2: [],
        bab3: [],
        bab4: [],
        bab5: []
      };

      let currentBabIndex = 0; // 0 = bab1, 1 = bab2... up to 4
      const babKeys = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
      
      let currentSectionId = null;
      let currentContent = [];

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
        currentSectionId = 'import_' + Date.now() + Math.random();
        newBabSections[bKey].push({
          id: currentSectionId,
          type: 'text',
          title: '',
          content: '',
          headingLevel: 0,
          numberingStyle: 'none'
        });
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

      // Initialize currentSectionId as null (we will dynamically create it when text/lists are found)
      currentSectionId = null;

      const frontMatterTexts = [];
      let isSkipMode = false;
      let hasHitFirstBab = false;
      let hasHitExplicitBab = false;
      let pendingBlock = null; // { section, kind } of a just-created figure/table to capture a trailing caption

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
          if ((tagName === 'p' || tagName === 'div') && !hasImg && !(node.querySelector && node.querySelector('table'))) {
            const labelRe = pb.kind === 'figure' ? /^gambar\b/i : /^tabel\b/i;
            const isLoneLabel = /^(gambar|tabel|figure|table)(\s+\d+([.\-]\d+)*)?\.?$/i.test(textContent);
            const isDup = pb.section.title && norm(textContent) === norm(pb.section.title);
            const hasDefaultTitle = !pb.section.title || pb.section.title === 'Gambar' || pb.section.title === 'Tabel';
            const isCaptionLike = textContent.length <= 120 && labelRe.test(textContent);

            if (isDup || isLoneLabel) {
              return; // always swallow exact duplicate or a lone "Gambar"/"Tabel" label
            }
            if (isCaptionLike && hasDefaultTitle) {
              pb.section.title = textContent; // adopt the trailing caption as this block's title
              return; // swallow
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
        const containsDaftarIsi = lowerText.includes('daftar isi') || lowerText.includes('daftar tabel') || lowerText.includes('daftar gambar') || lowerText.includes('daftar rumus');
        const containsBabI = /\bbab\s*(i|1)\b/i.test(lowerText);
        const containsBabII = /\bbab\s*(ii|2)\b/i.test(lowerText);
        const containsBabIII = /\bbab\s*(iii|3)\b/i.test(lowerText);
        const matchesMultipleBab = [containsBabI, containsBabII, containsBabIII].filter(Boolean).length >= 2;
        const isTocBlock = (containsDaftarIsi && (containsBabI || containsBabII || containsBabIII)) || matchesMultipleBab || (textContent.length > 500 && containsDaftarIsi);

        if (isLikelyTocEntry || isTocBlock) {
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
          const numStr = babMatch[1].toUpperCase();
          if (numStr === 'I' || numStr === '1') explicitBabIndex = 0;
          else if (numStr === 'II' || numStr === '2') explicitBabIndex = 1;
          else if (numStr === 'III' || numStr === '3') explicitBabIndex = 2;
          else if (numStr === 'IV' || numStr === '4') explicitBabIndex = 3;
          else if (numStr === 'V' || numStr === '5') explicitBabIndex = 4;
        }

        const isChapter = isChapterTitle(textContent) || explicitBabIndex !== -1;

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

        if (isFrontMatterHeading) {
           isSkipMode = true;
           return;
        }

        if (isChapter) {
          isSkipMode = false;
          flushSection();
          
          const cleanTitle = textContent.replace(/^\s*(?:\par|\(?\d+(?:\.\d+)*[.)]?|[A-Za-z][.)]|\([A-Za-z0-9]+\))\s*/, '').trim();
          const babMatchInner = cleanTitle.match(/^BAB\s*(I{1,3}|IV|V|VI|1|2|3|4|5|6)\b/i);
          let explicitIndex = -1;
          if (babMatchInner) {
            const numStr = babMatchInner[1].toUpperCase();
            if (numStr === 'I' || numStr === '1') explicitIndex = 0;
            else if (numStr === 'II' || numStr === '2') explicitIndex = 1;
            else if (numStr === 'III' || numStr === '3') explicitIndex = 2;
            else if (numStr === 'IV' || numStr === '4') explicitIndex = 3;
            else if (numStr === 'V' || numStr === '5') explicitIndex = 4;
          }

          if (explicitIndex !== -1) {
            currentBabIndex = explicitIndex;
            hasHitExplicitBab = true;
          } else if (explicitBabIndex !== -1) {
            currentBabIndex = explicitBabIndex;
            hasHitExplicitBab = true;
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
          if (!parsedTitle) {
            parsedTitle = babTitles[bKey]?.title || '';
          }

          newBabTitles[bKey] = {
            prefix: parsedPrefix.toUpperCase(),
            title: parsedTitle.toUpperCase()
          };

          // Reset currentSectionId to null so any following text starts a new block
          currentSectionId = null;
        } 
        else if (tagName === 'h1') {
          // Treat this H1 as a Sub-Bab (level 2) instead of a Bab (level 0)
          if (!hasHitFirstBab) return; // If we haven't hit the first Bab yet, ignore it!
          isSkipMode = false;
          flushSection();

          let cleanTitle = textContent.replace(/^\s*(?:\par|\(?\d+(?:\.\d+)*[.)]?|[A-Za-z][.)]|\([A-Za-z0-9]+\))\s*/, '').trim();
          if (!cleanTitle) cleanTitle = textContent;

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
          if (!hasHitFirstBab) return; // If we haven't hit the first Bab yet, ignore it!
          isSkipMode = false;
          flushSection();

          // Strip leading numbering from H2/H3
          let cleanTitle = textContent.replace(/^\s*(?:\par|\(?\d+(?:\.\d+)*[.)]?|[A-Za-z][.)]|\([A-Za-z0-9]+\))\s*/, '').trim();
          if (!cleanTitle) cleanTitle = textContent;

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
            numberingStyle: level === 2 ? 'bab_prefix_dot' : 'bab_prefix_double_dot'
          });
        } 
        else if (tagName === 'table' || (tagName === 'div' && node.querySelector && node.querySelector('table'))) {
          if (isSkipMode || !hasHitFirstBab) return;
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
              title: title || 'Rumus',
              content: formula || 'y = f(x)',
              description: description,
              page: 1
            };
            newBabSections[bKey].push(eqSection);
          } else {
            const parsed = parseImportedTable(tableEl);
            const caption = tagName === 'div' ? pickCaption(node) : '';
            const tabSection = {
              id: 'import_tab_' + Date.now() + Math.random(),
              type: 'table',
              title: caption || 'Tabel',
              page: 1,
              headers: parsed.headers,
              rows: parsed.rows,
              rowsText: parsed.rows.map(r => r.join(', ')).join('\n')
            };
            newBabSections[bKey].push(tabSection);
            pendingBlock = { section: tabSection, kind: 'table' };
          }
          startContinuationSection(bKey);
        }
        else if (tagName === 'img' || (node.querySelector && node.querySelector('img')) || (tagName === 'div' && /\[Skema|Diagram/i.test(textContent))) {
          if (isSkipMode || !hasHitFirstBab) return;
          flushSection();
          const bKey = babKeys[currentBabIndex];
          const imgEl = tagName === 'img' ? node : (node.querySelector ? node.querySelector('img') : null);
          const caption = (tagName === 'div' || hasImg) ? pickCaption(node) : '';
          const figSection = {
            id: 'import_fig_' + Date.now() + Math.random(),
            type: 'figure',
            title: caption || 'Gambar',
            page: 1,
            imageData: imgEl && imgEl.getAttribute('src') ? imgEl.getAttribute('src') : null
          };
          newBabSections[bKey].push(figSection);
          pendingBlock = { section: figSection, kind: 'figure' };
          startContinuationSection(bKey);
        }
        else if (tagName === 'p') {
          if (isSkipMode || !hasHitFirstBab) return;
          
          if (!currentSectionId) {
            currentSectionId = 'import_intro_' + Date.now() + Math.random();
            newBabSections[babKeys[currentBabIndex]].push({
              id: currentSectionId,
              type: 'text',
              title: '',
              content: '',
              headingLevel: 0,
              numberingStyle: 'none'
            });
          }
          currentContent.push(textContent);
        } 
        else if (tagName === 'ul' || tagName === 'ol') {
          if (isSkipMode || !hasHitFirstBab) return;
          
          if (!currentSectionId) {
            currentSectionId = 'import_intro_' + Date.now() + Math.random();
            newBabSections[babKeys[currentBabIndex]].push({
              id: currentSectionId,
              type: 'text',
              title: '',
              content: '',
              headingLevel: 0,
              numberingStyle: 'none'
            });
          }
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
      
      const updatedLayout = { ...layout, ...docLayoutSettings };
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
      showToast('Impor dokumen Word berhasil!');

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
          const response = await saveDraftRequest(newFilename, draftPayload);
          const result = await response.json();
          if (response.ok && result.success) {
            setSaveFilename(newFilename);
            autosaveConfirmedRef.current = newFilename;
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
      console.error(err);
      showToast('Gagal memproses dokumen: ' + err.message, true);
    }
    
    e.target.value = ''; // Reset
  };

  // ==========================================================================
  // DRAFT SAVING & PRINT INTEGRATION
  // ==========================================================================
  
  const handleSaveDraftDB = async () => {
    if (!saveFilename.trim()) {
      showToast("Harap tentukan nama file draft!", true);
      return;
    }
    
    const draftPayload = {
      layout, cover, coverElements, babSections, babTitles, references, refStyle, 
      tables: getAllTables(), 
      figures: getAllFigures(),
      abstrakIndo, abstrakIndoKeywords, abstrakEng, abstrakEngKeywords, headingStyles
    };

    showToast("Sedang menyimpan draft...");

    try {
      const response = await saveDraftRequest(saveFilename, draftPayload);

      const result = await response.json();
      if (response.ok && result.success) {
        showToast(result.message);
        autosaveConfirmedRef.current = saveFilename; // explicit save arms autosave for this draft
        fetchDraftsList();
      } else {
        showToast(result.message || "Gagal menyimpan draft.", true);
      }
    } catch (e) {
      showToast("Gagal terhubung dengan server Laravel: " + e.message, true);
    }
  };

  const handleLoadDraftDB = async (item) => {
    showToast(`Memuat draft "${item.title}"...`);
    try {
      const response = await loadDraftRequest(item.id, item.source);

      if (response.ok) {
        const data = await response.json();
        let loadedBabSections = babSections;
        if (data.layout) setLayout(data.layout);
        if (data.cover) setCover(data.cover);
        
        if (data.coverElements) {
          setCoverElements(data.coverElements);
        } else if (data.cover) {
          // Re-generate coverElements from loaded cover fields for compatibility
          const resolvedElements = defaultCoverElements.map(el => {
            if (el.field === 'title' && data.cover.title) return { ...el, value: data.cover.title };
            if (el.field === 'subtitle' && data.cover.subtitle) return { ...el, value: data.cover.subtitle };
            if (el.field === 'author' && data.cover.author) return { ...el, value: data.cover.author };
            if (el.field === 'nim' && data.cover.nim) return { ...el, value: data.cover.nim };
            if (el.field === 'prodi' && data.cover.prodi) return { ...el, value: `PROGRAM STUDI ${data.cover.prodi.toUpperCase()}` };
            if (el.field === 'fakultas' && data.cover.fakultas) return { ...el, value: `FAKULTAS ${data.cover.fakultas.toUpperCase()}` };
            if (el.field === 'univ' && data.cover.univ) return { ...el, value: data.cover.univ };
            if (el.field === 'city_year') {
              const city = data.cover.city || 'JAKARTA';
              const year = data.cover.year || '2026';
              return { ...el, value: `${city.toUpperCase()}, ${year}` };
            }
            if (el.type === 'logo') {
              return { ...el, logoType: data.cover.logoType || 'default', logoData: data.cover.logoData || null };
            }
            return el;
          });
          setCoverElements(resolvedElements);
        }

        if (data.babSections) {
          // Upgrade/merge tables/figures if they are in data.tables/data.figures but not in babSections
          let incomingBabSections = data.babSections;
          let hasTables = false;
          let hasFigures = false;
          Object.keys(incomingBabSections).forEach(k => {
            (incomingBabSections[k] || []).forEach(sec => {
              if (sec.type === 'table') hasTables = true;
              if (sec.type === 'figure') hasFigures = true;
            });
          });
          if (!hasTables && data.tables && data.tables.length > 0) {
            data.tables.forEach(t => {
              const babKey = t.bab;
              if (incomingBabSections[babKey] && !incomingBabSections[babKey].some(sec => sec.id === t.id)) {
                incomingBabSections[babKey].push({
                  id: t.id,
                  type: 'table',
                  title: t.title,
                  headers: t.headers,
                  rows: t.rows,
                  rowsText: Array.isArray(t.rows) ? t.rows.map(r => r.join(', ')).join('\n') : '',
                  page: babKey === 'bab3' ? 2 : (babKey === 'bab4' ? 2 : 1)
                });
              }
            });
          }
          if (!hasFigures && data.figures && data.figures.length > 0) {
            data.figures.forEach(f => {
              const babKey = f.bab;
              if (incomingBabSections[babKey] && !incomingBabSections[babKey].some(sec => sec.id === f.id)) {
                incomingBabSections[babKey].push({
                  id: f.id,
                  type: 'figure',
                  title: f.title,
                  imageData: null,
                  page: babKey === 'bab3' ? 1 : (babKey === 'bab1' ? 2 : 1)
                });
              }
            });
          }
          setBabSections(incomingBabSections);
          loadedBabSections = incomingBabSections;
        } else {
          const upgraded = convertOldDraftToSections(data);
          setBabSections(upgraded);
          loadedBabSections = upgraded;
        }
        if (data.references) setReferences(data.references);
        if (data.refStyle) setRefStyle(data.refStyle);
        if (data.abstrakIndo) setAbstrakIndo(data.abstrakIndo);
        if (data.abstrakIndoKeywords) setAbstrakIndoKeywords(data.abstrakIndoKeywords);
        if (data.abstrakEng) setAbstrakEng(data.abstrakEng);
        if (data.abstrakEngKeywords) setAbstrakEngKeywords(data.abstrakEngKeywords);
        if (data.headingStyles) setHeadingStyles(data.headingStyles);
        
        const fallbackBabTitles = data.babTitles || {
          bab1: { prefix: "BAB I", title: "PENDAHULUAN" },
          bab2: { prefix: "BAB II", title: "TINJAUAN PUSTAKA" },
          bab3: { prefix: "BAB III", title: "METODOLOGI PENELITIAN" },
          bab4: { prefix: "BAB IV", title: "HASIL DAN PEMBAHASAN" },
          bab5: { prefix: "BAB V", title: "KESIMPULAN DAN SARAN" }
        };
        setBabTitles(fallbackBabTitles);
        
        saveLocalDraft(data);
        setHasLocalDraft(true);
        setShowDraftsModal(false);
        setShowWelcomeModal(false);
        
        setSaveFilename(item.title);
        autosaveConfirmedRef.current = null; // ask once before autosave overwrites this loaded draft
        const loadedPayload = {
          layout: data.layout || layout,
          cover: data.cover || cover,
          coverElements: data.coverElements || data.cover ? defaultCoverElements.map(el => {
            if (el.field === 'title' && data.cover.title) return { ...el, value: data.cover.title };
            if (el.field === 'subtitle' && data.cover.subtitle) return { ...el, value: data.cover.subtitle };
            if (el.field === 'author' && data.cover.author) return { ...el, value: data.cover.author };
            if (el.field === 'nim' && data.cover.nim) return { ...el, value: data.cover.nim };
            if (el.field === 'prodi' && data.cover.prodi) return { ...el, value: `PROGRAM STUDI ${data.cover.prodi.toUpperCase()}` };
            if (el.field === 'fakultas' && data.cover.fakultas) return { ...el, value: `FAKULTAS ${data.cover.fakultas.toUpperCase()}` };
            if (el.field === 'univ' && data.cover.univ) return { ...el, value: data.cover.univ };
            if (el.field === 'city_year') {
              const city = data.cover.city || 'JAKARTA';
              const year = data.cover.year || '2026';
              return { ...el, value: `${city.toUpperCase()}, ${year}` };
            }
            if (el.type === 'logo') {
              return { ...el, logoType: data.cover.logoType || 'default', logoData: data.cover.logoData || null };
            }
            return el;
          }) : coverElements,
          babSections: loadedBabSections,
          babTitles: fallbackBabTitles,
          references: data.references || references,
          refStyle: data.refStyle || refStyle,
          tables: data.tables || getAllTables(loadedBabSections),
          figures: data.figures || getAllFigures(loadedBabSections),
          abstrakIndo: data.abstrakIndo || abstrakIndo,
          abstrakIndoKeywords: data.abstrakIndoKeywords || abstrakIndoKeywords,
          abstrakEng: data.abstrakEng || abstrakEng,
          abstrakEngKeywords: data.abstrakEngKeywords || abstrakEngKeywords,
          headingStyles: data.headingStyles || headingStyles
        };
        lastSavedPayloadRef.current = JSON.stringify(loadedPayload);
        
        showToast(`Draft "${item.title}" berhasil dimuat.`);
      }
    } catch (e) {
      showToast("Kesalahan memuat file: " + e.message, true);
    }
  };

  const fetchDraftsList = async () => {
    setLoadingDrafts(true);
    try {
      const response = await listDraftsRequest();
      if (response.ok) {
        const list = await response.json();
        setDraftsList(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const handleDeleteDraftDB = async (e, item) => {
    e.stopPropagation();
    if (!confirm(`Hapus draft "${item.title}" permanen?`)) return;

    try {
      const response = await deleteDraftRequest(item.id, item.source);

      if (response.ok) {
        const result = await response.json().catch(() => ({ success: true }));
        const activeSlug = (saveFilename || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        const isActiveDraft = item.slug && item.slug === activeSlug;
        showToast("Draft berhasil dihapus.");
        fetchDraftsList();
        if (isActiveDraft) {
          // The draft currently open was deleted → switch to a fresh blank document (like Word)
          handleCreateBlankDocument();
          setShowDraftManager(false);
        }
      } else {
        showToast("Gagal menghapus draft di server.", true);
      }
    } catch (e) {
      showToast("Gagal menghapus file.", true);
    }
  };

  const triggerAIGenerateFlow = (target) => {
    setAiPromptInput('');
    setAiPromptTarget(target);
    setShowAiPromptModal(true);
  };

  const closeAiPromptModal = () => {
    setShowAiPromptModal(false);
    setAiPromptTarget(null);
  };

  const generateAiPromptTarget = (prompt = '') => {
    const target = aiPromptTarget;
    closeAiPromptModal();
    if (!target) return;
    if (target.legacyKey) {
      handleAIGenerateSection(target.legacyKey, target.displayTitle, prompt);
    } else {
      handleAIGenerateDynamic(target.babKey, target.id, target.displayTitle, prompt);
    }
  };

  const handleAIGenerateSection = async (sectionKey, displayTitle, additionalPrompt = '') => {
    if (!apiKey) {
      showToast('Masukkan API Key Gemini terlebih dahulu!', true);
      return;
    }
    // Find the section ID for the legacy key, and set that as generatingSection
    const legacyToId = Object.entries(legacySectionKeyMapping).find(([, v]) => v === sectionKey);
    const trackingId = legacyToId ? legacyToId[0] : sectionKey;
    setGeneratingSection(trackingId);
    showToast(`Menghubungi Gemini untuk draf ${displayTitle}...`);

    try {
      const response = await generateSectionRequest(apiKey, {
        title: cover.title,
        section: sectionKey,
        topik: aiInputs.topik,
        metode: tables.length > 0 ? 'Fuzzy/KNN/PLS-SEM' : 'Metode Deskriptif',
        ai_write_style: sectionKey === 'latar_belakang' ? backgroundStyle : 'direct',
        year_start: scholarYearStart,
        year_end: scholarYearEnd,
        additional_prompt: additionalPrompt,
      });

      const resData = await response.json();
      if (!response.ok) {
        showToast(resData.error || 'Gagal menghasilkan konten.', true);
        return;
      }

      const content = resData.content;
      
      if (sectionKey === 'latar_belakang') updateSectionContentById('bab1', 'b1s1', content);
      else if (sectionKey === 'identifikasi_masalah') updateSectionContentById('bab1', 'b1s2', content);
      else if (sectionKey === 'rumusan_masalah') updateSectionContentById('bab1', 'b1s3', content);
      else if (sectionKey === 'penelitian_terdahulu') updateSectionContentById('bab2', 'b2s1', content);
      else if (sectionKey === 'grand_theory') updateSectionContentById('bab2', 'b2s2', content);
      else if (sectionKey === 'middle_theory') updateSectionContentById('bab2', 'b2s3', content);
      else if (sectionKey === 'applied_theory') updateSectionContentById('bab2', 'b2s4', content);
      else if (sectionKey === 'desain_penelitian') updateSectionContentById('bab3', 'b3s1', content);
      else if (sectionKey === 'tempat_waktu') updateSectionContentById('bab3', 'b3s2', content);
      else if (sectionKey === 'pengumpulan_data') updateSectionContentById('bab3', 'b3s3', content);
      else if (sectionKey === 'analisis_data') updateSectionContentById('bab3', 'b3s4', content);
      else if (sectionKey === 'deskripsi_data') updateSectionContentById('bab4', 'b4s1', content);
      else if (sectionKey === 'pembahasan') updateSectionContentById('bab4', 'b4s2', content);
      else if (sectionKey === 'kesimpulan') updateSectionContentById('bab5', 'b5s1', content);
      else if (sectionKey === 'saran') updateSectionContentById('bab5', 'b5s2', content);

      // Handle table auto-insertion if present in JSON response
      if (resData.table) {
        const sectionMapping = {
          latar_belakang: { babKey: 'bab1', blockId: 'b1s1' },
          identifikasi_masalah: { babKey: 'bab1', blockId: 'b1s2' },
          rumusan_masalah: { babKey: 'bab1', blockId: 'b1s3' },
          penelitian_terdahulu: { babKey: 'bab2', blockId: 'b2s1' },
          grand_theory: { babKey: 'bab2', blockId: 'b2s2' },
          middle_theory: { babKey: 'bab2', blockId: 'b2s3' },
          applied_theory: { babKey: 'bab2', blockId: 'b2s4' },
          desain_penelitian: { babKey: 'bab3', blockId: 'b3s1' },
          tempat_waktu: { babKey: 'bab3', blockId: 'b3s2' },
          pengumpulan_data: { babKey: 'bab3', blockId: 'b3s3' },
          analisis_data: { babKey: 'bab3', blockId: 'b3s4' },
          deskripsi_data: { babKey: 'bab4', blockId: 'b4s1' },
          pembahasan: { babKey: 'bab4', blockId: 'b4s2' },
          kesimpulan: { babKey: 'bab5', blockId: 'b5s1' },
          saran: { babKey: 'bab5', blockId: 'b5s2' },
        };
        const mapping = sectionMapping[sectionKey];
        if (mapping) {
          const { babKey, blockId } = mapping;
          const tableData = resData.table;
          setBabSections(prev => {
            const currentList = prev[babKey] || [];
            const idx = currentList.findIndex(sec => sec.id === blockId);
            if (idx === -1) return prev;
            
            const newBlock = {
              id: 'sec_tab_' + Date.now(),
              type: 'table',
              title: tableData.title || 'Tabel Hasil Generasi',
              page: 1,
              headers: tableData.headers || 'No, Kolom 1, Kolom 2',
              rowsText: Array.isArray(tableData.rows) ? tableData.rows.map(r => r.join(', ')).join('\n') : '',
              rows: tableData.rows || [['1', 'Data A', 'Data B']]
            };
            
            const updatedList = [...currentList];
            updatedList.splice(idx + 1, 0, newBlock);
            
            const updated = {
              ...prev,
              [babKey]: updatedList
            };
            saveLocalDraft({ babSections: updated });
            return updated;
          });
          showToast(`Tabel perbandingan berhasil disisipkan secara otomatis!`);
        }
      }

      showToast(`Konten ${displayTitle} berhasil ditulis oleh AI!`);
    } catch (e) {
      showToast('Koneksi terganggu: ' + e.message, true);
    } finally {
      setGeneratingSection(null);
    }
  };

  // Dynamic AI generation for any section (e.g., imported from DOCX)
  const handleAIGenerateDynamic = async (babKey, sectionId, sectionTitle, additionalPrompt = '') => {
    if (!apiKey) {
      showToast('Masukkan API Key Gemini terlebih dahulu!', true);
      return;
    }
    setGeneratingSection(sectionId);
    showToast(`Menghubungi Gemini untuk draf "${sectionTitle}"...`);

    // Determine bab number and context dynamically from babTitles
    const currentBab = babTitles[babKey];
    const babContext = currentBab ? `${currentBab.prefix} (${currentBab.title})` : `BAB ${babKey.replace('bab', '')}`;

    try {
      const response = await generateSectionRequest(apiKey, {
        title: cover.title,
        section: '__dynamic__',
        section_title: sectionTitle,
        bab_context: babContext,
        topik: aiInputs.topik,
        metode: tables.length > 0 ? 'Fuzzy/KNN/PLS-SEM' : 'Metode Deskriptif',
        additional_prompt: additionalPrompt,
      });

      const resData = await response.json();
      if (!response.ok) {
        showToast(resData.error || 'Gagal menghasilkan konten.', true);
        return;
      }

      updateSectionContentById(babKey, sectionId, resData.content);

      // Handle table auto-insertion if present in JSON response
      if (resData.table) {
        const tableData = resData.table;
        setBabSections(prev => {
          const currentList = prev[babKey] || [];
          const idx = currentList.findIndex(sec => sec.id === sectionId);
          if (idx === -1) return prev;
          
          const newBlock = {
            id: 'sec_tab_' + Date.now(),
            type: 'table',
            title: tableData.title || 'Tabel Hasil Generasi',
            page: 1,
            headers: tableData.headers || 'No, Kolom 1, Kolom 2',
            rowsText: Array.isArray(tableData.rows) ? tableData.rows.map(r => r.join(', ')).join('\n') : '',
            rows: tableData.rows || [['1', 'Data A', 'Data B']]
          };
          
          const updatedList = [...currentList];
          updatedList.splice(idx + 1, 0, newBlock);
          
          const updated = {
            ...prev,
            [babKey]: updatedList
          };
          saveLocalDraft({ babSections: updated });
          return updated;
        });
        showToast(`Tabel perbandingan berhasil disisipkan secara otomatis!`);
      }

      showToast(`Konten "${sectionTitle}" berhasil ditulis oleh AI!`);
    } catch (e) {
      showToast('Koneksi terganggu: ' + e.message, true);
    } finally {
      setGeneratingSection(null);
    }
  };

  return (
    <>
      <Head title="SkripsiFormatter v2.0 - Laravel React Thesis Builder" />
      
      {/* Editor Main Grid */}
      <div className={`flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} transition-colors duration-200`}>
        
        {/* ==========================================================================
           1. SIDEBAR EDITORS (LEFT)
           ========================================================================== */}
        {sidebarVisible && (
        <aside className="w-[450px] border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-white dark:bg-slate-900 no-print z-20 shadow-xl">
          
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-600/10 p-2 rounded-lg text-indigo-500">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-tight bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">SkripsiFormatter v2.0</h1>
                <p className="text-[10px] text-slate-400">Flexi-Numbering & Academic Elements</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')} 
                className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                title="Ganti tema"
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
              <button 
                onClick={() => setSidebarVisible(false)} 
                className="p-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                title="Sembunyikan panel"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Editor Tabs Navigation */}
          <div className="flex bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-1 gap-1 text-[11px] font-bold">
            <button onClick={() => setActiveTab('layout')} className={`flex-1 py-2 rounded-md flex flex-col items-center gap-0.5 transition-all ${activeTab === 'layout' ? 'bg-white dark:bg-slate-900 text-indigo-500 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><Sliders className="h-3.5 w-3.5" />Layout</button>
            <button onClick={() => setActiveTab('konten')} className={`flex-1 py-2 rounded-md flex flex-col items-center gap-0.5 transition-all ${activeTab === 'konten' ? 'bg-white dark:bg-slate-900 text-indigo-500 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><FileText className="h-3.5 w-3.5" />Isi Konten</button>
            <button onClick={() => setActiveTab('navigasi')} className={`flex-1 py-2 rounded-md flex flex-col items-center gap-0.5 transition-all ${activeTab === 'navigasi' ? 'bg-white dark:bg-slate-900 text-indigo-500 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><Compass className="h-3.5 w-3.5" />Navigasi</button>
            <button onClick={() => setActiveTab('asisten')} className={`flex-1 py-2 rounded-md flex flex-col items-center gap-0.5 transition-all ${activeTab === 'asisten' ? 'bg-white dark:bg-slate-900 text-indigo-500 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><Sparkles className="h-3.5 w-3.5" />Asisten AI</button>
            <button onClick={() => setActiveTab('referensi')} className={`flex-1 py-2 rounded-md flex flex-col items-center gap-0.5 transition-all ${activeTab === 'referensi' ? 'bg-white dark:bg-slate-900 text-indigo-500 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}><BookOpen className="h-3.5 w-3.5" />Pustaka</button>
          </div>

          {/* Scrollable inputs space */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            <LayoutSettingsPanel
              show={activeTab === 'layout'}
              layout={layout}
              autosaveEnabled={autosaveEnabled}
              selectedHeadingToStyle={selectedHeadingToStyle}
              headingStyles={headingStyles}
              onFileUpload={handleFileUpload}
              onApplyPreset={applyPreset}
              onLayoutChange={handleLayoutChange}
              onSelectedHeadingToStyleChange={setSelectedHeadingToStyle}
              onHeadingStylesChange={handleHeadingStylesChange}
              onAutosaveEnabledChange={(enabled) => {
                setAutosaveEnabled(enabled);
                saveLocalDraftSetting(enabled);
              }}
            />

            <NavigationPanel
              show={activeTab === 'navigasi'}
              activeNavTab={activeNavTab}
              visiblePages={getVisiblePages()}
              tocEntries={getTocEntries()}
              getPageNumber={getPageNumber}
              formatTocTitle={italicizeEnglishWordsText}
              onActiveNavTabChange={setActiveNavTab}
            />

            {/* TAB 2: CONTENT EDITOR */}
            {activeTab === 'konten' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Bagian yang Diedit</label>
                  <select value={activeSection} onChange={e=>setActiveSection(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2.5 rounded-lg font-bold">
                    <option value="cover">Halaman Cover (Sampul)</option>
                    {(layout.showAbstractIndo || layout.showAbstractEng) && (
                      <option value="abstrak">Abstrak (Indonesia / Inggris)</option>
                    )}
                    <option value="bab1">{babTitles.bab1.prefix} {babTitles.bab1.title}</option>
                    <option value="bab2">{babTitles.bab2.prefix} {babTitles.bab2.title}</option>
                    <option value="bab3">{babTitles.bab3.prefix} {babTitles.bab3.title}</option>
                    <option value="bab4">{babTitles.bab4.prefix} {babTitles.bab4.title}</option>
                    <option value="bab5">{babTitles.bab5.prefix} {babTitles.bab5.title}</option>
                    <option value="elemen">Kelola Tabel & Gambar Dokumen</option>
                  </select>
                </div>

                {/* Cover Editor (Flexible Block-Based) */}
                {activeSection === 'cover' && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-indigo-600/10 p-2.5 rounded-xl border border-indigo-500/20">
                      <span className="font-bold text-[10px] uppercase text-indigo-555 dark:text-indigo-400">Tambah Elemen Sampul</span>
                      <div className="flex gap-1 flex-wrap justify-end">
                        <button 
                          onClick={() => addCoverElement('title')} 
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded font-bold text-[9px]"
                        >
                          + Judul
                        </button>
                        <button 
                          onClick={() => addCoverElement('label')} 
                          className="bg-indigo-650 hover:bg-indigo-755 text-white px-2 py-1 rounded font-bold text-[9px]"
                        >
                          + Label
                        </button>
                        <button 
                          onClick={() => addCoverElement('text')} 
                          className="bg-indigo-650 hover:bg-indigo-755 text-white px-2 py-1 rounded font-bold text-[9px]"
                        >
                          + Teks
                        </button>
                        <button 
                          onClick={() => addCoverElement('logo')} 
                          className="bg-indigo-700 hover:bg-indigo-800 text-white px-2 py-1 rounded font-bold text-[9px]"
                        >
                          + Logo
                        </button>
                        <button 
                          onClick={() => addCoverElement('spacing')} 
                          className="bg-indigo-800 hover:bg-indigo-900 text-white px-2 py-1 rounded font-bold text-[9px]"
                        >
                          + Spasi
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                      {coverElements.map((el, idx) => (
                        <div key={el.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
                          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/60 pb-1.5">
                            <span className="font-bold text-slate-400 text-[10px] uppercase">
                              {el.type === 'title' ? 'Judul Utama' : el.type === 'label' ? 'Label/Keterangan' : el.type === 'logo' ? 'Logo' : el.type === 'spacing' ? 'Spasi Kosong' : 'Teks Biasa'} #{idx + 1}
                              {el.field && ` (${el.field.toUpperCase()})`}
                            </span>
                            
                            <div className="flex items-center gap-1">
                              <button 
                                disabled={idx === 0} 
                                onClick={() => moveCoverElement(el.id, 'up')}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded disabled:opacity-30 text-slate-400 text-[10px]"
                              >
                                ▲
                              </button>
                              <button 
                                disabled={idx === coverElements.length - 1} 
                                onClick={() => moveCoverElement(el.id, 'down')}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded disabled:opacity-30 text-slate-400 text-[10px]"
                              >
                                ▼
                              </button>
                              <button 
                                onClick={() => removeCoverElement(el.id)}
                                className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded text-slate-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {el.type === 'spacing' ? (
                            <div>
                              <label className="text-[9px] text-slate-400 block mb-0.5">Tinggi Spasi (cm/px/pt)</label>
                              <input 
                                type="text" 
                                value={el.height || '1cm'} 
                                onChange={e => updateCoverElement(el.id, 'height', e.target.value)} 
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs font-mono" 
                              />
                            </div>
                          ) : el.type === 'logo' ? (
                            <div className="space-y-2">
                              <label className="text-[9px] text-slate-400 block mb-0.5">Sumber Logo</label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateCoverElement(el.id, 'logoType', 'default')}
                                  className={`flex-1 py-1.5 text-[10px] font-bold border rounded-lg ${el.logoType === 'default' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400'}`}
                                >
                                  Default (Toga)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateCoverElement(el.id, 'logoType', 'custom')}
                                  className={`flex-1 py-1.5 text-[10px] font-bold border rounded-lg ${el.logoType === 'custom' ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400'}`}
                                >
                                  Custom (Upload)
                                </button>
                              </div>
                              {el.logoType === 'custom' && (
                                <div className="space-y-2 mt-1">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => handleCoverElementLogoUpload(el.id, e)}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-lg text-[9px]"
                                  />
                                  {el.logoData && (
                                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                                      <img src={el.logoData} className="h-10 w-10 object-contain border border-slate-250 bg-white rounded p-0.5" />
                                      <span className="text-[9px] text-slate-400">Logo dimuat</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div>
                                <label className="text-[9px] text-slate-400 block mb-0.5">Isi Teks</label>
                                {el.type === 'title' ? (
                                  <textarea 
                                    value={el.value || ''} 
                                    onChange={e => updateCoverElement(el.id, 'value', e.target.value)} 
                                    rows={3}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs font-bold" 
                                  />
                                ) : (
                                  <input 
                                    type="text" 
                                    value={el.value || ''} 
                                    onChange={e => updateCoverElement(el.id, 'value', e.target.value)} 
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs" 
                                  />
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] text-slate-400 block mb-0.5">Ukuran Font</label>
                                  <select 
                                    value={el.fontSize || '12pt'} 
                                    onChange={e => updateCoverElement(el.id, 'fontSize', e.target.value)} 
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-lg text-xs"
                                  >
                                    <option value="9pt">9 pt</option>
                                    <option value="10pt">10 pt</option>
                                    <option value="11pt">11 pt</option>
                                    <option value="12pt">12 pt</option>
                                    <option value="14pt">14 pt</option>
                                    <option value="16pt">16 pt</option>
                                    <option value="18pt">18 pt</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="text-[9px] text-slate-400 block mb-0.5">Hubungkan ke Data</label>
                                  <select 
                                    value={el.field || ''} 
                                    onChange={e => updateCoverElement(el.id, 'field', e.target.value)} 
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-lg text-xs"
                                  >
                                    <option value="">Tidak Dihubungkan</option>
                                    <option value="title">Judul Skripsi</option>
                                    <option value="subtitle">Jenis Dokumen (TA/Skripsi/dll)</option>
                                    <option value="author">Nama Penulis</option>
                                    <option value="nim">NIM / NPM</option>
                                    <option value="prodi">Program Studi</option>
                                    <option value="fakultas">Fakultas</option>
                                    <option value="univ">Universitas</option>
                                    <option value="city_year">Kota & Tahun</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex gap-2 flex-wrap text-[10px] text-slate-500 pt-1">
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!el.bold} 
                                    onChange={e => updateCoverElement(el.id, 'bold', e.target.checked)} 
                                    className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-3 w-3" 
                                  />
                                  <span className="font-bold">Bold</span>
                                </label>
                                
                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!el.italic} 
                                    onChange={e => updateCoverElement(el.id, 'italic', e.target.checked)} 
                                    className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-3 w-3" 
                                  />
                                  <span className="italic">Italic</span>
                                </label>

                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!el.uppercase} 
                                    onChange={e => updateCoverElement(el.id, 'uppercase', e.target.checked)} 
                                    className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-3 w-3" 
                                  />
                                  <span>ALL CAPS</span>
                                </label>

                                <label className="flex items-center gap-1 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!el.underline} 
                                    onChange={e => updateCoverElement(el.id, 'underline', e.target.checked)} 
                                    className="rounded border-slate-350 text-indigo-600 focus:ring-indigo-500 h-3 w-3" 
                                  />
                                  <span className="underline">Underline</span>
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Abstract Editor */}
                {activeSection === 'abstrak' && (
                  <div className="space-y-4">
                    {layout.showAbstractIndo && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-bold text-slate-400 text-[10px] block">Abstrak (Bahasa Indonesia)</span>
                          {abstrakIndo && (abstrakIndo.includes('\n') || abstrakIndo.includes('\r')) && (
                            <button
                              type="button"
                              onClick={() => {
                                const cleaned = cleanLineBreaks(abstrakIndo);
                                setAbstrakIndo(cleaned);
                                saveLocalDraft({ abstrakIndo: cleaned });
                                showToast("Abstrak Indonesia berhasil dirapikan!");
                              }}
                              className="text-[9px] text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold flex items-center gap-0.5 transition-colors"
                              title="Menggabungkan baris yang terputus akibat copy-paste dari PDF"
                            >
                              ✨ Rapikan Baris/Spasi (PDF)
                            </button>
                          )}
                        </div>
                        <textarea 
                          value={abstrakIndo} 
                          onChange={e=>{setAbstrakIndo(e.target.value); saveLocalDraft({abstrakIndo:e.target.value})}} 
                          onPaste={(e) => {
                            const pastedText = e.clipboardData.getData('text');
                            if (pastedText && (pastedText.includes('\n') || pastedText.includes('\r'))) {
                              setTimeout(() => {
                                showToast("Tips: Klik tombol '✨ Rapikan Baris/Spasi (PDF)' di atas untuk merapikan teks.");
                              }, 500);
                            }
                          }}
                          rows={6} 
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg" 
                        />
                        
                        <label className="text-[10px] text-slate-400 block mb-0.5">Kata Kunci</label>
                        <input type="text" value={abstrakIndoKeywords} onChange={e=>{setAbstrakIndoKeywords(e.target.value); saveLocalDraft({abstrakIndoKeywords:e.target.value})}} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg" />
                      </div>
                    )}
                    
                    {layout.showAbstractEng && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="font-bold text-slate-400 text-[10px] block">Abstract (English)</span>
                          {abstrakEng && (abstrakEng.includes('\n') || abstrakEng.includes('\r')) && (
                            <button
                              type="button"
                              onClick={() => {
                                const cleaned = cleanLineBreaks(abstrakEng);
                                setAbstrakEng(cleaned);
                                saveLocalDraft({ abstrakEng: cleaned });
                                showToast("Abstract English berhasil dirapikan!");
                              }}
                              className="text-[9px] text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold flex items-center gap-0.5 transition-colors"
                              title="Menggabungkan baris yang terputus akibat copy-paste dari PDF"
                            >
                              ✨ Rapikan Baris/Spasi (PDF)
                            </button>
                          )}
                        </div>
                        <textarea 
                          value={abstrakEng} 
                          onChange={e=>{setAbstrakEng(e.target.value); saveLocalDraft({abstrakEng:e.target.value})}} 
                          onPaste={(e) => {
                            const pastedText = e.clipboardData.getData('text');
                            if (pastedText && (pastedText.includes('\n') || pastedText.includes('\r'))) {
                              setTimeout(() => {
                                showToast("Tips: Klik tombol '✨ Rapikan Baris/Spasi (PDF)' di atas untuk merapikan teks.");
                              }, 500);
                            }
                          }}
                          rows={6} 
                          className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg" 
                        />
                        
                        <label className="text-[10px] text-slate-400 block mb-0.5">Keywords</label>
                        <input type="text" value={abstrakEngKeywords} onChange={e=>{setAbstrakEngKeywords(e.target.value); saveLocalDraft({abstrakEngKeywords:e.target.value})}} className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg" />
                      </div>
                    )}
                  </div>
                )}

                {/* Flexible Chapter Editor */}
                {activeSection.startsWith('bab') && (
                  <div className="space-y-4">
                    {/* Chapter Title Editor */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
                      <span className="font-bold text-[10px] uppercase text-indigo-500 dark:text-indigo-400 block mb-1">Edit Judul {babTitles[activeSection]?.prefix || 'BAB'}</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="text-[9px] text-slate-400 block mb-0.5">Penomoran</label>
                          <input 
                            type="text" 
                            value={babTitles[activeSection]?.prefix || ''} 
                            onChange={e => {
                              const updated = {
                                ...babTitles,
                                [activeSection]: {
                                  ...babTitles[activeSection],
                                  prefix: e.target.value
                                }
                              };
                              setBabTitles(updated);
                              saveLocalDraft({ babTitles: updated });
                            }}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs font-bold"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] text-slate-400 block mb-0.5">Nama Bab</label>
                          <input 
                            type="text" 
                            value={babTitles[activeSection]?.title || ''} 
                            onChange={e => {
                              const updated = {
                                ...babTitles,
                                [activeSection]: {
                                  ...babTitles[activeSection],
                                  title: e.target.value
                                }
                              };
                              setBabTitles(updated);
                              saveLocalDraft({ babTitles: updated });
                            }}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-indigo-600/10 p-2.5 rounded-xl border border-indigo-500/20">
                      <span className="font-bold text-[10px] uppercase text-indigo-555 dark:text-indigo-400">Kelola Sub-Bab & Konten</span>
                      <div className="flex gap-1 flex-wrap">
                        <button 
                          onClick={() => {
                            setBabSections(prev => {
                              const newBlock = {
                                id: 'sec_' + Date.now(),
                                type: 'text',
                                headingLevel: 0,
                                title: '',
                                content: '',
                                page: 1,
                                numberingStyle: 'none'
                              };
                              const updated = {
                                ...prev,
                                [activeSection]: [...(prev[activeSection] || []), newBlock]
                              };
                              saveLocalDraft({ babSections: updated });
                              return updated;
                            });
                          }} 
                          className="bg-sky-600 hover:bg-sky-700 text-white px-2 py-1 rounded flex items-center gap-1 font-bold text-[9px]"
                          title="Tambah paragraf konten tanpa judul heading"
                        >
                          <Plus className="h-3 w-3" /> Paragraf
                        </button>
                        <button 
                          onClick={() => handleAddSection(activeSection, 'text')} 
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded flex items-center gap-1 font-bold text-[9px]"
                          title="Tambah sub-bab baru dengan judul heading"
                        >
                          <Plus className="h-3 w-3" /> Sub-Bab
                        </button>
                        <button 
                          onClick={() => handleAddSection(activeSection, 'table')} 
                          className="bg-indigo-650 hover:bg-indigo-750 text-white px-2 py-1 rounded flex items-center gap-1 font-bold text-[9px]"
                        >
                          <Table className="h-3 w-3" /> Tabel
                        </button>
                        <button 
                          onClick={() => handleAddSection(activeSection, 'figure')} 
                          className="bg-indigo-700 hover:bg-indigo-800 text-white px-2 py-1 rounded flex items-center gap-1 font-bold text-[9px]"
                        >
                          <ImageIcon className="h-3 w-3" /> Gambar
                        </button>
                        <button 
                          onClick={() => handleAddSection(activeSection, 'equation')} 
                          className="bg-indigo-750 hover:bg-indigo-850 text-white px-2 py-1 rounded flex items-center gap-1 font-bold text-[9px]"
                          title="Tambah rumus/persamaan baru"
                        >
                          <Plus className="h-3 w-3" /> Rumus
                        </button>
                        <button 
                          onClick={handleResetToOutline} 
                          className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded flex items-center gap-1 font-bold text-[9px]"
                          title="Hapus semua isi paragraf, sisakan judul heading saja"
                        >
                          <RotateCcw className="h-3 w-3" /> Reset Outline
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {resolveBlockNumberingForBab(activeSection, babSections[activeSection] || []).map((sec, idx) => (
                        <div key={sec.id} className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/60 rounded-xl space-y-2">
                           <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800/60 pb-1.5">
                             <span className="font-bold text-slate-400 text-[10px]">
                               {sec.type === 'table' 
                                 ? 'Tabel' 
                                 : sec.type === 'figure' 
                                   ? 'Gambar' 
                                   : sec.headingLevel === 0 
                                     ? 'Paragraf Konten' 
                                     : 'Sub-Bab'} #{idx + 1}
                               {sec.headingLevel > 0 && sec.resolvedPrefix && ` (Pratinjau: ${sec.resolvedPrefix.trim()})`}
                             </span>
                            
                            <div className="flex items-center gap-1">
                              <button 
                                disabled={idx === 0} 
                                onClick={() => handleMoveSection(activeSection, idx, -1)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded disabled:opacity-30 text-slate-400 text-[10px]"
                              >
                                ▲
                              </button>
                              <button 
                                disabled={idx === (babSections[activeSection] || []).length - 1} 
                                onClick={() => handleMoveSection(activeSection, idx, 1)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded disabled:opacity-30 text-slate-400 text-[10px]"
                              >
                                ▼
                              </button>
                              <button 
                                onClick={() => handleDeleteSection(activeSection, sec.id)}
                                className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded text-slate-400"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                           {sec.type === 'table' ? (
                             <div className="space-y-2">
                               <div>
                                 <label className="text-[9px] text-slate-400 block mb-0.5">Judul Tabel (Caption)</label>
                                 <input 
                                   type="text" 
                                   value={sec.title} 
                                   onChange={e => handleUpdateSectionField(activeSection, sec.id, 'title', e.target.value)} 
                                   className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs" 
                                 />
                               </div>
                               
                               <div className="flex bg-slate-100 dark:bg-slate-950 p-0.5 gap-0.5 rounded text-[9px] font-bold mb-2">
                                 <button 
                                   type="button" 
                                   onClick={() => setActiveTableTab('visual')} 
                                   className={`flex-1 py-1 rounded text-center transition-all ${activeTableTab === 'visual' ? 'bg-white dark:bg-slate-900 text-indigo-500 shadow-sm' : 'text-slate-400'}`}
                                 >
                                   Visual
                                 </button>
                                 <button 
                                   type="button" 
                                   onClick={() => setActiveTableTab('csv')} 
                                   className={`flex-1 py-1 rounded text-center transition-all ${activeTableTab === 'csv' ? 'bg-white dark:bg-slate-900 text-indigo-500 shadow-sm' : 'text-slate-400'}`}
                                 >
                                   Teks CSV
                                 </button>
                               </div>

                               {activeTableTab === 'visual' ? (
                                 <div className="space-y-2">
                                   <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 bg-slate-50 dark:bg-slate-900/50">
                                     <table className="min-w-full border-collapse text-[9px] text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950">
                                       <thead>
                                         <tr className="bg-slate-100 dark:bg-slate-900">
                                           {normalizeHeaders(sec.headers).map((h, cIdx) => {
                                             const hMask = computeMaskedHeaders(normalizeHeaders(sec.headers));
                                             if (hMask[cIdx]) return null;
                                             const isSelected = selectedCell && selectedCell.blockId === sec.id && selectedCell.r === -1 && selectedCell.c === cIdx;
                                             return (
                                               <th
                                                 key={cIdx}
                                                 colSpan={h.colSpan || 1}
                                                 rowSpan={h.rowSpan || 1}
                                                 onClick={() => setSelectedCell({ blockId: sec.id, r: -1, c: cIdx })}
                                                 style={{ backgroundColor: h.bgColor || undefined }}
                                                 className={`border border-slate-350 dark:border-slate-700 p-1 cursor-pointer select-none font-bold text-left ${isSelected ? 'outline outline-2 outline-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30' : 'hover:bg-slate-100 dark:hover:bg-slate-805'}`}
                                               >
                                                 <div className="truncate max-w-[60px]">{h.text || <span className="text-slate-400 italic">(kosong)</span>}</div>
                                               </th>
                                             );
                                           })}
                                         </tr>
                                       </thead>
                                       <tbody>
                                         {normalizeTableRows(sec.rows).map((row, rIdx) => {
                                           const rMask = computeMaskedCells(normalizeTableRows(sec.rows));
                                           return (
                                             <tr key={rIdx}>
                                               {row.map((cell, cIdx) => {
                                                 if (rMask[rIdx] && rMask[rIdx][cIdx]) return null;
                                                 const isSelected = selectedCell && selectedCell.blockId === sec.id && selectedCell.r === rIdx && selectedCell.c === cIdx;
                                                 return (
                                                   <td
                                                     key={cIdx}
                                                     colSpan={cell.colSpan || 1}
                                                     rowSpan={cell.rowSpan || 1}
                                                     onClick={() => setSelectedCell({ blockId: sec.id, r: rIdx, c: cIdx })}
                                                     style={{ backgroundColor: cell.bgColor || undefined }}
                                                     className={`border border-slate-200 dark:border-slate-800 p-1 cursor-pointer select-none ${isSelected ? 'outline outline-2 outline-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
                                                   >
                                                     <div className="truncate max-w-[60px]">{cell.text || <span className="text-slate-400 italic">(kosong)</span>}</div>
                                                   </td>
                                                 );
                                               })}
                                             </tr>
                                           );
                                         })}
                                       </tbody>
                                     </table>
                                   </div>

                                   {(() => {
                                     if (!selectedCell || selectedCell.blockId !== sec.id) {
                                       return <div className="text-[9px] text-slate-400 italic text-center p-1">Klik sel di grid atas untuk mengedit teks, merge, atau mewarnai.</div>;
                                     }
                                     
                                     const isHeader = selectedCell.r === -1;
                                     const normH = normalizeHeaders(sec.headers);
                                     const normR = normalizeTableRows(sec.rows);
                                     const cellObj = isHeader ? normH[selectedCell.c] : (normR[selectedCell.r] ? normR[selectedCell.r][selectedCell.c] : null);
                                     if (!cellObj) return null;

                                     const canMergeRight = isHeader 
                                       ? selectedCell.c + (cellObj.colSpan || 1) < normH.length 
                                       : selectedCell.c + (cellObj.colSpan || 1) < (normR[selectedCell.r]?.length || 0);
                                     const canMergeDown = !isHeader && (selectedCell.r + (cellObj.rowSpan || 1) < normR.length);

                                     const PRESET_COLORS = [
                                       { name: 'Putih', value: '' },
                                       { name: 'Abu-abu', value: '#f1f5f9' },
                                       { name: 'Biru', value: '#e0f2fe' },
                                       { name: 'Hijau', value: '#dcfce7' },
                                       { name: 'Kuning', value: '#fef3c7' },
                                       { name: 'Merah', value: '#ffe4e6' }
                                     ];

                                     return (
                                       <div className="p-2 bg-slate-100/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2 text-[10px] animate-in fade-in duration-100">
                                         <div className="font-bold text-slate-400 uppercase text-[8px]">Sel Terpilih ({isHeader ? 'Header' : `Baris ${selectedCell.r + 1}`}, Kolom {selectedCell.c + 1})</div>
                                         
                                         <div>
                                           <label className="text-[9px] text-slate-400 block mb-0.5">Teks Sel</label>
                                           <input
                                             type="text"
                                             value={cellObj.text}
                                             onChange={e => updateTableCell(activeSection, sec.id, selectedCell.r, selectedCell.c, 'text', e.target.value)}
                                             className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1 rounded-lg text-xs"
                                           />
                                         </div>

                                         <div className="flex justify-between items-center gap-2">
                                           <div>
                                             <label className="text-[9px] text-slate-400 block mb-0.5">Warna Sel</label>
                                             <div className="flex gap-1 items-center">
                                               {PRESET_COLORS.map(color => (
                                                 <button
                                                   key={color.value}
                                                   type="button"
                                                   onClick={() => updateTableCell(activeSection, sec.id, selectedCell.r, selectedCell.c, 'bgColor', color.value)}
                                                   style={{ backgroundColor: color.value || '#fff' }}
                                                   className={`h-4 w-4 rounded-full border ${cellObj.bgColor === color.value ? 'ring-2 ring-indigo-500 border-indigo-500' : 'border-slate-350'} shadow-sm`}
                                                   title={color.name}
                                                 />
                                               ))}
                                             </div>
                                           </div>

                                           <div className="text-right">
                                             <label className="text-[9px] text-slate-400 block mb-0.5">Penggabungan</label>
                                             <div className="flex gap-1">
                                               <button
                                                 type="button"
                                                 disabled={!canMergeRight}
                                                 onClick={() => mergeTableCellRight(activeSection, sec.id, selectedCell.r, selectedCell.c)}
                                                 className="bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-500 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold text-[8.5px] disabled:opacity-40"
                                                 title="Gabungkan dengan sel kanan"
                                               >
                                                 ➔ Kanan
                                               </button>
                                               <button
                                                 type="button"
                                                 disabled={!canMergeDown}
                                                 onClick={() => mergeTableCellDown(activeSection, sec.id, selectedCell.r, selectedCell.c)}
                                                 className="bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-500 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold text-[8.5px] disabled:opacity-40"
                                                 title="Gabungkan dengan sel bawah"
                                               >
                                                 ⬇ Bawah
                                               </button>
                                               <button
                                                 type="button"
                                                 onClick={() => splitTableCell(activeSection, sec.id, selectedCell.r, selectedCell.c)}
                                                 className="bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-bold text-[8.5px]"
                                                 title="Pecah sel"
                                               >
                                                 Pecah
                                               </button>
                                             </div>
                                           </div>
                                         </div>

                                         <div className="flex gap-2 justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                                            <div className="flex gap-1">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  deleteTableRowVisual(activeSection, sec.id, selectedCell.r);
                                                  setSelectedCell(null);
                                                }}
                                                disabled={isHeader || normR.length <= 1}
                                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded text-[8.5px] disabled:opacity-45"
                                              >
                                                Hapus Baris
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  deleteTableColVisual(activeSection, sec.id, selectedCell.c);
                                                  setSelectedCell(null);
                                                }}
                                                disabled={normH.length <= 1}
                                                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded text-[8.5px] disabled:opacity-45"
                                              >
                                                Hapus Kolom
                                              </button>
                                            </div>

                                            <div className="flex gap-1">
                                              <button
                                                type="button"
                                                onClick={() => addTableRowVisual(activeSection, sec.id)}
                                                className="bg-emerald-600/10 hover:bg-emerald-650/20 text-emerald-500 px-1.5 py-0.5 rounded font-bold text-[8.5px]"
                                              >
                                                + Baris
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => addTableColVisual(activeSection, sec.id)}
                                                className="bg-emerald-600/10 hover:bg-emerald-650/20 text-emerald-500 px-1.5 py-0.5 rounded font-bold text-[8.5px]"
                                              >
                                                + Kolom
                                              </button>
                                            </div>
                                         </div>
                                       </div>
                                     );
                                   })()}
                                 </div>
                               ) : (
                                 <div className="space-y-2">
                                   <div className="p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg text-[9px] text-amber-500 leading-snug">
                                     Peringatan: Mengedit teks CSV langsung di bawah ini akan mengatur ulang (reset) semua merge span dan warna latar sel yang telah diatur sebelumnya.
                                   </div>
                                   <div className="grid grid-cols-2 gap-2">
                                     <div>
                                       <label className="text-[9px] text-slate-400 block mb-0.5">Letak Halaman</label>
                                       <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-350">
                                         Halaman {getBlockPageNumber(activeSection, sec.id) || '(Membaca...)'}
                                       </div>
                                     </div>
                                     <div>
                                       <label className="text-[9px] text-slate-400 block mb-0.5">Header (Koma Pembatas)</label>
                                       <input 
                                         type="text" 
                                         value={typeof sec.headers === 'string' ? sec.headers : normalizeHeaders(sec.headers).map(h => h.text).join(', ')} 
                                         onChange={e => handleUpdateSectionField(activeSection, sec.id, 'headers', e.target.value)} 
                                         className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs" 
                                       />
                                     </div>
                                   </div>
                                   <div>
                                     <label className="text-[9px] text-slate-400 block mb-0.5">Baris Data (Koma/Newline Pembatas)</label>
                                     <textarea 
                                       value={sec.rowsText || ''} 
                                       onChange={e => {
                                         const val = e.target.value;
                                         const parsedRows = val.split('\n').map(row => row.split(',').map(c => c.trim()));
                                         setBabSections(prev => {
                                           const updatedList = prev[activeSection].map(item => {
                                             if (item.id === sec.id) {
                                               return { ...item, rowsText: val, rows: parsedRows };
                                             }
                                             return item;
                                           });
                                           const updated = { ...prev, [activeSection]: updatedList };
                                           saveLocalDraft({ babSections: updated });
                                           return updated;
                                         });
                                       }} 
                                       rows={4} 
                                       className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-xs" 
                                     />
                                   </div>
                                 </div>
                               )}

                              <div className="flex flex-wrap gap-2 mt-2 pt-1 border-t border-slate-150 dark:border-slate-800/60 no-print">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInsertMenu(prev => (prev.blockId === sec.id && prev.position === 'above' ? { blockId: null, position: null } : { blockId: sec.id, position: 'above' }));
                                    }}
                                    className="bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-500 dark:text-indigo-400 px-2 py-1 rounded-lg flex items-center gap-1 font-bold text-[9px]"
                                  >
                                    ➕ Di Atas (Above)
                                  </button>
                                  {insertMenu.blockId === sec.id && insertMenu.position === 'above' && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setInsertMenu({ blockId: null, position: null })} />
                                      <div className="absolute bottom-full left-0 mb-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 min-w-[110px] flex flex-col">
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'sub-bab'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Sub-Bab
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'text'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Paragraf
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'table'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Tabel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'figure'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Gambar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'equation'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Rumus
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>

                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInsertMenu(prev => (prev.blockId === sec.id && prev.position === 'below' ? { blockId: null, position: null } : { blockId: sec.id, position: 'below' }));
                                    }}
                                    className="bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-500 dark:text-indigo-400 px-2 py-1 rounded-lg flex items-center gap-1 font-bold text-[9px]"
                                  >
                                    ➕ Di Bawah (Below)
                                  </button>
                                  {insertMenu.blockId === sec.id && insertMenu.position === 'below' && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setInsertMenu({ blockId: null, position: null })} />
                                      <div className="absolute bottom-full left-0 mb-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 min-w-[110px] flex flex-col">
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'sub-bab'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Sub-Bab
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'text'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Paragraf
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'table'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Tabel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'figure'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Gambar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'equation'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Rumus
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                          ) : sec.type === 'figure' ? (
                            <div className="space-y-2">
                              <div>
                                <label className="text-[9px] text-slate-400 block mb-0.5">Judul Gambar (Caption)</label>
                                <input 
                                  type="text" 
                                  value={sec.title} 
                                  onChange={e => handleUpdateSectionField(activeSection, sec.id, 'title', e.target.value)} 
                                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs" 
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2 items-center">
                                <div>
                                  <label className="text-[9px] text-slate-400 block mb-0.5">Letak Halaman</label>
                                  <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-350">
                                    Halaman {getBlockPageNumber(activeSection, sec.id) || '(Membaca...)'}
                                  </div>
                                </div>
                                <div className="pt-3.5">
                                  <label className="bg-indigo-600 hover:bg-indigo-750 text-white px-2 py-1.5 rounded text-xs font-bold text-center block cursor-pointer transition-colors">
                                    Unggah Gambar
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={(e) => handleImageUploadForSection(activeSection, sec.id, e)} 
                                    />
                                  </label>
                                </div>
                              </div>
                              {sec.imageData && (
                                <div className="mt-2 relative w-full h-24 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                  <img src={sec.imageData} alt={sec.title} className="w-full h-full object-contain" />
                                  <button 
                                    onClick={() => handleUpdateSectionField(activeSection, sec.id, 'imageData', null)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-650"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              )}
                              {sec.imageData && (
                                <div>
                                  <label className="text-[9px] text-slate-400 block mb-0.5 flex items-center justify-between">
                                    <span>Lebar Gambar</span>
                                    <span className="font-bold text-indigo-500">{(sec.imgWidth || 12).toFixed(1)} cm</span>
                                  </label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="range"
                                      min="3"
                                      max="16"
                                      step="0.5"
                                      value={sec.imgWidth || 12}
                                      onChange={e => handleUpdateSectionField(activeSection, sec.id, 'imgWidth', parseFloat(e.target.value))}
                                      className="flex-1 accent-indigo-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateSectionField(activeSection, sec.id, 'imgWidth', 12)}
                                      className="text-[9px] text-slate-400 hover:text-indigo-500 font-bold whitespace-nowrap"
                                      title="Reset ke ukuran default"
                                    >
                                      Reset
                                    </button>
                                  </div>
                                  <p className="text-[8px] text-slate-400 mt-0.5">Tinggi menyesuaikan otomatis sesuai rasio gambar. Berlaku di preview & unduhan.</p>
                                </div>
                              )}

                              <div className="flex flex-wrap gap-2 mt-2 pt-1 border-t border-slate-150 dark:border-slate-800/60 no-print">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInsertMenu(prev => (prev.blockId === sec.id && prev.position === 'above' ? { blockId: null, position: null } : { blockId: sec.id, position: 'above' }));
                                    }}
                                    className="bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-500 dark:text-indigo-400 px-2 py-1 rounded-lg flex items-center gap-1 font-bold text-[9px]"
                                  >
                                    ➕ Di Atas (Above)
                                  </button>
                                  {insertMenu.blockId === sec.id && insertMenu.position === 'above' && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setInsertMenu({ blockId: null, position: null })} />
                                      <div className="absolute bottom-full left-0 mb-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 min-w-[110px] flex flex-col">
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'sub-bab'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Sub-Bab
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'text'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Paragraf
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'table'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Tabel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'figure'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Gambar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'equation'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Rumus
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>

                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInsertMenu(prev => (prev.blockId === sec.id && prev.position === 'below' ? { blockId: null, position: null } : { blockId: sec.id, position: 'below' }));
                                    }}
                                    className="bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-500 dark:text-indigo-400 px-2 py-1 rounded-lg flex items-center gap-1 font-bold text-[9px]"
                                  >
                                    ➕ Di Bawah (Below)
                                  </button>
                                  {insertMenu.blockId === sec.id && insertMenu.position === 'below' && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setInsertMenu({ blockId: null, position: null })} />
                                      <div className="absolute bottom-full left-0 mb-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 min-w-[110px] flex flex-col">
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'sub-bab'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Sub-Bab
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'text'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Paragraf
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'table'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Tabel
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'figure'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Gambar
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'equation'); setInsertMenu({ blockId: null, position: null }); }}
                                          className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                        >
                                          ➕ Rumus
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : sec.type === 'equation' ? (
                            <div className="space-y-2">
                              <div>
                                <label className="text-[9px] text-slate-400 block mb-0.5">Judul/Nama Rumus (Caption)</label>
                                <input 
                                  type="text" 
                                  value={sec.title} 
                                  onChange={e => handleUpdateSectionField(activeSection, sec.id, 'title', e.target.value)} 
                                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs font-bold" 
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[9px] text-slate-400 block mb-0.5">Rumus / Persamaan</label>
                                  <input 
                                    type="text" 
                                    value={sec.content} 
                                    onChange={e => handleUpdateSectionField(activeSection, sec.id, 'content', e.target.value)} 
                                    placeholder="Contoh: P(A|B) = P(B|A)*P(A)/P(B)"
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs font-mono" 
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] text-slate-400 block mb-0.5">Letak Halaman</label>
                                  <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-350">
                                    Halaman {getBlockPageNumber(activeSection, sec.id) || '(Membaca...)'}
                                  </div>
                                </div>
                              </div>
                              {/* Formula syntax hint + live preview */}
                              <div className="p-2 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 rounded-lg space-y-1.5">
                                <p className="text-[8.5px] text-slate-400 leading-relaxed">
                                  <span className="font-bold text-slate-500 dark:text-slate-300">Sintaks:</span> pembagian <code className="text-indigo-500">a/b</code> atau <code className="text-indigo-500">{'\\frac{a}{b}'}</code> → pecahan bertingkat · pangkat <code className="text-indigo-500">x^2</code> / <code className="text-indigo-500">x^{'{n+1}'}</code> · indeks <code className="text-indigo-500">x_i</code> · akar <code className="text-indigo-500">sqrt</code> · simbol <code className="text-indigo-500">\sum \pi \alpha \times \pm \leq</code>
                                </p>
                                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-center text-sm font-bold italic text-slate-800 dark:text-slate-100 min-h-[2rem] flex items-center justify-center" dangerouslySetInnerHTML={{ __html: renderFormula(sec.content || 'y = f(x)') }} />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-400 block mb-0.5">Keterangan Variabel (Satu per Baris)</label>
                                <textarea 
                                  value={sec.description || ''} 
                                  onChange={e => handleUpdateSectionField(activeSection, sec.id, 'description', e.target.value)} 
                                  placeholder="Contoh:&#10;y = Variabel Dependen&#10;a = Konstanta"
                                  rows={4} 
                                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-xs italic" 
                                />
                              </div>

                              <div className="flex flex-wrap gap-2 mt-2 pt-1 border-t border-slate-150 dark:border-slate-800/60 no-print">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInsertMenu(prev => (prev.blockId === sec.id && prev.position === 'above' ? { blockId: null, position: null } : { blockId: sec.id, position: 'above' }));
                                    }}
                                    className="bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-500 dark:text-indigo-400 px-2 py-1 rounded-lg flex items-center gap-1 font-bold text-[9px]"
                                  >
                                    ➕ Di Atas (Above)
                                  </button>
                                  {insertMenu.blockId === sec.id && insertMenu.position === 'above' && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setInsertMenu({ blockId: null, position: null })} />
                                      <div className="absolute bottom-full left-0 mb-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 min-w-[110px] flex flex-col">
                                        <button type="button" onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'sub-bab'); setInsertMenu({ blockId: null, position: null }); }} className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1">➕ Sub-Bab</button>
                                        <button type="button" onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'text'); setInsertMenu({ blockId: null, position: null }); }} className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1">➕ Paragraf</button>
                                        <button type="button" onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'table'); setInsertMenu({ blockId: null, position: null }); }} className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1">➕ Tabel</button>
                                        <button type="button" onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'figure'); setInsertMenu({ blockId: null, position: null }); }} className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1">➕ Gambar</button>
                                        <button type="button" onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'equation'); setInsertMenu({ blockId: null, position: null }); }} className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1">➕ Rumus</button>
                                      </div>
                                    </>
                                  )}
                                </div>

                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInsertMenu(prev => (prev.blockId === sec.id && prev.position === 'below' ? { blockId: null, position: null } : { blockId: sec.id, position: 'below' }));
                                    }}
                                    className="bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-500 dark:text-indigo-400 px-2 py-1 rounded-lg flex items-center gap-1 font-bold text-[9px]"
                                  >
                                    ➕ Di Bawah (Below)
                                  </button>
                                  {insertMenu.blockId === sec.id && insertMenu.position === 'below' && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setInsertMenu({ blockId: null, position: null })} />
                                      <div className="absolute bottom-full left-0 mb-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 min-w-[110px] flex flex-col">
                                        <button type="button" onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'sub-bab'); setInsertMenu({ blockId: null, position: null }); }} className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1">➕ Sub-Bab</button>
                                        <button type="button" onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'text'); setInsertMenu({ blockId: null, position: null }); }} className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1">➕ Paragraf</button>
                                        <button type="button" onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'table'); setInsertMenu({ blockId: null, position: null }); }} className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1">➕ Tabel</button>
                                        <button type="button" onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'figure'); setInsertMenu({ blockId: null, position: null }); }} className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1">➕ Gambar</button>
                                        <button type="button" onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'equation'); setInsertMenu({ blockId: null, position: null }); }} className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1">➕ Rumus</button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                               <div className="space-y-2">
                                 <div className="grid grid-cols-2 gap-2">
                                   <div>
                                     <label className="text-[9px] text-slate-400 block mb-0.5">Format Teks / Heading</label>
                                     <select 
                                       value={sec.headingLevel} 
                                       onChange={e => {
                                         const level = parseInt(e.target.value);
                                         handleUpdateSectionField(activeSection, sec.id, 'headingLevel', level);
                                         if (level === 2) {
                                           handleUpdateSectionField(activeSection, sec.id, 'numberingStyle', 'bab_prefix_dot');
                                         } else if (level === 3) {
                                           handleUpdateSectionField(activeSection, sec.id, 'numberingStyle', 'bab_prefix_double_dot');
                                         } else if (level === 0) {
                                           handleUpdateSectionField(activeSection, sec.id, 'numberingStyle', 'none');
                                         }
                                       }} 
                                       className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200"
                                     >
                                       <option value={0}>Isi Saja (Paragraf Konten)</option>
                                       <option value={2}>Heading 2 (Sub-Bab 1.1)</option>
                                       <option value={3}>Heading 3 (Sub-Bab 1.1.1)</option>
                                       <option value={4}>Heading 4 (Sub-Bab 1.1.1.1)</option>
                                       <option value={5}>Heading 5</option>
                                       <option value={6}>Heading 6</option>
                                     </select>
                                   </div>

                                   {sec.headingLevel > 0 && (
                                     <div>
                                       <label className="text-[9px] text-slate-400 block mb-0.5">Penomoran</label>
                                       <select 
                                         value={sec.numberingStyle || 'none'} 
                                         onChange={e => handleUpdateSectionField(activeSection, sec.id, 'numberingStyle', e.target.value)} 
                                         className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs"
                                       >
                                         <option value="none">Tanpa Nomor</option>
                                         <option value="bab_prefix_dot">1.1 (Sesuai Bab)</option>
                                         <option value="bab_prefix_double_dot">1.1.1 (Suku Bab)</option>
                                         <option value="arabic_dot">1. 2. 3.</option>
                                         <option value="arabic_paren">1) 2) 3)</option>
                                         <option value="arabic_both_paren">(1) (2) (3)</option>
                                         <option value="alpha_dot_lower">a. b. c.</option>
                                         <option value="alpha_dot_upper">A. B. C.</option>
                                         <option value="alpha_paren_lower">a) b) c)</option>
                                         <option value="alpha_both_paren_lower">(a) (b) (c)</option>
                                         <option value="roman_dot_upper">I. II. III.</option>
                                         <option value="roman_dot_lower">i. ii. iii.</option>
                                       </select>
                                     </div>
                                   )}
                                 </div>
                                 
                                 {sec.headingLevel > 0 && (
                                   <div>
                                     <label className="text-[9px] text-slate-400 block mb-0.5">Judul Sub-Bab (Caption)</label>
                                     <input 
                                       type="text" 
                                       value={sec.title} 
                                       onChange={e => handleUpdateSectionField(activeSection, sec.id, 'title', e.target.value)} 
                                       className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs" 
                                     />
                                   </div>
                                 )}
                               </div>

                              {legacySectionKeyMapping[sec.id] === 'latar_belakang' && (
                                <div className="space-y-1 mb-2 bg-indigo-50/5 dark:bg-indigo-950/10 p-2 border border-indigo-500/10 dark:border-indigo-500/20 rounded-lg">
                                  <label className="text-[9px] text-indigo-400 block font-bold uppercase tracking-wider">Format Latar Belakang AI</label>
                                  <select
                                    value={backgroundStyle}
                                    onChange={e => setBackgroundStyle(e.target.value)}
                                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs font-bold text-indigo-500"
                                  >
                                    <option value="structured">✨ Tulis dengan Komentar (Terstruktur)</option>
                                    <option value="direct">📝 Tulis Langsung (Tanpa Komentar)</option>
                                  </select>
                                  <div className="text-[8.5px] text-slate-400 leading-snug">
                                    {backgroundStyle === 'structured' 
                                      ? "Terstruktur 4 alinea: Alinea 1 Teori/Konsep + Pustaka, Alinea 2 Masalah (Apa, Mengapa, Siapa), Alinea 3 Solusi, Alinea 4 Sasaran Judul. Min 3 kalimat/alinea."
                                      : "Menulis draf latar belakang akademik mengalir bebas secara langsung tanpa tag komentar panduan."}
                                  </div>
                                </div>
                              )}

                              <div className="grid grid-cols-3 gap-2 items-center">
                                <div className="col-span-2">
                                  <label className="text-[9px] text-slate-400 block mb-0.5">Letak Halaman</label>
                                  <div className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-350">
                                    Halaman {getBlockPageNumber(activeSection, sec.id) || '(Otomatis)'}
                                  </div>
                                </div>
                                
                                <div className="pt-3.5 flex justify-end">
                                  {getAIWriteButton(sec.id, activeSection, sec.title)}
                                </div>
                              </div>

                              <div>
                                <div className="flex justify-between items-center mb-0.5">
                                  <label className="text-[9px] text-slate-400 block">Isi Konten</label>
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const textarea = document.getElementById(`textarea-content-${sec.id}`);
                                        let newContent = sec.content || '';
                                        if (textarea) {
                                          const start = textarea.selectionStart;
                                          const end = textarea.selectionEnd;
                                          newContent = newContent.substring(0, start) + "\n[pagebreak]\n" + newContent.substring(end);
                                          handleUpdateSectionField(activeSection, sec.id, 'content', newContent);
                                          setTimeout(() => {
                                            textarea.focus();
                                            textarea.setSelectionRange(start + 13, start + 13);
                                          }, 50);
                                        } else {
                                          handleUpdateSectionField(activeSection, sec.id, 'content', newContent + "\n[pagebreak]\n");
                                        }
                                        showToast("Penanda Halaman Baru dimasukkan.");
                                      }}
                                      className="text-[9px] text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold flex items-center gap-0.5 transition-colors"
                                      title="Memaksa konten setelah baris ini mulai di halaman baru"
                                    >
                                      📄 Halaman Baru
                                    </button>
                                    {sec.content && (sec.content.includes('\n') || sec.content.includes('\r')) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const cleaned = cleanLineBreaks(sec.content);
                                          handleUpdateSectionField(activeSection, sec.id, 'content', cleaned);
                                          showToast("Paragraf berhasil dirapikan!");
                                        }}
                                        className="text-[9px] text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300 font-bold flex items-center gap-0.5 transition-colors"
                                        title="Menggabungkan baris yang terputus akibat copy-paste dari PDF/Word"
                                      >
                                        ✨ Rapikan Baris/Spasi (PDF)
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <InlineAutoTextarea 
                                  id={`textarea-content-${sec.id}`}
                                  value={sec.content || ''} 
                                  autoResize={false}
                                  onCommit={(text) => handleUpdateSectionField(activeSection, sec.id, 'content', text)} 
                                  onPaste={(e) => {
                                    const pastedText = e.clipboardData.getData('text');
                                    if (pastedText && (pastedText.includes('\n') || pastedText.includes('\r'))) {
                                      setTimeout(() => {
                                        showToast("Tips: Klik tombol '✨ Rapikan Baris/Spasi (PDF)' di atas untuk merapikan teks.");
                                      }, 500);
                                    }
                                  }}
                                  rows={5} 
                                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded-lg text-xs" 
                                />

                                <div className="flex flex-wrap gap-2 mt-1.5 no-print">
                                  <button
                                    type="button"
                                    onClick={() => handleSplitTextAndInsert(activeSection, sec.id, 'figure')}
                                    className="bg-sky-600/10 hover:bg-sky-650/20 text-sky-500 dark:text-sky-400 px-2 py-1 rounded-lg flex items-center gap-1 font-bold text-[9px]"
                                    title="Pecah paragraf di kursor dan sisipkan gambar baru"
                                  >
                                    🖼️ Sisipkan Gambar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSplitTextAndInsert(activeSection, sec.id, 'table')}
                                    className="bg-sky-600/10 hover:bg-sky-650/20 text-sky-500 dark:text-sky-400 px-2 py-1 rounded-lg flex items-center gap-1 font-bold text-[9px]"
                                    title="Pecah paragraf di kursor dan sisipkan tabel baru"
                                  >
                                    📊 Sisipkan Tabel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSplitTextAndInsert(activeSection, sec.id, 'split')}
                                    className="bg-teal-600/10 hover:bg-teal-650/20 text-teal-500 dark:text-teal-400 px-2 py-1 rounded-lg flex items-center gap-1 font-bold text-[9px]"
                                    title="Pecah paragraf di kursor menjadi dua bagian"
                                  >
                                    ✂️ Pecah Paragraf
                                  </button>

                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setInsertMenu(prev => (prev.blockId === sec.id && prev.position === 'above' ? { blockId: null, position: null } : { blockId: sec.id, position: 'above' }));
                                      }}
                                      className="bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-500 dark:text-indigo-400 px-2 py-1 rounded-lg flex items-center gap-1 font-bold text-[9px]"
                                    >
                                      ➕ Di Atas (Above)
                                    </button>
                                    {insertMenu.blockId === sec.id && insertMenu.position === 'above' && (
                                      <>
                                        <div className="fixed inset-0 z-40" onClick={() => setInsertMenu({ blockId: null, position: null })} />
                                        <div className="absolute bottom-full left-0 mb-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 min-w-[110px] flex flex-col">
                                          <button
                                            type="button"
                                            onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'sub-bab'); setInsertMenu({ blockId: null, position: null }); }}
                                            className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                          >
                                            ➕ Sub-Bab
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'text'); setInsertMenu({ blockId: null, position: null }); }}
                                            className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                          >
                                            ➕ Paragraf
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'table'); setInsertMenu({ blockId: null, position: null }); }}
                                            className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                          >
                                            ➕ Tabel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'figure'); setInsertMenu({ blockId: null, position: null }); }}
                                            className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                          >
                                            ➕ Gambar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => { handleInsertSection(activeSection, sec.id, 'above', 'equation'); setInsertMenu({ blockId: null, position: null }); }}
                                            className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                          >
                                            ➕ Rumus
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  <div className="relative">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setInsertMenu(prev => (prev.blockId === sec.id && prev.position === 'below' ? { blockId: null, position: null } : { blockId: sec.id, position: 'below' }));
                                      }}
                                      className="bg-indigo-600/10 hover:bg-indigo-650/20 text-indigo-500 dark:text-indigo-400 px-2 py-1 rounded-lg flex items-center gap-1 font-bold text-[9px]"
                                    >
                                      ➕ Di Bawah (Below)
                                    </button>
                                    {insertMenu.blockId === sec.id && insertMenu.position === 'below' && (
                                      <>
                                        <div className="fixed inset-0 z-40" onClick={() => setInsertMenu({ blockId: null, position: null })} />
                                        <div className="absolute bottom-full left-0 mb-1 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 min-w-[110px] flex flex-col">
                                          <button
                                            type="button"
                                            onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'sub-bab'); setInsertMenu({ blockId: null, position: null }); }}
                                            className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                          >
                                            ➕ Sub-Bab
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'text'); setInsertMenu({ blockId: null, position: null }); }}
                                            className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                          >
                                            ➕ Paragraf
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'table'); setInsertMenu({ blockId: null, position: null }); }}
                                            className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                          >
                                            ➕ Tabel
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'figure'); setInsertMenu({ blockId: null, position: null }); }}
                                            className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                          >
                                            ➕ Gambar
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => { handleInsertSection(activeSection, sec.id, 'below', 'equation'); setInsertMenu({ blockId: null, position: null }); }}
                                            className="text-left px-3 py-1.5 text-[9px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                          >
                                            ➕ Rumus
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <TablesFiguresPanel
                  show={activeSection === 'elemen'}
                  babTitles={babTitles}
                  tableInput={tableInput}
                  figureInput={figureInput}
                  editingElementId={editingElementId}
                  editingElementData={editingElementData}
                  tables={getAllTables()}
                  figures={getAllFigures()}
                  onTableInputChange={setTableInput}
                  onFigureInputChange={setFigureInput}
                  onEditingElementIdChange={setEditingElementId}
                  onEditingElementDataChange={setEditingElementData}
                  onAddTable={handleAddTable}
                  onAddFigure={handleAddFigure}
                  onSaveTableEdit={handleSaveTableEdit}
                  onSaveFigureEdit={handleSaveFigureEdit}
                  onDeleteTable={deleteTable}
                  onDeleteFigure={deleteFigure}
                />
              </div>
            )}
            <AiAssistantPanel
              show={activeTab === 'asisten'}
              apiKey={apiKey}
              aiInputs={aiInputs}
              loadingSuggestions={loadingSuggestions}
              suggestedTitles={suggestedTitles}
              onApiKeyChange={updateApiKey}
              onAiInputsChange={setAiInputs}
              onFetchTitleRecommendations={fetchTitleRecommendations}
              onApplySuggestedTitle={applySuggestedTitle}
            />
            <BibliographyPanel
              show={activeTab === 'referensi'}
              scholarQuery={scholarQuery}
              searchingScholar={searchingScholar}
              scholarYearStart={scholarYearStart}
              scholarYearEnd={scholarYearEnd}
              scholarResults={scholarResults}
              refInput={refInput}
              references={references}
              refStyle={refStyle}
              onScholarQueryChange={setScholarQuery}
              onScholarYearStartChange={setScholarYearStart}
              onScholarYearEndChange={setScholarYearEnd}
              onScholarSearch={handleScholarSearch}
              onImportCitation={importCitation}
              onRefInputChange={setRefInput}
              onAddReference={handleAddReference}
              onRefStyleChange={setRefStyle}
              onReferencesChange={setReferences}
            />
          </div>
          <SidebarFooter
            saveFilename={saveFilename}
            autosaveEnabled={autosaveEnabled}
            onSaveFilenameChange={setSaveFilename}
            onSaveDraft={handleSaveDraftDB}
            onOpenDraftManager={() => {
              fetchDraftsList();
              setShowDraftManager(true);
            }}
            onPrint={handlePrint}
            onImportDocx={handleDocxImport}
          />
        </aside>
        )}

        {/* Floating button to reopen the sidebar when hidden */}
        {!sidebarVisible && (
          <button
            onClick={() => setSidebarVisible(true)}
            className="fixed top-4 left-4 z-40 bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-lg shadow-xl flex items-center gap-1.5 no-print text-xs font-bold"
            title="Tampilkan panel editor"
          >
            <PanelLeftOpen className="h-4 w-4" />
            <span>Panel</span>
          </button>
        )}

        {/* ==========================================================================
           2. PREVIEW CANVAS AREA (RIGHT)
           ========================================================================== */}
        <main className="flex-1 overflow-auto flex flex-col items-center p-8 bg-slate-300 dark:bg-slate-950/60 relative">
          
          {/* Zoom & PDF Title floating bar */}
          <div className="sticky top-0 mb-6 bg-slate-900/85 border border-slate-700 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-4 text-slate-100 shadow-xl no-print z-30">
            <div className="flex items-center gap-2 border-r border-slate-700 pr-4 text-xs font-semibold text-slate-300">
              <GraduationCap className="h-4 w-4 text-indigo-400" />
              <span>{cleanDocTitle()}</span>
            </div>

            {/* Active draft indicator */}
            {(() => {
              const isUnsaved = !saveFilename || saveFilename === 'Draft_Skripsi';
              return (
                <div className="flex items-center gap-1.5 border-r border-slate-700 pr-4 text-[11px]" title={isUnsaved ? 'Draft belum disimpan ke database' : `Draft aktif: ${saveFilename}`}>
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
              );
            })()}
            
            <div className="flex items-center gap-3">
              <button onClick={() => setZoomLevel(prev => Math.max(prev - 10, 40))} className="hover:bg-slate-800 p-1.5 rounded-full"><ZoomOut className="h-4 w-4" /></button>
              <span className="font-mono text-xs w-10 text-center">{zoomLevel}%</span>
              <button onClick={() => setZoomLevel(prev => Math.min(prev + 10, 140))} className="hover:bg-slate-800 p-1.5 rounded-full"><ZoomIn className="h-4 w-4" /></button>
              <button
                type="button"
                onClick={() => setShowMarginGuide(prev => !prev)}
                className={`p-1.5 rounded-full transition-colors ${showMarginGuide ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                title={showMarginGuide ? 'Sembunyikan garis margin' : 'Tampilkan garis margin'}
                aria-pressed={showMarginGuide}
              >
                <Ruler className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Active Editing Formatting Toolbar */}
          {inlineEditingBlockId && inlineEditingBabKey && (() => {
            const sec = babSections[inlineEditingBabKey]?.find(x => x.id === inlineEditingBlockId);
            if (!sec) return null;
            
            const activeIndex = babSections[inlineEditingBabKey]?.findIndex(x => x.id === inlineEditingBlockId);
            const isFirst = activeIndex === 0;
            const isLast = activeIndex === (babSections[inlineEditingBabKey]?.length - 1);
            const legacyKey = legacySectionKeyMapping[sec.id];
            const displayTitle = sec.title || 'Sub-Bab';
            const isGenerating = generatingSection === sec.id;
            
            return (
              <div 
                className="sticky top-14 mb-4 bg-slate-900/90 dark:bg-slate-950/95 border border-slate-700/80 backdrop-blur-md px-4 py-2 rounded-full flex flex-wrap items-center gap-3 text-slate-100 shadow-xl no-print z-30 animate-in fade-in slide-in-from-top-2 duration-200 inline-editor-toolbar"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1">Teks:</span>
                  <select
                    value={sec.headingLevel}
                    onChange={e => {
                      const level = parseInt(e.target.value);
                      handleUpdateSectionField(inlineEditingBabKey, sec.id, 'headingLevel', level);
                      if (level === 2) {
                        handleUpdateSectionField(inlineEditingBabKey, sec.id, 'numberingStyle', 'bab_prefix_dot');
                      } else if (level === 3) {
                        handleUpdateSectionField(inlineEditingBabKey, sec.id, 'numberingStyle', 'bab_prefix_double_dot');
                      }
                    }}
                    className="bg-slate-800 dark:bg-slate-900 border border-slate-700 py-1 px-2 rounded text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold cursor-pointer"
                  >
                    <option value={0}>Paragraf Biasa</option>
                    <option value={2}>Heading 2 (Sub-Bab)</option>
                    <option value={3}>Heading 3 (Suku Bab)</option>
                    <option value={4}>Heading 4 (Sub Heading 4)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1">Nomor:</span>
                  <select
                    value={sec.numberingStyle || 'none'}
                    onChange={e => handleUpdateSectionField(inlineEditingBabKey, sec.id, 'numberingStyle', e.target.value)}
                    className="bg-slate-800 dark:bg-slate-900 border border-slate-700 py-1 px-2 rounded text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold cursor-pointer"
                  >
                    <option value="none">Tanpa Nomor</option>
                    <option value="bab_prefix_dot">1.1 (Sesuai Bab)</option>
                    <option value="bab_prefix_double_dot">1.1.1 (Suku Bab)</option>
                    <option value="arabic_dot">1. 2. 3.</option>
                    <option value="arabic_paren">1) 2) 3)</option>
                    <option value="alpha_dot_lower">a. b. c.</option>
                  </select>
                </div>

                <div className="h-5 w-[1px] bg-slate-700/80 mx-1"></div>

                {/* CLIPBOARD GROUP */}
                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={() => inlineClipboard(inlineEditingBabKey, sec, 'cut')} className="hover:bg-slate-800 p-1.5 rounded text-slate-300 hover:text-white transition-colors" title="Potong (Cut)"><Scissors className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => inlineClipboard(inlineEditingBabKey, sec, 'copy')} className="hover:bg-slate-800 p-1.5 rounded text-slate-300 hover:text-white transition-colors" title="Salin (Copy)"><Copy className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => inlineClipboard(inlineEditingBabKey, sec, 'paste')} className="hover:bg-slate-800 p-1.5 rounded text-slate-300 hover:text-white transition-colors" title="Tempel (Paste)"><ClipboardPaste className="h-3.5 w-3.5" /></button>
                </div>

                <div className="h-5 w-[1px] bg-slate-700/80 mx-1"></div>

                {/* FONT GROUP */}
                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={() => wrapInlineSelection(inlineEditingBabKey, sec, '**')} className="hover:bg-slate-800 p-1.5 rounded text-slate-200 hover:text-white transition-colors font-bold" title="Tebal (Bold)"><Bold className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => wrapInlineSelection(inlineEditingBabKey, sec, '*')} className="hover:bg-slate-800 p-1.5 rounded text-slate-200 hover:text-white transition-colors" title="Miring (Italic)"><Italic className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => wrapInlineSelection(inlineEditingBabKey, sec, '__')} className="hover:bg-slate-800 p-1.5 rounded text-slate-200 hover:text-white transition-colors" title="Garis Bawah (Underline)"><Underline className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => wrapInlineSelection(inlineEditingBabKey, sec, '~~')} className="hover:bg-slate-800 p-1.5 rounded text-slate-200 hover:text-white transition-colors" title="Coret (Strikethrough)"><Strikethrough className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => clearInlineFormatting(inlineEditingBabKey, sec)} className="hover:bg-slate-800 p-1.5 rounded text-slate-400 hover:text-white transition-colors" title="Hapus Format"><RemoveFormatting className="h-3.5 w-3.5" /></button>
                </div>

                <div className="h-5 w-[1px] bg-slate-700/80 mx-1"></div>

                {/* PARAGRAPH GROUP */}
                <div className="flex items-center gap-0.5">
                  <button type="button" onClick={() => applyLinePrefix(inlineEditingBabKey, sec, 'bullet')} className="hover:bg-slate-800 p-1.5 rounded text-slate-200 hover:text-white transition-colors" title="Daftar Berpoin (Bullet List)"><List className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => applyLinePrefix(inlineEditingBabKey, sec, 'numbered')} className="hover:bg-slate-800 p-1.5 rounded text-slate-200 hover:text-white transition-colors" title="Daftar Bernomor (Numbered List)"><ListOrdered className="h-3.5 w-3.5" /></button>
                </div>

                <div className="h-5 w-[1px] bg-slate-700/80 mx-1"></div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const textarea = document.getElementById(`inline-textarea-${sec.id}`);
                      let newContent = sec.content || '';
                      if (textarea) {
                        const start = textarea.selectionStart;
                        const end = textarea.selectionEnd;
                        newContent = newContent.substring(0, start) + "\n[pagebreak]\n" + newContent.substring(end);
                        handleUpdateSectionField(inlineEditingBabKey, sec.id, 'content', newContent);
                        setTimeout(() => {
                          textarea.focus();
                          textarea.setSelectionRange(start + 13, start + 13);
                        }, 50);
                      } else {
                        handleUpdateSectionField(inlineEditingBabKey, sec.id, 'content', newContent + "\n[pagebreak]\n");
                      }
                    }}
                    className="hover:bg-slate-800 p-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
                    title="Buat halaman baru dari titik cursor"
                  >
                    📄 Halaman Baru
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const cleaned = cleanLineBreaks(sec.content);
                      handleUpdateSectionField(inlineEditingBabKey, sec.id, 'content', cleaned);
                      showToast("Paragraf berhasil dirapikan!");
                    }}
                    className="hover:bg-slate-800 p-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 text-emerald-400 hover:text-emerald-350 transition-colors"
                    title="Menghapus spasi dan enter berlebih (akibat copy-paste PDF)"
                  >
                    ✨ Rapikan Spasi
                  </button>

                  <button
                    type="button"
                    disabled={!!generatingSection}
                    onClick={() => triggerAIGenerateFlow({ babKey: inlineEditingBabKey, id: sec.id, displayTitle, legacyKey })}
                    className="hover:bg-slate-800 p-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 text-amber-400 hover:text-amber-350 transition-colors disabled:opacity-40"
                    title="Tulis otomatis isi konten menggunakan AI"
                  >
                    {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    AI Tulis
                  </button>

                  {sec.type === 'text' && (
                    <>
                      <div className="h-4 w-[1px] bg-slate-800 mx-1 inline-block"></div>
                      <button
                        type="button"
                        onClick={() => handleSplitTextAndInsert(inlineEditingBabKey, sec.id, 'figure')}
                        className="hover:bg-slate-800 p-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 text-sky-400 hover:text-sky-350 transition-colors"
                        title="Pecah paragraf di kursor dan sisipkan gambar"
                      >
                        🖼️ Gambar (Kursor)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSplitTextAndInsert(inlineEditingBabKey, sec.id, 'table')}
                        className="hover:bg-slate-800 p-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 text-sky-400 hover:text-sky-350 transition-colors"
                        title="Pecah paragraf di kursor dan sisipkan tabel"
                      >
                        📊 Tabel (Kursor)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSplitTextAndInsert(inlineEditingBabKey, sec.id, 'split')}
                        className="hover:bg-slate-800 p-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 text-teal-400 hover:text-teal-350 transition-colors"
                        title="Pecah paragraf menjadi dua di kursor"
                      >
                        ✂️ Pecah
                      </button>
                    </>
                  )}
                </div>

                <div className="h-5 w-[1px] bg-slate-700/80 mx-1"></div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => handleMoveSection(inlineEditingBabKey, activeIndex, -1)}
                    className="p-1 px-2.5 text-[11px] hover:bg-slate-850 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Naikkan posisi blok ini"
                  >
                    Naik ↑
                  </button>
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => handleMoveSection(inlineEditingBabKey, activeIndex, 1)}
                    className="p-1 px-2.5 text-[11px] hover:bg-slate-850 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Turunkan posisi blok ini"
                  >
                    Turun ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Hapus blok konten ini?")) {
                        setInlineEditingBlockId(null);
                        setInlineEditingBabKey(null);
                        setBabSections(prev => {
                          const updatedList = prev[inlineEditingBabKey].filter(x => x.id !== sec.id);
                          const updated = { ...prev, [inlineEditingBabKey]: updatedList };
                          saveLocalDraft({ babSections: updated });
                          return updated;
                        });
                        showToast("Blok konten berhasil dihapus.");
                      }
                    }}
                    className="p-1 px-2.5 text-[11px] hover:bg-slate-850 rounded text-red-400 hover:text-red-350 transition-colors"
                    title="Hapus blok konten ini"
                  >
                    Hapus 🗑️
                  </button>
                </div>

                <div className="h-5 w-[1px] bg-slate-700/80 mx-1"></div>

                <button
                  type="button"
                  onClick={() => {
                    setInlineEditingBlockId(null);
                    setInlineEditingBabKey(null);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3.5 rounded-full text-[11px] transition-colors shadow-md shadow-indigo-600/10"
                >
                  Selesai
                </button>
              </div>
            );
          })()}

          {/* Scale transformer for preview paper */}
          <div className="flex flex-col items-center origin-top transition-transform duration-200" style={{ transform: `scale(${zoomLevel / 100})` }} onClick={handlePreviewBackgroundClick}>
            <div 
              className={`flex flex-col gap-8 pb-32 ${showMarginGuide ? 'show-margin-guide' : ''}`}
              style={{
                '--doc-margin-top': `${layout.marginTop}cm`,
                '--doc-margin-left': `${layout.marginLeft}cm`,
                '--doc-margin-bottom': `${layout.marginBottom}cm`,
                '--doc-margin-right': `${layout.marginRight}cm`,
                '--doc-font-family': layout.fontFamily,
                '--doc-font-size': layout.fontSize,
                '--doc-line-spacing': layout.lineSpacing,
                '--doc-text-align': layout.textAlign,
                '--doc-text-indent': layout.paragraphIndent === 'indented' ? '1.25cm' : '0cm'
              }}
            >
              
              {/* PAGE 1: COVER Sampul */}
              <div className={`a4-page relative ${getPagePrintClass('cover')}`} id="page-cover">
                <div className="page-content flex flex-col items-center justify-start h-full border border-dashed border-indigo-500/10 w-full">
                  <div className="w-full flex flex-col items-center">
                    {coverElements.map((el) => {
                      if (el.type === 'spacing') {
                        return <div key={el.id} style={{ height: el.height || '1cm' }} className="w-full" />;
                      }
                      if (el.type === 'logo') {
                        return (
                          <div key={el.id} className="flex justify-center text-center w-full my-2" align="center">
                            {el.logoType === 'custom' && el.logoData ? (
                              <img src={el.logoData} className="max-h-[5.5cm] max-w-[5.5cm] object-contain" alt="Logo Kustom" />
                            ) : (
                              <div className="w-[5.5cm] h-[5.5cm] flex items-center justify-center bg-indigo-50/50 rounded-full border border-indigo-200">
                                <GraduationCap className="w-20 h-20 text-indigo-500" />
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Styling for text, title, label
                      const textStyle = {
                        fontSize: el.fontSize || '12pt',
                        fontWeight: el.bold ? 'bold' : 'normal',
                        fontStyle: el.italic ? 'italic' : 'normal',
                        textDecoration: el.underline ? 'underline' : 'none',
                        textTransform: el.uppercase ? 'uppercase' : 'none',
                        lineHeight: '1.5',
                        margin: '0',
                        padding: '0',
                        fontFamily: 'var(--doc-font-family)'
                      };

                      if (el.type === 'title') {
                        return (
                          <h1 
                            key={el.id} 
                            style={textStyle} 
                            className="w-full max-w-[15.5cm] mx-auto text-center font-bold tracking-wide break-words"
                          >
                            {el.value}
                          </h1>
                        );
                      }

                      return (
                        <p 
                          key={el.id} 
                          style={textStyle} 
                          className="w-full text-center break-words"
                        >
                          {el.value}
                        </p>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* PAGE OPTIONAL: PERSATUJUAN */}
              {layout.showPersetujuan && (
                <div className={`a4-page relative ${getPagePrintClass('persetujuan')}`} id="page-persetujuan">
                  <div className="page-content border border-dashed border-indigo-500/10 flex flex-col justify-between text-justify" style={{ textIndent: 0 }}>
                    <div className="text-center">
                      <h1 className="text-[14pt] font-bold uppercase leading-normal tracking-wide">HALAMAN PERSETUJUAN</h1>
                    </div>
                    
                    <div className="my-6 text-[12pt] leading-relaxed">
                      <p className="mb-4">
                        Skripsi dengan judul:
                      </p>
                      <p className="font-bold uppercase text-center my-4 px-4 leading-normal">
                        "{cover.title}"
                      </p>
                      <p className="mb-4">
                        yang disusun dan diajukan oleh:
                      </p>
                      <table className="w-auto border-none mx-auto my-4 text-[12pt]">
                        <tbody>
                          <tr className="border-none">
                            <td className="border-none p-1 text-left font-semibold">Nama</td>
                            <td className="border-none p-1 text-center font-semibold">:</td>
                            <td className="border-none p-1 text-left font-bold uppercase">{cover.author}</td>
                          </tr>
                          <tr className="border-none">
                            <td className="border-none p-1 text-left font-semibold">NIM</td>
                            <td className="border-none p-1 text-center font-semibold">:</td>
                            <td className="border-none p-1 text-left">{cover.nim}</td>
                          </tr>
                          <tr className="border-none">
                            <td className="border-none p-1 text-left font-semibold">Program Studi</td>
                            <td className="border-none p-1 text-center font-semibold">:</td>
                            <td className="border-none p-1 text-left">{cover.prodi}</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="mt-4">
                        telah disetujui oleh Dosen Pembimbing untuk diujikan pada Sidang Skripsi Program Studi {cover.prodi}, Fakultas {cover.fakultas}, {cover.univ}.
                      </p>
                    </div>

                    <div className="mt-6 text-[12pt]">
                      <p className="text-right mb-8">{cover.city || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                      <div className="flex justify-between px-8">
                        <div className="text-center flex flex-col justify-between h-20">
                          <p>Dosen Pembimbing I,</p>
                          <div>
                            <p className="font-bold underline">Prof. Dr. Ir. H. Aditama, M.T.</p>
                            <p className="text-xs">NIDN. 0412038401</p>
                          </div>
                        </div>
                        <div className="text-center flex flex-col justify-between h-20">
                          <p>Dosen Pembimbing II,</p>
                          <div>
                            <p className="font-bold underline">Siti Rahmawati, S.Kom., M.Cs.</p>
                            <p className="text-xs">NIDN. 0418099102</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={getPageNumberClass('persetujuan')}>{getPageNumber('persetujuan')}</div>
                </div>
              )}

              {/* PAGE OPTIONAL: PENGESAHAN */}
              {layout.showPengesahan && (
                <div className={`a4-page relative ${getPagePrintClass('pengesahan')}`} id="page-pengesahan">
                  <div className="page-content border border-dashed border-indigo-500/10 flex flex-col justify-between text-justify" style={{ textIndent: 0 }}>
                    <div className="text-center">
                      <h1 className="text-[14pt] font-bold uppercase leading-normal tracking-wide">HALAMAN PENGESAHAN</h1>
                    </div>

                    <div className="my-4 text-[12pt] leading-relaxed">
                      <p className="mb-2">
                        Skripsi oleh:
                      </p>
                      <table className="w-auto border-none mx-auto my-2 text-[12pt]">
                        <tbody>
                          <tr className="border-none">
                            <td className="border-none p-1 text-left font-semibold">Nama</td>
                            <td className="border-none p-1 text-center font-semibold">:</td>
                            <td className="border-none p-1 text-left font-bold uppercase">{cover.author}</td>
                          </tr>
                          <tr className="border-none">
                            <td className="border-none p-1 text-left font-semibold">NIM</td>
                            <td className="border-none p-1 text-center font-semibold">:</td>
                            <td className="border-none p-1 text-left">{cover.nim}</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="my-2">
                        dengan judul:
                      </p>
                      <p className="font-bold uppercase text-center my-2 px-4 leading-normal">
                        "{cover.title}"
                      </p>
                      <p className="mt-2">
                        telah dipertahankan di depan Dewan Penguji Sidang Skripsi pada tanggal {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})} dan dinyatakan telah memenuhi syarat kelulusan.
                      </p>
                    </div>

                    <div className="text-[12pt]">
                      <p className="font-bold mb-2">Dewan Penguji:</p>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <p>1. Prof. Dr. Ir. H. Aditama, M.T. (Ketua)</p>
                          <p className="w-48 border-b border-black text-center text-xs text-slate-400 pb-1">Tanda Tangan</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p>2. Ir. Hermawan, M.T. (Anggota)</p>
                          <p className="w-48 border-b border-black text-center text-xs text-slate-400 pb-1">Tanda Tangan</p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p>3. Dr. Diana Lestari, M.Si. (Anggota)</p>
                          <p className="w-48 border-b border-black text-center text-xs text-slate-400 pb-1">Tanda Tangan</p>
                        </div>
                      </div>
                      
                      <div className="mt-6 pt-2 border-t border-dashed border-slate-300 flex justify-between">
                        <div className="text-center flex flex-col justify-between h-16">
                          <p>Mengetahui,<br />Dekan Fakultas</p>
                          <p className="font-bold underline text-xs">Prof. Ir. Sudjatmiko, Ph.D.</p>
                        </div>
                        <div className="text-center flex flex-col justify-between h-16">
                          <p>Menyetujui,<br />Ketua Program Studi</p>
                          <p className="font-bold underline text-xs">{cover.prodi}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={getPageNumberClass('pengesahan')}>{getPageNumber('pengesahan')}</div>
                </div>
              )}

              {/* PAGE OPTIONAL: PERNYATAAN */}
              {layout.showPernyataan && (
                <div className={`a4-page relative ${getPagePrintClass('pernyataan')}`} id="page-pernyataan">
                  <div className="page-content border border-dashed border-indigo-500/10 flex flex-col justify-between text-justify" style={{ textIndent: 0 }}>
                    <div className="text-center">
                      <h1 className="text-[14pt] font-bold uppercase leading-normal tracking-wide">PERNYATAAN ORISINALITAS</h1>
                    </div>

                    <div className="my-6 text-[12pt] leading-relaxed space-y-4">
                      <p>Saya yang bertanda tangan di bawah ini:</p>
                      <table className="w-auto border-none ml-8 text-[12pt]">
                        <tbody>
                          <tr className="border-none">
                            <td className="border-none p-1 text-left font-semibold">Nama</td>
                            <td className="border-none p-1 text-center font-semibold">:</td>
                            <td className="border-none p-1 text-left font-bold uppercase">{cover.author}</td>
                          </tr>
                          <tr className="border-none">
                            <td className="border-none p-1 text-left font-semibold">NIM</td>
                            <td className="border-none p-1 text-center font-semibold">:</td>
                            <td className="border-none p-1 text-left">{cover.nim}</td>
                          </tr>
                          <tr className="border-none">
                            <td className="border-none p-1 text-left font-semibold">Program Studi</td>
                            <td className="border-none p-1 text-center font-semibold">:</td>
                            <td className="border-none p-1 text-left">{cover.prodi}</td>
                          </tr>
                        </tbody>
                      </table>

                      <p className="text-justify">
                        Menyatakan dengan sebenarnya bahwa skripsi saya yang berjudul:
                      </p>
                      <p className="font-bold uppercase text-center px-4 leading-normal">
                        "{cover.title}"
                      </p>
                      <p className="text-justify">
                        adalah sepenuhnya hasil karya saya sendiri. Di dalam dokumen ini tidak terdapat tulisan atau pendapat orang lain tanpa rujukan yang sah. Apabila pernyataan ini terbukti tidak benar, saya bersedia menerima sanksi akademis sesuai peraturan yang berlaku.
                      </p>
                    </div>

                    <div className="mt-8 text-[12pt] flex flex-col items-end">
                      <div className="text-center w-64">
                        <p className="mb-2">{cover.city || 'Jakarta'}, {new Date().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                        <p className="mb-12">Yang membuat pernyataan,</p>
                        <div className="relative inline-block">
                          <span className="absolute -left-12 top-0 border border-slate-400 text-[8pt] text-slate-400 px-2 py-1 rotate-12 bg-white">Materai Rp 10.000</span>
                          <p className="font-bold underline uppercase">{cover.author}</p>
                          <p className="text-xs">NIM. {cover.nim}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={getPageNumberClass('pernyataan')}>{getPageNumber('pernyataan')}</div>
                </div>
              )}

              {/* PAGE OPTIONAL: ABSTRAK INDO */}
              {layout.showAbstractIndo && (
                <div className={`a4-page relative ${getPagePrintClass('abstrak-indo')}`} id="page-abstrak-indo">
                  <div className="page-content border border-dashed border-indigo-500/10 flex flex-col justify-between text-justify" style={{ textIndent: 0 }}>
                    <div>
                      <h1 className="text-[14pt] font-bold text-center uppercase mb-6">ABSTRAK</h1>

                      <div className="text-[11pt] text-justify leading-relaxed" style={{ textIndent: 'var(--doc-text-indent, 1.25cm)' }}>
                        <p className="paragraph-content" dangerouslySetInnerHTML={{ __html: italicizeEnglishWordsText(abstrakIndo) }} />
                      </div>
                    </div>

                    <div className="text-[11pt] font-semibold mt-4" style={{ textIndent: 0 }}>
                      <span>Kata Kunci: </span>
                      <span className="font-normal italic" dangerouslySetInnerHTML={{ __html: italicizeEnglishWordsText(abstrakIndoKeywords) }} />
                    </div>
                  </div>
                  <div className={getPageNumberClass('abstrak-indo')}>{getPageNumber('abstrak-indo')}</div>
                </div>
              )}

              {/* PAGE OPTIONAL: ABSTRAK ENG */}
              {layout.showAbstractEng && (
                <div className={`a4-page relative ${getPagePrintClass('abstrak-eng')}`} id="page-abstrak-eng">
                  <div className="page-content border border-dashed border-indigo-500/10 flex flex-col justify-between text-justify" style={{ textIndent: 0 }}>
                    <div>
                      <h1 className="text-[14pt] font-bold text-center uppercase mb-6 italic">ABSTRACT</h1>

                      <div className="text-[11pt] text-justify leading-relaxed italic" style={{ textIndent: 'var(--doc-text-indent, 1.25cm)' }}>
                        <p className="paragraph-content">{abstrakEng}</p>
                      </div>
                    </div>

                    <div className="text-[11pt] font-semibold mt-4" style={{ textIndent: 0 }}>
                      <span>Keywords: </span>
                      <span className="font-normal italic">{abstrakEngKeywords}</span>
                    </div>
                  </div>
                  <div className={getPageNumberClass('abstrak-eng')}>{getPageNumber('abstrak-eng')}</div>
                </div>
              )}

              {/* PAGE 2: DAFTAR ISI (DYNAMIC MULTI-PAGE) */}
              {!layout.blankMode && getTocPages().map((pageEntries, pageIdx) => {
                const pageId = `daftar-isi-${pageIdx + 1}`;
                return (
                  <div key={pageId} className={`a4-page relative ${getPagePrintClass(pageId)}`} id={`page-${pageId}`}>
                    <div className="page-content border border-dashed border-indigo-500/10 flex flex-col justify-between">
                      <div className="flex flex-col flex-1">
                        {pageIdx === 0 && (
                          <h1 className="text-[14pt] font-bold text-center uppercase mb-8">
                            DAFTAR ISI
                          </h1>
                        )}
                        
                        <div className="flex flex-col gap-2 text-[12pt] flex-1">
                          {pageEntries.map((entry, entryIdx) => {
                            const entryPageNumber = getPageNumber(entry.pageId);
                            return (
                              <div
                                key={entryIdx}
                                className={`flex items-baseline justify-between ${entry.isBold ? 'font-bold' : ''} ${entry.isChapter ? 'mt-3' : ''}`}
                                style={{ paddingLeft: entry.indent || '0cm' }}
                              >
                                <div className="flex items-baseline flex-1 mr-2 overflow-hidden">
                                  <span className="pr-2 relative z-10 bg-white" dangerouslySetInnerHTML={{ __html: italicizeEnglishWordsText(entry.title) }} />
                                  <span className="dot-leader"></span>
                                </div>
                                <span className="pl-2 font-normal text-right min-w-[25px]">{entryPageNumber}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className={getPageNumberClass(pageId)}>{getPageNumber(pageId)}</div>
                  </div>
                );
              })}

              {/* PAGE 3: DAFTAR TABEL (DYNAMIC MULTI-PAGE) */}
              {!layout.blankMode && getTableListPages().map((pageItems, pageIdx) => {
                const pageId = `daftar-tabel-${pageIdx + 1}`;
                return (
                  <div key={pageId} className={`a4-page relative ${getPagePrintClass(pageId)}`} id={`page-${pageId}`}>
                    <div className="page-content border border-dashed border-indigo-500/10 flex flex-col">
                      {pageIdx === 0 && <h1 className="text-[14pt] font-bold text-center uppercase mb-8">DAFTAR TABEL</h1>}
                      <div className="flex flex-col gap-2 text-[12pt] flex-1">
                        {pageItems.map((t) => {
                          const babPage = getPageForBlock(t.bab, t.id);
                          return (
                            <div key={t.id} className="flex items-baseline justify-between">
                              <div className="flex items-baseline flex-1 mr-2 overflow-hidden">
                                <span className="pr-2 relative z-10 bg-white">{t.title}</span>
                                <span className="dot-leader"></span>
                              </div>
                              <span className="pl-2 font-normal text-right min-w-[25px]">{babPage}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className={getPageNumberClass(pageId)}>{getPageNumber(pageId)}</div>
                  </div>
                );
              })}

              {/* PAGE 4: DAFTAR GAMBAR (DYNAMIC MULTI-PAGE) */}
              {!layout.blankMode && getFigureListPages().map((pageItems, pageIdx) => {
                const pageId = `daftar-gambar-${pageIdx + 1}`;
                return (
                  <div key={pageId} className={`a4-page relative ${getPagePrintClass(pageId)}`} id={`page-${pageId}`}>
                    <div className="page-content border border-dashed border-indigo-500/10 flex flex-col">
                      {pageIdx === 0 && <h1 className="text-[14pt] font-bold text-center uppercase mb-8">DAFTAR GAMBAR</h1>}
                      <div className="flex flex-col gap-2 text-[12pt] flex-1">
                        {pageItems.map((f) => {
                          const babPage = getPageForBlock(f.bab, f.id);
                          return (
                            <div key={f.id} className="flex items-baseline justify-between">
                              <div className="flex items-baseline flex-1 mr-2 overflow-hidden">
                                <span className="pr-2 relative z-10 bg-white">{f.title}</span>
                                <span className="dot-leader"></span>
                              </div>
                              <span className="pl-2 font-normal text-right min-w-[25px]">{babPage}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className={getPageNumberClass(pageId)}>{getPageNumber(pageId)}</div>
                  </div>
                );
              })}

              {/* PAGE 5: DAFTAR RUMUS (DYNAMIC MULTI-PAGE) */}
              {layout.showDaftarRumus && !layout.blankMode && getEquationListPages().map((pageItems, pageIdx) => {
                const pageId = `daftar-rumus-${pageIdx + 1}`;
                return (
                  <div key={pageId} className={`a4-page relative ${getPagePrintClass(pageId)}`} id={`page-${pageId}`}>
                    <div className="page-content border border-dashed border-indigo-500/10 flex flex-col">
                      {pageIdx === 0 && <h1 className="text-[14pt] font-bold text-center uppercase mb-8">DAFTAR RUMUS</h1>}
                      <div className="flex flex-col gap-2 text-[12pt] flex-1">
                        {pageItems.map((eq) => {
                          const babPage = getPageForBlock(eq.bab, eq.id);
                          const resolvedEqPrefix = (() => {
                            const babMatch = eq.bab.match(/\d+/);
                            const babNum = babMatch ? babMatch[0] : '1';
                            const babSecs = babSections[eq.bab] || [];
                            const eqIdx = babSecs.filter(s => s.type === 'equation').findIndex(s => s.id === eq.id);
                            return `Rumus ${babNum}.${eqIdx !== -1 ? eqIdx + 1 : 1}`;
                          })();
                          const displayTitle = eq.title && eq.title.trim() ? eq.title : resolvedEqPrefix;
                          return (
                            <div key={eq.id} className="flex items-baseline justify-between">
                              <div className="flex items-baseline flex-1 mr-2 overflow-hidden">
                                <span className="pr-2 relative z-10 bg-white">{displayTitle}</span>
                                <span className="dot-leader"></span>
                              </div>
                              <span className="pl-2 font-normal text-right min-w-[25px]">{babPage}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div className={getPageNumberClass(pageId)}>{getPageNumber(pageId)}</div>
                  </div>
                );
              })}

              {/* DYNAMIC CHAPTER PAGES (BAB I to V) */}
              {['bab1', 'bab2', 'bab3', 'bab4', 'bab5'].flatMap((babKey) => {
                // In blank/outline mode, skip chapters that have no sections
                if ((layout.blankMode || layout.hideEmptyChapters) && (!babSections[babKey] || babSections[babKey].length === 0)) return [];
                const pages = getBabPagesMap()[babKey] || [];
                return pages.map((pageElements, pageIdx) => {
                  const pageId = `${babKey}-${pageIdx + 1}`;
                  return (
                    <div key={pageId} className={`a4-page relative ${getPagePrintClass(pageId)}`} id={`page-${pageId}`}>
                      <div className="page-content border border-dashed border-indigo-500/10 text-justify">
                        {pageIdx === 0 && !layout.blankMode && renderHeading(1, getBabHeaderTitle(babKey))}
                        {renderBabDynamicPageContent(babKey, pageIdx)}
                      </div>
                      <div className={getPageNumberClass(pageId)}>{getPageNumber(pageId)}</div>
                    </div>
                  );
                });
              })}
 
              {/* PAGE: DAFTAR PUSTAKA (DYNAMIC MULTI-PAGE) */}
              {(!layout.blankMode || (references && references.length > 0)) && getReferencesPages().map((pageRefs, pageIdx) => {
                const pageId = `daftar-pustaka-${pageIdx + 1}`;
                
                // Calculate absolute index offset of references for IEEE style numbering
                let globalIndexOffset = 0;
                const refPages = getReferencesPages();
                for (let p = 0; p < pageIdx; p++) {
                  globalIndexOffset += refPages[p].length;
                }
                
                return (
                  <div key={pageId} className={`a4-page relative ${getPagePrintClass(pageId)}`} id={`page-${pageId}`}>
                    <div className="page-content border border-dashed border-indigo-500/10 text-justify flex flex-col justify-between">
                      <div className="flex flex-col flex-1">
                        {pageIdx === 0 && renderHeading(1, "DAFTAR PUSTAKA")}
                        
                        <div className="space-y-3 flex-1">
                          {pageRefs.map((ref, refIdx) => {
                            const globalIdx = globalIndexOffset + refIdx;
                            return (
                              <div 
                                key={ref.id} 
                                className="text-[12pt] leading-normal text-justify"
                                style={{
                                  paddingLeft: refStyle === 'apa' ? '1.25cm' : '0.8cm',
                                  textIndent: refStyle === 'apa' ? '-1.25cm' : '-0.8cm'
                                }}
                              >
                                {refStyle === 'apa' ? (
                                  <span dangerouslySetInnerHTML={{ __html: formatRefAPA(ref) }} />
                                ) : (
                                  <span>
                                    <span style={{ display: 'inline-block', minWidth: '0.8cm' }}>[{globalIdx + 1}]</span>
                                    <span dangerouslySetInnerHTML={{ __html: formatRefIEEE(ref) }} />
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className={getPageNumberClass(pageId)}>{getPageNumber(pageId)}</div>
                  </div>
                );
              })}

            </div>
          </div>
        </main>
      </div>

      <DraftManager
        show={showDraftManager}
        draftsList={draftsList}
        loadingDrafts={loadingDrafts}
        draftSearch={draftSearch}
        saveFilename={saveFilename}
        onClose={() => setShowDraftManager(false)}
        onSearchChange={setDraftSearch}
        onRefresh={fetchDraftsList}
        onImportDocx={handleDocxImport}
        onOpenNewDraftChooser={() => setShowNewDraftChooser(true)}
        onLoadDraft={handleLoadDraftDB}
        onDeleteDraft={handleDeleteDraftDB}
      />

      <NewDraftChooser
        show={showNewDraftChooser}
        onClose={() => setShowNewDraftChooser(false)}
        onCreateTemplate={() => {
          setShowNewDraftChooser(false);
          setShowDraftManager(false);
          handleCreateNewBlankDraft();
        }}
        onCreateBlank={() => {
          setShowNewDraftChooser(false);
          setShowDraftManager(false);
          handleCreateBlankDocument();
        }}
        onCreateWithOutline={() => {
          setShowNewDraftChooser(false);
          setShowDraftManager(false);
          setShowOutlineBuilder(true);
        }}
        onImportDocx={(event) => {
          setShowNewDraftChooser(false);
          setShowDraftManager(false);
          handleDocxImport(event);
        }}
      />
      <DraftListModal
        show={showDraftsModal}
        loadingDrafts={loadingDrafts}
        draftsList={draftsList}
        onClose={() => setShowDraftsModal(false)}
        onLoadDraft={handleLoadDraftDB}
        onDeleteDraft={handleDeleteDraftDB}
      />
      <DownloadModal
        show={showDownloadModal}
        format={downloadFormat}
        range={downloadRange}
        split={downloadSplit}
        selectedSections={selectedDownloadSections}
        sectionGroups={SECTION_GROUPS}
        layout={layout}
        babTitles={babTitles}
        onClose={() => setShowDownloadModal(false)}
        onFormatChange={setDownloadFormat}
        onRangeChange={setDownloadRange}
        onSplitChange={setDownloadSplit}
        onSelectedSectionsChange={setSelectedDownloadSections}
        onStartExport={handleStartExport}
      />

      <AiPromptModal
        show={showAiPromptModal}
        target={aiPromptTarget}
        promptInput={aiPromptInput}
        onPromptInputChange={setAiPromptInput}
        onClose={closeAiPromptModal}
        onGenerateDirect={() => generateAiPromptTarget('')}
        onGenerateWithPrompt={() => generateAiPromptTarget(aiPromptInput)}
      />

      <ToastNotification toast={toast} />
      <WelcomeModal
        show={showWelcomeModal}
        hasLocalDraft={hasLocalDraft}
        loadingDrafts={loadingDrafts}
        draftsList={draftsList}
        onClose={() => setShowWelcomeModal(false)}
        onCreateTemplate={handleCreateNewBlankDraft}
        onCreateBlank={handleCreateBlankDocument}
        onOpenOutline={() => setShowOutlineBuilder(true)}
        onImportDocx={handleDocxImport}
        onLoadDraft={handleLoadDraftDB}
        onDeleteDraft={handleDeleteDraftDB}
      />

      <OutlineBuilderModal
        show={showOutlineBuilder}
        outlineText={outlineText}
        onOutlineTextChange={setOutlineText}
        onClose={() => setShowOutlineBuilder(false)}
        onCreate={handleCreateOutlineDocument}
      />
    </>
  );
}
