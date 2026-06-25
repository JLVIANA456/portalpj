/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { PJUser } from '../types';
import {
  Home,
  UploadCloud,
  History,
  BarChart3,
  LogOut,
  ShieldCheck,
  Building2,
  X,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Mail,
  Users,
  ArrowRightLeft,
  BanknoteArrowDown,
  BanknoteArrowUp,
  CircleDollarSign,
  Send,
  ReceiptText
} from 'lucide-react';


interface SidebarProps {
  user: PJUser;
  currentTab: string;
  onChangeTab: (tab: string) => void;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const WhatsappIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

export default function Sidebar({
  user,
  currentTab,
  onChangeTab,
  onLogout,
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse
}: SidebarProps) {
  const isAdmin = user.role === 'admin_tenant' || user.role === 'super_admin';
  const isSuperAdmin = user.role === 'super_admin';

  // Otimização: Evita recriar o array de navegação a cada render
  const menuItems = useMemo(() => [
    { id: 'dashboard', label: 'Visão Geral', icon: Home },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'whatsapp', label: 'WhatsApp', icon: WhatsappIcon },
    { id: 'emissor_nacional', label: 'Emissor de Notas (Nota do Milhão) SP', icon: ReceiptText },
    { id: 'portal_nacional', label: 'Portal Nacional', icon: Building2 },
    { id: 'financeiro', label: 'Financeiro', icon: CircleDollarSign },
    { id: 'contas_receber', label: 'Contas a Receber', icon: BanknoteArrowUp },
    { id: 'contas_pagar', label: 'Contas a Pagar', icon: BanknoteArrowDown },
    { id: 'conciliacao', label: 'Conciliação', icon: ArrowRightLeft },
    { id: 'cobrancas', label: 'Cobranças', icon: Mail },
    ...(isAdmin ? [{ id: 'enviar_notas_email', label: 'Enviar Notas', icon: Send }] : []),
    ...(isAdmin ? [] : [
      { id: 'enviar_nota', label: 'Enviar Nota', icon: UploadCloud }
    ]),
    { id: 'historico', label: isAdmin ? 'Gerenciar Notas' : 'Minhas Notas', icon: History },
    { id: 'relatorios', label: 'Gerar Relatórios', icon: BarChart3 },
    ...(isSuperAdmin ? [{ id: 'super_admin', label: 'Gestão de Empresas', icon: Landmark }] : [])
  ], [isAdmin, isSuperAdmin]);

  return (
    <>
      {/* Background overlay for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-950 text-slate-100 border-r border-slate-800 transition-all duration-300 lg:static lg:translate-x-0 ${isOpen ? 'translate-x-0 w-72' : '-translate-x-full'
          } ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}`}
      >
        {/* Header logo */}
        <div className={`flex h-16 items-center border-b border-slate-800 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-6'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent truncate">
                Portal PJ
              </span>
            </div>
          )}

          {isCollapsed && (
            <div className="hidden lg:flex items-center justify-center font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent" title="Portal PJ">
              P
            </div>
          )}

          {/* Mobile close button */}
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="lg:hidden p-1.5 text-slate-400 dark:text-slate-500 transition-colors hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Desktop collapse button toggle */}
          <button
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
            title={isCollapsed ? 'Expandir Menu' : 'Recolher Menu'}
            className="hidden lg:flex p-1.5 text-slate-400 dark:text-slate-500 transition-colors hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer animate-fade-in"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* User profile card */}
        <div className={`p-4 border-b border-slate-800 bg-slate-900/35 overflow-hidden ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-full bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-semibold text-sm flex-shrink-0"
              title={isCollapsed ? `${user.ownerName} (${user.companyName})` : undefined}
            >
              {isAdmin ? (
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              ) : (
                user.ownerName.charAt(0).toUpperCase()
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-slate-100">{user.ownerName}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 transition-colors truncate">{user.companyName}</p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="mt-3 flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase border ${
                user.role === 'super_admin'
                  ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                  : user.role === 'admin_tenant'
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin_tenant' ? 'Administração' : 'Prestador PJ'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors font-mono">
                {user.cnpj.slice(0, 10)}...
              </span>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 px-3 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => {
                  onChangeTab(item.id);
                  onClose();
                }}
                title={item.label}
                aria-label={item.label}
                className={`flex items-center rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ${isCollapsed
                    ? 'justify-center p-3 mx-auto w-12'
                    : 'w-full gap-3 px-3 py-3'
                  } ${isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'text-slate-400 dark:text-slate-500 transition-colors hover:bg-slate-900 hover:text-slate-100'
                  }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            id="logout-btn"
            title="Sair do Portal"
            aria-label="Sair do Portal"
            className={`flex items-center rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-950/20 hover:text-rose-300 transition-colors cursor-pointer ${isCollapsed
                ? 'justify-center p-3 mx-auto w-12'
                : 'w-full gap-3 px-3 py-2.5'
              }`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Sair do Portal</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
