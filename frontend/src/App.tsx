import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from './auth/AuthProvider';
import RequireAuth from './auth/RequireAuth';
import { AIStatus } from './components/ui/AIStatus';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const DashboardLayout = lazy(() => import('./pages/DashboardLayout'));
const LunarGravityDemo = lazy(() => import('./components/ui/lunar-gravity-card-demo'));

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthProvider><BrowserRouter>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#101114]">
            <AIStatus state="working" size={64} label="Opening your study space" />
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/demo/lunar-gravity" element={<LunarGravityDemo />} />
          <Route path="/dashboard" element={<RequireAuth><DashboardLayout /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </BrowserRouter></AuthProvider>
    </ThemeProvider>
  );
}

export default App;
