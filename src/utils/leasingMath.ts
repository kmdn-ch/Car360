import { TERMINATION_TABLE } from '../data/terminationTable';
import type { AppState, LeasingContract, TerminationTableRow } from '../types';
import {
  diffDaysLocal,
  endOfContractMonthDate,
  getContractMonth,
  parseLocalDate,
} from './dates';

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface MileageMetrics {
  daysSinceStart: number;
  kmDriven: number;
  annualizedPace: number;
  prorataAllowanceKm: number;
  kmAheadOfAllowance: number;
  prorataPenaltyChf: number;
  targetPaceLimit: number;
  remainingKmToTarget: number;
  requiredPaceToTarget: number;
  requiredMonthlyKmToTarget: number;
  status: 'ok' | 'warning' | 'urgent';
}

export function computeMileageMetrics(state: AppState): MileageMetrics {
  const start = parseLocalDate(state.leasing.startDate);
  const last = parseLocalDate(state.vehicle.lastMileageDate);
  const daysSinceStart = Math.max(1, diffDaysLocal(start, last));
  const kmDriven = Math.max(
    0,
    state.vehicle.currentMileage - state.vehicle.startMileage
  );
  const yearsElapsed = daysSinceStart / 365.25;
  const annualizedPace = Math.round(kmDriven / yearsElapsed);

  const prorataAllowanceKm = Math.round(
    state.vehicle.startMileage +
      state.leasing.annualKmAllowance * yearsElapsed
  );
  const kmAheadOfAllowance =
    state.vehicle.currentMileage - prorataAllowanceKm;
  const prorataPenaltyChf = round2(
    Math.max(0, kmAheadOfAllowance) * state.leasing.excessKmFee
  );

  const targetYears = state.leasing.targetExitMonthMin / 12;
  const targetPaceLimit = Math.round(
    (state.leasing.targetExitKmMax - state.vehicle.startMileage) / targetYears
  );

  const targetDate = endOfContractMonthDate(
    state.leasing.startDate,
    state.leasing.targetExitMonthMin
  );
  const remainingDays = Math.max(1, diffDaysLocal(last, targetDate));
  const remainingKmToTarget =
    state.leasing.targetExitKmMax - state.vehicle.currentMileage;
  const requiredPaceToTarget =
    remainingKmToTarget > 0
      ? Math.round(remainingKmToTarget / (remainingDays / 365.25))
      : 0;
  const requiredMonthlyKmToTarget = Math.round(requiredPaceToTarget / 12);

  let status: MileageMetrics['status'] = 'ok';
  if (annualizedPace > targetPaceLimit) status = 'urgent';
  else if (annualizedPace > state.leasing.annualKmAllowance) status = 'warning';

  return {
    daysSinceStart,
    kmDriven,
    annualizedPace,
    prorataAllowanceKm,
    kmAheadOfAllowance,
    prorataPenaltyChf,
    targetPaceLimit,
    remainingKmToTarget,
    requiredPaceToTarget,
    requiredMonthlyKmToTarget,
    status,
  };
}

export function getTerminationRow(
  month: number
): TerminationTableRow | undefined {
  return TERMINATION_TABLE.find((r) => r.m === month);
}

/**
 * Valeur comptable théorique (mensualités payables d'avance + valeur résiduelle)
 * utilisée en repli lorsque m < 3 ou hors tableau.
 */
export function bookValueFormula(
  month: number,
  leasing: LeasingContract
): number {
  const k = leasing.durationMonths - month;
  if (k <= 0) return round2(leasing.residualValue);
  const i = leasing.nominalRatePct / 100 / 12;
  const v = 1 / (1 + i);
  const annuityDue =
    i > 0
      ? leasing.monthlyPayment * ((1 - Math.pow(v, k)) / i) * (1 + i)
      : leasing.monthlyPayment * k;
  return round2(annuityDue + leasing.residualValue * Math.pow(v, k));
}

export interface BuyoutDetails {
  baseBookValue: number;
  fee: number;
  totalBuyout: number;
  fromTable: boolean;
}

/**
 * Solde estimé de rachat / reprise (CG ch. 7.6) :
 * valeur comptable (B+C du Tableau de résiliation, ou formule) + émolument 2% (min CHF 400.-).
 * À l'échéance (mois 60), seule la valeur résiduelle est due.
 */
export function buyoutDetails(
  month: number,
  leasing: LeasingContract
): BuyoutDetails {
  if (month >= leasing.durationMonths) {
    const rv = round2(leasing.residualValue);
    return { baseBookValue: rv, fee: 0, totalBuyout: rv, fromTable: true };
  }
  const row = getTerminationRow(month);
  const baseBookValue = row
    ? round2(row.B + row.C)
    : bookValueFormula(month, leasing);
  const fee = round2(
    Math.max(
      leasing.earlyTerminationFeeMin,
      (leasing.earlyTerminationFeePct / 100) * baseBookValue
    )
  );
  return {
    baseBookValue,
    fee,
    totalBuyout: round2(baseBookValue + fee),
    fromTable: Boolean(row),
  };
}

export interface RestitutionDetails {
  tableAmountE: number;
  prorataMaxKm: number;
  excessKm: number;
  excessPenalty: number;
  totalRestitutionCost: number;
}

/**
 * Coût de résiliation + restitution anticipée (Tableau Annexe 1 col. E + km supp. au prorata).
 */
export function restitutionDetails(
  month: number,
  km: number,
  state: AppState
): RestitutionDetails {
  const { leasing, vehicle } = state;
  const row = getTerminationRow(month);
  const tableAmountE =
    month >= leasing.durationMonths ? 0 : row ? row.E : 0;
  const prorataMaxKm = Math.round(
    vehicle.startMileage + (leasing.annualKmAllowance * month) / 12
  );
  const excessKm = Math.max(0, Math.round(km - prorataMaxKm));
  const excessPenalty = round2(excessKm * leasing.excessKmFee);
  return {
    tableAmountE,
    prorataMaxKm,
    excessKm,
    excessPenalty,
    totalRestitutionCost: round2(tableAmountE + excessPenalty),
  };
}

export type ResaleMode = 'garage' | 'private';

/**
 * Estimation indicative de valeur marchande suisse (G01 LCI).
 */
export function estimateMarketValue(
  month: number,
  km: number,
  mode: ResaleMode,
  adjustPct: number,
  state: AppState,
  overrideChf?: number
): number {
  if (overrideChf && overrideChf > 0) {
    return round2(overrideChf);
  }
  const exitDate = endOfContractMonthDate(state.leasing.startDate, month);
  const regDate = parseLocalDate(state.vehicle.firstRegistrationDate);
  const ageYears = Math.max(0.1, diffDaysLocal(regDate, exitDate) / 365.25);
  const basePrice =
    state.vehicle.listPrice + state.vehicle.accessoriesPrice;
  const expectedKm = 15000 * ageYears;
  const rawPrivate =
    basePrice * Math.pow(0.82, ageYears) -
    0.06 * Math.max(0, km - expectedKm) +
    0.03 * Math.max(0, expectedKm - km);
  const privateVal = Math.max(3000, rawPrivate);
  const modeVal = mode === 'garage' ? privateVal * 0.85 : privateVal;
  return Math.max(3000, round2(modeVal * (1 + adjustPct / 100)));
}

export function accumulatedSavings(
  month: number,
  currentMonth: number,
  monthlySavings: number,
  existingSavings: number
): number {
  return round2(
    existingSavings + Math.max(0, month - currentMonth) * monthlySavings
  );
}

export interface SimulationPoint {
  month: number;
  label: string;
  projectedKm: number;
  buyoutTotal: number;
  marketValue: number;
  netShortfallBuyout: number;
  restitutionTotal: number;
  netShortfallRestitution: number;
  savings: number;
}

export function buildSimulationSeries(
  state: AppState,
  selectedMonth: number,
  projectedKmAtSelected: number,
  resaleMode: ResaleMode,
  marketAdjustPct: number,
  monthlySavings: number,
  overrideValue?: number,
  refDate = new Date(2026, 10, 21, 16, 0, 0)
): SimulationPoint[] {
  const currentMonth = getContractMonth(
    state.leasing.startDate,
    refDate,
    state.leasing.durationMonths
  );
  const currentKm = state.vehicle.currentMileage;
  const spanMonths = Math.max(1, selectedMonth - currentMonth);
  const slopeKmPerMonth = (projectedKmAtSelected - currentKm) / spanMonths;

  const points: SimulationPoint[] = [];
  for (let m = 36; m <= 60; m++) {
    const kmAtM = Math.max(
      currentKm,
      Math.round(currentKm + (m - currentMonth) * slopeKmPerMonth)
    );
    const buyout = buyoutDetails(m, state.leasing);
    const restit = restitutionDetails(m, kmAtM, state);
    const market = estimateMarketValue(
      m,
      kmAtM,
      resaleMode,
      marketAdjustPct,
      state,
      m === selectedMonth ? overrideValue : undefined
    );
    const savings = accumulatedSavings(
      m,
      currentMonth,
      monthlySavings,
      state.leasing.existingSafetySavings
    );
    points.push({
      month: m,
      label: `M${m}`,
      projectedKm: kmAtM,
      buyoutTotal: Math.round(buyout.totalBuyout),
      marketValue: Math.round(market),
      netShortfallBuyout: Math.round(buyout.totalBuyout - market - savings),
      restitutionTotal: Math.round(restit.totalRestitutionCost),
      netShortfallRestitution: Math.round(
        restit.totalRestitutionCost - savings
      ),
      savings: Math.round(savings),
    });
  }
  return points;
}
