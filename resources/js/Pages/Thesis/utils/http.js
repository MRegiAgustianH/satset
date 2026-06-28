export const getCsrfToken = () => {
  const token = document.querySelector('meta[name="csrf-token"]');
  if (token) return token.getAttribute('content');

  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);

  return '';
};

export const jsonHeaders = () => {
  const token = getCsrfToken();
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (token) {
    headers['X-CSRF-TOKEN'] = token;
  }

  return headers;
};

export const readJsonResponse = async (response) => {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    if (response.status === 419) {
      return {
        success: false,
        message: 'Sesi/CSRF token kedaluwarsa. Muat ulang halaman lalu coba simpan lagi.',
      };
    }

    return {
      success: false,
      message: `Server Laravel mengembalikan respons tidak valid (HTTP ${response.status}).`,
    };
  }
};

