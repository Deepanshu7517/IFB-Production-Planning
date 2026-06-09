type AppConfig = {
  API_URL?: string;
};

declare global {
  interface Window {
    APP_CONFIG?: AppConfig;
  }
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const resolveApiOrigin = () => {
  // 1. If an explicit override is provided in the config, use it.
  if (window.APP_CONFIG?.API_URL) {
    return trimTrailingSlash(window.APP_CONFIG.API_URL);
  }

  // 2. Get the hostname from the browser
  const host = window.location.hostname;

  // 3. For Tauri or strictly local environments, use 'localhost'.
  // Otherwise, use the actual hostname (which allows your network IP to work).
  const apiHost = 
    host === "tauri.localhost" || host === "127.0.0.1" 
      ? "localhost" 
      : host;

  return `${window.location.protocol === "https:" ? "https" : "http"}://${apiHost}:5001`;
};
// const resolveApiOrigin = () => {
//   if (window.APP_CONFIG?.API_URL) {
//     return trimTrailingSlash(window.APP_CONFIG.API_URL);
//   }

//   const host = window.location.hostname;
//   const apiHost =
//     host === "tauri.localhost" || host === "127.0.0.1" || host === "0.0.0.0"
//       ? "localhost"
//       : host || "localhost";

//   return `${window.location.protocol === "https:" ? "https" : "http"}://${apiHost}:5001`;
// };

export const API_ORIGIN = resolveApiOrigin();
export const API_BASE = `${API_ORIGIN}/api`;
export const API_HEALTH_URL = `${API_ORIGIN}/health`;

export async function readJsonResponse<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Server returned a non-JSON response (${response.status}).`);
  }
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  return error instanceof Error ? error.message : fallback;
}
