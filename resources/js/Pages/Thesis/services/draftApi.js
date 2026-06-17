import { jsonHeaders } from '../utils/http';

const DIRECT_SAVE_LIMIT_BYTES = 2.5 * 1024 * 1024;
const CHUNK_SIZE = 512 * 1024;

export const slugifyDraftFilename = (filename = '') => {
  const slug = String(filename)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return slug || 'draft_skripsi';
};

export const getDraftPayloadSize = (draftData) => new Blob([JSON.stringify(draftData)]).size;

const createUploadId = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID().replace(/-/g, '');
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
};

const saveDraftDirectRequest = (filename, draftData) => fetch('/thesis/save', {
  method: 'POST',
  headers: jsonHeaders(),
  credentials: 'same-origin',
  body: JSON.stringify({
    filename,
    draft_data: draftData,
  }),
});

const saveDraftChunkedRequest = async (filename, payloadString, options = {}) => {
  const totalChunks = Math.ceil(payloadString.length / CHUNK_SIZE);
  const uploadId = createUploadId();
  let finalResponse = null;

  for (let index = 0; index < totalChunks; index += 1) {
    const chunk = payloadString.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
    finalResponse = await fetch('/thesis/save-chunk', {
      method: 'POST',
      headers: jsonHeaders(),
      credentials: 'same-origin',
      body: JSON.stringify({
        filename,
        upload_id: uploadId,
        chunk_index: index,
        total_chunks: totalChunks,
        chunk,
      }),
    });

    options.onProgress?.({
      mode: 'chunked',
      current: index + 1,
      total: totalChunks,
      percent: Math.round(((index + 1) / totalChunks) * 100),
    });

    if (!finalResponse.ok && index < totalChunks - 1) {
      return finalResponse;
    }
  }

  return finalResponse;
};

export const saveDraftRequest = async (filename, draftData, options = {}) => {
  const payloadString = JSON.stringify(draftData);
  const payloadBytes = new Blob([payloadString]).size;

  options.onStart?.({
    mode: payloadBytes > DIRECT_SAVE_LIMIT_BYTES ? 'chunked' : 'direct',
    bytes: payloadBytes,
    slug: slugifyDraftFilename(filename),
  });

  if (payloadBytes > DIRECT_SAVE_LIMIT_BYTES) {
    return saveDraftChunkedRequest(filename, payloadString, options);
  }

  return saveDraftDirectRequest(filename, draftData);
};

export const listDraftsRequest = () => fetch('/thesis/list', {
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  credentials: 'same-origin',
});

export const loadDraftRequest = (id, source) => fetch('/thesis/load', {
  method: 'POST',
  headers: jsonHeaders(),
  credentials: 'same-origin',
  body: JSON.stringify({
    id: String(id),
    source,
  }),
});

export const deleteDraftRequest = (id, source) => fetch('/thesis/delete', {
  method: 'POST',
  headers: jsonHeaders(),
  credentials: 'same-origin',
  body: JSON.stringify({
    id: String(id),
    source,
  }),
});
