import type { AppAlert, AppState, CbsScheduleItem } from '../types';
import { addDaysLocal, diffDaysLocal, parseLocalDate, toLocalDateStr } from './dates';
import { formatChf, formatDateCH, formatKm } from './format';
import { computeMileageMetrics } from './leasingMath';
import { getTireAlerts } from './tires';

export interface CbsStatusInfo {
  status: 'ok' | 'warning' | 'urgent' | 'confirm' | 'incomplete';
  label: string;
  detail: string;
  estimatedDate?: string;
}

export function evaluateCbsItem(
  item: CbsScheduleItem,
  state: AppState,
  annualizedPace: number,
  now: Date
): CbsStatusInfo {
  if (item.completed) {
    return { status: 'ok', label: 'Effectué', detail: item.intervalNote ?? 'À jour' };
  }
  const kmLeft =
    item.dueKm !== undefined
      ? item.dueKm - state.vehicle.currentMileage
      : undefined;
  const daysLeft = item.dueDate
    ? diffDaysLocal(now, parseLocalDate(item.dueDate))
    : undefined;

  let estimatedDate: string | undefined;
  if (kmLeft !== undefined && kmLeft > 0 && annualizedPace > 500) {
    const estDays = Math.round((kmLeft / annualizedPace) * 365.25);
    estimatedDate = toLocalDateStr(addDaysLocal(now, estDays));
  }

  if (
    (kmLeft !== undefined && kmLeft <= 0) ||
    (daysLeft !== undefined && daysLeft <= 0)
  ) {
    return {
      status: 'urgent',
      label: item.toConfirm ? 'Dépassé · à vérifier' : 'Dépassé',
      detail:
        kmLeft !== undefined && kmLeft <= 0
          ? `Dépassé de ${formatKm(Math.abs(kmLeft))}`
          : `Échéance dépassée (${formatDateCH(item.dueDate ?? '')})`,
      estimatedDate,
    };
  }

  if (
    (kmLeft !== undefined && kmLeft <= 1000) ||
    (daysLeft !== undefined && daysLeft <= 30)
  ) {
    return {
      status: 'urgent',
      label: 'Urgent',
      detail:
        kmLeft !== undefined
          ? `Dans ${formatKm(kmLeft)}`
          : `Dans ${daysLeft} j (${formatDateCH(item.dueDate ?? '')})`,
      estimatedDate,
    };
  }

  if (item.toConfirm) {
    return {
      status: 'confirm',
      label: 'À confirmer',
      detail:
        daysLeft !== undefined
          ? `Estimé le ${formatDateCH(item.dueDate ?? '')} (dans ${daysLeft} j)`
          : kmLeft !== undefined
            ? `Dans ${formatKm(kmLeft)}`
            : 'Vérifier iDrive / SAN',
      estimatedDate,
    };
  }

  if (
    (kmLeft !== undefined && kmLeft <= 5000) ||
    (daysLeft !== undefined && daysLeft <= 90)
  ) {
    return {
      status: 'warning',
      label: 'À prévoir',
      detail:
        kmLeft !== undefined
          ? `Dans ${formatKm(kmLeft)}`
          : `Dans ${daysLeft} j (${formatDateCH(item.dueDate ?? '')})`,
      estimatedDate,
    };
  }

  if (kmLeft === undefined && daysLeft === undefined) {
    return {
      status: 'incomplete',
      label: 'À compléter',
      detail: item.intervalNote ?? 'Échéance non définie',
    };
  }

  return {
    status: 'ok',
    label: 'OK',
    detail:
      kmLeft !== undefined
        ? `Dans ${formatKm(kmLeft)}`
        : `Dans ${daysLeft} j (${formatDateCH(item.dueDate ?? '')})`,
    estimatedDate,
  };
}

const SEVERITY_ORDER: Record<AppAlert['severity'], number> = {
  urgent: 0,
  warning: 1,
  confirm: 2,
  info: 3,
};

export function buildActiveAlerts(state: AppState, now = new Date()): AppAlert[] {
  const alerts: AppAlert[] = [];

  // 1. Alertes Pneus & Roues
  alerts.push(...getTireAlerts(state, now));

  // 2. Smile prise d'effet 09.12.2026
  const smileStart = parseLocalDate(state.smile.startDate);
  const daysToSmile = diffDaysLocal(now, smileStart);
  if (daysToSmile > 0 && daysToSmile <= 45) {
    alerts.push({
      id: 'smile-activation',
      severity: daysToSmile <= 7 ? 'warning' : 'info',
      domain: 'insurance',
      title: `Prise d'effet assurance Smile le ${formatDateCH(state.smile.startDate)}`,
      subtitle: `Dans ${daysToSmile} jours, police ${state.smile.policyNumber} (vérifier couverture transitoire jusqu’au 08.12).`,
      actionLabel: 'Voir Assurances',
      actionType: 'go-insurance',
      icsEvent: {
        title: `BMW X3 : Prise d'effet Smile (${state.smile.policyNumber})`,
        description: `Entrée en vigueur police Smile ${state.smile.policyNumber} et Carte Verte ${state.smile.greenCardCode}.`,
        startLocal: `${state.smile.startDate}T08:00`,
        filename: 'bmw-x3-smile-activation.ics',
      },
    });
  }

  // 3. Résiliation ALPHERA Protection J-60 avant reconduction
  const alpheraEnd = parseLocalDate(state.alpheraProtection.endDate);
  const cancelDeadline = addDaysLocal(
    alpheraEnd,
    -state.alpheraProtection.cancellationNoticeDays
  );
  const daysToCancel = diffDaysLocal(now, cancelDeadline);
  const daysToEnd = diffDaysLocal(now, alpheraEnd);
  if (daysToEnd >= 0) {
    const severity: AppAlert['severity'] =
      daysToCancel <= 0 ? 'urgent' : daysToCancel <= 30 ? 'warning' : 'info';
    if (daysToCancel <= 100) {
      alerts.push({
        id: 'alphera-cancel-j60',
        severity,
        domain: 'insurance',
        title: `Résiliation ALPHERA Protection avant le ${formatDateCH(toLocalDateStr(cancelDeadline))}`,
        subtitle:
          daysToCancel <= 0
            ? `Délai J-${state.alpheraProtection.cancellationNoticeDays} dépassé ! Échéance ${formatDateCH(state.alpheraProtection.endDate)}.`
            : `Dans ${daysToCancel} j (J-${state.alpheraProtection.cancellationNoticeDays} avant fin gratuité le ${formatDateCH(state.alpheraProtection.endDate)}).`,
        actionLabel: 'Gérer',
        actionType: 'go-insurance',
        icsEvent: {
          title: 'BMW X3 · Décider / Résilier ALPHERA Protection',
          description: `Fin période gratuite ALPHERA Protection le ${formatDateCH(state.alpheraProtection.endDate)}. Résiliation J-${state.alpheraProtection.cancellationNoticeDays}.`,
          startLocal: `${toLocalDateStr(cancelDeadline)}T09:00`,
          filename: 'bmw-x3-alphera-resiliation.ics',
        },
      });
    }
  }

  // 4. Rythme kilométrique vs forfait 25k / cible 26.75k
  const kmMetrics = computeMileageMetrics(state);
  if (kmMetrics.status !== 'ok') {
    alerts.push({
      id: 'mileage-pace',
      severity: kmMetrics.status === 'urgent' ? 'urgent' : 'warning',
      domain: 'mileage',
      title: `Rythme kilométrique élevé : ${formatKm(kmMetrics.annualizedPace)}/an`,
      subtitle: `Avance +${formatKm(kmMetrics.kmAheadOfAllowance)} vs forfait (${formatChf(kmMetrics.prorataPenaltyChf)}). Rythme max conseillé : ${formatKm(kmMetrics.requiredPaceToTarget)}/an pour rester ≤ ${formatKm(state.leasing.targetExitKmMax)} en 04.2030.`,
      actionLabel: 'Simuler sortie',
      actionType: 'go-leasing',
    });
  }

  // 5. Échéances CBS / MFK
  for (const item of state.cbsSchedule) {
    if (item.completed) continue;
    const ev = evaluateCbsItem(item, state, kmMetrics.annualizedPace, now);
    if (ev.status === 'ok' || ev.status === 'incomplete') continue;
    const sev: AppAlert['severity'] =
      ev.status === 'urgent'
        ? 'urgent'
        : ev.status === 'warning'
          ? 'warning'
          : 'confirm';
    alerts.push({
      id: `cbs-${item.id}`,
      severity: sev,
      domain: 'maintenance',
      title: item.title,
      subtitle: `${ev.detail}${item.notes ? ` — ${item.notes}` : ''}`,
      actionLabel: 'Entretien',
      actionType: 'go-maintenance',
      icsEvent: item.dueDate
        ? {
            title: `BMW X3 : ${item.title}`,
            description: `${item.intervalNote ?? ''} ${item.notes ?? ''}`.trim(),
            startLocal: `${item.dueDate}T09:00`,
            filename: `bmw-x3-${item.id}.ics`,
          }
        : undefined,
    });
  }

  return alerts.sort(
    (a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]
  );
}
