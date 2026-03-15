import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './components/LandingPage';
import { DashboardPage } from './components/DashboardPage';
import { AdvancedAnalytics } from './components/AdvancedAnalytics';
import { ShopifyConfigPage } from './components/ShopifyConfigPage';
import { WidgetGeneratorPage } from './components/WidgetGeneratorPage';
import { AccountSettingsPage } from './components/AccountSettingsPage';
import { SizeChartManagerNew } from './components/SizeChartManagerNew';
import { WidgetPage } from './components/WidgetPage';
import { AuthForm } from './components/AuthForm';
import { FeedbackPage } from './components/FeedbackPage';
import CollectionsPage from './components/CollectionsPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { ContactPage } from './components/ContactPage';
import { PricingPage } from './components/PricingPage';
import { supabase } from './lib/supabase';

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
        <Route path="/widget" element={<WidgetPage />} />
      </Routes>
    </Router>
  );
}

export default App;
