import React from 'react';
import { Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
  open: boolean;
  message: string;
  title?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  message,
  title = 'Confirmar exclusão',
  confirmLabel = 'Excluir',
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-500/10">
                <Trash2 className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900 dark:text-white">{title}</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="rounded-xl px-4 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
