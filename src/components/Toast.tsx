import React from 'react';
import { CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Toast: React.FC = () => {
  const { toast } = useApp();
  if (!toast) return null;

  const Icon =
    toast.tone === 'warning'
      ? AlertTriangle
      : toast.tone === 'info'
        ? Info
        : CheckCircle2;

  const toneClass =
    toast.tone === 'warning'
      ? 'border-[#E59A1A]/40 text-[#E59A1A]'
      : toast.tone === 'info'
        ? 'border-[#0066FF]/40 text-[#4D94FF]'
        : 'border-[#18A96B]/40 text-[#18A96B]';

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:inset-x-auto md:right-6 md:bottom-6 z-50 flex justify-center md:justify-end px-4 md:px-0">
      <div
        className={`flex max-w-[440px] items-center gap-2.5 rounded-md border bg-[#0D1119]/95 px-4 py-2.5 text-xs font-medium text-[#F5F5F7] shadow-2xl backdrop-blur-md ${toneClass}`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-[#F5F5F7]">{toast.text}</span>
      </div>
    </div>
  );
};
