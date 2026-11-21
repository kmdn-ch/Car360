import React, { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronDown, ChevronUp, Phone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  endOfContractMonthDate,
  getContractMonth,
  toLocalDateStr,
} from '../utils/dates';
import { formatChf, formatDateCH, formatKm, telHref } from '../utils/format';
import {
  accumulatedSavings,
  buildSimulationSeries,
  buyoutDetails,
  computeMileageMetrics,
  estimateMarketValue,
  restitutionDetails,
  type ResaleMode,
} from '../utils/leasingMath';

export const LeasingView: React.FC = () => {
  const { state, updateLeasing } = useApp();
  const { leasing, vehicle } = state;

  const now = useMemo(() => new Date(), []);
  const currentMonth = useMemo(
    () => getContractMonth(leasing.startDate, now, leasing.durationMonths),
    [leasing.startDate, leasing.durationMonths, now]
  );
  const kmMetrics = useMemo(() => computeMileageMetrics(state), [state]);

  const [exitMonth, setExitMonth] = useState<number>(48);
  const [projectedKm, setProjectedKm] = useState<number>(145000);
  const [scenario, setScenario] = useState<'buyout' | 'restitution'>('buyout');
  const [resaleMode, setResaleMode] = useState<ResaleMode>('garage');
  const [marketAdjustPct, setMarketAdjustPct] = useState<number>(0);
  const [overrideInput, setOverrideInput] = useState<string>('');
  const [contractOpen, setContractOpen] = useState<boolean>(false);

  const overrideValue =
    overrideInput.trim() && Number(overrideInput) > 0
      ? Number(overrideInput)
      : undefined;

  const exitDate = useMemo(
    () => endOfContractMonthDate(leasing.startDate, exitMonth),
    [leasing.startDate, exitMonth]
  );

  const buyout = useMemo(
    () => buyoutDetails(exitMonth, leasing),
    [exitMonth, leasing]
  );
  const restit = useMemo(
    () => restitutionDetails(exitMonth, projectedKm, state),
    [exitMonth, projectedKm, state]
  );
  const marketVal = useMemo(
    () =>
      estimateMarketValue(
        exitMonth,
        projectedKm,
        resaleMode,
        marketAdjustPct,
        state,
        overrideValue
      ),
    [exitMonth, projectedKm, resaleMode, marketAdjustPct, state, overrideValue]
  );
  const savings = useMemo(
    () =>
      accumulatedSavings(
        exitMonth,
        currentMonth,
        leasing.monthlySafetySavings,
        leasing.existingSafetySavings
      ),
    [
      exitMonth,
      currentMonth,
      leasing.monthlySafetySavings,
      leasing.existingSafetySavings,
    ]
  );

  const netBuyout = Math.round(buyout.totalBuyout - marketVal - savings);
  const netRestitution = Math.round(restit.totalRestitutionCost - savings);
  const activeNet = scenario === 'buyout' ? netBuyout : netRestitution;
  const bestOption = netBuyout <= netRestitution ? 'buyout' : 'restitution';
  const bestDelta = Math.abs(netBuyout - netRestitution);

  const chartData = useMemo(
    () =>
      buildSimulationSeries(
        state,
        exitMonth,
        projectedKm,
        resaleMode,
        marketAdjustPct,
        leasing.monthlySafetySavings,
        overrideValue,
        now
      ),
    [
      state,
      exitMonth,
      projectedKm,
      resaleMode,
      marketAdjustPct,
      leasing.monthlySafetySavings,
      overrideValue,
      now,
    ]
  );

  const netColor =
    activeNet <= leasing.targetNetShortfallMax
      ? 'text-[#18A96B]'
      : activeNet <= 3000
        ? 'text-[#E59A1A]'
        : 'text-[#E53935]';

  const applyPresetKm = (preset: 'target145' | 'allowance25' | 'currentPace') => {
    if (preset === 'target145') {
      const targetAtM =
        vehicle.startMileage +
        Math.round(
          ((leasing.targetExitKmMax - vehicle.startMileage) /
            leasing.targetExitMonthMin) *
            exitMonth
        );
      setProjectedKm(Math.max(vehicle.currentMileage, targetAtM));
    } else if (preset === 'allowance25') {
      const prorata =
        vehicle.startMileage +
        Math.round((leasing.annualKmAllowance * exitMonth) / 12);
      setProjectedKm(Math.max(vehicle.currentMileage, prorata));
    } else {
      const yearsForward = Math.max(0, (exitMonth - currentMonth) / 12);
      setProjectedKm(
        Math.round(vehicle.currentMileage + kmMetrics.annualizedPace * yearsForward)
      );
    }
  };

  const progressPct = Math.round((currentMonth / leasing.durationMonths) * 100);

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* 1. Bandeau contrat Alphera */}
      <section className="panel overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-12 p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex h-7 items-center rounded-[5px] bg-white px-2 py-1 border border-black/10 shrink-0">
                  <img
                    src="/images/logos/alphera.png"
                    alt="ALPHERA Financial Services"
                    className="h-5 w-auto object-contain"
                  />
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-[#636873] dark:text-[#8B8F99] whitespace-nowrap">
                    Contrat Alphera {leasing.contractNumber}
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-3 flex-wrap">
                    <h1 className="font-display text-xl font-semibold tabular-nums">
                      Mois {currentMonth} sur {leasing.durationMonths}
                    </h1>
                    <span className="text-xs text-[#636873] dark:text-[#8B8F99]">
                      du {formatDateCH(leasing.startDate)} au{' '}
                      {formatDateCH(leasing.endDate)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-5 flex-wrap">
                <div className="hidden md:flex items-center gap-6 text-xs">
                  <div>
                    <span className="text-[#636873] dark:text-[#8B8F99]">
                      Mensualité{' '}
                    </span>
                    <strong className="font-display tabular-nums">
                      {formatChf(leasing.monthlyPayment)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#636873] dark:text-[#8B8F99]">
                      Forfait{' '}
                    </span>
                    <strong className="font-display tabular-nums">
                      {formatKm(leasing.annualKmAllowance)}/an
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#636873] dark:text-[#8B8F99]">
                      VR M60{' '}
                    </span>
                    <strong className="font-display tabular-nums">
                      {formatChf(leasing.residualValue)}
                    </strong>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setContractOpen((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#0066FF] dark:text-[#4D94FF] hover:underline"
                >
                  Détails du contrat
                  {contractOpen ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="h-[2px] w-full bg-[#E5E7EB] dark:bg-white/[0.08] overflow-hidden">
              <div
                className="h-full bg-[#0066FF]"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-[#636873] dark:text-[#8B8F99] tabular-nums">
              <span>Départ {formatKm(vehicle.startMileage)}</span>
              <span>Fenêtre cible : M48 à M57</span>
              <span>VR {formatChf(leasing.residualValue)}</span>
            </div>
          </div>
        </div>

        {contractOpen && (
          <div className="border-t border-[#E5E7EB] dark:border-white/[0.08] px-5 sm:px-6 py-4 text-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-[#FAFAFB]/60 dark:bg-white/[0.015]">
            <div>
              <span className="text-[#636873] dark:text-[#8B8F99] block text-[11px]">
                Prix net / Acompte
              </span>
              <span className="font-medium tabular-nums">
                {formatChf(leasing.netVehiclePrice)} /{' '}
                {formatChf(leasing.downPayment)}
              </span>
            </div>
            <div>
              <span className="text-[#636873] dark:text-[#8B8F99] block text-[11px]">
                Taux nominal / effectif
              </span>
              <span className="font-medium tabular-nums">
                {leasing.nominalRatePct.toFixed(3)}% /{' '}
                {leasing.effectiveRatePct.toFixed(3)}%
              </span>
            </div>
            <div>
              <span className="text-[#636873] dark:text-[#8B8F99] block text-[11px]">
                Forfait / Km supp.
              </span>
              <span className="font-medium tabular-nums">
                {formatKm(leasing.annualKmAllowance)}/an,{' '}
                {formatChf(leasing.excessKmFee)}/km
              </span>
            </div>
            <div>
              <span className="text-[#636873] dark:text-[#8B8F99] block text-[11px]">
                Frais sortie / Préavis
              </span>
              <span className="font-medium tabular-nums">
                {leasing.earlyTerminationFeePct}% (min{' '}
                {formatChf(leasing.earlyTerminationFeeMin)}),{' '}
                {leasing.noticeDays} j
              </span>
            </div>
            <div>
              <span className="text-[#636873] dark:text-[#8B8F99] block text-[11px]">
                Agent livraison
              </span>
              <span className="font-medium">
                {leasing.dealer} ({leasing.dealerAdvisor})
              </span>
            </div>
            <div className="flex items-center">
              <a
                href={telHref(leasing.lenderPhone)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0066FF] dark:text-[#4D94FF] hover:underline"
              >
                <Phone className="h-3 w-3" />
                Alphera {leasing.lenderPhone}
              </a>
            </div>
          </div>
        )}
      </section>

      {/* 2. Cockpit Simulateur */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Contrôles */}
        <section className="lg:col-span-5 panel p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-semibold tracking-tight">
              Paramètres de sortie
            </h2>
            {exitMonth >= leasing.targetExitMonthMin &&
              exitMonth <= leasing.targetExitMonthMax && (
                <span className="text-xs font-medium text-[#18A96B]">
                  Zone cible
                </span>
              )}
          </div>

          <div>
            <div className="flex justify-between text-xs mb-2.5">
              <span className="text-[#636873] dark:text-[#8B8F99]">
                Mois de sortie
              </span>
              <span className="font-display font-semibold tabular-nums">
                Mois {exitMonth} ({formatDateCH(toLocalDateStr(exitDate))})
              </span>
            </div>
            <input
              type="range"
              min={36}
              max={60}
              step={1}
              value={exitMonth}
              aria-label="Mois de sortie"
              onChange={(e) => setExitMonth(Number(e.target.value))}
              className="w-full bmw-range"
            />
            <div className="mt-1.5 flex justify-between text-[11px] text-[#636873] dark:text-[#8B8F99] tabular-nums">
              <span>M36</span>
              <span className="text-[#18A96B] font-medium">M48 (04.2030)</span>
              <span className="text-[#18A96B] font-medium">M57 (01.2031)</span>
              <span>M60</span>
            </div>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-[#E5E7EB] dark:border-white/[0.08]">
            <div className="flex justify-between items-center text-xs gap-2">
              <span className="text-[#636873] dark:text-[#8B8F99]">
                Kilométrage projeté à M{exitMonth}
              </span>
              <input
                type="number"
                step={500}
                min={vehicle.currentMileage}
                max={250000}
                value={projectedKm}
                aria-label="Kilométrage projeté"
                onChange={(e) =>
                  setProjectedKm(
                    Math.max(
                      vehicle.currentMileage,
                      Number(e.target.value) || 0
                    )
                  )
                }
                className="w-28 rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-2.5 py-1 text-right font-display text-xs font-semibold tabular-nums"
              />
            </div>
            <input
              type="range"
              min={Math.max(vehicle.currentMileage, 90000)}
              max={220000}
              step={1000}
              value={projectedKm}
              aria-label="Curseur kilométrage projeté"
              onChange={(e) => setProjectedKm(Number(e.target.value))}
              className="w-full bmw-range"
            />
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => applyPresetKm('target145')}
                className="rounded-md border border-[#D8DFE9] dark:border-white/[0.12] min-h-[36px] px-3 py-1.5 text-[11px] font-medium hover:border-[#0066FF]"
              >
                Cible 145k (M48)
              </button>
              <button
                type="button"
                onClick={() => applyPresetKm('allowance25')}
                className="rounded-md border border-[#D8DFE9] dark:border-white/[0.12] min-h-[36px] px-3 py-1.5 text-[11px] font-medium hover:border-[#0066FF]"
              >
                Forfait 25k/an
              </button>
              <button
                type="button"
                onClick={() => applyPresetKm('currentPace')}
                className="rounded-md border border-[#D8DFE9] dark:border-white/[0.12] min-h-[36px] px-3 py-1.5 text-[11px] font-medium hover:border-[#0066FF]"
              >
                Rythme actuel ({Math.round(kmMetrics.annualizedPace / 1000)}k/an)
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-[#E5E7EB] dark:border-white/[0.08]">
            <div className="grid grid-cols-2 rounded-md border border-[#D8DFE9] dark:border-white/[0.12] overflow-hidden">
              <button
                type="button"
                onClick={() => setScenario('buyout')}
                className={`min-h-[38px] py-2 text-xs font-medium transition-colors ${
                  scenario === 'buyout'
                    ? 'bg-[#0066FF] text-white'
                    : 'text-[#636873] dark:text-[#8B8F99]'
                }`}
              >
                Vente / Reprise (rachat)
              </button>
              <button
                type="button"
                onClick={() => setScenario('restitution')}
                className={`min-h-[38px] py-2 text-xs font-medium transition-colors ${
                  scenario === 'restitution'
                    ? 'bg-[#0066FF] text-white'
                    : 'text-[#636873] dark:text-[#8B8F99]'
                }`}
              >
                Restitution (col. E)
              </button>
            </div>

            {scenario === 'buyout' && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResaleMode('garage')}
                    className={`rounded-md min-h-[36px] py-2 text-xs font-medium border transition-colors ${
                      resaleMode === 'garage'
                        ? 'border-[#0066FF] text-[#0066FF] dark:text-[#4D94FF]'
                        : 'border-[#D8DFE9] dark:border-white/[0.12] text-[#636873] dark:text-[#8B8F99]'
                    }`}
                  >
                    Reprise garage (-15%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setResaleMode('private')}
                    className={`rounded-md min-h-[36px] py-2 text-xs font-medium border transition-colors ${
                      resaleMode === 'private'
                        ? 'border-[#0066FF] text-[#0066FF] dark:text-[#4D94FF]'
                        : 'border-[#D8DFE9] dark:border-white/[0.12] text-[#636873] dark:text-[#8B8F99]'
                    }`}
                  >
                    Vente particulier
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 items-end text-xs">
                  <div>
                    <div className="flex justify-between text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1.5">
                      <span>Ajustement cote</span>
                      <span className="font-semibold tabular-nums">
                        {marketAdjustPct > 0
                          ? `+${marketAdjustPct}%`
                          : `${marketAdjustPct}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-30}
                      max={30}
                      step={5}
                      value={marketAdjustPct}
                      onChange={(e) => setMarketAdjustPct(Number(e.target.value))}
                      className="w-full bmw-range"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                      Offre réelle (CHF)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={overrideInput}
                      onChange={(e) => setOverrideInput(e.target.value)}
                      placeholder="Auto"
                      className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-2.5 py-1.5 text-xs tabular-nums"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E5E7EB] dark:border-white/[0.08] text-xs">
            <div>
              <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                Épargne mensuelle (CHF)
              </label>
              <input
                type="number"
                min="0"
                step="5"
                value={leasing.monthlySafetySavings}
                aria-label="Épargne mensuelle"
                onChange={(e) =>
                  updateLeasing({
                    monthlySafetySavings: Math.max(
                      0,
                      Number(e.target.value) || 0
                    ),
                  })
                }
                className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 font-display text-xs font-semibold tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                Réserve acquise (CHF)
              </label>
              <input
                type="number"
                min="0"
                step="50"
                value={leasing.existingSafetySavings}
                aria-label="Réserve déjà acquise"
                onChange={(e) =>
                  updateLeasing({
                    existingSafetySavings: Math.max(
                      0,
                      Number(e.target.value) || 0
                    ),
                  })
                }
                className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 font-display text-xs font-semibold tabular-nums"
              />
            </div>
          </div>
        </section>

        {/* Résultats & Graphique */}
        <div className="lg:col-span-7 space-y-6 lg:sticky lg:top-20">
          <section className="panel p-5 sm:p-6 space-y-5">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs text-[#636873] dark:text-[#8B8F99]">
                  Reste à charge net (
                  {scenario === 'buyout' ? 'Vente/Reprise' : 'Restitution'})
                </div>
                <div
                  className={`mt-1 font-display text-2xl sm:text-3xl font-semibold tabular-nums tracking-[-0.02em] ${netColor}`}
                >
                  {activeNet < 0
                    ? `Surplus : +${formatChf(Math.abs(activeNet))}`
                    : formatChf(activeNet)}
                </div>
              </div>
              <span className={`text-xs font-medium ${netColor}`}>
                {activeNet <= leasing.targetNetShortfallMax
                  ? `Sous objectif (${formatChf(leasing.targetNetShortfallMax)})`
                  : `Cible < ${formatChf(leasing.targetNetShortfallMax)}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E5E7EB] dark:border-white/[0.08] text-xs">
              <div>
                <div className="text-[#636873] dark:text-[#8B8F99]">
                  Rachat Alphera (M{exitMonth})
                </div>
                <div className="mt-0.5 font-display text-base font-semibold tabular-nums">
                  {formatChf(buyout.totalBuyout)}
                </div>
                <div className="text-[11px] text-[#636873] dark:text-[#8B8F99] tabular-nums">
                  {formatChf(buyout.baseBookValue)} + {formatChf(buyout.fee)}
                </div>
              </div>

              <div>
                <div className="text-[#636873] dark:text-[#8B8F99]">
                  {overrideValue
                    ? 'Offre réelle saisie'
                    : `Valeur ${resaleMode === 'garage' ? 'reprise' : 'particulier'}`}
                </div>
                <div className="mt-0.5 font-display text-base font-semibold tabular-nums text-[#18A96B]">
                  {formatChf(marketVal)}
                </div>
                <div className="text-[11px] text-[#636873] dark:text-[#8B8F99] tabular-nums">
                  Épargne : {formatChf(savings)}
                </div>
              </div>

              <div>
                <div className="text-[#636873] dark:text-[#8B8F99]">
                  Restitution (col. E + km)
                </div>
                <div className="mt-0.5 font-display text-base font-semibold tabular-nums">
                  {formatChf(restit.totalRestitutionCost)}
                </div>
                <div className="text-[11px] text-[#636873] dark:text-[#8B8F99] tabular-nums">
                  {formatChf(restit.tableAmountE)} + {formatKm(restit.excessKm)}{' '}
                  × 0.36
                </div>
              </div>
            </div>

            <div className="border-l-2 border-[#0066FF] pl-3 py-1 text-xs space-y-1 text-[#636873] dark:text-[#8B8F99]">
              <div className="text-[#0B0C0F] dark:text-[#F5F5F7]">
                <strong>Meilleure option à M{exitMonth} :</strong>{' '}
                {bestOption === 'buyout'
                  ? 'Rachat / Reprise'
                  : 'Restitution Alphera'}{' '}
                (écart de {formatChf(bestDelta)}).
              </div>
              <div className="text-[11px]">
                Estimation rachat : valeur comptable ≈ B+C du Tableau de
                résiliation + émolument 2% (min CHF 400.–) selon CG ch. 7.6 ;
                demander le décompte exact à Alphera avant décision.
              </div>
            </div>
          </section>

          <section className="panel p-5 sm:p-6 space-y-4">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <h2 className="font-display text-base font-semibold tracking-tight">
                Trajectoire M36 à M60
              </h2>
              <span className="text-[11px] text-[#636873] dark:text-[#8B8F99]">
                Zone verte : cible M48–M57
              </span>
            </div>

            <div className="h-[260px] lg:h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 8, right: 18, left: -10, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(139,143,153,0.18)"
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#8B8F99' }}
                    padding={{ left: 4, right: 10 }}
                    interval={3}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#8B8F99' }}
                    tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F1013',
                      borderColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      fontSize: 11,
                      color: '#F5F5F7',
                    }}
                    formatter={(value: unknown, name: string) => [
                      formatChf(Number(value)),
                      name,
                    ]}
                  />
                  <ReferenceArea
                    x1="M48"
                    x2="M57"
                    fill="#18A96B"
                    fillOpacity={0.09}
                  />
                  <ReferenceLine
                    y={leasing.targetNetShortfallMax}
                    stroke="#18A96B"
                    strokeDasharray="4 4"
                  />
                  <ReferenceLine
                    x={`M${exitMonth}`}
                    stroke="#0066FF"
                    strokeWidth={1.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="marketValue"
                    name="Valeur marchande"
                    stroke="#18A96B"
                    fill="#18A96B"
                    fillOpacity={0.12}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="buyoutTotal"
                    name="Solde rachat Alphera"
                    stroke="#0066FF"
                    strokeWidth={2.2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="netShortfallBuyout"
                    name="Reste net (vente)"
                    stroke="#E59A1A"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="restitutionTotal"
                    name="Coût restitution"
                    stroke="#E53935"
                    strokeWidth={1.8}
                    strokeDasharray="4 3"
                    dot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap gap-4 text-[11px] text-[#636873] dark:text-[#8B8F99]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#0066FF]" /> Rachat
                Alphera
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#18A96B]" /> Valeur
                marchande
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#E59A1A]" /> Reste net
                (vente)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#E53935]" />{' '}
                Restitution (col. E + km)
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
