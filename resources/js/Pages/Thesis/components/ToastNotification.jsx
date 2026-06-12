import React from 'react';
import { AlertCircle, Info } from 'lucide-react';

export default function ToastNotification({ toast }) {
  if (!toast?.show) return null;

  return (
    <div className={`fixed bottom-6 right-6 border ${toast.isError ? 'bg-red-900/80 border-red-500 text-red-100' : 'bg-slate-900/95 border-slate-800 text-slate-100'} backdrop-blur-md px-4 py-3 rounded-xl flex items-center gap-3 shadow-2xl z-50 transition-all max-w-sm no-print`}>
      {toast.isError ? <AlertCircle className="h-5 w-5 text-red-400 shrink-0" /> : <Info className="h-5 w-5 text-indigo-400 shrink-0" />}
      <span className="text-xs font-semibold">{toast.message}</span>
    </div>
  );
}
