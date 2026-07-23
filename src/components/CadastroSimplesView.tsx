import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Pencil, Plus, Tag, Target, Trash2, X } from 'lucide-react';
import { PJUser } from '../types';
import {
  getCategorias, addCategoria, updateCategoria, deleteCategoria,
  getCentrosCusto, addCentroCusto, updateCentroCusto, deleteCentroCusto
} from '../lib/db';
import ConfirmDialog from './ConfirmDialog';

interface CadastroSimplesViewProps {
  user: PJUser;
  tipo: 'categoria' | 'centro_custo';
}

interface Item {
  id: string;
  nome: string;
}

const PRIMARY = '#4F39F6';

const inputCls = 'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-[#4F39F6] focus:ring-2 focus:ring-[#4F39F6]/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white transition';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      {children}
    </div>
  );
}

const TIPO_META = {
  categoria: {
    title: 'Categoria',
    subtitle: 'Categorias usadas para classificar lançamentos em Contas a Pagar.',
    icon: Tag,
    placeholder: 'Ex: Marketing, Aluguel, Impostos...',
    emptyLabel: 'Nenhuma categoria cadastrada.'
  },
  centro_custo: {
    title: 'Centro de Custo',
    subtitle: 'Centros de custo usados para classificar lançamentos em Contas a Pagar.',
    icon: Target,
    placeholder: 'Ex: Comercial, Diretoria, Tecnologia...',
    emptyLabel: 'Nenhum centro de custo cadastrado.'
  }
} as const;

export default function CadastroSimplesView({ user, tipo }: CadastroSimplesViewProps) {
  const meta = TIPO_META[tipo];
  const Icon = meta.icon;

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [novoNome, setNovoNome] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = tipo === 'categoria' ? await getCategorias(user) : await getCentrosCusto(user);
      setItems(data);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar lista.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tipo, user.id, user.tenantId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const nome = novoNome.trim();
    if (!nome) return setError('Informe um nome.');
    setError(''); setSaving(true);
    try {
      const created = tipo === 'categoria' ? await addCategoria(user, nome) : await addCentroCusto(user, nome);
      setItems(prev => [...prev, created].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNovoNome('');
      setSuccess(`${meta.title} adicionada com sucesso.`);
    } catch (err: any) {
      setError(err?.message || 'Erro ao adicionar.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: Item) => {
    setEditingId(item.id);
    setEditingNome(item.nome);
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingNome('');
  };

  const handleSaveEdit = async (id: string) => {
    const nome = editingNome.trim();
    if (!nome) return setError('Informe um nome.');
    setError('');
    try {
      const updated = tipo === 'categoria' ? await updateCategoria(id, nome) : await updateCentroCusto(id, nome);
      setItems(prev => prev.map(i => i.id === id ? updated : i).sort((a, b) => a.nome.localeCompare(b.nome)));
      setSuccess(`${meta.title} atualizada com sucesso.`);
      cancelEdit();
    } catch (err: any) {
      setError(err?.message || 'Erro ao atualizar.');
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = (id: string) => setConfirmDeleteId(id);

  const doDelete = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    setConfirmDeleteId(null);
    setError('');
    try {
      if (tipo === 'categoria') await deleteCategoria(id); else await deleteCentroCusto(id);
      setItems(prev => prev.filter(i => i.id !== id));
      setSuccess(`${meta.title} excluída com sucesso.`);
    } catch (err: any) {
      setError(err?.message || 'Erro ao excluir.');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-2xl p-3" style={{ background: PRIMARY }}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">{meta.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{meta.subtitle}</p>
        </div>
      </div>

      {(error || success) && (
        <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${error
            ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
          }`}>
          <div className="flex items-center gap-2">
            {error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {error || success}
          </div>
          <button onClick={() => { setError(''); setSuccess(''); }}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Novo item */}
      <Card className="p-4">
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            value={novoNome}
            onChange={e => setNovoNome(e.target.value)}
            placeholder={meta.placeholder}
            className={inputCls}
          />
          <button
            type="submit"
            disabled={saving}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ background: PRIMARY }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </button>
        </form>
      </Card>

      {/* Lista */}
      <Card className="p-2">
        {loading ? (
          <div className="flex items-center justify-center p-8 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" style={{ color: PRIMARY }} /> Carregando...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">{meta.emptyLabel}</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2.5">
                {editingId === item.id ? (
                  <>
                    <input
                      autoFocus
                      value={editingNome}
                      onChange={e => setEditingNome(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(item.id); if (e.key === 'Escape') cancelEdit(); }}
                      className={inputCls}
                    />
                    <button onClick={() => handleSaveEdit(item.id)} title="Salvar" className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button onClick={cancelEdit} title="Cancelar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{item.nome}</span>
                    <button onClick={() => startEdit(item)} title="Editar" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} title="Excluir" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirmDeleteId}
        message={`Deseja excluir esta ${meta.title.toLowerCase()}? Lançamentos existentes que a usam não serão alterados.`}
        onConfirm={doDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
