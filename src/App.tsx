import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './components/LandingPage';
import { DashboardPage } from './components/DashboardPage';
import { AdvancedAnalytics } from './components/AdvancedAnalytics';
import { ShopifyConfigPage } from './components/ShopifyConfigPage';
import { WidgetGeneratorPage } from './components/WidgetGeneratorPage';
import { AccountSettingsPage } from './components/AccountSettingsPage';
import { SizeChartManager } from './components/SizeChartManager';
import { WidgetPage } from './components/WidgetPage';
import { AuthForm } from './components/AuthForm';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicRoute } from './components/PublicRoute';

function DashboardWrapper() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'analytics':
        return <AdvancedAnalytics />;
      case 'shopify':
        return <ShopifyConfigPage />;
      case 'widget':
        return <WidgetGeneratorPage />;
      case 'size-chart':
        return <SizeChartManager />;
      case 'account':
        return <AccountSettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function LandingPageWrapper() {
  const navigate = useNavigate();

  return (
    <LandingPage
      onGetStarted={(priceId) => {
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

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPageWrapper />} />
        <Route path="/auth" element={<AuthWrapper />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardWrapper />
            </ProtectedRoute>
          }
        />
        <Route path="/widget" element={<WidgetPage />} />
      </Routes>
    </Router>
  );
}

export default App;
