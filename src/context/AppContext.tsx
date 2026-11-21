import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { INITIAL_STATE } from '../data/initialData';
import { VEHICLE_PHOTOS } from '../data/vehicleMedia';
import {
  loadActiveTab,
  loadAppState,
  saveActiveTab,
  saveAppState,
} from '../storage/stateStorage';
import type {
  AppState,
  CbsScheduleItem,
  LeasingContract,
  MaintenanceEntry,
  PlannedTireChange,
  TabId,
  TcsCoverage,
  TireChange,
  TireChangeChecklist,
  WarrantyItem,
  WheelSet,
} from '../types';
import { toLocalDateStr } from '../utils/dates';
import { formatKm } from '../utils/format';
import { seasonLabel } from '../utils/tires';

export interface ToastMessage {
  id: number;
  text: string;
  tone?: 'success' | 'info' | 'warning';
}

interface PerformTireChangeInput {
  toSetId: string;
  newSet?: Omit<WheelSet, 'id'>;
  dateTime: string;
  km: number;
  doneBy: 'self' | 'garage';
  cost: number;
  checklist: TireChangeChecklist;
  notes: string;
  unmountedStorageLocation?: string;
}

interface AppContextValue {
  state: AppState;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  toast: ToastMessage | null;
  showToast: (text: string, tone?: ToastMessage['tone']) => void;
  toggleTheme: () => void;
  updateMileage: (km: number, dateStr?: string, note?: string) => void;
  updateVehicleNotes: (patch: Partial<AppState['vehicle']>) => void;
  updateLeasing: (patch: Partial<LeasingContract>) => void;
  updateAlpheraDates: (startDate: string, endDate: string) => void;
  updateTcs: (patch: Partial<TcsCoverage>) => void;
  addMaintenance: (entry: Omit<MaintenanceEntry, 'id'>) => void;
  updateMaintenance: (entry: MaintenanceEntry) => void;
  deleteMaintenance: (id: string) => void;
  upsertCbs: (item: CbsScheduleItem) => void;
  deleteCbs: (id: string) => void;
  performTireChange: (input: PerformTireChangeInput) => void;
  planTireChange: (planned: PlannedTireChange | null) => void;
  markRetorqueDone: (changeId?: string) => void;
  upsertWheelSet: (set: WheelSet) => void;
  updateTireChangeEntry: (entry: TireChange) => void;
  deleteTireChangeEntry: (id: string) => void;
  upsertWarranty: (w: WarrantyItem) => void;
  deleteWarranty: (id: string) => void;
  replaceFullState: (next: AppState) => void;
  resetToDefault: () => void;
  quickMileageOpen: boolean;
  setQuickMileageOpen: (v: boolean) => void;
  tireChangeOpen: boolean;
  setTireChangeOpen: (v: boolean) => void;
  tirePlanOpen: boolean;
  setTirePlanOpen: (v: boolean) => void;
  galleryIndex: number | null;
  openGallery: (index?: number) => void;
  closeGallery: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [activeTab, setActiveTabState] = useState<TabId>(() => loadActiveTab());
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const [quickMileageOpen, setQuickMileageOpen] = useState(false);
  const [tireChangeOpen, setTireChangeOpen] = useState(false);
  const [tirePlanOpen, setTirePlanOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  const openGallery = useCallback((index = 0) => {
    const safeIndex = Math.max(0, Math.min(VEHICLE_PHOTOS.length - 1, index));
    setGalleryIndex(safeIndex);
  }, []);

  const closeGallery = useCallback(() => {
    setGalleryIndex(null);
  }, []);

  const showToast = useCallback(
    (text: string, tone: ToastMessage['tone'] = 'success') => {
      setToast({ id: Date.now(), text, tone });
    },
    []
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    saveAppState(state);
  }, [state]);

  useEffect(() => {
    const html = document.documentElement;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (state.theme === 'dark') {
      html.classList.add('dark');
      document.body.className =
        'bg-[#06080D] text-[#F5F5F7] antialiased selection:bg-[#0066FF] selection:text-white';
      metaTheme?.setAttribute('content', '#06080D');
    } else {
      html.classList.remove('dark');
      document.body.className =
        'bg-[#F2F5FA] text-[#0B0C0F] antialiased selection:bg-[#0057DB] selection:text-white';
      metaTheme?.setAttribute('content', '#F2F5FA');
    }
  }, [state.theme]);

  const setActiveTab = useCallback((tab: TabId) => {
    setActiveTabState(tab);
    saveActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  const toggleTheme = useCallback(() => {
    setState((prev) => ({
      ...prev,
      theme: prev.theme === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  const updateMileage = useCallback(
    (km: number, dateStr?: string, note?: string) => {
      const cleanKm = Math.max(0, Math.round(km));
      const date = dateStr || toLocalDateStr(new Date());
      setState((prev) => ({
        ...prev,
        vehicle: {
          ...prev.vehicle,
          currentMileage: cleanKm,
          lastMileageDate: date,
        },
        mileageHistory: [
          {
            id: `km-${Date.now()}`,
            date,
            km: cleanKm,
            note: note?.trim() || 'Mise à jour compteur',
          },
          ...prev.mileageHistory,
        ].slice(0, 50),
      }));
      showToast(`Kilométrage mis à jour : ${formatKm(cleanKm)}`);
    },
    [showToast]
  );

  const updateVehicleNotes = useCallback(
    (patch: Partial<AppState['vehicle']>) => {
      setState((prev) => ({
        ...prev,
        vehicle: { ...prev.vehicle, ...patch },
      }));
      showToast('Fiche véhicule enregistrée');
    },
    [showToast]
  );

  const updateLeasing = useCallback((patch: Partial<LeasingContract>) => {
    setState((prev) => ({
      ...prev,
      leasing: { ...prev.leasing, ...patch },
    }));
  }, []);

  const updateAlpheraDates = useCallback(
    (startDate: string, endDate: string) => {
      setState((prev) => ({
        ...prev,
        alpheraProtection: {
          ...prev.alpheraProtection,
          startDate,
          endDate,
        },
        warranties: prev.warranties.map((w) =>
          w.syncedWithAlphera ? { ...w, startDate, endDate } : w
        ),
      }));
      showToast('Dates ALPHERA Protection enregistrées');
    },
    [showToast]
  );

  const updateTcs = useCallback(
    (patch: Partial<TcsCoverage>) => {
      setState((prev) => ({
        ...prev,
        tcs: { ...prev.tcs, ...patch },
      }));
      showToast('Informations TCS mises à jour');
    },
    [showToast]
  );

  const addMaintenance = useCallback(
    (entry: Omit<MaintenanceEntry, 'id'>) => {
      const newItem: MaintenanceEntry = {
        ...entry,
        id: `maint-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      setState((prev) => ({
        ...prev,
        maintenanceLog: [newItem, ...prev.maintenanceLog].sort((a, b) =>
          b.date.localeCompare(a.date)
        ),
      }));
      showToast(`Entrée ajoutée : ${entry.title}`);
    },
    [showToast]
  );

  const updateMaintenance = useCallback(
    (entry: MaintenanceEntry) => {
      setState((prev) => ({
        ...prev,
        maintenanceLog: prev.maintenanceLog
          .map((m) => (m.id === entry.id ? entry : m))
          .sort((a, b) => b.date.localeCompare(a.date)),
      }));
      showToast('Intervention modifiée');
    },
    [showToast]
  );

  const deleteMaintenance = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        maintenanceLog: prev.maintenanceLog.filter((m) => m.id !== id),
      }));
      showToast('Entrée supprimée', 'info');
    },
    [showToast]
  );

  const upsertCbs = useCallback(
    (item: CbsScheduleItem) => {
      setState((prev) => {
        const exists = prev.cbsSchedule.some((c) => c.id === item.id);
        return {
          ...prev,
          cbsSchedule: exists
            ? prev.cbsSchedule.map((c) => (c.id === item.id ? item : c))
            : [...prev.cbsSchedule, item],
        };
      });
      showToast('Échéance CBS enregistrée');
    },
    [showToast]
  );

  const deleteCbs = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        cbsSchedule: prev.cbsSchedule.filter((c) => c.id !== id),
      }));
      showToast('Échéance supprimée', 'info');
    },
    [showToast]
  );

  const performTireChange = useCallback(
    (input: PerformTireChangeInput) => {
      setState((prev) => {
        let targetSetId = input.toSetId;
        let nextSets = [...prev.tires.sets];

        if (input.newSet) {
          targetSetId = `set-${Date.now()}`;
          nextSets.push({
            ...input.newSet,
            id: targetSetId,
          });
        }

        const fromSetId = prev.tires.mountedSetId || null;
        nextSets = nextSets.map((s) => {
          if (s.id === targetSetId) {
            return { ...s, storageLocation: 'Montées sur le véhicule' };
          }
          if (s.id === fromSetId) {
            return {
              ...s,
              storageLocation:
                input.unmountedStorageLocation?.trim() ||
                (s.storageLocation === 'Montées sur le véhicule'
                  ? 'Dépôt / Garage personnel'
                  : s.storageLocation),
            };
          }
          return s;
        });

        const toSet = nextSets.find((s) => s.id === targetSetId);
        const fromSet = nextSets.find((s) => s.id === fromSetId);

        const changeRecord: TireChange = {
          id: `tc-${Date.now()}`,
          dateTime: input.dateTime,
          km: input.km,
          fromSetId,
          toSetId: targetSetId,
          doneBy: input.doneBy,
          cost: input.cost,
          checklist: input.checklist,
          notes: input.notes,
          retorqueDone: false,
        };

        const dateOnly = input.dateTime.split('T')[0];
        const logEntry: MaintenanceEntry = {
          id: `maint-tire-${Date.now()}`,
          date: dateOnly,
          km: input.km,
          category: 'Pneus',
          title: `Changement de roues → ${toSet?.name ?? seasonLabel(toSet?.season)}`,
          details: `${fromSet ? `Démontage : ${fromSet.name}. ` : ''}${input.checklist.torque ? `Serrage ${prev.tires.wheelBoltTorqueNm} Nm` : 'Serrage à vérifier'}${input.checklist.rdcReset ? ' · RDC réinitialisé' : ''}${input.notes ? ` · ${input.notes}` : ''}`,
          cost: input.cost,
          performedBy: input.doneBy === 'self' ? 'Moi-même' : 'Garage',
          statusNote: `À resserrer (${prev.tires.wheelBoltTorqueNm} Nm) après 50–100 km`,
        };

        const clearPlanned =
          prev.tires.planned && prev.tires.planned.toSetId === targetSetId
            ? null
            : prev.tires.planned;

        const shouldUpdateKm = input.km > prev.vehicle.currentMileage;

        return {
          ...prev,
          vehicle: shouldUpdateKm
            ? {
                ...prev.vehicle,
                currentMileage: input.km,
                lastMileageDate: dateOnly,
              }
            : prev.vehicle,
          mileageHistory: shouldUpdateKm
            ? [
                {
                  id: `km-tire-${Date.now()}`,
                  date: dateOnly,
                  km: input.km,
                  note: `Changement roues → ${seasonLabel(toSet?.season)}`,
                },
                ...prev.mileageHistory,
              ].slice(0, 50)
            : prev.mileageHistory,
          maintenanceLog: [logEntry, ...prev.maintenanceLog].sort((a, b) =>
            b.date.localeCompare(a.date)
          ),
          tires: {
            ...prev.tires,
            mountedSetId: targetSetId,
            sets: nextSets,
            history: [changeRecord, ...prev.tires.history],
            planned: clearPlanned,
          },
        };
      });
      showToast('Roues montées mises à jour · Pensez au resserrage à 50–100 km');
    },
    [showToast]
  );

  const planTireChange = useCallback(
    (planned: PlannedTireChange | null) => {
      setState((prev) => ({
        ...prev,
        tires: { ...prev.tires, planned },
      }));
      showToast(
        planned ? 'Changement de roues planifié' : 'Planification annulée',
        planned ? 'success' : 'info'
      );
    },
    [showToast]
  );

  const markRetorqueDone = useCallback(
    (changeId?: string) => {
      setState((prev) => {
        const targetId = changeId ?? prev.tires.history[0]?.id;
        if (!targetId) return prev;
        return {
          ...prev,
          tires: {
            ...prev.tires,
            history: prev.tires.history.map((h) =>
              h.id === targetId ? { ...h, retorqueDone: true } : h
            ),
          },
        };
      });
      showToast('Resserrage à 140 Nm confirmé');
    },
    [showToast]
  );

  const upsertWheelSet = useCallback(
    (wheelSet: WheelSet) => {
      setState((prev) => {
        const exists = prev.tires.sets.some((s) => s.id === wheelSet.id);
        return {
          ...prev,
          tires: {
            ...prev.tires,
            sets: exists
              ? prev.tires.sets.map((s) =>
                  s.id === wheelSet.id ? wheelSet : s
                )
              : [...prev.tires.sets, wheelSet],
          },
        };
      });
      showToast(`Jeu « ${wheelSet.name} » enregistré`);
    },
    [showToast]
  );

  const updateTireChangeEntry = useCallback(
    (entry: TireChange) => {
      setState((prev) => ({
        ...prev,
        tires: {
          ...prev.tires,
          history: prev.tires.history.map((h) =>
            h.id === entry.id ? entry : h
          ),
        },
      }));
      showToast('Historique pneus mis à jour');
    },
    [showToast]
  );

  const deleteTireChangeEntry = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        tires: {
          ...prev.tires,
          history: prev.tires.history.filter((h) => h.id !== id),
        },
      }));
      showToast('Entrée supprimée de l’historique pneus', 'info');
    },
    [showToast]
  );

  const upsertWarranty = useCallback(
    (w: WarrantyItem) => {
      setState((prev) => {
        const exists = prev.warranties.some((x) => x.id === w.id);
        return {
          ...prev,
          warranties: exists
            ? prev.warranties.map((x) => (x.id === w.id ? w : x))
            : [...prev.warranties, w],
        };
      });
      showToast('Garantie enregistrée');
    },
    [showToast]
  );

  const deleteWarranty = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        warranties: prev.warranties.filter((w) => w.id !== id),
      }));
      showToast('Garantie supprimée', 'info');
    },
    [showToast]
  );

  const replaceFullState = useCallback(
    (next: AppState) => {
      setState(next);
      showToast('Sauvegarde importée avec succès');
    },
    [showToast]
  );

  const resetToDefault = useCallback(() => {
    setState(structuredClone(INITIAL_STATE));
    showToast('Données réinitialisées aux valeurs initiales', 'info');
  }, [showToast]);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      activeTab,
      setActiveTab,
      toast,
      showToast,
      toggleTheme,
      updateMileage,
      updateVehicleNotes,
      updateLeasing,
      updateAlpheraDates,
      updateTcs,
      addMaintenance,
      updateMaintenance,
      deleteMaintenance,
      upsertCbs,
      deleteCbs,
      performTireChange,
      planTireChange,
      markRetorqueDone,
      upsertWheelSet,
      updateTireChangeEntry,
      deleteTireChangeEntry,
      upsertWarranty,
      deleteWarranty,
      replaceFullState,
      resetToDefault,
      quickMileageOpen,
      setQuickMileageOpen,
      tireChangeOpen,
      setTireChangeOpen,
      tirePlanOpen,
      setTirePlanOpen,
      galleryIndex,
      openGallery,
      closeGallery,
    }),
    [
      state,
      activeTab,
      setActiveTab,
      toast,
      showToast,
      toggleTheme,
      updateMileage,
      updateVehicleNotes,
      updateLeasing,
      updateAlpheraDates,
      updateTcs,
      addMaintenance,
      updateMaintenance,
      deleteMaintenance,
      upsertCbs,
      deleteCbs,
      performTireChange,
      planTireChange,
      markRetorqueDone,
      upsertWheelSet,
      updateTireChangeEntry,
      deleteTireChangeEntry,
      upsertWarranty,
      deleteWarranty,
      replaceFullState,
      resetToDefault,
      quickMileageOpen,
      tireChangeOpen,
      tirePlanOpen,
      galleryIndex,
      openGallery,
      closeGallery,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
