/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PJUser } from '../types';
import { loginUser, registerUser, lookupCnpj, getTenantByCode } from '../lib/db';
import { ShieldAlert, CheckCircle, Building2, User, Key, Mail, Landmark, Users, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginFormProps {
  onLoginSuccess: (user: PJUser) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [isRegister, setIsRegister] = useState(false);

  // Estados do formulário
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [cnpj, setCnpj] = useState('');

  // Estado do fluxo de múltiplos colaboradores
  const [cnpjLookupDone, setCnpjLookupDone] = useState(false);
  const [existingCompany, setExistingCompany] = useState<{ name: string; cnpj: string } | null>(null);
  const [isCheckingCnpj, setIsCheckingCnpj] = useState(false);
  const [joinMode, setJoinMode] = useState(false);

  // Estados de feedback
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Lógica invisível de código de convite
  const [inviteValid, setInviteValid] = useState(false);
  const [inviteTenantId, setInviteTenantId] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('convite');
    if (code) {
      setIsRegister(true);
      validateInvisibleInvite(code.toUpperCase());
    }
  }, []);

  const validateInvisibleInvite = async (code: string) => {
    const tenant = await getTenantByCode(code.trim());
    if (tenant) {
      setInviteValid(true);
      setInviteTenantId(tenant.id);
    }
  };


  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '').slice(0, 14);
    value = value.replace(/^(\d{2})(\d)/, '$1.$2');
    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
    value = value.replace(/(\d{4})(\d)/, '$1-$2');
    setCnpj(value);
    // Ao mudar o CNPJ, reseta a detecção anterior
    if (cnpjLookupDone) {
      setCnpjLookupDone(false);
      setExistingCompany(null);
      setJoinMode(false);
      setCompanyName('');
    }
  };

  const handleCheckCnpj = async () => {
    if (cnpj.length < 18) {
      setError('Preencha o CNPJ completo para continuar.');
      return;
    }
    setError('');
    setIsCheckingCnpj(true);
    const found = await lookupCnpj(cnpj);
    setIsCheckingCnpj(false);
    setCnpjLookupDone(true);

    if (found) {
      setExistingCompany({ name: found.companyName, cnpj: found.cnpj });
      setCompanyName(found.companyName);
      setJoinMode(false);
    } else {
      setExistingCompany(null);
      setJoinMode(false);
      setCompanyName('');
    }
  };

  const resetForm = () => {
    setCompanyName('');
    setOwnerName('');
    setCnpj('');
    setEmail('');
    setPassword('');
    setError('');
    setSuccess('');
    setCnpjLookupDone(false);
    setExistingCompany(null);
    setJoinMode(false);
  };

  const handleToggleMode = () => {
    setIsRegister(!isRegister);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!isRegister) {
      // LOGIN FLOW
      if (!email || !password) {
        setError('Por favor, preencha todos os campos.');
        return;
      }
      const result = await loginUser(email, password);
      if (typeof result === 'string') {
        setError(result);
        return;
      }
      onLoginSuccess(result);
    } else {
      // REGISTER FLOW
      if (!ownerName || !cnpj || !email || !password) {
        setError('Por favor, preencha todos os campos do cadastro.');
        return;
      }
      if (password.length < 6) {
        setError('A senha deve possuir pelo menos 6 caracteres.');
        return;
      }
      if (cnpj.length < 18) {
        setError('O CNPJ informado parece incompleto.');
        return;
      }
      if (!cnpjLookupDone) {
        setError('Clique em "Verificar" antes de finalizar o cadastro.');
        return;
      }
      if (!companyName && !existingCompany) {
        setError('Informe a Razão Social da empresa.');
        return;
      }

      const result = await registerUser({
        tenantId: inviteValid ? inviteTenantId : 'tenant-1',
        companyName: existingCompany ? existingCompany.name : companyName,
        ownerName,
        cnpj,
        email,
        password
      });

      if (typeof result === 'string') {
        setError(result);
      } else {
        const msg = joinMode
          ? `Acesso criado! Você foi vinculado à empresa ${existingCompany?.name}.`
          : 'Empresa cadastrada com sucesso! Faça login abaixo.';
        setIsRegister(false);
        resetForm();
        setEmail(result.email);
        setSuccess(msg);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20">
            <Landmark className="h-6 w-6" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-950 dark:text-slate-100 font-sans tracking-tight">
          Portal Notas PJ
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400 dark:text-slate-500 transition-colors max-w-sm mx-auto">
          Plataforma para envio, controle e geração de relatórios de Notas Fiscais de Prestadores de Serviços (PJ).
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 transition-colors py-8 px-4 shadow-xl border border-slate-100 dark:border-slate-800 transition-colors rounded-2xl sm:px-10">

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex gap-3 text-red-700 text-sm"
              id="error-banner"
            >
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <div>{error}</div>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-r-lg flex gap-3 text-emerald-800 text-sm"
              id="success-banner"
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <div>{success}</div>
            </motion.div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <>
                {/* CNPJ com botão de verificação */}
                <div>
                  <label htmlFor="cnpj" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">
                    CNPJ da Empresa
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      id="cnpj"
                      type="text"
                      required
                      placeholder="00.000.000/0001-00"
                      value={cnpj}
                      onChange={handleCnpjChange}
                      className="block w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 transition-colors rounded-xl text-slate-900 dark:text-slate-100 transition-colors bg-slate-50 dark:bg-slate-950 transition-colors /50 focus:bg-white dark:bg-slate-900 transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <button
                      type="button"
                      id="check-cnpj-btn"
                      onClick={handleCheckCnpj}
                      disabled={isCheckingCnpj || cnpj.length < 18}
                      className="flex-shrink-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl disabled:bg-slate-200 disabled:text-slate-400 dark:text-slate-500 transition-colors cursor-pointer disabled:cursor-not-allowed transition-colors "
                    >
                      {isCheckingCnpj ? '...' : 'Verificar'}
                    </button>
                  </div>
                </div>

                {/* Resultado da verificação */}
                <AnimatePresence>
                  {cnpjLookupDone && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {existingCompany && !joinMode ? (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
                          <div className="flex items-start gap-2">
                            <Users className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-bold text-indigo-900">CNPJ já cadastrado!</p>
                              <p className="text-xs text-indigo-700 mt-0.5">
                                Este CNPJ pertence à empresa <strong>{existingCompany.name}</strong>.
                                Deseja entrar como colaborador?
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setJoinMode(true)}
                              className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors "
                            >
                              ✓ Sim, entrar como colaborador
                            </button>
                            <button
                              type="button"
                              onClick={() => { setCnpjLookupDone(false); setExistingCompany(null); setCnpj(''); }}
                              className="py-2 px-3 border border-slate-200 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 transition-colors hover:bg-slate-50 dark:bg-slate-950 transition-colors text-slate-600 dark:text-slate-400 dark:text-slate-500 transition-colors text-xs font-semibold rounded-xl cursor-pointer transition-colors "
                            >
                              <ArrowLeft className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : existingCompany && joinMode ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <p className="text-xs text-emerald-800 font-medium">
                            Vinculando à <strong>{existingCompany.name}</strong>. Preencha seus dados pessoais abaixo.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-slate-50 dark:bg-slate-950 transition-colors border border-slate-200 dark:border-slate-700 transition-colors rounded-xl p-3 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors flex-shrink-0" />
                          <p className="text-xs text-slate-600 dark:text-slate-400 dark:text-slate-500 transition-colors font-medium">
                            CNPJ disponível! Preencha os dados da nova empresa abaixo.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Campos visíveis após verificação */}
                <AnimatePresence>
                  {cnpjLookupDone && (!existingCompany || joinMode) && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      {!existingCompany && (
                        <div>
                          <label htmlFor="companyName" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">
                            Razão Social
                          </label>
                          <div className="mt-1 relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Building2 className="h-5 w-5 text-slate-400 dark:text-slate-500 transition-colors " />
                            </div>
                            <input
                              id="companyName"
                              type="text"
                              required
                              placeholder="Empresa Tecnologia Ltda"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 transition-colors rounded-xl text-slate-900 dark:text-slate-100 transition-colors bg-slate-50 dark:bg-slate-950 transition-colors /50 focus:bg-white dark:bg-slate-900 transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label htmlFor="ownerName" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">
                          {joinMode ? 'Seu Nome (Colaborador)' : 'Nome do Responsável / Sócio'}
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors " />
                          </div>
                          <input
                            id="ownerName"
                            type="text"
                            required
                            placeholder="Nome Sobrenome"
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 transition-colors rounded-xl text-slate-900 dark:text-slate-100 transition-colors bg-slate-50 dark:bg-slate-950 transition-colors /50 focus:bg-white dark:bg-slate-900 transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">
                Endereço de E-mail
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500 transition-colors " />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 transition-colors rounded-xl text-slate-900 dark:text-slate-100 transition-colors bg-slate-50 dark:bg-slate-950 transition-colors /50 focus:bg-white dark:bg-slate-900 transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">
                Senha
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-slate-400 dark:text-slate-500 transition-colors " />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 transition-colors rounded-xl text-slate-900 dark:text-slate-100 transition-colors bg-slate-50 dark:bg-slate-950 transition-colors /50 focus:bg-white dark:bg-slate-900 transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                id="submit-auth-btn"
                disabled={isRegister && cnpjLookupDone && !!existingCompany && !joinMode}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400 dark:text-slate-500 transition-colors disabled:cursor-not-allowed transition-colors "
              >
                {isRegister
                  ? joinMode
                    ? 'Entrar como Colaborador'
                    : 'Finalizar Cadastro'
                  : 'Entrar no Sistema'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700 transition-colors " />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white dark:bg-slate-900 transition-colors text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors font-medium">Ou alterne</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                id="toggle-auth-mode"
                onClick={handleToggleMode}
                className="w-full text-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 focus:outline-none py-2 border border-indigo-100 rounded-xl bg-indigo-50/25 hover:bg-indigo-50/80 cursor-pointer"
              >
                {isRegister ? 'Já tenho uma empresa registrada' : 'Cadastrar Nova Empresa (PJ)'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}