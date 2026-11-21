import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-[4px] sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-[520px] max-h-[90dvh] overflow-y-auto rounded-t-[10px] sm:rounded-[10px] border border-[#D8DFE9] dark:border-white/[0.1] bg-white/95 dark:bg-[#0D1119]/95 backdrop-blur-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[2px] w-full m-stripe" />
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-[#E5E7EB] dark:border-white/[0.08] bg-white/95 dark:bg-[#0D1119]/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-[#0B0C0F] dark:text-[#F5F5F7] truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[#636873] dark:text-[#8B8F99] mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="shrink-0 rounded-md p-1.5 text-[#636873] hover:bg-black/[0.05] hover:text-[#0B0C0F] dark:text-[#8B8F99] dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>
  );
};
