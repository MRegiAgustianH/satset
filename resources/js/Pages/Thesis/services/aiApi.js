import { getCsrfToken, jsonHeaders } from '../utils/http';

const geminiHeaders = (apiKey) => ({
  ...jsonHeaders(),
  'X-Gemini-Key': apiKey,
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

export const recommendTitlesRequest = (apiKey, { fakultas, prodi, topik }) => fetch('/thesis/recommend-titles', {
  method: 'POST',
  headers: geminiHeaders(apiKey),
  credentials: 'same-origin',
  body: JSON.stringify({
    fakultas,
    prodi,
    topik,
  }),
});

export const searchCitationRequest = (apiKey, { query, yearStart, yearEnd }) => fetch('/thesis/search-citation', {
  method: 'POST',
  headers: geminiHeaders(apiKey),
  credentials: 'same-origin',
  body: JSON.stringify({
    query,
    year_start: yearStart,
    year_end: yearEnd,
  }),
});

export const generateSectionRequest = (apiKey, payload) => fetch('/thesis/generate', {
  method: 'POST',
  headers: geminiHeaders(apiKey),
  credentials: 'same-origin',
  body: JSON.stringify(payload),
});
