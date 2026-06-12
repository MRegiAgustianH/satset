import { getCsrfToken } from '../utils/http';

const jsonHeaders = () => ({
  'Content-Type': 'application/json',
  'X-CSRF-TOKEN': getCsrfToken(),
});

export const saveDraftRequest = (filename, draftData) => fetch('/thesis/save', {
  method: 'POST',
  headers: jsonHeaders(),
  body: JSON.stringify({
    filename,
    draft_data: draftData,
  }),
});

export const listDraftsRequest = () => fetch('/thesis/list');

export const loadDraftRequest = (id, source) => fetch('/thesis/load', {
  method: 'POST',
  headers: jsonHeaders(),
  body: JSON.stringify({
    id: String(id),
    source,
  }),
});

export const deleteDraftRequest = (id, source) => fetch('/thesis/delete', {
  method: 'POST',
  headers: jsonHeaders(),
  body: JSON.stringify({
    id: String(id),
    source,
  }),
});
