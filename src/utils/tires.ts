import type { AppAlert, AppState, TireSeason } from '../types';
import {
  diffDaysLocal,
  diffHours,
  parseLocalDate,
} from './dates';
import {
  formatDateTimeCH,
  formatKm,
  formatRelativeDay,
} from './format';

/**
 * Algorithme grégorien anonyme pour le dimanche de Pâques.
 * Contrôle : easterSunday(2027) -> 28.03.2027.
 */
export function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export function seasonLabel(season?: TireSeason): string {
  if (season === 'winter') return 'Hiver';
  if (season === 'summer') return 'Été';
  return '4 saisons';
}

export function isWinterPeriod(now: Date): boolean {
  const y = now.getFullYear();
  const easter = easterSunday(y);
  const oct15 = new Date(y, 9, 15, 0, 0, 0, 0);
  const today = new Date(y, now.getMonth(), now.getDate());
  return today < easter || today >= oct15;
}

export function getTireAlerts(state: AppState, now: Date): AppAlert[] {
  const alerts: AppAlert[] = [];
  const { tires, vehicle } = state;
  const mounted = tires.sets.find((s) => s.id === tires.mountedSetId);

  // 1. Changement planifié
  if (tires.planned) {
    const targetDate = parseLocalDate(tires.planned.dateTime);
    const hours = diffHours(now, targetDate);
    const days = diffDaysLocal(now, targetDate);
    const toSet = tires.sets.find((s) => s.id === tires.planned?.toSetId);
    const targetSeason = seasonLabel(toSet?.season);
    const rel = formatRelativeDay(tires.planned.dateTime, now);

    if (days <= 14) {
      const severity: AppAlert['severity'] =
        hours <= 24 ? 'urgent' : 'warning';
      alerts.push({
        id: 'tire-planned-change',
        severity,
        domain: 'tires',
        title: `Changement vers roues ${targetSeason} le ${formatDateTimeCH(tires.planned.dateTime)}`,
        subtitle: `${rel}, ${tires.planned.doneBy === 'self' ? 'par moi-même' : 'au garage'}${tires.planned.note ? ` (${tires.planned.note})` : ''}`,
        actionLabel: 'Changer maintenant',
        actionType: 'open-tire-change',
        icsEvent: {
          title: `BMW X3 : Changement de roues (${targetSeason})`,
          description: `${toSet?.name ?? targetSeason}. Couple serrage ${tires.wheelBoltTorqueNm} Nm et reset RDC iDrive.`,
          startLocal: tires.planned.dateTime,
          filename: 'bmw-x3-changement-roues.ics',
        },
      });
    }
  }

  // 2. Cohérence saisonnière (O à O : 15 oct -> Pâques)
  if (mounted && mounted.season !== 'allseason') {
    const winterNow = isWinterPeriod(now);
    const y = now.getFullYear();
    const dec1 = new Date(y, 11, 1, 0, 0, 0, 0);
    const may31 = new Date(y, 4, 31, 23, 59, 59, 0);

    if (winterNow && mounted.season === 'summer') {
      const isLateOrUnplanned = now >= dec1 || now.getMonth() < 4 || !tires.planned;
      alerts.push({
        id: 'tire-season-summer-in-winter',
        severity: isLateOrUnplanned ? 'urgent' : 'warning',
        domain: 'tires',
        title: 'Pneus été montés en saison froide',
        subtitle: tires.planned
          ? `Règle suisse d’octobre à Pâques. Changement planifié le ${formatDateTimeCH(tires.planned.dateTime)}.`
          : 'Règle suisse d’octobre à Pâques : passez aux roues hiver dès que la température passe sous 7 °C.',
        actionLabel: tires.planned ? undefined : 'Planifier / Changer',
        actionType: tires.planned ? undefined : 'open-tire-change',
      });
    } else if (!winterNow && mounted.season === 'winter') {
      const urgent = now > may31;
      alerts.push({
        id: 'tire-season-winter-in-summer',
        severity: urgent ? 'urgent' : 'warning',
        domain: 'tires',
        title: 'Repasser en pneus été (T° > 7 °C)',
        subtitle:
          "Les pneus hiver s'usent prématurément au-delà de 7 °C et allongent les distances de freinage.",
        actionLabel: 'Changer de roues',
        actionType: 'open-tire-change',
      });
    }
  }

  // 3. Resserrage écrous à 140 Nm après 50–100 km
  const latestChange = tires.history[0];
  if (latestChange && !latestChange.retorqueDone) {
    const driven = Math.max(0, vehicle.currentMileage - latestChange.km);
    alerts.push({
      id: `tire-retorque-${latestChange.id}`,
      severity: driven >= 100 ? 'urgent' : 'warning',
      domain: 'tires',
      title: `Resserrer les écrous à ${tires.wheelBoltTorqueNm} Nm`,
      subtitle: `Contrôle obligatoire 50–100 km après montage (${formatKm(driven)} parcourus depuis le changement).`,
      actionLabel: 'Fait',
      actionType: 'mark-retorque',
    });
  }

  // 4. Profondeur de sculpture (si renseignée)
  for (const s of tires.sets) {
    if (s.treadDepthMm === undefined || s.treadDepthMm === null) continue;
    if (s.treadDepthMm < 1.6) {
      alerts.push({
        id: `tire-tread-legal-${s.id}`,
        severity: 'urgent',
        domain: 'tires',
        title: `Sculpture critique : ${s.name} (${s.treadDepthMm} mm)`,
        subtitle: 'Sous le minimum légal de 1.6 mm — remplacement immédiat requis.',
        actionLabel: 'Voir Entretien',
        actionType: 'go-maintenance',
      });
    } else if (
      (s.season === 'winter' && s.treadDepthMm < 4) ||
      s.treadDepthMm < 3
    ) {
      alerts.push({
        id: `tire-tread-low-${s.id}`,
        severity: 'warning',
        domain: 'tires',
        title: `Sculpture faible : ${s.name} (${s.treadDepthMm} mm)`,
        subtitle:
          s.season === 'winter'
            ? 'Recommandation hiver en Suisse : min. 4.0 mm.'
            : 'À surveiller avant les prochains trajets sous la pluie (< 3.0 mm).',
        actionLabel: 'Voir Entretien',
        actionType: 'go-maintenance',
      });
    }
  }

  return alerts;
}
