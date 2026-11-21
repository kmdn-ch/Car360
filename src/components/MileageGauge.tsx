import React from 'react';
import { formatChf, formatKm } from '../utils/format';
import type { MileageMetrics } from '../utils/leasingMath';

interface MileageGaugeProps {
  metrics: MileageMetrics;
  annualAllowance: number;
  targetExitKm: number;
}

export const MileageGauge: React.FC<MileageGaugeProps> = ({
  metrics,
  annualAllowance,
  targetExitKm,
}) => {
  const maxScale = Math.max(46000, metrics.annualizedPace * 1.12);
  const ratio = (val: number) => Math.min(1, Math.max(0, val / maxScale));
  const clampPct = (r: number) => `${Math.min(98.5, Math.max(1.5, r * 100))}%`;

  const paceRatio = ratio(metrics.annualizedPace);
  const allowanceRatio = ratio(annualAllowance);
  const targetRatio = ratio(metrics.targetPaceLimit);

  const accentHex =
    metrics.status === 'ok'
      ? '#18A96B'
      : metrics.status === 'warning'
        ? '#E59A1A'
        : '#E53935';

  const fillGradient =
    metrics.status === 'ok'
      ? 'linear-gradient(90deg, #0D9468 0%, #18A96B 100%)'
      : metrics.status === 'warning'
        ? 'linear-gradient(90deg, #0D9468 0%, #18A96B 65%, #E59A1A 100%)'
        : 'linear-gradient(90deg, #0D9468 0%, #E59A1A 56%, #E53935 100%)';

  const statusText =
    metrics.status === 'ok'
      ? 'Dans le forfait'
      : metrics.status === 'warning'
        ? 'Sous plafond cible'
        : 'Au-dessus du plafond cible';

  return (
    <div className="space-y-4">
      {/* Ligne rythme annualisé */}
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xs text-[#636873] dark:text-[#8B8F99]">
            Rythme annualisé sur {metrics.daysSinceStart} jours
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="font-display text-lg sm:text-xl font-semibold tracking-tight tabular-nums">
              {formatKm(metrics.annualizedPace).replace(' km', '')}
            </span>
            <span className="text-xs text-[#636873] dark:text-[#8B8F99]">
              km/an
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-medium">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: accentHex }}
          />
          <span style={{ color: accentHex }}>{statusText}</span>
        </span>
      </div>

      {/* Jauge linéaire moderne à seuils sans superposition */}
      <div
        role="img"
        aria-label={`Jauge rythme kilométrique : ${formatKm(metrics.annualizedPace)} par an, forfait ${formatKm(annualAllowance)}, plafond cible ${formatKm(Math.round(metrics.targetPaceLimit))}`}
      >
        <div className="relative py-1.5">
          <div className="h-2.5 w-full rounded-[4px] bg-black/[0.08] dark:bg-white/[0.1] overflow-hidden">
            <div
              className="h-full rounded-[4px] transition-all duration-300"
              style={{
                width: `${Math.max(4, paceRatio * 100)}%`,
                background: fillGradient,
              }}
            />
          </div>

          {/* Repère vertical Forfait 25'000 km/an */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0.5 bottom-0.5 w-[2px] -translate-x-1/2 rounded-full bg-[#18A96B]"
            style={{ left: clampPct(allowanceRatio) }}
          />

          {/* Repère vertical Plafond cible 26'750 km/an */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0.5 bottom-0.5 w-[2px] -translate-x-1/2 rounded-full bg-[#E59A1A]"
            style={{ left: clampPct(targetRatio) }}
          />

          {/* Aiguille rythme actuel */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0 bottom-0 w-[3px] -translate-x-1/2 rounded-[2px] bg-[#0B0C0F] dark:bg-white shadow-sm"
            style={{ left: clampPct(paceRatio) }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 pt-2 text-[11px] text-[#636873] dark:text-[#8B8F99] tabular-nums">
          <span>0</span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="inline-flex items-center gap-1.5 font-medium text-[#18A96B]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#18A96B]" />
              Forfait {formatKm(annualAllowance)}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-[#E59A1A]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#E59A1A]" />
              Cible {formatKm(Math.round(metrics.targetPaceLimit))}
            </span>
          </div>
          <span>{Math.round(maxScale / 1000)}k+</span>
        </div>
      </div>

      {/* Deux colonnes ouvertes séparées par filet */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#E5E7EB] dark:border-white/[0.08] text-xs">
        <div>
          <div className="text-[#636873] dark:text-[#8B8F99]">
            Écart au forfait prorata
          </div>
          <div
            className={`mt-1 font-display text-sm sm:text-base font-semibold tabular-nums ${
              metrics.kmAheadOfAllowance > 0
                ? 'text-[#E53935]'
                : 'text-[#18A96B]'
            }`}
          >
            {metrics.kmAheadOfAllowance > 0 ? '+' : ''}
            {formatKm(metrics.kmAheadOfAllowance)}
          </div>
          {metrics.prorataPenaltyChf > 0 && (
            <div className="mt-0.5 text-[11px] text-[#636873] dark:text-[#8B8F99] tabular-nums">
              Équivalent {formatChf(metrics.prorataPenaltyChf)} à CHF 0.36/km
            </div>
          )}
        </div>

        <div>
          <div className="text-[#636873] dark:text-[#8B8F99]">
            Cadence max pour {Math.round(targetExitKm / 1000)}k en 04.2030
          </div>
          <div className="mt-1 font-display text-sm sm:text-base font-semibold tabular-nums text-[#0066FF] dark:text-[#4D94FF]">
            {formatKm(metrics.requiredPaceToTarget)}/an
          </div>
          <div className="mt-0.5 text-[11px] text-[#636873] dark:text-[#8B8F99] tabular-nums">
            Environ {formatKm(metrics.requiredMonthlyKmToTarget)}/mois (reste{' '}
            {formatKm(Math.max(0, metrics.remainingKmToTarget))})
          </div>
        </div>
      </div>
    </div>
  );
};
