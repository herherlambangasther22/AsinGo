/**
 * AsinGo API & Real-time Connection Configuration
 *
 * Mendukung akses multi-perangkat lintas jaringan secara realtime:
 * 1. Di lingkungan hosting sendiri/Cloud Run/Localhost: memakai endpoint server internal /api
 * 2. Di Vercel (static deployment): dapat menyambung ke server backend sentral via VITE_API_URL
 *    atau menggunakan custom backend URL yang disimpan di browser/localStorage
 * 3. Dilengkapi mekanisme auto-reconnect SSE + polling fallback berkala
 */

const STORAGE_KEY_CUSTOM_API = 'asingo_custom_api_url';

export function getBaseApiUrl(): string {
  // 1. Cek konfigurasi runtime environment Vite
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl && typeof envApiUrl === 'string' && envApiUrl.trim().length > 0) {
    return envApiUrl.trim().replace(/\/+$/, '');
  }

  // 2. Cek apakah ada custom backend URL yang diatur user di pengaturan
  try {
    const savedCustomUrl = localStorage.getItem(STORAGE_KEY_CUSTOM_API);
    if (savedCustomUrl && savedCustomUrl.trim().length > 0) {
      return savedCustomUrl.trim().replace(/\/+$/, '');
    }
  } catch {}

  // 3. Default: relative URL sama dengan domain origin saat ini
  return '';
}

export function setCustomApiUrl(url: string) {
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_API);
    } else {
      localStorage.setItem(STORAGE_KEY_CUSTOM_API, url.trim().replace(/\/+$/, ''));
    }
  } catch {}
}

export function buildApiUrl(path: string): string {
  const base = getBaseApiUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${cleanPath}` : cleanPath;
}
