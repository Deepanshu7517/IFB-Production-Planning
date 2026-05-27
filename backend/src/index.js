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
import authRoutes from './routes/auth.route.js';
import groupRoutes from './routes/group.route.js';
import masterRoutes from './routes/master.route.js';
import messageRoutes from './routes/message.route.js';
import productionPlanRoutes from './routes/productionPlan.route.js';
import productionAuthRoutes from './routes/productionAuth.route.js';
import { connectDB, connectLocalhostDB } from './lib/db.js';

const app = express();

startFtpServer();
startFolderWatcher();

app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

connectDB();
connectLocalhostDB();

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

let frontendPath;
if (process.env.FRONTEND_PATH) {
  frontendPath = process.env.FRONTEND_PATH;
} else if (process.pkg) {
  frontendPath = path.join(path.dirname(process.execPath), 'public');
} else {
  frontendPath = path.join(process.cwd(), 'public');
}

console.log('Serving frontend from:', frontendPath);
app.use(express.static(frontendPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});
const PORT = Number(process.env.PORT || 5001);
const NETWORK_IP = (process.env.NETWORK_IP || '127.0.0.1').trim();
const HOST = NETWORK_IP; // bind directly to this IP

app.listen(PORT, HOST, () => {
  const base = `http://${NETWORK_IP}:${PORT}`;
  console.log(`Server running on ${base}`);
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Network: ${base}`);
});
// const PORT = process.env.PORT || 5001;
// const HOST = process.env.HOST || '0.0.0.0';

// app.listen(PORT, HOST, () => {
//   console.log(`Server running on http://${HOST}:${PORT}`);
//   console.log(`Local:   http://localhost:${PORT}`);
//   console.log(`Network: http://<machine-ip>:${PORT}`);
// });

export default app;