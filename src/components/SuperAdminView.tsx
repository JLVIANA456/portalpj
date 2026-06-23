/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Tenant, PJUser } from '../types';
import { getTenants, addTenant, getAllUsers, updateUserRole, updateUserTenant } from '../lib/db';
import {
  Building2, Plus, Copy, CheckCircle, Loader2,
  Users, Hash, ShieldCheck, Globe, Search,
  ShieldAlert, UserCheck, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SuperAdminViewProps {
  user: PJUser;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
  admin_tenant: { label: 'Administração', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
  pj: { label: 'Prestador PJ', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
};

export default function SuperAdminView({ user }: SuperAdminViewProps) {
  const [activeTab, setActiveTab] = useState<'empresas' | 'usuarios'>('empresas');

  // Empresas state
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Usuarios state
  const [allUsers, setAllUsers] = useState<(PJUser & { tenantName?: string })[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [search, setSearch] = useState('');
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [roleSuccess, setRoleSuccess] = useState<string | null>(null);
  const [updatingTenant, setUpdatingTenant] = useState<string | null>(null);
  const [tenantSuccess, setTenantSuccess] = useState<string | null>(null);

  const baseUrl = window.location.origin;

  useEffect(() => { loadTenants(); }, []);

  // FIX: recarrega usuários sempre que a aba ficar ativa, não só na primeira vez
  useEffect(() => {
    if (activeTab === 'usuarios') loadUsers();
  }, [activeTab]);

  const loadTenants = async () => {
    setLoadingTenants(true);
    setTenants(await getTenants());
    setLoadingTenants(false);
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    setAllUsers(await getAllUsers());
    setLoadingUsers(false);
  };

  const generateCode = (name: string) =>
    name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) + Math.floor(100 + Math.random() * 900);

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!formCode) setFormCode(generateCode(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formName.trim() || !formCode.trim()) { setError('Preencha o nome e o código.'); return; }
    if (tenants.some(t => t.code.toUpperCase() === formCode.toUpperCase())) {
      setError('Este código já está em uso. Escolha outro.'); return;
    }
    setSaving(true);
    try {
      const newTenant = await addTenant({ name: formName.trim(), code: formCode.trim().toUpperCase() });
      setTenants(prev => [...prev, newTenant]);
      setFormName(''); setFormCode(''); setShowForm(false);
    } catch {
      setError('Erro ao cadastrar empresa. Tente novamente.');
    } finally { setSaving(false); }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleRoleChange = async (userId: string, newRole: 'pj' | 'admin_tenant' | 'super_admin') => {
    setUpdatingRole(userId);
    const ok = await updateUserRole(userId, newRole);
    if (ok) {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setRoleSuccess(userId);
      setTimeout(() => setRoleSuccess(null), 2000);
    }
    setUpdatingRole(null);
  };

  const handleTenantChange = async (userId: string, newTenantId: string) => {
    setUpdatingTenant(userId);
    const newTenant = tenants.find(t => t.id === newTenantId);
    const ok = await updateUserTenant(userId, newTenantId);
    if (ok) {
      setAllUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, tenantId: newTenantId, tenantName: newTenant?.name || newTenantId } : u
      ));
      setTenantSuccess(userId);
      setTimeout(() => setTenantSuccess(null), 2000);
    }
    setUpdatingTenant(null);
  };

  const filteredUsers = allUsers.filter(u =>
    u.ownerName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.tenantName || '').toLowerCase().includes(search.toLowerCase())
  );

  const getInviteUrl = (code: string) => `${baseUrl}?convite=${code}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Painel Super Admin</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gerencie empresas e usuários do Portal PJ.</p>
        </div>
        {activeTab === 'empresas' && (
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl cursor-pointer transition-colors shadow-md shadow-indigo-600/20"
            id="btn-nova-empresa"
          >
            <Plus className="w-4 h-4" /> Nova Empresa
          </button>
        )}
      </div>

      {/* Super Admin badge */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-950/40 dark:to-indigo-950/40 border border-violet-200 dark:border-violet-800 rounded-2xl">
        <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-violet-900 dark:text-violet-200">Modo Super Admin — {user.ownerName}</p>
          <p className="text-xs text-violet-700 dark:text-violet-400">Você enxerga todos os tenants e usuários do sistema.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/60 rounded-xl w-fit">
        {([
          { key: 'empresas', label: 'Empresas', icon: Building2 },
          { key: 'usuarios', label: 'Usuários', icon: Users },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${activeTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: EMPRESAS */}
      {activeTab === 'empresas' && (
        <div className="space-y-4">
          <AnimatePresence>
            {showForm && (
              <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }} className="overflow-hidden">
                <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-4">
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">Cadastrar Nova Empresa Contratante</h2>
                  {error && <div className="bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 p-3 rounded-r-lg text-sm text-red-700 dark:text-red-400">{error}</div>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Nome da Empresa</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input id="tenant-name" type="text" placeholder="Ex: Agência XYZ" value={formName} onChange={e => handleNameChange(e.target.value)} className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Código de Convite (único)</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input id="tenant-code" type="text" placeholder="Ex: AGENCIA123" value={formCode} onChange={e => setFormCode(e.target.value.toUpperCase().replace(/\s/g, ''))} className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-950 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Gerado automaticamente. Pode editar.</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => { setShowForm(false); setError(''); }} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">Cancelar</button>
                    <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl cursor-pointer transition-colors disabled:opacity-60">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      {saving ? 'Salvando...' : 'Cadastrar Empresa'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {loadingTenants ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
          ) : tenants.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhuma empresa cadastrada ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenants.map((tenant, idx) => (
                <motion.div key={tenant.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{tenant.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">ID: {tenant.id}</p>
                    </div>
                    <span className="flex-shrink-0 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Ativo</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Código de Convite</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg text-sm font-mono font-bold">{tenant.code}</code>
                        <button onClick={() => copyToClipboard(tenant.code, `code-${tenant.id}`)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors" title="Copiar código">
                          {copiedId === `code-${tenant.id}` ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1"><Globe className="w-3 h-3" /> Link de Cadastro</p>
                      <div className="flex items-center gap-2">
                        <p className="flex-1 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg text-xs text-slate-500 dark:text-slate-400 truncate font-mono">{getInviteUrl(tenant.code)}</p>
                        <button onClick={() => copyToClipboard(getInviteUrl(tenant.code), `url-${tenant.id}`)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors flex-shrink-0" title="Copiar link">
                          {copiedId === `url-${tenant.id}` ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: USUÁRIOS */}
      {activeTab === 'usuarios' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou empresa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <>
              {/* Tabela — desktop */}
              <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Usuário</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Empresa</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Cargo Atual</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Alterar Cargo</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Vincular Empresa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u, idx) => (
                        <motion.tr
                          key={u.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center flex-shrink-0">
                                {u.role === 'super_admin' ? <ShieldAlert className="w-4 h-4 text-violet-500" /> :
                                  u.role === 'admin_tenant' ? <UserCheck className="w-4 h-4 text-rose-400" /> :
                                    <User className="w-4 h-4 text-emerald-400" />}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 dark:text-slate-100">{u.ownerName}</p>
                                <p className="text-xs text-slate-400">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg font-mono">
                              {u.tenantName || u.tenantId}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${ROLE_LABELS[u.role]?.color || ''}`}>
                              {ROLE_LABELS[u.role]?.label || u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {/* FIX: value controlado em vez de defaultValue */}
                              <select
                                value={u.role}
                                onChange={e => handleRoleChange(u.id, e.target.value as 'pj' | 'admin_tenant' | 'super_admin')}
                                // FIX: impede o super admin de alterar o próprio cargo
                                disabled={updatingRole === u.id || u.id === user.id}
                                title={u.id === user.id ? 'Você não pode alterar seu próprio cargo.' : undefined}
                                className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <option value="pj">Prestador PJ</option>
                                <option value="admin_tenant">Administração</option>
                                <option value="super_admin">Super Admin</option>
                              </select>
                              {updatingRole === u.id && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
                              {roleSuccess === u.id && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {/* FIX: guarda para quando tenants ainda está carregando */}
                              {tenants.length === 0 ? (
                                <span className="text-xs text-slate-400 italic">Carregando...</span>
                              ) : (
                                <select
                                  value={u.tenantId}
                                  onChange={e => handleTenantChange(u.id, e.target.value)}
                                  disabled={updatingTenant === u.id}
                                  className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 max-w-[160px] truncate"
                                >
                                  {tenants.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                                </select>
                              )}
                              {updatingTenant === u.id && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
                              {tenantSuccess === u.id && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cards — mobile */}
              <div className="md:hidden space-y-3">
                {filteredUsers.map((u, idx) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-sm space-y-3"
                  >
                    {/* Cabeçalho do card */}
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center flex-shrink-0">
                        {u.role === 'super_admin' ? <ShieldAlert className="w-4 h-4 text-violet-500" /> :
                          u.role === 'admin_tenant' ? <UserCheck className="w-4 h-4 text-rose-400" /> :
                            <User className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{u.ownerName}</p>
                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                      </div>
                      <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${ROLE_LABELS[u.role]?.color || ''}`}>
                        {ROLE_LABELS[u.role]?.label || u.role}
                      </span>
                    </div>

                    {/* Empresa atual */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Empresa</span>
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg font-mono truncate max-w-[160px]">
                        {u.tenantName || u.tenantId}
                      </span>
                    </div>

                    {/* Alterar cargo */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 font-medium flex-shrink-0">Cargo</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value as 'pj' | 'admin_tenant' | 'super_admin')}
                          disabled={updatingRole === u.id || u.id === user.id}
                          title={u.id === user.id ? 'Você não pode alterar seu próprio cargo.' : undefined}
                          className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="pj">Prestador PJ</option>
                          <option value="admin_tenant">Administração</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                        {updatingRole === u.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
                        {roleSuccess === u.id && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                    </div>

                    {/* Vincular empresa */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-500 font-medium flex-shrink-0">Vincular</span>
                      <div className="flex items-center gap-2">
                        {tenants.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">Carregando...</span>
                        ) : (
                          <select
                            value={u.tenantId}
                            onChange={e => handleTenantChange(u.id, e.target.value)}
                            disabled={updatingTenant === u.id}
                            className="text-xs border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 max-w-[160px] truncate"
                          >
                            {tenants.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        )}
                        {updatingTenant === u.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />}
                        {tenantSuccess === u.id && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}