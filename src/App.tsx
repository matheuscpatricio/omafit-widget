import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './components/LandingPage';
const WidgetPage = lazy(() => import('./components/WidgetPage').then((m) => ({ default: m.WidgetPage })));
import { ShoeARWidgetPage } from './components/ShoeARWidgetPage';
import { AuthForm } from './components/AuthForm';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { ContactPage } from './components/ContactPage';
import { supabase } from './lib/supabase';

const DashboardPage = lazy(() => import('./components/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AdvancedAnalytics = lazy(() => import('./components/AdvancedAnalytics').then(m => ({ default: m.AdvancedAnalytics })));
const ShopifyConfigPage = lazy(() => import('./components/ShopifyConfigPage').then(m => ({ default: m.ShopifyConfigPage })));
const WidgetGeneratorPage = lazy(() => import('./components/WidgetGeneratorPage').then(m => ({ default: m.WidgetGeneratorPage })));
const AccountSettingsPage = lazy(() => import('./components/AccountSettingsPage').then(m => ({ default: m.AccountSettingsPage })));
const SizeChartManagerNew = lazy(() => import('./components/SizeChartManagerNew').then(m => ({ default: m.SizeChartManagerNew })));
const FeedbackPage = lazy(() => import('./components/FeedbackPage').then(m => ({ default: m.FeedbackPage })));
const CollectionsPage = lazy(() => import('./components/CollectionsPage'));
const PricingPage = lazy(() => import('./components/PricingPage').then(m => ({ default: m.PricingPage })));

function DashboardWrapper() {
  const navigate = useNavigate();

  return (
    <Layout onNavigate={navigate}>
      <DashboardPage />
    </Layout>
  );
}

function LandingPageWrapper() {
  const navigate = useNavigate();

  return (
    <LandingPage
      onGetStarted={(priceId) => {
        if (priceId === 'free') {
          window.open('https://apps.shopify.com/omafit', '_blank');
          return;
        }
        if (priceId) {
          navigate(`/auth?mode=register&priceId=${priceId}`);
        } else {
          navigate('/auth?mode=register');
        }
      }}
      onLogin={() => navigate('/auth?mode=login')}
    />
  );
}

function AuthWrapper() {
  return (
    <PublicRoute>
      <AuthForm />
    </PublicRoute>
  );
}

function OAuthRedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleOAuthRedirect = async () => {
      const hash = location.hash;

      if (hash && hash.includes('access_token')) {
        console.log('OAuth callback detectado, processando...');

        try {
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            console.error('Erro ao obter sessão:', error);
            navigate('/auth?mode=login&error=auth_failed');
            return;
          }

          if (data?.session) {
            console.log('Sessão OAuth válida, redirecionando para dashboard...');
            navigate('/dashboard', { replace: true });
          } else {
            console.log('Nenhuma sessão encontrada');
            navigate('/auth?mode=login', { replace: true });
          }
        } catch (err) {
          console.error('Erro no callback OAuth:', err);
          navigate('/auth?mode=login&error=callback_failed', { replace: true });
        }
      }
    };

    handleOAuthRedirect();
  }, [location, navigate]);

  return null;
}

function App() {
  return (
    <Router>
      <OAuthRedirectHandler />
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#810707]" /></div>}>
      <Routes>
        <Route path="/" element={<LandingPageWrapper />} />
        <Route path="/auth" element={<AuthWrapper />} />
        <Route path="/privacidade" element={<PrivacyPolicyPage />} />
        <Route path="/contato" element={<ContactPage />} />
        <Route
          path="/pricing"
          element={
            <ProtectedRoute>
              <PricingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardWrapper />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <Layout onNavigate={(path: string) => {}}><AdvancedAnalytics /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/cadastro-loja"
          element={
            <ProtectedRoute>
              <Layout onNavigate={(path: string) => {}}><ShopifyConfigPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/widget-generator"
          element={
            <ProtectedRoute>
              <Layout onNavigate={(path: string) => {}}><WidgetGeneratorPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/size-chart"
          element={
            <ProtectedRoute>
              <Layout onNavigate={(path: string) => {}}><SizeChartManagerNew /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/collections"
          element={
            <ProtectedRoute>
              <Layout onNavigate={(path: string) => {}}><CollectionsPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback"
          element={
            <ProtectedRoute>
              <Layout onNavigate={(path: string) => {}}><FeedbackPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Layout onNavigate={(path: string) => {}}><AccountSettingsPage /></Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/widget"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen bg-white flex items-center justify-center p-6">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-[#810707]" />
                    <p className="text-sm text-gray-600">A preparar provador…</p>
                  </div>
                </div>
              }
            >
              <WidgetPage />
            </Suspense>
          }
        />
        <Route path="/widget-shoes" element={<ShoeARWidgetPage />} />
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
