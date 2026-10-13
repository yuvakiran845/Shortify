import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import AuthProvider from './context/AuthProvider';
import RequireAuth from './components/auth/RequireAuth';
import AdaptiveLayout from './components/app/AdaptiveLayout';
import AppLayout from './components/app/AppLayout';
import PublicLayout from './components/layout/PublicLayout';
import PageLoader from './components/ui/PageLoader';
import Toaster from './components/ui/Toaster';
import Landing from './pages/Landing';
import Shorten from './pages/Shorten';
import Dashboard from './pages/Dashboard';
import MyLinks from './pages/MyLinks';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';

// Loaded on demand: the QR library is only downloaded when someone opens /qr,
// keeping the landing page bundle small.
const QrGenerator = lazy(() => import('./pages/QrGenerator'));
// The charting library is only downloaded when someone opens Analytics.
const Analytics = lazy(() => import('./pages/Analytics'));
// The component style guide only exists in development builds.
const StyleGuide = import.meta.env.DEV ? lazy(() => import('./pages/StyleGuide')) : null;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public website: navbar + footer */}
          <Route element={<PublicLayout />}>
            <Route index element={<Landing />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            {StyleGuide && (
              <Route
                path="ui"
                element={
                  <Suspense fallback={null}>
                    <StyleGuide />
                  </Suspense>
                }
              />
            )}
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Tools anyone can use: inside the app when signed in, on the website otherwise */}
          <Route element={<AdaptiveLayout />}>
            <Route path="shorten" element={<Shorten />} />
            <Route
              path="qr"
              element={
                <Suspense fallback={<PageLoader label="Loading QR code generator…" />}>
                  <QrGenerator />
                </Suspense>
              }
            />
          </Route>

          {/* Signed-in app: sidebar layout, login required */}
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="links" element={<MyLinks />} />
              <Route
                path="analytics"
                element={
                  <Suspense fallback={<PageLoader label="Loading analytics…" />}>
                    <Analytics />
                  </Suspense>
                }
              />
            </Route>
          </Route>
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
