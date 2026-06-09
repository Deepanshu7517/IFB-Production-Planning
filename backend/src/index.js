// // import express from 'express';
// // import cors from 'cors';
// // import dotenv from 'dotenv';
// // import path from 'path';

// // dotenv.config();

// // import authRoutes from './routes/auth.route.js';
// // import groupRoutes from './routes/group.route.js';
// // import masterRoutes from './routes/master.route.js';
// // import messageRoutes from './routes/message.route.js';
// // import productionPlanRoutes from './routes/productionPlan.route.js';
// // import productionAuthRoutes from './routes/productionAuth.route.js';
// // import { connectDB, connectLocalhostDB } from './lib/db.js';

// // const app = express();

// // app.use(cors({ origin: '*', credentials: true }));
// // app.use(express.json());
// // app.use(express.urlencoded({ extended: true }));

// // connectDB();
// // connectLocalhostDB();

// // // API routes first
// // app.use('/api/auth', authRoutes);
// // app.use('/api/groups', groupRoutes);
// // app.use('/api/masters', masterRoutes);
// // app.use('/api/messages', messageRoutes);
// // app.use('/api/production-plans', productionPlanRoutes);
// // app.use('/api/production-auth', productionAuthRoutes);

// // app.get('/health', (req, res) => {
// //   res.status(200).json({
// //     success: true,
// //     message: 'Server is running',
// //     timestamp: new Date().toISOString()
// //   });
// // });

// // // Static files — after API routes, before catch-all
// // let frontendPath;
// // if (process.env.FRONTEND_PATH) {
// //   frontendPath = process.env.FRONTEND_PATH;
// // } else if (process.pkg) {
// //   frontendPath = path.join(path.dirname(process.execPath), 'public');
// // } else {
// //   frontendPath = path.join(process.cwd(), 'public');
// // }

// // console.log('Serving frontend from:', frontendPath);
// // app.use(express.static(frontendPath));

// // // Catch-all — serve React for any non-API route
// // app.get('*', (req, res) => {
// //   res.sendFile(path.join(frontendPath, 'index.html'));
// // });

// // // Error handler
// // app.use((err, req, res, next) => {
// //   console.error('Error:', err.stack);
// //   res.status(err.status || 500).json({
// //     success: false,
// //     message: err.message || 'Internal server error',
// //   });
// // });

// // const PORT = process.env.PORT || 5001;
// // app.listen(PORT, '0.0.0.0', () => {
// //   console.log(`Server running on http://0.0.0.0:${PORT}`);
// //   console.log(`Local access: http://localhost:${PORT}`);
// //   console.log(`Network access: http://${process.env.NETWORK_IP}:${PORT}`);
// // });

// // export default app;

// // import express from 'express';
// // import cors from 'cors';
// // import dotenv from 'dotenv';
// // import path from 'path';

// // dotenv.config();

// // import authRoutes from './routes/auth.route.js';
// // import groupRoutes from './routes/group.route.js';
// // import masterRoutes from './routes/master.route.js';
// // import messageRoutes from './routes/message.route.js';
// // import productionPlanRoutes from './routes/productionPlan.route.js';
// // import productionAuthRoutes from './routes/productionAuth.route.js';
// // import { connectDB, connectLocalhostDB } from './lib/db.js';

// // const app = express();

// // // app.use(cors({ origin: '*', credentials: true }));
// // app.use(cors({
// //     origin: function (origin, callback) {
// //         // Allow Tauri, localhost, and LAN IPs
// //         callback(null, true); 
// //     },
// //     credentials: true
// // }));
// // app.use(express.json());
// // app.use(express.urlencoded({ extended: true }));

// // connectDB();
// // connectLocalhostDB();

// // app.use('/api/auth', authRoutes);
// // app.use('/api/groups', groupRoutes);
// // app.use('/api/masters', masterRoutes);
// // app.use('/api/messages', messageRoutes);
// // app.use('/api/production-plans', productionPlanRoutes);
// // app.use('/api/production-auth', productionAuthRoutes);

// // app.get('/health', (req, res) => {
// //   res.status(200).json({
// //     success: true,
// //     message: 'Server is running',
// //     timestamp: new Date().toISOString()
// //   });
// // });

// // let frontendPath;
// // if (process.env.FRONTEND_PATH) {
// //   frontendPath = process.env.FRONTEND_PATH;
// // } else if (process.pkg) {
// //   frontendPath = path.join(path.dirname(process.execPath), 'public');
// // } else {
// //   frontendPath = path.join(process.cwd(), 'public');
// // }

// // console.log('Serving frontend from:', frontendPath);
// // app.use(express.static(frontendPath));

// // app.get('*', (req, res) => {
// //   res.sendFile(path.join(frontendPath, 'index.html'));
// // });

// // app.use((err, req, res, next) => {
// //   console.error('Error:', err.stack);
// //   res.status(err.status || 500).json({
// //     success: false,
// //     message: err.message || 'Internal server error',
// //   });
// // });

// // const PORT = process.env.PORT || 5001;
// // const HOST = process.env.HOST || '0.0.0.0';

// // app.listen(PORT, HOST, () => {
// //   console.log(`Server running on http://${HOST}:${PORT}`);
// //   console.log(`Local:   http://localhost:${PORT}`);
// //   console.log(`Network: http://<machine-ip>:${PORT}`);
// // });

// // export default app;


// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import path from 'path';
// import { startFtpServer } from './lib/ftp.js';
// import authRoutes from './routes/auth.route.js';
// import groupRoutes from './routes/group.route.js';
// import masterRoutes from './routes/master.route.js';
// import messageRoutes from './routes/message.route.js';
// import productionPlanRoutes from './routes/productionPlan.route.js';
// import productionAuthRoutes from './routes/productionAuth.route.js';
// import { connectDB, connectLocalhostDB } from './lib/db.js';

// dotenv.config(); // Must be first
// const app = express();

// // Start FTP server alongside Express
// startFtpServer();

// app.use(cors({
//   origin: function (origin, callback) {
//     callback(null, true);
//   },
//   credentials: true
// }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// connectDB();
// connectLocalhostDB();

// app.use('/api/auth', authRoutes);
// app.use('/api/groups', groupRoutes);
// app.use('/api/masters', masterRoutes);
// app.use('/api/messages', messageRoutes);
// app.use('/api/production-plans', productionPlanRoutes);
// app.use('/api/production-auth', productionAuthRoutes);

// app.get('/health', (req, res) => {
//   res.status(200).json({
//     success: true,
//     message: 'Server is running',
//     timestamp: new Date().toISOString()
//   });
// });

// let frontendPath;
// if (process.env.FRONTEND_PATH) {
//   frontendPath = process.env.FRONTEND_PATH;
// } else if (process.pkg) {
//   frontendPath = path.join(path.dirname(process.execPath), 'public');
// } else {
//   frontendPath = path.join(process.cwd(), 'public');
// }

// console.log('Serving frontend from:', frontendPath);
// app.use(express.static(frontendPath));

// app.get('*', (req, res) => {
//   res.sendFile(path.join(frontendPath, 'index.html'));
// });

// app.use((err, req, res, next) => {
//   console.error('Error:', err.stack);
//   res.status(err.status || 500).json({
//     success: false,
//     message: err.message || 'Internal server error',
//   });
// });

// const PORT = process.env.PORT || 5001;
// const HOST = process.env.HOST || '0.0.0.0';

// app.listen(PORT, HOST, () => {
//   console.log(`Server running on http://${HOST}:${PORT}`);
//   console.log(`Local:   http://localhost:${PORT}`);
//   console.log(`Network: http://<machine-ip>:${PORT}`);
// });

// export default app;

import dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: process.env.ENV_FILE_PATH || '.env' });
import express from 'express';
import cors from 'cors';
import path from 'path';
import { startFtpServer } from './lib/ftp.js';
import { startFolderWatcher, WATCH_FOLDER, getLatestProcessingResult } from './lib/folderWatcher.js';
// import { startSapAutomator } from './lib/sapAutomator.js'; 
import authRoutes from './routes/auth.route.js';
import groupRoutes from './routes/group.route.js';
import masterRoutes from './routes/master.route.js';
import messageRoutes from './routes/message.route.js';
import productionPlanRoutes from './routes/productionPlan.route.js';
import productionAuthRoutes from './routes/productionAuth.route.js';
import { connectDB, waitForLocalhostDB } from './lib/db.js';
const app = express();

const startBackgroundService = (name, starter) => {
  try {
    return starter();
  } catch (error) {
    console.error(`[STARTUP] ${name} failed:`, error.message);
    return null;
  }
};

process.on('uncaughtException', (error) => {
  console.error('[PROCESS] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[PROCESS] Unhandled rejection:', reason);
});

startBackgroundService('FTP server', startFtpServer);
// startSapAutomator()
app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

connectDB();
waitForLocalhostDB().then((ready) => {
  if (!ready) {
    console.warn('[STARTUP] Local MongoDB is not ready yet. BOM watcher will retry files until the database is connected.');
  }
  startBackgroundService('BOM folder watcher', startFolderWatcher);
});

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/masters', masterRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/production-plans', productionPlanRoutes);
app.use('/api/production-auth', productionAuthRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// BOM watcher status — your senior can check this to see last processed file
app.get('/api/bom-watcher/status', (req, res) => {
  const result = getLatestProcessingResult();
  res.json({
    success:     true,
    watchFolder: WATCH_FOLDER,
    lastResult:  result,
  });
});

app.get('/api/runtime/status', (req, res) => {
  res.json({
    success: true,
    server: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeEnv: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
    services: {
      ftp: {
        enabled: true,
        port: Number(process.env.FTP_PORT || 21),
      },
      bomWatcher: {
        watchFolder: WATCH_FOLDER,
        lastResult: getLatestProcessingResult(),
      },
    },
  });
});

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

let frontendPath;
if (process.env.FRONTEND_PATH) {
  frontendPath = process.env.FRONTEND_PATH;
} else if (process.pkg) {
  frontendPath = path.join(path.dirname(process.execPath), 'public');
} else {
  frontendPath = path.join(process.cwd(), 'public');
    // frontendPath = path.join(process.cwd(), "..", "frontend", "dist");
}

console.log('Serving frontend from:', frontendPath);
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  const indexPath = path.join(frontendPath, 'index.html');
  res.sendFile(indexPath, (error) => {
    if (!error) return;
    res.status(404).send('Frontend build not found. Run the frontend build and copy it into the backend public folder.');
  });
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});
const PORT = Number(process.env.PORT || 5001);
const HOST = (process.env.HOST || process.env.NETWORK_IP || '0.0.0.0').trim();
const NETWORK_IP = (process.env.NETWORK_IP || '').trim();

const startHttpServer = (host) => {
  const server = app.listen(PORT, host, () => {
    const networkHost = NETWORK_IP && NETWORK_IP !== '0.0.0.0' ? NETWORK_IP : '<machine-ip>';
    console.log(`Server running on http://${host}:${PORT}`);
    console.log(`Local:   http://localhost:${PORT}`);
    console.log(`Network: http://${networkHost}:${PORT}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRNOTAVAIL' && host !== '0.0.0.0') {
      console.error(`[STARTUP] Cannot bind to ${host}:${PORT}. Falling back to 0.0.0.0.`);
      startHttpServer('0.0.0.0');
      return;
    }

    console.error(`[STARTUP] HTTP server failed on ${host}:${PORT}:`, error.message);
  });

  return server;
};

startHttpServer(HOST);
// const PORT = process.env.PORT || 5001;
// const HOST = process.env.HOST || '0.0.0.0';

// app.listen(PORT, HOST, () => {
//   console.log(`Server running on http://${HOST}:${PORT}`);
//   console.log(`Local:   http://localhost:${PORT}`);
//   console.log(`Network: http://<machine-ip>:${PORT}`);
// });

export default app;
