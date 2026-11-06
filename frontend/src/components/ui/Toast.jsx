import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full px-4 sm:px-0">
      <div className={`p-4 bg-[#FFFFFF] border-2 flex items-start space-x-3 ${
        isSuccess
          ? 'border-[#1E4332] text-[#111111]'
          : isError
          ? 'border-[#963614] text-[#111111]'
          : 'border-[#111111] text-[#111111]'
      }`}>
        <div className="shrink-0 mt-0.5">
          {isSuccess ? (
            <CheckCircle2 className="w-4 h-4 text-[#1E4332]" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4 text-[#963614]" />
          ) : (
            <Info className="w-4 h-4 text-[#111111]" />
          )}
        </div>
        
        <div className="flex-1 text-xs">
          {toast.title && <div className="font-bold text-[#111111] mb-0.5 font-mono">{toast.title}</div>}
          <div className="text-[#555550] leading-relaxed font-medium">{toast.message}</div>
        </div>

        <button
          onClick={onClose}
          className="text-[#555550] hover:text-[#111111] p-0.5 transition-none"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
