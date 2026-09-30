import axios from 'axios';
import Cookies from 'js-cookie';
import { API_URL } from '@/lib/api';

// True when running as the installed app (home-screen / desktop install)
// rather than in a browser tab.
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    // iOS Safari home-screen apps
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function saveToken(token: string) {
  localStorage.setItem('token', token);
  Cookies.set('token', token, { sameSite: 'strict', secure: location.protocol === 'https:' });
}

export function clearToken() {
  localStorage.removeItem('token');
  Cookies.remove('token');
}

// True only when the server rejected the session (401). Network failures
// (offline, flaky mobile data) must NOT sign the user out.
export function isAuthRejection(err: unknown): boolean {
  return axios.isAxiosError(err) && err.response?.status === 401;
}

// The user identity carried in the stored token, if it hasn't expired yet.
// Used to keep the app usable when the session can't be checked (offline).
export function userFromStoredToken(): { id: number; name: string; role_id: number } | null {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp || payload.exp * 1000 < Date.now()) return null;
    return { id: payload.user_id, name: payload.name, role_id: payload.role_id };
  } catch {
    return null;
  }
}

// Swaps the stored token for a fresh one (same kind: web or app) and returns
// the user. Throws if the token is missing, expired or the account is inactive.
export async function refreshSession() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No session');
  const res = await axios.post(`${API_URL}/api/refresh`, null, {
    headers: { Authorization: `Bearer ${token}` },
  });
  saveToken(res.data.access_token);
  return res.data.user;
}
