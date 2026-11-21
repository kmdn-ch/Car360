import React, { useEffect, useState } from 'react';
import { CalendarPlus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { downloadIcsEvent } from '../utils/ics';
import { seasonLabel } from '../utils/tires';
import { Modal } from './Modal';

export const TirePlanModal: React.FC = () => {
  const {
    state,
    tirePlanOpen,
    setTirePlanOpen,
    planTireChange,
    showToast,
  } = useApp();

  const { tires } = state;

  const [dateTime, setDateTime] = useState('2026-11-22T14:00');
  const [toSetId, setToSetId] = useState('');
  const [doneBy, setDoneBy] = useState<'self' | 'garage'>('self');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!tirePlanOpen) return;
    if (tires.planned) {
      setDateTime(tires.planned.dateTime);
      setToSetId(tires.planned.toSetId);
      setDoneBy(tires.planned.doneBy);
      setNote(tires.planned.note);
    } else {
      const other =
        tires.sets.find((s) => s.id !== tires.mountedSetId)?.id ||
        tires.sets[0]?.id ||
        '';
      setDateTime('2026-11-22T14:00');
      setToSetId(other);
      setDoneBy('self');
      setNote('');
    }
  }, [tirePlanOpen, tires]);

  const selectedSet = tires.sets.find((s) => s.id === toSetId);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dateTime || !toSetId) return;
    planTireChange({ dateTime, toSetId, doneBy, note: note.trim() });
    setTirePlanOpen(false);
  };

  const handleDownloadIcs = () => {
    if (!dateTime) return;
    const season = seasonLabel(selectedSet?.season);
    downloadIcsEvent({
      title: `BMW X3 · Changement de roues (${season})`,
      description: `${selectedSet?.name ?? season}. Couple serrage ${tires.wheelBoltTorqueNm} Nm + reset RDC iDrive. ${note}`.trim(),
      startLocal: dateTime,
      filename: 'bmw-x3-changement-roues.ics',
    });
    showToast('Rappel calendrier (.ics) téléchargé');
  };

  return (
    <Modal
      open={tirePlanOpen}
      onClose={() => setTirePlanOpen(false)}
      title="Planifier un changement de roues"
      subtitle="Rappel intégré et export calendrier smartphone (.ics)"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#636873] dark:text-[#8B8F99] mb-1">
            Jeu de roues à monter
          </label>
          <select
            value={toSetId}
            onChange={(e) => setToSetId(e.target.value)}
            className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-white dark:bg-[#0D1119] px-3 py-2.5 text-sm"
          >
            {tires.sets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({seasonLabel(s.season)})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-xs font-medium text-[#636873] dark:text-[#8B8F99] mb-1">
              Date et heure prévues
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              required
              className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-2.5 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#636873] dark:text-[#8B8F99] mb-1">
              Exécutant
            </label>
            <div className="grid grid-cols-2 rounded-md border border-[#E5E7EB] dark:border-white/[0.14] overflow-hidden">
              <button
                type="button"
                onClick={() => setDoneBy('self')}
                className={`py-2 text-xs font-medium ${
                  doneBy === 'self'
                    ? 'bg-[#0066FF] text-white'
                    : 'text-[#636873] dark:text-[#8B8F99]'
                }`}
              >
                Moi-même
              </button>
              <button
                type="button"
                onClick={() => setDoneBy('garage')}
                className={`py-2 text-xs font-medium ${
                  doneBy === 'garage'
                    ? 'bg-[#0066FF] text-white'
                    : 'text-[#636873] dark:text-[#8B8F99]'
                }`}
              >
                Garage
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#636873] dark:text-[#8B8F99] mb-1">
            Note ou lieu
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex. Dimanche après-midi avec clé 140 Nm"
            className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
          />
        </div>

        <button
          type="button"
          onClick={handleDownloadIcs}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-[#E5E7EB] dark:border-white/[0.14] py-2.5 text-xs font-medium text-[#0066FF] dark:text-[#4D94FF] hover:border-[#0066FF]"
        >
          <CalendarPlus className="h-4 w-4" />
          Ajouter au calendrier du téléphone (.ics, alertes J-1 et H-1)
        </button>

        <div className="flex gap-2 pt-1">
          {tires.planned && (
            <button
              type="button"
              onClick={() => {
                planTireChange(null);
                setTirePlanOpen(false);
              }}
              aria-label="Supprimer la planification"
              className="rounded-md border border-[#E53935]/35 px-3 py-2.5 text-[#E53935] hover:bg-[#E53935]/10"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setTirePlanOpen(false)}
            className="flex-1 rounded-md border border-[#E5E7EB] dark:border-white/[0.14] py-2.5 text-sm font-medium"
          >
            Fermer
          </button>
          <button
            type="submit"
            className="flex-1 rounded-md bg-[#0066FF] py-2.5 text-sm font-medium text-white hover:bg-[#0052CC]"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </Modal>
  );
};
