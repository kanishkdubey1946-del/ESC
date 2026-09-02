import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import RequireAuth from './auth/RequireAuth';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardLayout = lazy(() => import('./pages/DashboardLayout'));

function App() {
  return (
    <AuthProvider><BrowserRouter>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
            Loading COMET Civic...
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter></AuthProvider>
  );
}

export default App;
