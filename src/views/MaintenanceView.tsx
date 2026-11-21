import React, { useMemo, useState } from 'react';
import {
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Disc,
  Edit3,
  Plus,
  Snowflake,
  Sun,
  Trash2,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { useApp } from '../context/AppContext';
import type {
  CbsScheduleItem,
  MaintenanceCategory,
  MaintenanceEntry,
  TireSeason,
  WheelSet,
} from '../types';
import { evaluateCbsItem } from '../utils/alerts';
import { toLocalDateStr } from '../utils/dates';
import {
  formatChf,
  formatDateCH,
  formatDateTimeCH,
  formatKm,
} from '../utils/format';
import { downloadIcsEvent } from '../utils/ics';
import { computeMileageMetrics } from '../utils/leasingMath';
import { seasonLabel } from '../utils/tires';

const CATEGORIES: MaintenanceCategory[] = [
  'Huile',
  'Service',
  'Pneus',
  'Freins',
  'MFK / Expertise',
  'Réparation',
  'Autre',
];

export const MaintenanceView: React.FC = () => {
  const {
    state,
    addMaintenance,
    updateMaintenance,
    deleteMaintenance,
    upsertCbs,
    deleteCbs,
    upsertWheelSet,
    markRetorqueDone,
    deleteTireChangeEntry,
    updateVehicleNotes,
    setTireChangeOpen,
    setTirePlanOpen,
    showToast,
  } = useApp();

  const now = useMemo(() => new Date(), []);
  const kmMetrics = useMemo(() => computeMileageMetrics(state), [state]);

  const [techDetailsOpen, setTechDetailsOpen] = useState(false);
  const [editingTechPressure, setEditingTechPressure] = useState(false);
  const [pressureInput, setPressureInput] = useState(
    state.vehicle.tirePressureNote
  );
  const [catFilter, setCatFilter] = useState<MaintenanceCategory | 'Toutes'>(
    'Toutes'
  );

  // Modal ajout/édition maintenance
  const [maintModalOpen, setMaintModalOpen] = useState(false);
  const [editingMaintId, setEditingMaintId] = useState<string | null>(null);
  const [mDate, setMDate] = useState(toLocalDateStr(new Date()));
  const [mKm, setMKm] = useState(String(state.vehicle.currentMileage));
  const [mCat, setMCat] = useState<MaintenanceCategory>('Service');
  const [mTitle, setMTitle] = useState('');
  const [mDetails, setMDetails] = useState('');
  const [mCost, setMCost] = useState('0');
  const [mBy, setMBy] = useState('Garage BMW / Spécialiste');
  const [mStatusNote, setMStatusNote] = useState('');

  // Modal ajout/édition CBS
  const [cbsModalOpen, setCbsModalOpen] = useState(false);
  const [cbsForm, setCbsForm] = useState<CbsScheduleItem>({
    id: '',
    title: '',
    category: 'Service',
  });

  // Modal édition jeu de roues
  const [wheelModalOpen, setWheelModalOpen] = useState(false);
  const [wheelForm, setWheelForm] = useState<WheelSet>({
    id: '',
    name: '',
    season: 'winter',
    rimDesc: '',
    sizeFront: '',
    sizeRear: '',
    tireBrand: '',
    tireModel: '',
    dot: '',
    treadDepthMm: undefined,
    storageLocation: '',
    notes: '',
  });

  const filteredLog = useMemo(() => {
    if (catFilter === 'Toutes') return state.maintenanceLog;
    return state.maintenanceLog.filter((m) => m.category === catFilter);
  }, [state.maintenanceLog, catFilter]);

  const totalCost = useMemo(
    () => filteredLog.reduce((sum, item) => sum + (item.cost || 0), 0),
    [filteredLog]
  );

  const openNewMaintenance = () => {
    setEditingMaintId(null);
    setMDate(toLocalDateStr(new Date()));
    setMKm(String(state.vehicle.currentMileage));
    setMCat('Service');
    setMTitle('');
    setMDetails('');
    setMCost('0');
    setMBy('Moi-même');
    setMStatusNote('');
    setMaintModalOpen(true);
  };

  const openEditMaintenance = (item: MaintenanceEntry) => {
    setEditingMaintId(item.id);
    setMDate(item.date);
    setMKm(String(item.km));
    setMCat(item.category);
    setMTitle(item.title);
    setMDetails(item.details);
    setMCost(String(item.cost));
    setMBy(item.performedBy);
    setMStatusNote(item.statusNote ?? '');
    setMaintModalOpen(true);
  };

  const saveMaintenanceForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mTitle.trim()) return;
    const payload = {
      date: mDate,
      km: Math.max(0, Math.round(Number(mKm) || state.vehicle.currentMileage)),
      category: mCat,
      title: mTitle.trim(),
      details: mDetails.trim(),
      cost: Math.max(0, Number(mCost) || 0),
      performedBy: mBy.trim() || 'Moi-même',
      statusNote: mStatusNote.trim() || undefined,
    };
    if (editingMaintId) {
      updateMaintenance({ id: editingMaintId, ...payload });
    } else {
      addMaintenance(payload);
    }
    setMaintModalOpen(false);
  };

  const openNewCbs = () => {
    setCbsForm({
      id: `cbs-${Date.now()}`,
      title: '',
      category: 'Service',
      dueKm: undefined,
      dueDate: '',
      intervalNote: '',
      toConfirm: false,
      notes: '',
      completed: false,
    });
    setCbsModalOpen(true);
  };

  const openEditCbs = (item: CbsScheduleItem) => {
    setCbsForm({ ...item });
    setCbsModalOpen(true);
  };

  const openEditWheel = (set: WheelSet) => {
    setWheelForm({ ...set });
    setWheelModalOpen(true);
  };

  const openNewWheel = () => {
    setWheelForm({
      id: `set-${Date.now()}`,
      name: '',
      season: 'winter',
      rimDesc: '',
      sizeFront: '',
      sizeRear: '',
      tireBrand: '',
      tireModel: '',
      dot: '',
      treadDepthMm: undefined,
      storageLocation: 'Dépôt / Garage personnel',
      notes: '',
    });
    setWheelModalOpen(true);
  };

  const copyVal = async (label: string, val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      showToast(`${label} copié`);
    } catch {
      showToast('Copie impossible', 'info');
    }
  };

  const cbsDotColor = (status: string) => {
    if (status === 'urgent') return '#E53935';
    if (status === 'warning' || status === 'confirm') return '#E59A1A';
    if (status === 'ok') return '#18A96B';
    return '#8B8F99';
  };

  const seasonIcon = (season: TireSeason) => {
    if (season === 'winter')
      return <Snowflake className="h-4 w-4 text-sky-500 shrink-0" />;
    if (season === 'summer')
      return <Sun className="h-4 w-4 text-[#E59A1A] shrink-0" />;
    return <Disc className="h-4 w-4 text-[#18A96B] shrink-0" />;
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* 1. Bandeau repères techniques */}
      <section className="panel overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-12 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h1 className="font-display text-base font-semibold tracking-tight">
                Repères techniques BMW X3 (B48)
              </h1>
              <button
                type="button"
                onClick={() => setTechDetailsOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0066FF] dark:text-[#4D94FF] hover:underline"
              >
                {techDetailsOpen ? 'Masquer iDrive & pressions' : 'Mesure iDrive & pressions'}
                {techDetailsOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            </div>

            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <dt className="text-[#636873] dark:text-[#8B8F99]">Huile moteur</dt>
                <dd className="mt-0.5 font-medium">{state.vehicle.oilSpec}</dd>
              </div>
              <div>
                <dt className="text-[#636873] dark:text-[#8B8F99]">
                  Écart MIN / MAX
                </dt>
                <dd className="mt-0.5 font-display text-sm font-semibold tabular-nums">
                  {state.vehicle.oilMinMaxDiffLiters.toFixed(1)} L
                </dd>
              </div>
              <div>
                <dt className="text-[#636873] dark:text-[#8B8F99]">
                  Serrage roues
                </dt>
                <dd className="mt-0.5 font-display text-sm font-semibold tabular-nums">
                  {state.tires.wheelBoltTorqueNm} Nm (étoile)
                </dd>
              </div>
              <div>
                <dt className="text-[#636873] dark:text-[#8B8F99]">
                  Châssis (VIN)
                </dt>
                <dd className="mt-0.5">
                  <button
                    type="button"
                    onClick={() => copyVal('VIN', state.vehicle.vin)}
                    className="inline-flex items-center gap-1.5 font-display font-medium hover:text-[#0066FF] dark:hover:text-[#4D94FF]"
                  >
                    <span className="truncate">{state.vehicle.vin}</span>
                    <Copy className="h-3 w-3 shrink-0 text-[#636873]" />
                  </button>
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {techDetailsOpen && (
          <div className="border-t border-[#E5E7EB] dark:border-white/[0.08] px-5 sm:px-6 py-4 grid grid-cols-1 md:grid-cols-12 gap-5 items-start text-xs">
            <div className="md:col-span-6 space-y-1">
              <div className="font-medium">Procédure mesure huile iDrive</div>
              <p className="text-[#636873] dark:text-[#8B8F99] leading-relaxed">
                Moteur à température, véhicule à plat au ralenti : Menu,
                Véhicule, Statut du véhicule, Niveau d’huile moteur, Effectuer
                mesure (~1 min). Ne jamais dépasser MAX.
              </p>
            </div>
            <div className="md:col-span-6 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">Pressions des pneus</span>
                <button
                  type="button"
                  onClick={() => {
                    setPressureInput(state.vehicle.tirePressureNote);
                    setEditingTechPressure((v) => !v);
                  }}
                  className="text-xs font-medium text-[#0066FF] dark:text-[#4D94FF]"
                >
                  {editingTechPressure ? 'Annuler' : 'Modifier'}
                </button>
              </div>
              <p className="text-[#636873] dark:text-[#8B8F99]">
                {state.vehicle.tirePressureNote}
              </p>
              {editingTechPressure && (
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={pressureInput}
                    onChange={(e) => setPressureInput(e.target.value)}
                    placeholder="Ex. 2.2 bar AV / 2.4 bar AR à froid"
                    className="flex-1 rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      updateVehicleNotes({ tirePressureNote: pressureInput });
                      setEditingTechPressure(false);
                    }}
                    className="rounded-md bg-[#0066FF] px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Enregistrer
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 2. Workspace 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Colonne gauche (5 cols) : Jeux de roues + Échéances CBS */}
        <div className="lg:col-span-5 space-y-8">
          {/* Pneus & Jeux de roues */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-2 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-3">
              <h2 className="font-display text-base font-semibold tracking-tight">
                Jeux de roues
              </h2>
              <button
                type="button"
                onClick={openNewWheel}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0066FF] dark:text-[#4D94FF] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Nouveau jeu
              </button>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setTireChangeOpen(true)}
                className="flex-1 rounded-md bg-[#0066FF] min-h-[40px] py-2.5 px-3 text-xs font-medium text-white hover:bg-[#0052CC] transition-colors"
              >
                Changer de roues
              </button>
              <button
                type="button"
                onClick={() => setTirePlanOpen(true)}
                className="rounded-md border border-[#D8DFE9] dark:border-white/[0.12] min-h-[40px] py-2.5 px-4 text-xs font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
              >
                {state.tires.planned ? 'Modifier planning' : 'Planifier'}
              </button>
            </div>

            {state.tires.planned && (
              <div className="border-l-2 border-[#E59A1A] pl-3 py-1 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    Prévu le {formatDateTimeCH(state.tires.planned.dateTime)} (
                    {seasonLabel(
                      state.tires.sets.find(
                        (s) => s.id === state.tires.planned?.toSetId
                      )?.season
                    )}
                    )
                  </div>
                  <div className="text-[11px] text-[#636873] dark:text-[#8B8F99] truncate">
                    {state.tires.planned.note || 'Changement planifié'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const toSet = state.tires.sets.find(
                      (s) => s.id === state.tires.planned?.toSetId
                    );
                    downloadIcsEvent({
                      title: `BMW X3 : Changement de roues (${seasonLabel(toSet?.season)})`,
                      description: `${toSet?.name ?? ''}. Serrage ${state.tires.wheelBoltTorqueNm} Nm.`,
                      startLocal: state.tires.planned!.dateTime,
                      filename: 'bmw-x3-changement-roues.ics',
                    });
                    showToast('Rappel .ics téléchargé');
                  }}
                  className="shrink-0 rounded-md border border-[#D8DFE9] dark:border-white/[0.12] px-2.5 py-1 text-[11px] font-medium"
                >
                  .ics
                </button>
              </div>
            )}

            <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
              {state.tires.sets.map((s) => {
                const isMounted = state.tires.mountedSetId === s.id;
                return (
                  <div key={s.id} className="py-3.5 text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {seasonIcon(s.season)}
                        <span className="font-semibold text-sm truncate">
                          {s.name}
                        </span>
                        {isMounted && (
                          <span className="shrink-0 rounded-[4px] bg-[#0066FF]/12 px-2 py-0.5 text-[10px] font-semibold text-[#0066FF] dark:text-[#4D94FF]">
                            Montées
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => openEditWheel(s)}
                        className="shrink-0 rounded-md p-1.5 text-[#636873] hover:text-[#0B0C0F] dark:text-[#8B8F99] dark:hover:text-white"
                        aria-label={`Modifier ${s.name}`}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-[#636873] dark:text-[#8B8F99]">
                      Dimensions : {s.sizeFront}
                      {s.sizeRear && s.sizeRear !== s.sizeFront
                        ? ` (AV) / ${s.sizeRear} (AR)`
                        : ''}
                      {s.tireBrand !== 'À compléter' ? `, ${s.tireBrand}` : ''}{' '}
                      {s.tireModel}
                      {s.dot ? `, DOT ${s.dot}` : ''}
                      {s.treadDepthMm !== undefined
                        ? `, ${s.treadDepthMm} mm`
                        : ''}
                    </div>
                    <div className="text-[11px] text-[#636873] dark:text-[#8B8F99]">
                      Stockage : {s.storageLocation}
                    </div>
                  </div>
                );
              })}
            </div>

            {state.tires.history.length > 0 && (
              <div className="pt-2 space-y-2">
                <div className="text-xs font-medium text-[#636873] dark:text-[#8B8F99]">
                  Historique montages ({state.tires.history.length})
                </div>
                <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
                  {state.tires.history.map((tc) => {
                    const toSet = state.tires.sets.find(
                      (s) => s.id === tc.toSetId
                    );
                    return (
                      <div key={tc.id} className="py-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">
                            Montage {toSet?.name ?? 'Jeu'} ({formatKm(tc.km)})
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!tc.retorqueDone ? (
                              <button
                                type="button"
                                onClick={() => markRetorqueDone(tc.id)}
                                className="rounded-md bg-[#E59A1A]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#B47009] dark:text-[#FBBF24]"
                              >
                                Resserrer 140 Nm
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[11px] text-[#18A96B]">
                                <Check className="h-3 w-3" /> 140 Nm OK
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteTireChangeEntry(tc.id)}
                              aria-label="Supprimer changement"
                              className="p-1 text-[#636873] hover:text-[#E53935]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="text-[11px] text-[#636873] dark:text-[#8B8F99]">
                          {formatDateTimeCH(tc.dateTime)},{' '}
                          {tc.doneBy === 'self' ? 'par moi-même' : 'garage'}
                          {tc.cost > 0 ? `, ${formatChf(tc.cost)}` : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-[11px] text-[#636873] dark:text-[#8B8F99] leading-relaxed">
              ALPHERA Protection couvre les pneus endommagés (CHF 600.– par
              pneu, CHF 2'400.– par an) et jantes (CHF 500.–). Les changements
              saisonniers sont à charge du preneur (CG leasing ch. 10.3).
            </p>
          </section>

          {/* Échéances BMW CBS & MFK */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-2 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-3">
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight">
                  Échéances BMW CBS et MFK
                </h2>
                <p className="text-xs text-[#636873] dark:text-[#8B8F99]">
                  Projection à {formatKm(kmMetrics.annualizedPace)}/an
                </p>
              </div>
              <button
                type="button"
                onClick={openNewCbs}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0066FF] dark:text-[#4D94FF] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Échéance
              </button>
            </div>

            <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
              {state.cbsSchedule.map((item) => {
                const ev = evaluateCbsItem(
                  item,
                  state,
                  kmMetrics.annualizedPace,
                  now
                );
                const dot = cbsDotColor(ev.status);
                return (
                  <div
                    key={item.id}
                    className="py-3 text-xs flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: dot }}
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-sm leading-snug">
                          {item.title}
                        </div>
                        <div className="mt-0.5 text-[#636873] dark:text-[#8B8F99]">
                          <span style={{ color: dot }} className="font-medium">
                            {ev.label}
                          </span>
                          {' — '}
                          {ev.detail}
                          {item.dueKm !== undefined
                            ? ` (cible ${formatKm(item.dueKm)})`
                            : ''}
                          {ev.estimatedDate
                            ? `, estimé ~${formatDateCH(ev.estimatedDate)}`
                            : ''}
                        </div>
                        {item.notes && (
                          <div className="mt-0.5 text-[11px] text-[#636873] dark:text-[#8B8F99]">
                            {item.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      {item.dueDate && !item.completed && (
                        <button
                          type="button"
                          onClick={() => {
                            downloadIcsEvent({
                              title: `BMW X3 : ${item.title}`,
                              description: item.intervalNote ?? item.notes ?? '',
                              startLocal: `${item.dueDate!}T09:00`,
                              filename: `bmw-x3-${item.id}.ics`,
                            });
                            showToast('Rappel .ics téléchargé');
                          }}
                          aria-label="Ajouter au calendrier"
                          className="p-1.5 rounded-md text-[#636873] hover:text-[#0B0C0F] dark:text-[#8B8F99] dark:hover:text-white"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          upsertCbs({ ...item, completed: !item.completed })
                        }
                        aria-label="Basculer effectué"
                        className={`p-1.5 rounded-md ${
                          item.completed
                            ? 'text-[#18A96B]'
                            : 'text-[#636873] dark:text-[#8B8F99] hover:text-[#18A96B]'
                        }`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditCbs(item)}
                        aria-label={`Modifier ${item.title}`}
                        className="p-1.5 rounded-md text-[#636873] dark:text-[#8B8F99] hover:text-[#0B0C0F] dark:hover:text-white"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Colonne droite (7 cols) : Journal chronologique d'entretien */}
        <section className="lg:col-span-7 panel p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold tracking-tight">
                Journal d’entretien
              </h2>
              <p className="text-xs text-[#636873] dark:text-[#8B8F99] tabular-nums">
                {filteredLog.length} entrée{filteredLog.length > 1 ? 's' : ''},
                total {formatChf(totalCost)}
              </p>
            </div>
            <button
              type="button"
              onClick={openNewMaintenance}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0066FF] min-h-[36px] px-3.5 py-2 text-xs font-medium text-white hover:bg-[#0052CC] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {(['Toutes', ...CATEGORIES] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCatFilter(cat)}
                className={`shrink-0 rounded-md min-h-[34px] px-3 py-1.5 text-xs font-medium transition-colors ${
                  catFilter === cat
                    ? 'bg-[#0B0C0F] text-white dark:bg-[#F5F5F7] dark:text-[#050507]'
                    : 'border border-[#D8DFE9] dark:border-white/[0.1] text-[#636873] dark:text-[#8B8F99] hover:text-[#0B0C0F] dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredLog.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#636873] dark:text-[#8B8F99]">
              Aucune intervention enregistrée dans cette catégorie.
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
              {filteredLog.map((entry) => (
                <div key={entry.id} className="py-4 first:pt-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-[#0066FF] dark:text-[#4D94FF]">
                          {entry.category}
                        </span>
                        <h3 className="text-sm font-medium">{entry.title}</h3>
                      </div>
                      <div className="mt-0.5 text-xs text-[#636873] dark:text-[#8B8F99] tabular-nums">
                        {formatDateCH(entry.date)}, {formatKm(entry.km)},{' '}
                        {entry.performedBy}
                      </div>
                    </div>
                    <div className="font-display text-sm font-semibold tabular-nums shrink-0">
                      {formatChf(entry.cost)}
                    </div>
                  </div>

                  {entry.details && (
                    <p className="text-xs text-[#636873] dark:text-[#8B8F99] leading-relaxed">
                      {entry.details}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    {entry.statusNote ? (
                      <span className="text-[11px] font-medium text-[#18A96B]">
                        {entry.statusNote}
                      </span>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditMaintenance(entry)}
                        className="rounded-md p-1.5 text-[#636873] hover:text-[#0B0C0F] dark:text-[#8B8F99] dark:hover:text-white"
                        aria-label={`Modifier ${entry.title}`}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteMaintenance(entry.id)}
                        className="rounded-md p-1.5 text-[#636873] hover:text-[#E53935]"
                        aria-label={`Supprimer ${entry.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal Ajout/Édition Maintenance */}
      <Modal
        open={maintModalOpen}
        onClose={() => setMaintModalOpen(false)}
        title={
          editingMaintId
            ? 'Modifier l’intervention'
            : 'Nouvelle ligne d’entretien'
        }
      >
        <form onSubmit={saveMaintenanceForm} className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                Date
              </label>
              <input
                type="date"
                value={mDate}
                onChange={(e) => setMDate(e.target.value)}
                required
                className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                Kilométrage (km)
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={mKm}
                onChange={(e) => setMKm(e.target.value)}
                required
                className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                Catégorie
              </label>
              <select
                value={mCat}
                onChange={(e) => setMCat(e.target.value as MaintenanceCategory)}
                className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-white dark:bg-[#0D1119] px-3 py-2 text-xs"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                Coût (CHF)
              </label>
              <input
                type="number"
                step="0.05"
                min="0"
                value={mCost}
                onChange={(e) => setMCost(e.target.value)}
                className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
              Titre de l’intervention
            </label>
            <input
              type="text"
              required
              value={mTitle}
              onChange={(e) => setMTitle(e.target.value)}
              placeholder="Ex. Grand Service 60'000 km / Vidange LL-04"
              className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
              Détails (pièces, huile, remarques)
            </label>
            <textarea
              rows={2}
              value={mDetails}
              onChange={(e) => setMDetails(e.target.value)}
              placeholder="Ex. Bougies, filtre à air, microfiltre..."
              className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                Réalisé par
              </label>
              <input
                type="text"
                value={mBy}
                onChange={(e) => setMBy(e.target.value)}
                className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                Statut (optionnel)
              </label>
              <input
                type="text"
                value={mStatusNote}
                onChange={(e) => setMStatusNote(e.target.value)}
                placeholder="Ex. Facture archivée"
                className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMaintModalOpen(false)}
              className="flex-1 rounded-md border border-[#D8DFE9] dark:border-white/[0.14] py-2.5 text-xs font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-[#0066FF] py-2.5 text-xs font-medium text-white"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Échéance CBS */}
      <Modal
        open={cbsModalOpen}
        onClose={() => setCbsModalOpen(false)}
        title="Échéance BMW CBS / MFK"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!cbsForm.title.trim()) return;
            upsertCbs(cbsForm);
            setCbsModalOpen(false);
          }}
          className="space-y-3"
        >
          <div>
            <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
              Libellé
            </label>
            <input
              type="text"
              required
              value={cbsForm.title}
              onChange={(e) =>
                setCbsForm({ ...cbsForm, title: e.target.value })
              }
              className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                Kilométrage cible
              </label>
              <input
                type="number"
                value={cbsForm.dueKm ?? ''}
                onChange={(e) =>
                  setCbsForm({
                    ...cbsForm,
                    dueKm: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                placeholder="Ex. 68000"
                className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                Date cible
              </label>
              <input
                type="date"
                value={cbsForm.dueDate ?? ''}
                onChange={(e) =>
                  setCbsForm({
                    ...cbsForm,
                    dueDate: e.target.value || undefined,
                  })
                }
                className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
              Notes
            </label>
            <input
              type="text"
              value={cbsForm.notes ?? ''}
              onChange={(e) =>
                setCbsForm({ ...cbsForm, notes: e.target.value })
              }
              className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
            />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={Boolean(cbsForm.toConfirm)}
              onChange={(e) =>
                setCbsForm({ ...cbsForm, toConfirm: e.target.checked })
              }
              className="h-4 w-4 accent-[#0066FF]"
            />
            Marquer « À confirmer (iDrive / SAN) »
          </label>
          <div className="flex gap-2 pt-1">
            {state.cbsSchedule.some((c) => c.id === cbsForm.id) && (
              <button
                type="button"
                onClick={() => {
                  deleteCbs(cbsForm.id);
                  setCbsModalOpen(false);
                }}
                className="rounded-md border border-[#E53935]/35 px-3 py-2 text-[#E53935]"
                aria-label="Supprimer échéance"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setCbsModalOpen(false)}
              className="flex-1 rounded-md border border-[#D8DFE9] dark:border-white/[0.14] py-2 text-xs font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-[#0066FF] py-2 text-xs font-medium text-white"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Jeu de roues */}
      <Modal
        open={wheelModalOpen}
        onClose={() => setWheelModalOpen(false)}
        title="Détails du jeu de roues"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!wheelForm.name.trim()) return;
            upsertWheelSet(wheelForm);
            setWheelModalOpen(false);
          }}
          className="space-y-3"
        >
          <div className="grid grid-cols-3 gap-1.5">
            {(['summer', 'winter', 'allseason'] as TireSeason[]).map((se) => (
              <button
                key={se}
                type="button"
                onClick={() => setWheelForm({ ...wheelForm, season: se })}
                className={`rounded-md py-1.5 text-xs font-medium border ${
                  wheelForm.season === se
                    ? 'border-[#0066FF] bg-[#0066FF] text-white'
                    : 'border-[#D8DFE9] dark:border-white/[0.14]'
                }`}
              >
                {seasonLabel(se)}
              </button>
            ))}
          </div>
          <input
            type="text"
            required
            value={wheelForm.name}
            onChange={(e) =>
              setWheelForm({ ...wheelForm, name: e.target.value })
            }
            placeholder="Désignation du jeu"
            className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={wheelForm.sizeFront}
              onChange={(e) =>
                setWheelForm({ ...wheelForm, sizeFront: e.target.value })
              }
              placeholder="Dimensions AV"
              className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={wheelForm.sizeRear}
              onChange={(e) =>
                setWheelForm({ ...wheelForm, sizeRear: e.target.value })
              }
              placeholder="Dimensions AR"
              className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={wheelForm.tireBrand}
              onChange={(e) =>
                setWheelForm({ ...wheelForm, tireBrand: e.target.value })
              }
              placeholder="Marque pneu"
              className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
            />
            <input
              type="text"
              value={wheelForm.tireModel}
              onChange={(e) =>
                setWheelForm({ ...wheelForm, tireModel: e.target.value })
              }
              placeholder="Modèle pneu"
              className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={wheelForm.dot}
              onChange={(e) =>
                setWheelForm({ ...wheelForm, dot: e.target.value })
              }
              placeholder="DOT (ex. 2425)"
              className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-2.5 py-2 text-xs"
            />
            <input
              type="number"
              step="0.5"
              min="0"
              max="12"
              value={wheelForm.treadDepthMm ?? ''}
              onChange={(e) =>
                setWheelForm({
                  ...wheelForm,
                  treadDepthMm: e.target.value
                    ? Number(e.target.value)
                    : undefined,
                })
              }
              placeholder="Prof. mm"
              className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-2.5 py-2 text-xs"
            />
            <input
              type="text"
              value={wheelForm.storageLocation}
              onChange={(e) =>
                setWheelForm({ ...wheelForm, storageLocation: e.target.value })
              }
              placeholder="Stockage"
              className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-2.5 py-2 text-xs"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setWheelModalOpen(false)}
              className="flex-1 rounded-md border border-[#D8DFE9] dark:border-white/[0.14] py-2 text-xs font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-[#0066FF] py-2 text-xs font-medium text-white"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
