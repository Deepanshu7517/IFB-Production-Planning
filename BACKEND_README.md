# IFB Production Planning - Backend

A Node.js/Express backend server for IFB production planning, featuring REST APIs, real-time FTP file monitoring, MongoDB database integration, and WebSocket support.

## 🚀 Overview

This backend service powers the IFB Production Planning application with:
- **RESTful APIs** for authentication, production planning, and data management
- **FTP Server** for automated file uploads and monitoring
- **Real-time File Watching** for BOM (Bill of Materials) processing
- **MongoDB Integration** for persistent data storage
- **JWT Authentication** for secure API access
- **WebSocket Support** for real-time updates

## 📋 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.22
- **Database**: MongoDB 8.8.1
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **File Processing**: XLSX 0.18.5, Multer 2.1.1
- **FTP**: FTP-SRV 4.6.3, Basic-FTP 5.2.1
- **Real-time**: Socket.io 4.8.1
- **File Monitoring**: Chokidar 5.0.0
- **Image Management**: Cloudinary 2.5.1
- **Security**: Bcryptjs 2.4.3

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.js                 # Main Express app setup
│   ├── env.js                   # Environment configuration
│   ├── controllers/             # Business logic handlers
│   │   ├── auth.controller.js
│   │   ├── dailyEntry.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── group.controller.js
│   │   ├── message.controller.js
│   │   └── productionPlan.controller.js
│   ├── routes/                  # API endpoint definitions
│   │   ├── auth.route.js
│   │   ├── dashboard.route.js
│   │   ├── group.route.js
│   │   ├── master.route.js
│   │   ├── message.route.js
│   │   ├── productionAuth.route.js
│   │   └── productionPlan.route.js
│   ├── models/                  # MongoDB data models
│   │   ├── group.model.js
│   │   ├── master.model.js
│   │   ├── message.model.js
│   │   ├── productionPlan.model.js
│   │   └── user.model.js
│   ├── middleware/              # Express middleware
│   ├── lib/                     # Utility libraries
│   │   ├── db.js               # Database connections
│   │   ├── ftp.js              # FTP server setup
│   │   └── folderWatcher.js    # File monitoring
│   └── seeds/                   # Database seeding
├── dist/                        # Compiled output
├── public/                      # Static files / frontend build
├── ftp-storage/                 # FTP upload storage
├── .env                         # Environment variables
├── package.json                 # Dependencies
└── package-lock.json
```

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Deepanshu7517/IFB-Production-Planning.git
   cd IFB-Production-Planning/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create or update `.env` file:
   ```env
   # Database
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?appName=Cluster0
   LOCAL_DB=mongodb://127.0.0.1:27017/ifb
   
   # Server
   PORT=5001
   HOST=0.0.0.0
   NETWORK_IP=192.168.1.11
   
   # JWT
   JWT_SECRET=your_secret_key_here
   NODE_ENV=development
   
   # Cloudinary (Image uploads)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   
   # FTP Server
   FTP_PORT=2121
   FTP_USER=ifbftpuser
   FTP_PASS=ifb@ftp2026
   FTP_HOST=0.0.0.0
   ```

## 📦 Available Scripts

```bash
# Development with auto-reload
npm run dev

# Production start
npm start

# Build standalone binary
npm run build:binary

# Bundle with frontend
npm run bundle

# Seed master data
npm run seed:masters
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### Production Planning
- `GET /api/production-plans` - Fetch all production plans
- `POST /api/production-plans` - Create new production plan
- `PUT /api/production-plans/:id` - Update production plan
- `DELETE /api/production-plans/:id` - Delete production plan

### Groups & Masters
- `GET /api/groups` - Fetch all groups
- `POST /api/groups` - Create group
- `GET /api/masters` - Fetch master data
- `POST /api/masters` - Create master entry

### Dashboard
- `GET /api/dashboard/*` - Various dashboard analytics endpoints

### Production Auth
- `POST /api/production-auth/login` - Production user login
- `POST /api/production-auth/verify` - Verify production user

### File Monitoring
- `GET /api/bom-watcher/status` - Check BOM processing status

### Messages
- `GET /api/messages` - Fetch messages
- `POST /api/messages` - Send message

### System Health
- `GET /health` - Server health check

## 🗄️ Database Models

### User
- `email` - User email (unique)
- `password` - Hashed password
- `role` - User role

### ProductionPlan
- `planName` - Name of the production plan
- `startDate`, `endDate` - Plan timeline
- `status` - Current status
- `items` - Array of production items
- `createdBy` - Reference to user
- `timestamps` - Auto-generated creation/update times

### Master
- Contains master data for production parameters
- Includes groups, categories, and configuration

### Group
- `groupName` - Name of the group
- `description` - Group description
- `members` - Array of user references

### Message
- `sender` - Reference to user
- `content` - Message text
- `timestamp` - Message creation time

## 🚀 FTP Server

The backend includes a built-in FTP server for automated file uploads:

**Credentials** (from .env):
- Username: `ifbftpuser`
- Password: `ifb@ftp2026`
- Port: `2121`
- Host: `0.0.0.0` (accessible on network)

**Upload Directory**: `backend/ftp-storage/`

## 📁 File Watching

The application monitors a watch folder for BOM file changes using Chokidar:

- Automatically detects new/modified Excel files
- Processes BOMs for production planning
- Stores processing results for retrieval via API

**Status Endpoint**: `GET /api/bom-watcher/status`

## 🔐 Authentication

Uses JWT (JSON Web Tokens) with:
- `JWT_SECRET` for token signing
- Token expiration configured in controllers
- Protected routes via middleware validation

## 🌐 CORS Configuration

Configured to accept requests from:
- Tauri desktop applications
- Local development servers
- Configured network IPs
- Production URLs (via environment)

## 📦 Deployment

### Standalone Binary
Generate a Windows executable:
```bash
npm run build:binary
```

This creates `dist/index.cjs` and bundles all required assets.

### Docker
(Optional - can be added based on needs)

### Server Deployment
1. Install Node.js 18+
2. Set up MongoDB connection
3. Configure `.env` with production values
4. Install dependencies: `npm install --production`
5. Start server: `npm start`

## 🛠️ Development

### Adding New Routes
1. Create controller in `src/controllers/`
2. Define routes in `src/routes/`
3. Create MongoDB model in `src/models/` if needed
4. Add middleware for authentication if required

### Database Connection
- Cloud MongoDB via `MONGODB_URI`
- Local MongoDB via `LOCAL_DB`
- Auto-connects to both on startup

## 🐛 Troubleshooting

**Connection Issues**
- Verify MongoDB connection string in `.env`
- Check firewall rules for PORT and FTP_PORT
- Ensure NETWORK_IP matches your machine IP

**FTP Issues**
- Verify FTP_USER and FTP_PASS credentials
- Check if port 2121 is available
- Ensure `ftp-storage/` directory has write permissions

**File Watching**
- Check folder permissions for watched directory
- Verify file format is supported (Excel/XLSX)
- Check `/api/bom-watcher/status` for processing errors

## 📚 Additional Resources

- [Express Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Socket.io Guide](https://socket.io/docs/)
- [JWT Guide](https://jwt.io/)

## 📄 License

ISC

## 👤 Author

Deepanshu Dagar (deepudagar90_db_user)

---

**Last Updated**: May 2026
