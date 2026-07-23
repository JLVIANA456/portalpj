/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PJUser, Invoice } from './types';
import { initDB, getInvoices } from './lib/db';
import LoginForm from './components/LoginForm';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import BulkUploadView from './components/BulkUploadView';
import HistoryView from './components/HistoryView';
import ReportsView from './components/ReportsView';
import SuperAdminView from './components/SuperAdminView';
import CobrancasView from './components/CobrancasView';
import ClientesView from './components/ClientesView';
import ConciliacaoView from './components/ConciliacaoView';
import ContasPagarView from './components/ContasPagarView';
import ContasReceberView from './components/ContasReceberView';
import NovoLancamentoView from './components/NovoLancamentoView';
import NovoRecebimentoView from './components/NovoRecebimentoView';
import CadastroSimplesView from './components/CadastroSimplesView';
import FinanceiroView from './components/FinanceiroView';
import EnviarNotasView from './components/EnviarNotasView';
import EmissorNacionalModule from './components/emissor/Notadomilhão';
import PortalNacionalModule from './components/emissor/PortalNacionalModule';
import WhatsappView from './components/whatsapp/WhatsappView';
import { Menu, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ToastProvider } from './lib/toast';

export default function App() {
  // Otimização: Lê a sessão sincronicamente na inicialização do estado
  // Isso impede que a tela de login pisque rapidamente ao dar F5
  const [currentUser, setCurrentUser] = useState<PJUser | null>(() => {
    const savedUser = localStorage.getItem('portal_pj_session');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error('Erro de parse de sessão salva', e);
        return null;
      }
    }
    return null;
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('portal_pj_sidebar_collapsed') === 'true';
  });
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('portal_pj_theme') === 'dark';
  });

  const handleToggleCollapse = () => {
    setSidebarCollapsed(prev => {
      const nextVal = !prev;
      localStorage.setItem('portal_pj_sidebar_collapsed', String(nextVal));
      return nextVal;
    });
  };

  // Initialize DB and fetch invoices on start
  useEffect(() => {
    initDB();
    getInvoices().then(setInvoices);
  }, []);

  // Theme observer
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('portal_pj_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('portal_pj_theme', 'light');
    }
  }, [isDarkMode]);

  const handleLogin = (user: PJUser) => {
    setCurrentUser(user);
    localStorage.setItem('portal_pj_session', JSON.stringify(user));
    // Reset tab to dashboard on login
    setCurrentTab('dashboard');
    // Reload database invoices
    getInvoices().then(setInvoices);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('portal_pj_session');
  };

  const handleRefreshInvoices = () => {
    getInvoices().then(setInvoices);
  };

  // Safe wrapper to prevent infinite rendering dependency changes
  const changeTab = (tab: string) => {
    setCurrentTab(tab);
  };

  if (!currentUser) {
    return <LoginForm onLoginSuccess={handleLogin} />;
  }

  if (currentTab === 'emissor_nacional') {
    return (
      <ToastProvider>
        <EmissorNacionalModule
          user={currentUser}
          onExit={() => changeTab('dashboard')}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />
      </ToastProvider>
    );
  }

  if (currentTab === 'portal_nacional') {
    return (
      <ToastProvider>
        <PortalNacionalModule
          user={currentUser}
          onExit={(tab) => changeTab(typeof tab === 'string' ? tab : 'dashboard')}
          onLogout={handleLogout}
          isDarkMode={isDarkMode}
          onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        />
      </ToastProvider>
    );
  }

  // Active view helper selection
  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardView
            user={currentUser}
            invoices={invoices}
            onChangeTab={changeTab}
          />
        );
      case 'enviar_nota':
        return (
          <BulkUploadView
            user={currentUser}
            onUploadSuccess={() => {
              handleRefreshInvoices();
              changeTab('historico');
            }}
          />
        );
      case 'historico':
        return (
          <HistoryView
            user={currentUser}
            invoices={invoices}
            onUpdateInvoice={handleRefreshInvoices}
          />
        );
      case 'relatorios':
        return (
          <ReportsView
            user={currentUser}
            invoices={invoices}
          />
        );
      case 'super_admin':
        return <SuperAdminView user={currentUser} />;
      case 'cobrancas':
        return <CobrancasView user={currentUser} />;
      case 'clientes':
        return <ClientesView user={currentUser} />;
      case 'conciliacao':
        return <ConciliacaoView user={currentUser} />;
      case 'financeiro':
        return <FinanceiroView user={currentUser} />;
      case 'contas_pagar':
        return <ContasPagarView user={currentUser} onNavigate={changeTab} />;
      case 'contas_receber':
        return <ContasReceberView user={currentUser} onNavigate={changeTab} />;
      case 'novo_lancamento':
        return <NovoLancamentoView user={currentUser} />;
      case 'novo_recebimento':
        return <NovoRecebimentoView user={currentUser} />;
      case 'cadastro_categoria':
        return <CadastroSimplesView user={currentUser} tipo="categoria" />;
      case 'cadastro_centro_custo':
        return <CadastroSimplesView user={currentUser} tipo="centro_custo" />;
      case 'enviar_notas_email':
        return <EnviarNotasView user={currentUser} />;
      case 'whatsapp':
        return <WhatsappView user={currentUser} />;
      default:
        return <DashboardView user={currentUser} invoices={invoices} onChangeTab={changeTab} />;
    }
  };

  return (
    <ToastProvider>
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300" id="main-portal-container">
      {/* Dynamic Sidebar Component */}
      <Sidebar
        user={currentUser}
        currentTab={currentTab}
        onChangeTab={changeTab}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content Area Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Dynamic Nav Header Bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs z-20 flex-shrink-0 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              id="hamburger-menu-btn"
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 lg:hidden cursor-pointer"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>

          </div>

          <div className="flex items-center gap-4">
            {/* Quick alert notifications or state message */}
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-bold text-slate-700">{currentUser.companyName}</span>
              <span className="block text-[10px] text-slate-400">CNPJ: {currentUser.cnpj}</span>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
              title={isDarkMode ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span className="font-semibold text-slate-600 dark:text-slate-300 select-none">Ativo</span>
            </div>
          </div>
        </header>

        {/* Action Workspace Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto px-6 py-6 md:px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>

      </div>
    </div>
    </ToastProvider>
  );
}
