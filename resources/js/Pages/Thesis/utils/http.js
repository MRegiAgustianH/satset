export const getCsrfToken = () => {
  const token = document.querySelector('meta[name="csrf-token"]');
  if (token) return token.getAttribute('content');

  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  if (match) return decodeURIComponent(match[1]);

  return '';
};
