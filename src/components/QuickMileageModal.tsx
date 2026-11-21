import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { toLocalDateStr } from '../utils/dates';
import { formatKm } from '../utils/format';
import { computeMileageMetrics } from '../utils/leasingMath';
import { Modal } from './Modal';

export const QuickMileageModal: React.FC = () => {
  const {
    state,
    quickMileageOpen,
    setQuickMileageOpen,
    updateMileage,
  } = useApp();

  const [kmInput, setKmInput] = useState<string>(
    String(state.vehicle.currentMileage)
  );
  const [dateInput, setDateInput] = useState<string>(
    toLocalDateStr(new Date())
  );
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (quickMileageOpen) {
      setKmInput(String(state.vehicle.currentMileage));
      setDateInput(toLocalDateStr(new Date()));
      setNote('');
    }
  }, [quickMileageOpen, state.vehicle.currentMileage]);

  const parsedKm = Number(kmInput);
  const valid = Number.isFinite(parsedKm) && parsedKm >= state.vehicle.startMileage;

  const previewMetrics = useMemo(() => {
    if (!valid) return null;
    return computeMileageMetrics({
      ...state,
      vehicle: {
        ...state.vehicle,
        currentMileage: Math.round(parsedKm),
        lastMileageDate: dateInput || state.vehicle.lastMileageDate,
      },
    });
  }, [valid, parsedKm, dateInput, state]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    updateMileage(Math.round(parsedKm), dateInput, note);
    setQuickMileageOpen(false);
  };

  return (
    <Modal
      open={quickMileageOpen}
      onClose={() => setQuickMileageOpen(false)}
      title="Mettre à jour le kilométrage"
      subtitle={`Compteur actuel : ${formatKm(state.vehicle.currentMileage)}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#636873] dark:text-[#8B8F99] mb-1.5">
            Nouveau kilométrage (km)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={state.vehicle.startMileage}
            step={1}
            value={kmInput}
            onChange={(e) => setKmInput(e.target.value)}
            className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-3.5 py-2.5 font-display text-lg font-semibold tabular-nums focus:border-[#0066FF] focus:outline-none"
            required
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[100, 250, 500, 1000].map((delta) => (
              <button
                key={delta}
                type="button"
                onClick={() =>
                  setKmInput(
                    String((Number(kmInput) || state.vehicle.currentMileage) + delta)
                  )
                }
                className="rounded-md border border-[#E5E7EB] dark:border-white/[0.12] px-2.5 py-1 text-xs font-medium tabular-nums hover:border-[#0066FF]"
              >
                +{formatKm(delta).replace(' km', '')} km
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#636873] dark:text-[#8B8F99] mb-1">
              Date du relevé
            </label>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs focus:border-[#0066FF] focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#636873] dark:text-[#8B8F99] mb-1">
              Note (optionnel)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Trajet, plein..."
              className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs focus:border-[#0066FF] focus:outline-none"
            />
          </div>
        </div>

        {previewMetrics && (
          <div className="border-t border-[#E5E7EB] dark:border-white/[0.08] pt-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#636873] dark:text-[#8B8F99]">
                Nouveau rythme annualisé
              </span>
              <span className="font-display font-semibold tabular-nums">
                {formatKm(previewMetrics.annualizedPace)} / an
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#636873] dark:text-[#8B8F99]">
                Cadence max pour 145k (04.2030)
              </span>
              <span className="font-display font-semibold tabular-nums text-[#0066FF] dark:text-[#4D94FF]">
                {formatKm(previewMetrics.requiredPaceToTarget)} / an
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setQuickMileageOpen(false)}
            className="flex-1 rounded-md border border-[#E5E7EB] dark:border-white/[0.14] py-2.5 text-sm font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!valid}
            className="flex-1 rounded-md bg-[#0066FF] py-2.5 text-sm font-medium text-white hover:bg-[#0052CC] disabled:opacity-50"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
};
