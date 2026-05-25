// src/config/api.ts

// 1. Figure out the current host dynamically
let currentHost = window.location.hostname;

// 2. If running inside Tauri, force it to localhost
if (currentHost === 'tauri.localhost' || currentHost === '127.0.0.1') {
  currentHost = 'localhost';
}

// 3. Define the auto-detected base URL (assuming default port 5001)
const AUTO_DETECTED_URL = `http://${currentHost}:5001/api`;

// 4. Export the final API_BASE. 
// It checks if the client created an external config.js file first. 
// If not, it safely falls back to the auto-detected URL.
export const API_BASE = (window as any).APP_CONFIG?.API_URL 
  ? `${(window as any).APP_CONFIG.API_URL}/api` 
  : AUTO_DETECTED_URL;