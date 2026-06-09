import '../env.js'; // ensures dotenv runs before anything else
import FtpSrv from 'ftp-srv';
import * as ftp from 'basic-ftp';
import fs from 'fs';
import path from 'path';
import os from 'os';

const APP_DATA = path.join(os.homedir(), 'AppData', 'Local', 'IFBDashboard');
export const STORAGE_PATH = process.pkg
  ? path.join(APP_DATA, 'ftp-storage')
  : path.join(process.cwd(), 'ftp-storage');

export const TEMP_PATH = process.pkg
  ? path.join(APP_DATA, 'ftp-temp')
  : path.join(process.cwd(), 'ftp-temp');

// export const STORAGE_PATH = process.pkg
//   ? path.join(path.dirname(process.execPath), 'ftp-storage')
//   : path.join(process.cwd(), 'ftp-storage');

// export const TEMP_PATH = process.pkg
//   ? path.join(path.dirname(process.execPath), 'ftp-temp')
//   : path.join(process.cwd(), 'ftp-temp');

if (!fs.existsSync(STORAGE_PATH)) fs.mkdirSync(STORAGE_PATH, { recursive: true });
if (!fs.existsSync(TEMP_PATH)) fs.mkdirSync(TEMP_PATH, { recursive: true });

const normalizeHost = (host, fallback = '127.0.0.1') => {
  const value = String(host || '').trim();
  if (!value || value === '0.0.0.0' || value === '::') return fallback;
  return value;
};

// Read credentials at call time, not at import time
const getFtpConfig = () => {
  const parsedPort = Number.parseInt(process.env.FTP_PORT, 10);
  const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 21;

  return {
    port,
    user: process.env.FTP_USER || 'ifbftpuser',
    pass: process.env.FTP_PASS || 'ifb@ftp2026',
    bindHost: process.env.FTP_BIND_HOST || '0.0.0.0',
    advertisedHost: normalizeHost(process.env.FTP_PASV_URL || process.env.FTP_HOST),
    connectHost: normalizeHost(process.env.FTP_CONNECT_HOST || process.env.FTP_CLIENT_HOST || process.env.FTP_HOST),
  };
};
let ftpInstance = null;

// export function startFtpServer() {
//   if (ftpInstance) {
//     console.log("⚠️ FTP already running");
//     return ftpInstance;
//   }

//   const { port, user, pass } = getFtpConfig();

//   const ftpServer = new FtpSrv({
//     url: `ftp://0.0.0.0:${port}`,
//     anonymous: false,
//     pasv_min: 1024,
//     pasv_max: 1048,
//     pasv_url: process.env.FTP_HOST || "192.168.1.51",
//   });

//   ftpServer.on('login', ({ username, password }, resolve, reject) => {
//     if (username === user && password === pass) {
//       resolve({ root: STORAGE_PATH });
//     } else {
//       reject(new Error('Invalid FTP credentials'));
//     }
//   });

//   ftpServer.listen()
//     .then(() => console.log(`🚀 FTP Server running on port ${port}`))
//     .catch(err => console.error('FTP Server error:', err.message));

//   ftpInstance = ftpServer;
//   return ftpServer;
// }
export function startFtpServer() {
  if (ftpInstance) {
    console.log("⚠️ FTP already running");
    return ftpInstance;
  }

  const { port, user, pass, bindHost, advertisedHost } = getFtpConfig();

  const ftpServer = new FtpSrv({
    url: `ftp://${bindHost}:${port}`,
    anonymous: false,
    pasv_min: 1024,
    pasv_max: 1048,
    pasv_url: advertisedHost,
  });

  // PREVENTS NODE.JS FROM CRASHING (Fixes "Aw Snap")
  ftpServer.on('client-error', (event = {}) => {
    const error = event.error || event;
    console.error(`[FTP Client Error]: ${error?.message || error}`);
  });

  ftpServer.on('server-error', (event = {}) => {
    const error = event.error || event;
    console.error(`[FTP Server Error]: ${error?.message || error}`);
  });

  ftpServer.on('login', ({ username, password }, resolve, reject) => {
    if (username === user && password === pass) {
      resolve({ root: STORAGE_PATH });
    } else {
      reject(new Error('Invalid FTP credentials'));
    }
  });

  ftpServer.listen()
    .then(() => console.log(`🚀 FTP Server running on port ${port}`))
    .catch(err => {
      ftpInstance = null;
      console.error('FTP Server startup error:', err.message);
    });

  ftpInstance = ftpServer;
  return ftpServer;
}
// export async function getFtpClient() {
//   const { port, user, pass } = getFtpConfig();
//   const client = new ftp.Client(30000);
//   await client.access({
//     host: '127.0.0.1',
//     port,
//     user,
//     password: pass,
//     secure: false,
//   });
//   return client;
// }
export async function getFtpClient() {
  const { port, user, pass, connectHost } = getFtpConfig();
  const client = new ftp.Client(30000);

  await client.access({
    host: connectHost,
    port,
    user,
    password: pass,
    secure: false,
  });
  return client;
}
// export async function uploadToFtp(localFilePath, remoteFileName) {
//   const client = await getFtpClient();
//   try {
//     await client.uploadFrom(localFilePath, remoteFileName);
//   } finally {
//     client.close();
//   }
// }
export async function uploadToFtp(localFilePath, remoteFileName) {
  const client = await getFtpClient();
  try {
    await client.uploadFrom(localFilePath, remoteFileName);
  } catch (error) {
    console.error(`[FTP] Failed to upload ${remoteFileName}:`, error.message);
    throw error; // Re-throw so the HTTP route knows it failed
  } finally {
    client.close();
  }
}
export async function downloadFromFtp(remoteFileName, localFilePath) {
  const client = await getFtpClient();
  try {
    await client.downloadTo(localFilePath, remoteFileName);
    return true;
  } catch {
    return false;
  } finally {
    client.close();
  }
}

export async function ftpFileExists(remoteFileName) {
  const client = await getFtpClient();
  try {
    const list = await client.list();
    return list.some(f => f.name === remoteFileName);
  } catch {
    return false;
  } finally {
    client.close();
  }
}

export function cleanupTemp(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch { /* silent */ }
}
