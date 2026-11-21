import React, { useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  FolderLock,
  Gauge,
  Moon,
  ShieldAlert,
  Sun,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { TabId } from '../types';
import { buildActiveAlerts } from '../utils/alerts';

const TABS: {
  id: TabId;
  label: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'dashboard', label: 'Aperçu', icon: Gauge },
  { id: 'insurance', label: 'Assurances', icon: ShieldAlert },
  { id: 'maintenance', label: 'Entretien', icon: Wrench },
  { id: 'leasing', label: 'Leasing', icon: Calculator },
  { id: 'documents', label: 'Documents', icon: FolderLock },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { state, activeTab, setActiveTab, toggleTheme } = useApp();

  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const now = useMemo(() => new Date(), []);
  const urgentCount = useMemo(
    () =>
      buildActiveAlerts(state, now).filter((a) => a.severity === 'urgent')
        .length,
    [state, now]
  );

  return (
    <div className="min-h-dvh w-full app-canvas text-[#0B0C0F] dark:text-[#F5F5F7] flex flex-col">
      {/* Barre supérieure unique minimaliste */}
      <header className="sticky top-0 z-30 border-b border-[#D8DFE9]/70 dark:border-white/[0.08] bg-[#F5F8FC]/68 dark:bg-[#080C16]/68 backdrop-blur-xl">
        <div className="h-[6px] w-full m-stripe" />
        <div className="mx-auto flex max-w-[1140px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 h-14 sm:h-15">
          {/* Identité sobre + plaque suisse */}
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="font-display text-[15px] font-semibold tracking-tight">
              Car360
            </span>
            <span className="ch-plate">{state.vehicle.plate}</span>
            <span className="hidden lg:inline text-xs text-[#636873] dark:text-[#8B8F99]">
              xDrive20i M Sport
            </span>
          </div>

          {/* Navigation horizontale Tablette & Desktop */}
          <nav
            aria-label="Navigation principale"
            className="hidden md:flex items-center gap-6 h-full"
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative h-full inline-flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
                    active
                      ? 'text-[#0B0C0F] dark:text-[#F5F5F7]'
                      : 'text-[#636873] hover:text-[#0B0C0F] dark:text-[#8B8F99] dark:hover:text-[#F5F5F7]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.id === 'dashboard' && urgentCount > 0 && (
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[#E53935]" />
                  )}
                  {active && (
                    <span className="absolute inset-x-0 bottom-0 h-[2px] bg-[#0066FF]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Actions discrètes droite */}
          <div className="flex items-center gap-2 shrink-0">
            {!online && (
              <span
                className="inline-flex items-center gap-1.5 rounded-md bg-[#E59A1A]/15 px-2.5 py-1 text-[11px] font-medium text-[#B47009] dark:text-[#FBBF24]"
                title="Mode hors-ligne actif"
              >
                <WifiOff className="h-3 w-3" />
                Hors-ligne
              </span>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                state.theme === 'dark'
                  ? 'Activer le thème clair'
                  : 'Activer le thème sombre'
              }
              title={
                state.theme === 'dark'
                  ? 'Passer en thème clair'
                  : 'Passer en thème sombre'
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[#636873] hover:bg-black/[0.05] hover:text-[#0B0C0F] dark:text-[#8B8F99] dark:hover:bg-white/[0.07] dark:hover:text-[#F5F5F7] transition-colors"
            >
              {state.theme === 'dark' ? (
                <Sun className="h-[18px] w-[18px]" />
              ) : (
                <Moon className="h-[18px] w-[18px]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Contenu principal aéré */}
      <main className="mx-auto w-full max-w-[1140px] flex-1 overflow-x-hidden px-4 sm:px-6 lg:px-8 pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:py-10">
        {children}
      </main>

      {/* Barre de navigation fixe en bas — Mobile uniquement */}
      <nav
        aria-label="Navigation mobile"
        className="md:hidden fixed inset-x-0 bottom-0 z-30 border-t border-[#D8DFE9]/70 dark:border-white/[0.08] bg-white/76 dark:bg-[#080C16]/76 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid max-w-[480px] grid-cols-5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center gap-1 py-2 px-1 text-[10px] font-medium transition-colors ${
                  active
                    ? 'text-[#0066FF] dark:text-[#4D94FF]'
                    : 'text-[#636873] dark:text-[#8B8F99]'
                }`}
              >
                <span className="relative">
                  <Icon className="h-[18px] w-[18px]" />
                  {tab.id === 'dashboard' && urgentCount > 0 && (
                    <span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-[#E53935]" />
                  )}
                </span>
                <span className="max-w-full whitespace-nowrap leading-[1.25]">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
