import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG: Record<ToastType, { icon: React.FC<any>; bg: string; border: string; iconColor: string; titleColor: string }> = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-l-4 border-l-emerald-500',
    iconColor: 'text-emerald-500',
    titleColor: 'text-slate-900 dark:text-white',
  },
  error: {
    icon: XCircle,
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-l-4 border-l-rose-500',
    iconColor: 'text-rose-500',
    titleColor: 'text-slate-900 dark:text-white',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-l-4 border-l-amber-500',
    iconColor: 'text-amber-500',
    titleColor: 'text-slate-900 dark:text-white',
  },
  info: {
    icon: Info,
    bg: 'bg-white dark:bg-slate-900',
    border: 'border-l-4 border-l-indigo-500',
    iconColor: 'text-indigo-500',
    titleColor: 'text-slate-900 dark:text-white',
  },
};

// ─── Toast Item ───────────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const cfg = CONFIG[toast.type];
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`
        flex items-start gap-3 w-80 max-w-full p-4 rounded-2xl shadow-xl
        border border-slate-200 dark:border-slate-700
        ${cfg.bg} ${cfg.border}
      `}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug ${cfg.titleColor}`}>{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const push = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, type, title, message }]);
    timers.current[id] = setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const value: ToastContextValue = {
    success: (title, message) => push('success', title, message),
    error:   (title, message) => push('error',   title, message),
    warning: (title, message) => push('warning', title, message),
    info:    (title, message) => push('info',    title, message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Toast Container — fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
        <AnimatePresence mode="sync">
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onDismiss={dismiss} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
