// Backend connection configuration
// Defaults to http://localhost:3000 if running client on Vite (:5173),
// or connects to same-origin if served directly from backend.
export const BACKEND_URL: string =
  (import.meta.env.VITE_BACKEND_URL as string) ||
  (window.location.port === '3000'
    ? ''
    : `${window.location.protocol}//${window.location.hostname}:3000`);
