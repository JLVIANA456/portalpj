/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SupabaseConfig } from '../types';
import { getSupabaseConfig, saveSupabaseConfig, SUPABASE_SQL_INSTRUCTION } from '../lib/db';
import { 
  Database, 
  HelpCircle, 
  Copy, 
  Check, 
  Save, 
  Terminal, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { motion } from 'motion/react';

export default function ConfigView() {
  const [config, setConfig] = useState<SupabaseConfig>(getSupabaseConfig());
  const [url, setUrl] = useState(config.url);
  const [anonKey, setAnonKey] = useState(config.anonKey);
  const [useMock, setUseMock] = useState(config.useMockDatabase);

  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_INSTRUCTION);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    // Save configuration
    const updatedConfig: SupabaseConfig = {
      url: url.trim(),
      anonKey: anonKey.trim(),
      useMockDatabase: useMock,
      isConnected: url.trim().length > 0 && anonKey.trim().length > 0 && !useMock
    };

    saveSupabaseConfig(updatedConfig);
    setConfig(updatedConfig);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-slate-100 transition-colors tracking-tight">Vincular Banco Supabase</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">Configure a conexão com seu servidor Supabase ou utilize o banco local auto-salvável para demonstração.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Connection Form Block */}
        <div className="bg-white dark:bg-slate-900 transition-colors p-6 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm lg:col-span-5 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 transition-colors ">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 transition-colors font-sans">Credenciais de Acesso</span>
            </div>
            
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
              config.isConnected 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {config.isConnected ? 'Conectado Real' : 'Local DB ativo'}
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-4 text-xs font-sans">
            <div className="space-y-2">
              <span className="block text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors font-semibold uppercase tracking-wider">Modo do Banco de Dados</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setUseMock(true)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-semibold ${
                    useMock 
                      ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 ring-2 ring-indigo-600/10' 
                      : 'border-slate-200 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 transition-colors hover:bg-slate-50 dark:bg-slate-950 transition-colors text-slate-600 dark:text-slate-400 dark:text-slate-500 transition-colors '
                  }`}
                >
                  Demonstração Local
                </button>
                <button
                  type="button"
                  onClick={() => setUseMock(false)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer font-semibold ${
                    !useMock 
                      ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 ring-2 ring-indigo-600/10' 
                      : 'border-slate-200 dark:border-slate-700 transition-colors bg-white dark:bg-slate-900 transition-colors hover:bg-slate-50 dark:bg-slate-950 transition-colors text-slate-700 dark:text-slate-300 transition-colors '
                  }`}
                >
                  Supabase Backend
                </button>
              </div>
            </div>

            <div className="space-y-3.5 pt-2">
              <div>
                <label htmlFor="supabase-url" className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">SUPABASE_PROJECT_URL</label>
                <input
                  id="supabase-url"
                  type="url"
                  placeholder="https://xyzabcdefg.supabase.co"
                  disabled={useMock}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 transition-colors rounded-xl text-slate-900 dark:text-slate-100 transition-colors bg-slate-50 dark:bg-slate-950 transition-colors /50 focus:bg-white dark:bg-slate-900 transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-xs disabled:opacity-50"
                />
              </div>

              <div>
                <label htmlFor="supabase-key" className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500 transition-colors ">SUPABASE_ANON_PUBLIC_KEY</label>
                <input
                  id="supabase-key"
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                  disabled={useMock}
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="mt-1 block w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 transition-colors rounded-xl text-slate-900 dark:text-slate-100 transition-colors bg-slate-50 dark:bg-slate-950 transition-colors /50 focus:bg-white dark:bg-slate-900 transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-xs disabled:opacity-50"
                />
              </div>
            </div>

            {saved && (
              <div id="save-status" className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 p-3 rounded-r-xl flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Configurações salvas e aplicadas!</span>
              </div>
            )}

            <button
              type="submit"
              id="save-supabase-config-btn"
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Configurações</span>
            </button>
          </form>

          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 flex gap-2.5 text-xs text-amber-800 leading-normal">
            <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <span className="font-bold block mb-0.5">Nota sobre o Banco de Dados</span>
              Como as credenciais são processadas de forma isolada, as tabelas são simuladas baseadas em JSON local para permitir alteração de status em tempo real sem falhas no ambiente de demonstração de fluxo de caixa.
            </div>
          </div>
        </div>

        {/* PostgreSQL Schema Instructions Block */}
        <div className="bg-white dark:bg-slate-900 transition-colors p-6 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-600" />
              <span className="font-bold text-sm text-slate-950 font-sans">Script SQL das Tabelas</span>
            </div>
            
            <button
              onClick={handleCopySql}
              id="copy-sql-btn"
              className="py-1.5 px-3 border border-slate-200 dark:border-slate-700 transition-colors hover:bg-slate-50 dark:bg-slate-950 transition-colors text-slate-700 dark:text-slate-300 transition-colors bg-white dark:bg-slate-900 transition-colors shadow-xs rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-colors " />
                  <span>Copiar Código SQL</span>
                </>
              )}
            </button>
          </div>

          <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden font-mono text-[11px] text-slate-300 relative">
            <div className="absolute top-2 right-2 bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors px-2 py-0.5 rounded uppercase text-[9px] border border-slate-700 tracking-wider font-semibold">
              postgresql
            </div>
            <textarea
              readOnly
              value={SUPABASE_SQL_INSTRUCTION}
              className="w-full h-80 bg-slate-950 text-indigo-200 border-none p-4 font-mono leading-relaxed outline-none resize-none cursor-text select-all focus:ring-0"
            />
          </div>

          <div className="text-xs text-slate-400 dark:text-slate-500 transition-colors leading-normal">
            Copie o script SQL acima e execute-o diretamente no console SQL do painel do seu projeto no Supabase para automatizar o setup das tabelas relacionais com chaves estrangeiras.
          </div>
        </div>

      </div>
    </div>
  );
}
