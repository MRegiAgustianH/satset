import { getCsrfToken, jsonHeaders } from '../utils/http';

const aiHeaders = (aiConfig = {}) => ({
  ...jsonHeaders(),
  'X-AI-Key': aiConfig.apiKey || '',
  'X-Gemini-Key': aiConfig.apiKey || '',
  'X-AI-Provider': aiConfig.provider || 'gemini',
  'X-AI-Model': aiConfig.model || '',
  'X-AI-Base-URL': aiConfig.baseUrl || '',
});

const formHeaders = () => {
  const token = getCsrfToken();
  const headers = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (token) {
    headers['X-CSRF-TOKEN'] = token;
  }

  return headers;
};

export const parseGuideRequest = (formData) => fetch('/thesis/parse-guide', {
  method: 'POST',
  headers: formHeaders(),
  credentials: 'same-origin',
  body: formData,
});

export const recommendTitlesRequest = (aiConfig, { fakultas, prodi, topik }) => fetch('/thesis/recommend-titles', {
  method: 'POST',
  headers: aiHeaders(aiConfig),
  credentials: 'same-origin',
  body: JSON.stringify({
    fakultas,
    prodi,
    topik,
  }),
});

export const searchCitationRequest = (aiConfig, { query, yearStart, yearEnd }) => fetch('/thesis/search-citation', {
  method: 'POST',
  headers: aiHeaders(aiConfig),
  credentials: 'same-origin',
  body: JSON.stringify({
    query,
    year_start: yearStart,
    year_end: yearEnd,
  }),
});

export const generateSectionRequest = (aiConfig, payload) => fetch('/thesis/generate', {
  method: 'POST',
  headers: aiHeaders(aiConfig),
  credentials: 'same-origin',
  body: JSON.stringify(payload),
});

export const aiChatRequest = (aiConfig, payload) => fetch('/thesis/ai-chat', {
  method: 'POST',
  headers: aiHeaders(aiConfig),
  credentials: 'same-origin',
  body: JSON.stringify(payload),
});

export const testAiConnectionRequest = (aiConfig) => fetch('/thesis/test-ai', {
  method: 'POST',
  headers: aiHeaders(aiConfig),
  credentials: 'same-origin',
  body: JSON.stringify({}),
});
