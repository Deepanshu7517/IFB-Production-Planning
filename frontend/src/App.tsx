import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import AppLayout from "./pages/layout";
import SignIn from "./pages/auth/signIn";
import ProductionPlanningDashboard from "./pages/page/production-planning/production-planning-dashboard";
import SCMDashboard from "./pages/page/scm-dashboard/scm-dashboard";
import InventoryDashboard from "./pages/page/inventory-dashboard";
import ManpowerPlanningDashboard from "./pages/page/manpower-planning-dashboard";
import Masters from "./pages/page/masters/masters";
import WeeklyEntry from "./pages/page/weekly-entry.tsx/entry";
import ProductionCalendar from "./pages/page/production-calendar/production-calendar";

// ─── Protected Route ──────────────────────────────────────────────────────────
// Checks localStorage for 'production_user'.
// If not found → redirect to sign-in page.
// If found     → render the child page normally.
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = localStorage.getItem('production_user');
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const routes = createBrowserRouter([
  // ── Public ──────────────────────────────────────────────────────────────────
  {
    path: '/',
    element: <SignIn />,
  },

  // ── Protected ────────────────────────────────────────────────────────────────
  {
    path: '/production-planning',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ProductionPlanningDashboard />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/scm',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <SCMDashboard />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <InventoryDashboard />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/manpower-planning',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ManpowerPlanningDashboard />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/masters',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <Masters />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/weekly-entry',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <WeeklyEntry />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/production-calendar',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <ProductionCalendar />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
]);

const App = () => {
  return <RouterProvider router={routes} />;
};

export default App;