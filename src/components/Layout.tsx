import React, { useState } from 'react';
import { BarChart3, Settings, Code, Store, Zap, TrendingUp, Menu, X, LogOut, ChevronLeft, ChevronRight, CreditCard, Ruler, MessageSquare } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (path: string) => void;
}

export function Layout({ children, onNavigate }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/dashboard' },
    { id: 'analytics', label: 'Analytics Avançado', icon: TrendingUp, path: '/analytics' },
    { id: 'cadastro-loja', label: 'Cadastro de Loja', icon: Store, path: '/cadastro-loja' },
    { id: 'widget-generator', label: 'Gerador de Widget', icon: Code, path: '/widget-generator' },
    { id: 'size-chart', label: 'Tabela de Medidas', icon: Ruler, path: '/size-chart' },
    { id: 'feedback', label: 'Sugestões e Melhorias', icon: MessageSquare, path: '/feedback' },
    { id: 'account', label: 'Configurações da Conta', icon: CreditCard, path: '/account' },
  ];

  const handlePageChange = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const currentPath = window.location.pathname;

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-[#810707] p-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-[#810707]" />
          </div>
          <h1 className="admin-logo text-lg font-bold text-white">OMAFIT</h1>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-white p-2"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:sticky md:top-0
        bg-[#810707] shadow-lg
        transform transition-all duration-300 ease-in-out
        md:transform-none
        z-50
        h-screen
        flex flex-col
        ${
          mobileMenuOpen
            ? 'translate-x-0 w-64'
            : '-translate-x-full md:translate-x-0'
        }
        ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'}
      `}>
        <div className="p-6 hidden md:block relative">
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-[#810707]" />
            </div>
            {!sidebarCollapsed && (
              <h1 className="admin-logo text-xl font-bold text-white whitespace-nowrap">OMAFIT</h1>
            )}
          </div>
        </div>

        {/* Toggle Button - Outside header, fixed position */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden md:flex absolute top-8 -right-3 z-50 bg-white text-[#810707] hover:bg-gray-100 p-1.5 rounded-full shadow-lg border border-gray-200 transition-all"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <nav className="flex-1 mt-6 md:mt-0 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handlePageChange(item.path)}
                className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                  currentPath === item.path
                    ? 'bg-white text-[#810707] border-r-4 border-[#810707]'
                    : 'text-white hover:bg-red-800 hover:text-white'
                }`}
                title={sidebarCollapsed ? item.label : ''}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-red-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-3 text-white hover:bg-red-800 rounded-lg transition-colors"
            title={sidebarCollapsed ? 'Sair' : ''}
          >
            <LogOut className={`w-5 h-5 flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
          {!sidebarCollapsed && user && (
            <div className="mt-2 text-xs text-red-200 truncate">
              {user.email}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen md:min-h-0">
        <header className="bg-white shadow-sm border-b border-gray-200 hidden md:block">
          <div className="px-4 md:px-6 py-4">
            <h2 className="text-xl md:text-2xl font-semibold text-[#810707]">
              {currentPath === '/dashboard' ? 'Dashboard' :
               currentPath === '/analytics' ? 'Analytics Avançado' :
               currentPath === '/cadastro-loja' ? 'Cadastro de Loja' :
               currentPath === '/widget-generator' ? 'Gerador de Widget' :
               currentPath === '/size-chart' ? 'Tabela de Medidas' :
               currentPath === '/feedback' ? 'Sugestões e Melhorias' :
               currentPath === '/account' ? 'Configurações da Conta' : 'Omafit Admin'}
            </h2>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 bg-gray-50 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}