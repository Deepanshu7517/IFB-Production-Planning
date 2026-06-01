# IFB Production Planning - Frontend

A modern React-based dashboard application for production planning, inventory management, and supply chain optimization built with TypeScript, Vite, and Tailwind CSS.

## 🚀 Overview

The frontend provides a comprehensive web interface for:
- **Production Planning Dashboard** - Visual production schedules and planning
- **SCM Dashboard** - Supply Chain Management analytics
- **Inventory Management** - Real-time inventory tracking
- **Manpower Planning** - Resource allocation and workforce management
- **Masters Management** - Configuration and master data setup
- **Weekly Entry** - Data entry for weekly production metrics
- **Production Calendar** - Interactive production schedule calendar
- **Real-time Charts** - Data visualization with Recharts

## 📋 Tech Stack

- **Framework**: React 19.2.0
- **Language**: TypeScript 5.9.3
- **Build Tool**: Vite 7.2.4
- **Styling**: Tailwind CSS 4.1.18 + DaisyUI 5.5.18
- **UI Components**: Lucide React 0.563.0
- **HTTP Client**: Axios 1.13.5
- **State Management**: Zustand 5.0.11
- **Routing**: React Router DOM 7.13.0
- **Charts**: Recharts 3.7.0
- **Icons**: React Icons 5.5.0
- **Linting**: ESLint 9.39.1
- **Desktop**: Tauri (Electron alternative)

## 📁 Project Structure

```
frontend/
├── src/
│   ├── App.tsx                          # Main router and app setup
│   ├── main.tsx                         # React entry point
│   ├── index.css                        # Global styles
│   ├── pages/                           # Page components
│   │   ├── layout.tsx                   # Main app layout
│   │   ├── auth/
│   │   │   └── signIn.tsx               # Sign-in page
│   │   └── page/
│   │       ├── production-planning/
│   │       │   └── production-planning-dashboard.tsx
│   │       ├── scm-dashboard/
│   │       │   └── scm-dashboard.tsx
│   │       ├── inventory-dashboard.tsx
│   │       ├── manpower-planning-dashboard.tsx
│   │       ├── masters/
│   │       │   └── masters.tsx
│   │       ├── weekly-entry.tsx/
│   │       │   └── entry.tsx
│   │       └── production-calendar/
│   │           └── production-calendar.tsx
│   ├── components/                      # Reusable components
│   ├── config/                          # Configuration files
│   ├── assets/                          # Static assets
│   └── lib/                             # Utility functions
├── public/                              # Static public files
├── src-tauri/                           # Tauri desktop app config
├── index.html                           # HTML entry point
├── vite.config.ts                       # Vite configuration
├── tsconfig.json                        # TypeScript config
├── eslint.config.js                     # ESLint rules
├── package.json                         # Dependencies
└── README.md
```

## 🔌 Routes & Pages

| Route | Component | Protected | Description |
|-------|-----------|-----------|-------------|
| `/` | SignIn | ❌ | User login page |
| `/production-planning` | ProductionPlanningDashboard | ✅ | Main production planning interface |
| `/scm` | SCMDashboard | ✅ | Supply chain management dashboard |
| `/inventory` | InventoryDashboard | ✅ | Inventory tracking & management |
| `/manpower-planning` | ManpowerPlanningDashboard | ✅ | Workforce & resource planning |
| `/masters` | Masters | ✅ | Master data configuration |
| `/weekly-entry` | WeeklyEntry | ✅ | Weekly production metrics entry |
| `/production-calendar` | ProductionCalendar | ✅ | Interactive calendar view |

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Deepanshu7517/IFB-Production-Planning.git
   cd IFB-Production-Planning/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure backend URL**
   Create or update `src/config/api.ts`:
   ```typescript
   const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
   export default API_BASE_URL;
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 📦 Available Scripts

```bash
# Development server with HMR
npm run dev

# Type-check and build
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint

# Tauri desktop app commands
npm run tauri dev      # Dev desktop app
npm run tauri build    # Build desktop executable
```

## 🔐 Authentication

### Protected Routes
All dashboard routes are protected using the `ProtectedRoute` component:

```typescript
const ProtectedRoute = ({ children }) => {
  const user = localStorage.getItem('production_user');
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};
```

**Storage Key**: `production_user` (localStorage)

### Login Flow
1. User enters credentials on `/` (SignIn page)
2. Credentials sent to `/api/auth/login` or `/api/production-auth/login`
3. JWT token stored in localStorage
4. User redirected to `/production-planning`
5. Protected routes accessible

## 🎨 Styling

### Tailwind CSS + DaisyUI
- **Utility-first CSS framework**: Tailwind CSS
- **Component library**: DaisyUI (pre-built accessible components)
- **Responsive design**: Mobile-first approach
- **Dark mode**: Built-in support via DaisyUI themes

### Using DaisyUI Components
```typescript
// Button
<button className="btn btn-primary">Click me</button>

// Card
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Card Title</h2>
  </div>
</div>

// Table
<table className="table">
  <thead>
    <tr>
      <th>Column</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data</td>
    </tr>
  </tbody>
</table>
```

## 📊 Data Visualization

### Recharts Integration
Multiple chart types for production analytics:

```typescript
import { LineChart, BarChart, AreaChart, PieChart } from 'recharts';

<LineChart width={600} height={400} data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Line type="monotone" dataKey="production" stroke="#8884d8" />
</LineChart>
```

## 🔄 API Integration

### Axios Setup
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### API Calls Example
```typescript
// Fetch production plans
const { data } = await api.get('/production-plans');

// Create new plan
const response = await api.post('/production-plans', {
  planName: 'Plan 2026',
  startDate: new Date(),
  status: 'active'
});

// Update plan
await api.put(`/production-plans/${id}`, updatedData);

// Delete plan
await api.delete(`/production-plans/${id}`);
```

## 🗂️ State Management with Zustand

Simple global state management using Zustand:

```typescript
import { create } from 'zustand';

export const useProductionStore = create((set) => ({
  plans: [],
  loading: false,
  
  fetchPlans: async () => {
    set({ loading: true });
    const data = await api.get('/production-plans');
    set({ plans: data, loading: false });
  },
  
  addPlan: (plan) => set((state) => ({
    plans: [...state.plans, plan]
  })),
}));

// Usage in components
const { plans, fetchPlans } = useProductionStore();
```

## 🖥️ Desktop Application (Tauri)

This frontend can be packaged as a desktop application using Tauri:

### Building Desktop App
```bash
npm run tauri dev      # Run in dev mode
npm run tauri build    # Create executable
```

**Output**: Standalone Windows executable in `src-tauri/target/release/`

### Tauri Features
- Native desktop app
- No Electron overhead
- Lightweight (~20MB vs 150MB for Electron)
- Full OS integration

## 🔍 Page Descriptions

### Production Planning Dashboard
- Visual production schedule
- Drag-and-drop task management
- Real-time status updates
- Gantt chart view

### SCM Dashboard
- Supplier management
- Order tracking
- Lead time analysis
- Performance metrics

### Inventory Dashboard
- Stock levels
- Reorder alerts
- Movement history
- Warehouse management

### Manpower Planning
- Resource allocation
- Shift management
- Skill matrix
- Workforce utilization

### Masters
- Configuration setup
- Master data entry
- Parameter management
- System settings

### Weekly Entry
- Data entry form
- Batch updates
- Validation checks
- Submission tracking

### Production Calendar
- Monthly/weekly views
- Color-coded events
- Drag-to-reschedule
- Conflict detection

## 🚀 Development Best Practices

### Component Structure
```typescript
import React from 'react';

interface ComponentProps {
  title: string;
  onAction: () => void;
}

const MyComponent: React.FC<ComponentProps> = ({ title, onAction }) => {
  return <div>{title}</div>;
};

export default MyComponent;
```

### Custom Hooks
```typescript
const useFetchData = (url: string) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    api.get(url).then(({ data }) => {
      setData(data);
      setLoading(false);
    });
  }, [url]);
  
  return { data, loading };
};
```

## 🧪 Type Safety

Fully typed with TypeScript:

```typescript
interface ProductionPlan {
  id: string;
  planName: string;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'completed';
  items: PlanItem[];
}

interface PlanItem {
  itemId: string;
  quantity: number;
  priority: number;
}
```

## 🐛 Troubleshooting

**CORS Errors**
- Backend CORS must allow frontend origin
- Check backend `.env` CORS configuration

**Authentication Issues**
- Verify `production_user` key in localStorage
- Check JWT token validity
- Clear localStorage and re-login

**Build Issues**
- Clear `node_modules` and `package-lock.json`
- Run `npm install` again
- Check Node.js version (18+ required)

**Tauri Build Errors**
- Install Rust toolchain
- Ensure Visual Studio Build Tools installed (Windows)
- Check `src-tauri` configuration

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS](https://tailwindcss.com/)
- [DaisyUI Components](https://daisyui.com/)
- [Recharts API](https://recharts.org/)
- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Tauri Documentation](https://tauri.app/)

## 📄 License

ISC

## 👤 Author

Deepanshu Dagar (deepudagar90_db_user)

---

**Last Updated**: May 2026
