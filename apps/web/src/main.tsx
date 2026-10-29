import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@fontsource/cormorant-garamond/300.css';
import '@fontsource/cormorant-garamond/300-italic.css';
import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource-variable/inter';
import './styles/app.css';
import { Layout } from './components/Layout';
import { Spinner } from './components/Bits';
import { SessionProvider, useMeQuery } from './lib/session';
import { ToastProvider } from './lib/toast';
import { LoginPage } from './pages/Login';
import { LandingPage } from './pages/Landing';
import { TodayPage } from './pages/Today';
import { DomHomePage } from './pages/DomHome';
import { ReviewPage } from './pages/Review';
import { SubDetailPage } from './pages/SubDetail';
import { JournalPage } from './pages/Journal';
import { RewardsPage } from './pages/Rewards';
import { ProfilePage } from './pages/Profile';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 10_000 } },
});

function App() {
  const me = useMeQuery();
  if (me.isLoading) return <Spinner />;
  if (!me.data) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }
  const isDom = me.data.user.role === 'dom';
  return (
    <SessionProvider me={me.data}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={isDom ? <DomHomePage /> : <TodayPage />} />
          {isDom && <Route path="revisar" element={<ReviewPage />} />}
          {isDom && <Route path="sums/:id" element={<SubDetailPage />} />}
          <Route path="journal" element={<JournalPage />} />
          <Route path="recompensas" element={<RewardsPage />} />
          <Route path="perfil" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SessionProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
