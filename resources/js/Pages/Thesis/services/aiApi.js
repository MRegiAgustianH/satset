import { getCsrfToken } from '../utils/http';

const geminiHeaders = (apiKey) => ({
  'Content-Type': 'application/json',
  'X-Gemini-Key': apiKey,
});

export const parseGuideRequest = (formData) => fetch('/thesis/parse-guide', {
  method: 'POST',
  headers: {
    Accept: 'application/json',
    'X-XSRF-TOKEN': getCsrfToken(),
  },
  body: formData,
});

export const recommendTitlesRequest = (apiKey, { fakultas, prodi, topik }) => fetch('/thesis/recommend-titles', {
  method: 'POST',
  headers: geminiHeaders(apiKey),
  body: JSON.stringify({
    fakultas,
    prodi,
    topik,
  }),
});

export const searchCitationRequest = (apiKey, { query, yearStart, yearEnd }) => fetch('/thesis/search-citation', {
  method: 'POST',
  headers: geminiHeaders(apiKey),
  body: JSON.stringify({
    query,
    year_start: yearStart,
    year_end: yearEnd,
  }),
});

export const generateSectionRequest = (apiKey, payload) => fetch('/thesis/generate', {
  method: 'POST',
  headers: geminiHeaders(apiKey),
  body: JSON.stringify(payload),
});
