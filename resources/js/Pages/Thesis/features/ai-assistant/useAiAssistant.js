import { useState } from 'react';
import { recommendTitlesRequest, searchCitationRequest, generateSectionRequest, aiChatRequest } from '../../services/aiApi';

const hasContent = (section) => Boolean(section?.content && section.content.trim().length > 0);

const buildOrderedTextSections = (babSections) => Object.entries(babSections || {}).flatMap(([babKey, sections]) => (
  (sections || [])
    .filter((section) => section.type === 'text' && section.headingLevel > 0)
    .map((section) => ({ ...section, babKey }))
));

export const useAiAssistant = ({
  cover,
  tables,
  scholarYearStart,
  scholarYearEnd,
  backgroundStyle,
  legacySectionKeyMapping,
  updateSectionContentById,
  setBabSections,
  saveLocalDraft,
  showToast,
  babTitles,
  babSections,
}) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');
  const [aiInputs, setAiInputs] = useState({
    fakultas: 'Teknologi Informasi',
    prodi: 'Sistem Informasi',
    topik: 'Platform Pembelajaran E-Learning',
  });
  const [suggestedTitles, setSuggestedTitles] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showAiPromptModal, setShowAiPromptModal] = useState(false);
  const [aiPromptTarget, setAiPromptTarget] = useState(null);
  const [aiPromptInput, setAiPromptInput] = useState('');
  const [generatingSection, setGeneratingSection] = useState(null);
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Halo, saya siap membantu menyusun laporan/skripsi. Tanyakan struktur bab, metode, UML/ERD/BPMN, atau cara menanggapi revisi dosen.' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Scholar search states
  const [scholarQuery, setScholarQuery] = useState('');
  const [scholarYearStartVal, setScholarYearStart] = useState('2021');
  const [scholarYearEndVal, setScholarYearEnd] = useState('2026');
  const [searchingScholar, setSearchingScholar] = useState(false);
  const [scholarResults, setScholarResults] = useState([]);

  const handleApiKeyChange = (val) => {
    setApiKey(val);
    localStorage.setItem('gemini_api_key', val);
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

  const applySuggestedTitle = (item, setCover) => {
    const newTitle = item.judul.toUpperCase();
    setCover((p) => {
      const updated = { ...p, title: newTitle };
      saveLocalDraft({ cover: updated });
      return updated;
    });
    setAiInputs((p) => ({ ...p, topik: item.judul }));
    showToast('Judul rekomendasi diterapkan.');
  };

  const handleScholarSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
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
        yearStart: scholarYearStartVal,
        yearEnd: scholarYearEndVal,
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

  const openAiPromptModal = (target) => {
    setAiPromptInput('');
    setAiPromptTarget(target);
    setShowAiPromptModal(true);
  };

  const closeAiPromptModal = () => {
    setShowAiPromptModal(false);
    setAiPromptTarget(null);
  };

  const getSequenceBlocker = (babKey, sectionId) => {
    const orderedSections = buildOrderedTextSections(babSections);
    const targetIndex = orderedSections.findIndex((section) => section.babKey === babKey && section.id === sectionId);
    if (targetIndex <= 0) return null;
    return orderedSections.slice(0, targetIndex).find((section) => !hasContent(section)) || null;
  };

  const ensureGenerationOrder = (babKey, sectionId, displayTitle) => {
    const blocker = getSequenceBlocker(babKey, sectionId);
    if (!blocker) return true;
    showToast(`Tidak bisa generate "${displayTitle}" dulu. Isi/generate bagian sebelumnya: "${blocker.title}".`, true);
    return false;
  };

  const generateAiPromptTarget = (prompt = '') => {
    const target = aiPromptTarget;
    closeAiPromptModal();
    if (!target) return;
    if (!ensureGenerationOrder(target.babKey, target.id, target.displayTitle)) return;
    const finalPrompt = target.mode === 'revision'
      ? `Revisi berdasarkan komentar dosen berikut. Pertahankan kesinambungan dengan sub-bab sebelumnya, perbaiki substansi akademik, dan tulis ulang bagian ini secara rapi: ${prompt || 'Perbaiki kualitas akademik, fokus masalah, alur logika, dan ketepatan istilah.'}`
      : prompt;
    if (target.legacyKey) {
      handleAIGenerateSection(target.legacyKey, target.displayTitle, finalPrompt);
    } else {
      handleAIGenerateDynamic(target.babKey, target.id, target.displayTitle, finalPrompt);
    }
  };

  const handleAIGenerateSection = async (sectionKey, displayTitle, additionalPrompt = '') => {
    if (!apiKey) {
      showToast('Masukkan API Key Gemini terlebih dahulu!', true);
      return;
    }
    const legacyToId = Object.entries(legacySectionKeyMapping).find(([, v]) => v === sectionKey);
    const trackingId = legacyToId ? legacyToId[0] : sectionKey;
    const legacyTarget = buildOrderedTextSections(babSections).find((section) => section.id === trackingId);
    if (legacyTarget && !ensureGenerationOrder(legacyTarget.babKey, legacyTarget.id, displayTitle)) return;
    setGeneratingSection(trackingId);
    showToast(`Menghubungi Gemini untuk draf ${displayTitle}...`);

    try {
      const response = await generateSectionRequest(apiKey, {
        title: cover.title,
        section: sectionKey,
        fakultas: aiInputs.fakultas,
        prodi: aiInputs.prodi,
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
          setBabSections((prev) => {
            const currentList = prev[babKey] || [];
            const idx = currentList.findIndex((sec) => sec.id === blockId);
            if (idx === -1) return prev;

            const newBlock = {
              id: 'sec_tab_' + Date.now(),
              type: 'table',
              title: tableData.title || 'Tabel Hasil Generasi',
              page: 1,
              headers: tableData.headers || 'No, Kolom 1, Kolom 2',
              rowsText: Array.isArray(tableData.rows) ? tableData.rows.map((r) => r.join(', ')).join('\n') : '',
              rows: tableData.rows || [['1', 'Data A', 'Data B']],
            };

            const updatedList = [...currentList];
            updatedList.splice(idx + 1, 0, newBlock);

            const updated = {
              ...prev,
              [babKey]: updatedList,
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

  const handleAIGenerateDynamic = async (babKey, sectionId, sectionTitle, additionalPrompt = '') => {
    if (!apiKey) {
      showToast('Masukkan API Key Gemini terlebih dahulu!', true);
      return;
    }
    if (!ensureGenerationOrder(babKey, sectionId, sectionTitle)) return;
    setGeneratingSection(sectionId);
    showToast(`Menghubungi Gemini untuk draf "${sectionTitle}"...`);

    const currentBab = babTitles[babKey];
    const babContext = currentBab ? `${currentBab.prefix} (${currentBab.title})` : `BAB ${babKey.replace('bab', '')}`;

    try {
      const response = await generateSectionRequest(apiKey, {
        title: cover.title,
        section: '__dynamic__',
        section_title: sectionTitle,
        bab_context: babContext,
        fakultas: aiInputs.fakultas,
        prodi: aiInputs.prodi,
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
      showToast(`Konten "${sectionTitle}" berhasil ditulis oleh AI!`);
    } catch (e) {
      showToast('Koneksi terganggu: ' + e.message, true);
    } finally {
      setGeneratingSection(null);
    }
  };

  const sendChatMessage = async () => {
    const message = chatInput.trim();
    if (!message || chatLoading) return;
    if (!apiKey) {
      showToast('Masukkan API Key Gemini terlebih dahulu!', true);
      return;
    }

    const nextMessages = [...chatMessages, { role: 'user', content: message }];
    setChatMessages(nextMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await aiChatRequest(apiKey, {
        message,
        history: nextMessages.slice(-8),
        title: cover.title,
        fakultas: aiInputs.fakultas,
        prodi: aiInputs.prodi,
        topik: aiInputs.topik,
      });
      const data = await response.json();
      if (!response.ok) {
        showToast(data.error || 'Gagal menghubungi AI Chat.', true);
        return;
      }
      setChatMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
    } catch (e) {
      showToast('Koneksi terganggu: ' + e.message, true);
    } finally {
      setChatLoading(false);
    }
  };

  return {
    apiKey,
    aiInputs,
    setAiInputs,
    suggestedTitles,
    loadingSuggestions,
    showAiPromptModal,
    aiPromptTarget,
    aiPromptInput,
    setAiPromptInput,
    generatingSection,
    chatMessages,
    chatInput,
    setChatInput,
    chatLoading,
    scholarQuery,
    setScholarQuery,
    scholarYearStartVal,
    setScholarYearStart,
    scholarYearEndVal,
    setScholarYearEnd,
    searchingScholar,
    scholarResults,
    setScholarResults,
    handleApiKeyChange,
    fetchTitleRecommendations,
    applySuggestedTitle,
    handleScholarSearch,
    openAiPromptModal,
    closeAiPromptModal,
    generateAiPromptTarget,
    sendChatMessage,
  };
};
