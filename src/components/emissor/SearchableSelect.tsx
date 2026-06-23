import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { MUNICIPIOS, MunicipioItem } from '../../lib/tabelas/municipios';
import { CNAE, CNAEItem } from '../../lib/tabelas/cnae';
import { LC116, LC116Item } from '../../lib/tabelas/lc116';
import { NBS, NBSItem } from '../../lib/tabelas/nbs';

// ─── Generic SearchableSelect ────────────────────────────────────────────────

interface Option {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  full?: boolean;
}

export function SearchableSelect({ label, value, onChange, options, placeholder = 'Pesquisar...', full = false }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = search.trim()
    ? options.filter(o =>
        o.value.toLowerCase().includes(search.toLowerCase()) ||
        o.label.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 80)
    : options.slice(0, 80);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openDropdown = () => {
    setOpen(true);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const select = (opt: Option) => {
    onChange(opt.value);
    setOpen(false);
    setSearch('');
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${full ? 'col-span-full' : ''}`}>
      <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">{label}</span>

      {/* Trigger */}
      <button
        type="button"
        onClick={openDropdown}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 text-left"
      >
        <span className={`truncate ${selected ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
          {selected ? `${selected.value} — ${selected.label}` : placeholder}
        </span>
        <div className="flex flex-shrink-0 items-center gap-1">
          {value && (
            <span onClick={clear} className="rounded p-0.5 text-slate-400 hover:text-rose-500">
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[200] mt-1 w-full min-w-[280px] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5 dark:border-slate-800">
            <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Digitar para filtrar..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-100"
            />
          </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-center text-xs text-slate-400">Nenhum resultado encontrado</p>
            ) : (
              <>
                {filtered.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => select(opt)}
                    className={`flex w-full flex-col px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${
                      opt.value === value ? 'bg-emerald-50 dark:bg-emerald-950/30' : ''
                    }`}
                  >
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{opt.value}</span>
                    <span className="truncate text-xs text-slate-500">{opt.label}</span>
                    {opt.sublabel && <span className="text-[10px] text-slate-400">{opt.sublabel}</span>}
                  </button>
                ))}
                {options.length > 80 && !search.trim() && (
                  <p className="px-4 py-2 text-center text-[10px] text-slate-400">
                    Mostrando 80 de {options.length}. Digite para filtrar.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Typed wrappers ──────────────────────────────────────────────────────────

export function MunicipioSelect({ label, value, onChange, full }: {
  label: string; value: string; onChange: (v: string) => void; full?: boolean;
}) {
  const options: Option[] = MUNICIPIOS.map((m: MunicipioItem) => ({
    value: m.ibge,
    label: m.nome,
    sublabel: m.uf,
  }));
  return <SearchableSelect label={label} value={value} onChange={onChange} options={options}
    placeholder="Selecione o município..." full={full} />;
}

export function CNAESelect({ label, value, onChange, full }: {
  label: string; value: string; onChange: (v: string) => void; full?: boolean;
}) {
  const options: Option[] = CNAE.map((c: CNAEItem) => ({
    value: c.codigo,
    label: c.descricao,
  }));
  return <SearchableSelect label={label} value={value} onChange={onChange} options={options}
    placeholder="Selecione o CNAE..." full={full} />;
}

export function LC116Select({ label, value, onChange, full }: {
  label: string; value: string; onChange: (v: string) => void; full?: boolean;
}) {
  const options: Option[] = LC116.map((l: LC116Item) => ({
    value: l.codigo,
    label: l.descricao,
  }));
  return <SearchableSelect label={label} value={value} onChange={onChange} options={options}
    placeholder="Selecione o código LC 116..." full={full} />;
}

export function NBSSelect({ label, value, onChange, full }: {
  label: string; value: string; onChange: (v: string) => void; full?: boolean;
}) {
  const options: Option[] = NBS.map((n: NBSItem) => ({
    value: n.codigo,
    label: n.descricao,
  }));
  return <SearchableSelect label={label} value={value} onChange={onChange} options={options}
    placeholder="Selecione o código NBS..." full={full} />;
}
