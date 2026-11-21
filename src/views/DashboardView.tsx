import React, { useMemo } from 'react';
import {
  Calendar,
  CalendarPlus,
  Check,
  Copy,
  Disc,
  Edit3,
  Snowflake,
  Sun,
} from 'lucide-react';
import { MileageGauge } from '../components/MileageGauge';
import { useApp } from '../context/AppContext';
import type { AppAlert } from '../types';
import { buildActiveAlerts } from '../utils/alerts';
import { diffDaysLocal, getContractMonth, parseLocalDate } from '../utils/dates';
import {
  formatChf,
  formatDateCH,
  formatDateTimeCH,
  formatKm,
  formatRelativeDay,
} from '../utils/format';
import { downloadIcsEvent } from '../utils/ics';
import { computeMileageMetrics } from '../utils/leasingMath';
import { seasonLabel } from '../utils/tires';

export const DashboardView: React.FC = () => {
  const {
    state,
    setActiveTab,
    setQuickMileageOpen,
    setTireChangeOpen,
    setTirePlanOpen,
    markRetorqueDone,
    showToast,
  } = useApp();

  const now = useMemo(() => new Date(), []);
  const kmMetrics = useMemo(() => computeMileageMetrics(state), [state]);
  const alerts = useMemo(() => buildActiveAlerts(state, now), [state, now]);
  const contractMonth = useMemo(
    () =>
      getContractMonth(
        state.leasing.startDate,
        now,
        state.leasing.durationMonths
      ),
    [state.leasing.startDate, state.leasing.durationMonths, now]
  );

  const mountedSet = state.tires.sets.find(
    (s) => s.id === state.tires.mountedSetId
  );
  const lastTireChange = state.tires.history[0];
  const daysSinceMount = lastTireChange
    ? Math.max(
        0,
        diffDaysLocal(parseLocalDate(lastTireChange.dateTime), now)
      )
    : null;
  const kmSinceMount = lastTireChange
    ? Math.max(0, state.vehicle.currentMileage - lastTireChange.km)
    : null;

  const monthlyConsolidated =
    state.leasing.monthlyPayment +
    state.smile.monthlyEquivalent +
    state.leasing.monthlySafetySavings;

  const leasingSharePct =
    monthlyConsolidated > 0
      ? (state.leasing.monthlyPayment / monthlyConsolidated) * 100
      : 0;
  const smileSharePct =
    monthlyConsolidated > 0
      ? (state.smile.monthlyEquivalent / monthlyConsolidated) * 100
      : 0;
  const savingsSharePct = Math.max(0, 100 - leasingSharePct - smileSharePct);

  const handleAlertAction = (alert: AppAlert) => {
    switch (alert.actionType) {
      case 'open-tire-change':
        setTireChangeOpen(true);
        break;
      case 'open-tire-plan':
        setTirePlanOpen(true);
        break;
      case 'mark-retorque':
        markRetorqueDone();
        break;
      case 'go-insurance':
        setActiveTab('insurance');
        break;
      case 'go-maintenance':
        setActiveTab('maintenance');
        break;
      case 'go-leasing':
        setActiveTab('leasing');
        break;
      case 'go-documents':
        setActiveTab('documents');
        break;
    }
  };

  const seasonVisual = () => {
    if (mountedSet?.season === 'winter') {
      return {
        label: 'Hiver',
        color: 'text-sky-600 dark:text-sky-400',
        Icon: Snowflake,
      };
    }
    if (mountedSet?.season === 'summer') {
      return {
        label: 'Été',
        color: 'text-[#D97706] dark:text-[#F59E0B]',
        Icon: Sun,
      };
    }
    return {
      label: '4 saisons',
      color: 'text-[#18A96B]',
      Icon: Disc,
    };
  };

  const sv = seasonVisual();
  const SeasonIcon = sv.Icon;

  const severityMeta = (sev: AppAlert['severity']) => {
    if (sev === 'urgent') return { dot: '#E53935', label: 'Urgent' };
    if (sev === 'warning') return { dot: '#E59A1A', label: 'À prévoir' };
    if (sev === 'confirm') return { dot: '#E59A1A', label: 'À confirmer' };
    return { dot: '#0066FF', label: 'Info' };
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Bandeau Héro sculptural unifié */}
      <section className="panel overflow-hidden">
        <div className="relative w-full overflow-hidden bg-gradient-to-r from-[#0B1220] via-[#111C32] to-[#0A0E17] px-5 sm:px-7 py-5 sm:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-base sm:text-xl font-semibold tracking-tight text-white">
                {state.vehicle.brandModel}
              </h1>
              <p className="mt-0.5 text-xs text-white/70">
                {state.vehicle.color} · {state.vehicle.engine}
              </p>
            </div>
            <span className="ch-plate">{state.vehicle.plate}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 border-t border-[#E5E7EB] dark:border-white/[0.08]">
          {/* Gauche : Compteur & Instrument kilométrique */}
          <div className="lg:col-span-7 p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div>
              <div className="text-xs text-[#636873] dark:text-[#8B8F99]">
                Compteur au {formatDateCH(state.vehicle.lastMileageDate)}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="font-display text-2xl sm:text-3xl font-semibold tracking-[-0.02em] tabular-nums">
                  {formatKm(state.vehicle.currentMileage).replace(' km', '')}
                </span>
                <span className="font-display text-sm sm:text-base text-[#636873] dark:text-[#8B8F99]">
                  km
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[#636873] dark:text-[#8B8F99]">
                Mois {contractMonth} sur {state.leasing.durationMonths} (leasing
                Alphera), +{formatKm(kmMetrics.kmDriven)} parcourus depuis la
                livraison
              </p>
            </div>

            <button
              type="button"
              onClick={() => setQuickMileageOpen(true)}
              className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-1.5 rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-white/80 dark:bg-white/[0.05] min-h-[38px] sm:min-h-[34px] px-3.5 py-2 text-xs sm:text-[13px] font-medium hover:border-[#0066FF] transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5 text-[#0066FF] dark:text-[#4D94FF]" />
              Mettre à jour
            </button>
          </div>

          <MileageGauge
            metrics={kmMetrics}
            annualAllowance={state.leasing.annualKmAllowance}
            targetExitKm={state.leasing.targetExitKmMax}
          />
        </div>

        {/* Droite : Roues montées & Changement DIY */}
        <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-[#E5E7EB] dark:border-white/[0.08] p-5 sm:p-7 flex flex-col justify-between gap-6 bg-black/[0.02] dark:bg-white/[0.015]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#636873] dark:text-[#8B8F99]">
                Roues montées
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-medium ${sv.color}`}
              >
                <SeasonIcon className="h-3.5 w-3.5" />
                {sv.label}
              </span>
            </div>

            <div>
              <h2 className="font-display text-base sm:text-lg font-semibold tracking-tight">
                {mountedSet?.name ?? 'Jeu non défini'}
              </h2>
              <p className="mt-1 text-xs text-[#636873] dark:text-[#8B8F99] leading-relaxed">
                {daysSinceMount !== null && kmSinceMount !== null
                  ? `Montées il y a ${daysSinceMount} jours, ${formatKm(kmSinceMount)} parcourus depuis le montage.`
                  : mountedSet?.notes || 'État initial au 21.11.2026.'}
              </p>
            </div>

            {state.tires.planned && (
              <div className="border-l-2 border-[#E59A1A] pl-3 py-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium">
                    Passage en{' '}
                    {seasonLabel(
                      state.tires.sets.find(
                        (s) => s.id === state.tires.planned?.toSetId
                      )?.season
                    )}{' '}
                    prévu
                  </span>
                  <button
                    type="button"
                    onClick={() => setTirePlanOpen(true)}
                    className="text-xs font-medium text-[#0066FF] dark:text-[#4D94FF] hover:underline"
                  >
                    Modifier
                  </button>
                </div>
                <div className="text-xs text-[#636873] dark:text-[#8B8F99]">
                  {formatRelativeDay(state.tires.planned.dateTime, now)},{' '}
                  {formatDateTimeCH(state.tires.planned.dateTime)} (
                  {state.tires.planned.doneBy === 'self'
                    ? 'par moi-même'
                    : 'garage'}
                  )
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => setTireChangeOpen(true)}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-[#0066FF] min-h-[42px] sm:min-h-[38px] px-4 py-2.5 text-xs sm:text-[13px] font-medium text-white hover:bg-[#0052CC] transition-colors"
            >
              <Check className="h-4 w-4" />
              Changer de roues
            </button>
            <button
              type="button"
              onClick={() => setTirePlanOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#D8DFE9] dark:border-white/[0.12] min-h-[42px] sm:min-h-[38px] px-4 py-2.5 text-xs sm:text-[13px] font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
            >
              <Calendar className="h-3.5 w-3.5" />
              Planifier
            </button>
          </div>
        </div>
        </div>
      </section>

      {/* Grille éditoriale ouverte : Points d'attention + Budget & Repères */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Points d'attention */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-baseline justify-between border-b border-[#E5E7EB] dark:border-white/[0.08] pb-3">
            <h2 className="font-display text-base font-semibold tracking-tight">
              Points d’attention
            </h2>
            <span className="text-xs text-[#636873] dark:text-[#8B8F99] tabular-nums">
              {alerts.length} élément{alerts.length > 1 ? 's' : ''}
            </span>
          </div>

          {alerts.length === 0 ? (
            <p className="py-4 text-sm text-[#18A96B]">
              Aucune échéance urgente ou action en attente.
            </p>
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
              {alerts.map((al) => {
                const meta = severityMeta(al.severity);
                return (
                  <div key={al.id} className="py-4 first:pt-1 space-y-2">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: meta.dot }}
                        title={meta.label}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-sm font-medium leading-snug">
                            {al.title}
                          </h3>
                          <span
                            className="mt-0.5 text-[11px] font-medium shrink-0"
                            style={{ color: meta.dot }}
                          >
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#636873] dark:text-[#8B8F99] leading-relaxed">
                          {al.subtitle}
                        </p>

                        {(al.actionLabel || al.icsEvent) && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            {al.actionLabel && (
                              <button
                                type="button"
                                onClick={() => handleAlertAction(al)}
                                className="rounded-md bg-[#0B0C0F] dark:bg-white/[0.1] min-h-[34px] px-3 py-1.5 text-xs font-medium text-white hover:opacity-85 transition-opacity"
                              >
                                {al.actionLabel}
                              </button>
                            )}
                            {al.icsEvent && (
                              <button
                                type="button"
                                onClick={() => {
                                  downloadIcsEvent(al.icsEvent!);
                                  showToast('Rappel calendrier (.ics) téléchargé');
                                }}
                                className="inline-flex items-center gap-1.5 rounded-md border border-[#D8DFE9] dark:border-white/[0.12] min-h-[34px] px-3 py-1.5 text-xs font-medium text-[#636873] dark:text-[#8B8F99] hover:text-[#0B0C0F] dark:hover:text-white transition-colors"
                              >
                                <CalendarPlus className="h-3 w-3" />
                                Ajouter au calendrier
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Budget mensuel & Repères */}
        <div className="lg:col-span-5 space-y-8">
          <section className="panel p-5 sm:p-6 space-y-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-display text-base font-semibold tracking-tight">
                Budget mensuel
              </h2>
              <span className="font-display text-lg font-semibold tabular-nums whitespace-nowrap shrink-0">
                {formatChf(monthlyConsolidated)}
                <span className="text-xs font-normal text-[#636873] dark:text-[#8B8F99]">
                  {' '}
                  / mois
                </span>
              </span>
            </div>

            <div className="flex h-1 w-full overflow-hidden rounded-[2px] bg-black/[0.06] dark:bg-white/[0.08]">
              <div
                className="bg-[#007AB8]"
                style={{ width: `${leasingSharePct}%` }}
              />
              <div
                className="bg-[#F26B00]"
                style={{ width: `${smileSharePct}%` }}
              />
              <div
                className="bg-[#18A96B]"
                style={{ width: `${savingsSharePct}%` }}
              />
            </div>

            <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.06] text-xs">
              <div className="flex justify-between items-center py-2.5">
                <span className="inline-flex items-center gap-2 text-[#636873] dark:text-[#8B8F99]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#007AB8]" />
                  Leasing Alphera (60 mois)
                </span>
                <span className="font-medium tabular-nums">
                  {formatChf(state.leasing.monthlyPayment)}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="inline-flex items-center gap-2 text-[#636873] dark:text-[#8B8F99]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F26B00]" />
                  Assurance Smile
                </span>
                <span className="font-medium tabular-nums">
                  {formatChf(state.smile.monthlyEquivalent)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('leasing')}
                className="w-full flex justify-between items-center py-2.5 text-left hover:text-[#0066FF] dark:hover:text-[#4D94FF] transition-colors"
              >
                <span className="inline-flex items-center gap-2 text-[#636873] dark:text-[#8B8F99]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#18A96B]" />
                  Épargne de sécurité sortie
                </span>
                <span className="font-medium tabular-nums underline decoration-dotted underline-offset-4">
                  {formatChf(state.leasing.monthlySafetySavings)}
                </span>
              </button>
            </div>
          </section>

          <section className="hidden md:block space-y-3">
            <h2 className="font-display text-base font-semibold tracking-tight pb-2 border-b border-[#E5E7EB] dark:border-white/[0.08]">
              Repères véhicule
            </h2>
            <dl className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-[#636873] dark:text-[#8B8F99]">
                  1re mise en circulation
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {formatDateCH(state.vehicle.firstRegistrationDate)}
                </dd>
              </div>
              <div>
                <dt className="text-[#636873] dark:text-[#8B8F99]">
                  Prise d’effet Smile Car
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {formatDateCH(state.smile.startDate)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[#636873] dark:text-[#8B8F99]">
                  Numéro de châssis (VIN)
                </dt>
                <dd className="mt-1">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(state.vehicle.vin);
                        showToast('VIN copié dans le presse-papier');
                      } catch {
                        showToast('Copie manuelle requise', 'info');
                      }
                    }}
                    className="inline-flex items-center gap-2 text-xs font-medium hover:text-[#0066FF] dark:hover:text-[#4D94FF] transition-colors"
                  >
                    <span className="font-display tracking-wide">
                      {state.vehicle.vin}
                    </span>
                    <Copy className="h-3.5 w-3.5 text-[#636873] dark:text-[#8B8F99]" />
                  </button>
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
};
