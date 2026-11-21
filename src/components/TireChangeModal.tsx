import React, { useEffect, useState } from 'react';
import { Check, Plus, Snowflake, Sun, Disc } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { TireSeason } from '../types';
import { toLocalDateTimeStr } from '../utils/dates';
import { seasonLabel } from '../utils/tires';
import { Modal } from './Modal';

export const TireChangeModal: React.FC = () => {
  const {
    state,
    tireChangeOpen,
    setTireChangeOpen,
    performTireChange,
  } = useApp();

  const { tires, vehicle } = state;

  const [selectedSetId, setSelectedSetId] = useState<string>('');
  const [creatingNew, setCreatingNew] = useState(false);

  // Nouveau jeu inline
  const [newName, setNewName] = useState('');
  const [newSeason, setNewSeason] = useState<TireSeason>('winter');
  const [newSizeFront, setNewSizeFront] = useState('');
  const [newSizeRear, setNewSizeRear] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newDot, setNewDot] = useState('');
  const [newTread, setNewTread] = useState('');

  const [dateTime, setDateTime] = useState('');
  const [kmInput, setKmInput] = useState('');
  const [doneBy, setDoneBy] = useState<'self' | 'garage'>('self');
  const [costInput, setCostInput] = useState('0');
  const [unmountedStorage, setUnmountedStorage] = useState(
    'Dépôt / Garage personnel'
  );
  const [notes, setNotes] = useState('');

  const [torque, setTorque] = useState(true);
  const [pressure, setPressure] = useState(true);
  const [rdcReset, setRdcReset] = useState(true);
  const [treadCheck, setTreadCheck] = useState(true);
  const [storageCheck, setStorageCheck] = useState(true);

  useEffect(() => {
    if (!tireChangeOpen) return;
    const defaultTarget =
      tires.planned?.toSetId ||
      tires.sets.find((s) => s.id !== tires.mountedSetId)?.id ||
      tires.sets[0]?.id ||
      '';
    setSelectedSetId(defaultTarget);
    setCreatingNew(false);
    setDateTime(toLocalDateTimeStr(new Date()));
    setKmInput(String(vehicle.currentMileage));
    setDoneBy(tires.planned?.doneBy ?? 'self');
    setCostInput('0');
    setUnmountedStorage('Dépôt / Garage personnel');
    setNotes('');
    setTorque(true);
    setPressure(true);
    setRdcReset(true);
    setTreadCheck(true);
    setStorageCheck(true);
    setNewName('');
    setNewSeason('winter');
    setNewSizeFront('');
    setNewSizeRear('');
    setNewBrand('');
    setNewModel('');
    setNewDot('');
    setNewTread('');
  }, [tireChangeOpen, tires.mountedSetId, tires.planned, tires.sets, vehicle.currentMileage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const km = Math.max(vehicle.startMileage, Math.round(Number(kmInput) || vehicle.currentMileage));
    const cost = Math.max(0, Number(costInput) || 0);

    if (creatingNew) {
      if (!newName.trim()) return;
      performTireChange({
        toSetId: '',
        newSet: {
          name: newName.trim(),
          season: newSeason,
          rimDesc: 'Jantes à préciser',
          sizeFront: newSizeFront.trim() || 'À compléter',
          sizeRear: newSizeRear.trim() || newSizeFront.trim() || 'À compléter',
          tireBrand: newBrand.trim() || 'À compléter',
          tireModel: newModel.trim(),
          dot: newDot.trim(),
          treadDepthMm: newTread ? Number(newTread) : undefined,
          storageLocation: 'Montées sur le véhicule',
          notes: '',
        },
        dateTime,
        km,
        doneBy,
        cost,
        checklist: {
          torque,
          pressure,
          rdcReset,
          tread: treadCheck,
          storage: storageCheck,
        },
        notes: notes.trim(),
        unmountedStorageLocation: unmountedStorage,
      });
    } else {
      if (!selectedSetId) return;
      performTireChange({
        toSetId: selectedSetId,
        dateTime,
        km,
        doneBy,
        cost,
        checklist: {
          torque,
          pressure,
          rdcReset,
          tread: treadCheck,
          storage: storageCheck,
        },
        notes: notes.trim(),
        unmountedStorageLocation: unmountedStorage,
      });
    }
    setTireChangeOpen(false);
  };

  const seasonIcon = (season: TireSeason) => {
    if (season === 'winter') return <Snowflake className="h-4 w-4 text-sky-400" />;
    if (season === 'summer') return <Sun className="h-4 w-4 text-amber-400" />;
    return <Disc className="h-4 w-4 text-emerald-400" />;
  };

  return (
    <Modal
      open={tireChangeOpen}
      onClose={() => setTireChangeOpen(false)}
      title="J'ai changé les roues"
      subtitle="Sélectionnez le jeu de roues monté et validez la checklist"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Choix du type de roues */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Type de roues montées
          </label>
          <div className="space-y-2">
            {tires.sets.map((s) => {
              const active = !creatingNew && selectedSetId === s.id;
              const isMounted = tires.mountedSetId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setCreatingNew(false);
                    setSelectedSetId(s.id);
                  }}
                  className={`w-full flex items-center justify-between gap-2 rounded-md border p-3 text-left transition-all ${
                    active
                      ? 'border-[#0066FF] bg-[#0066FF]/10'
                      : 'border-[#E5E7EB] dark:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {seasonIcon(s.season)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {s.name}
                        </span>
                        <span className="text-[11px] text-[#636873] dark:text-[#8B8F99]">
                          {seasonLabel(s.season)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#636873] dark:text-[#8B8F99] truncate">
                        {isMounted ? 'Montées actuellement — ' : ''}
                        {s.sizeFront !== 'À compléter'
                          ? `${s.sizeFront}, ${s.tireBrand}`
                          : s.rimDesc}
                      </p>
                    </div>
                  </div>
                  {active && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#0066FF] text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCreatingNew((v) => !v)}
              className={`w-full flex items-center justify-center gap-1.5 rounded-md border border-dashed py-2.5 text-xs font-medium transition-colors ${
                creatingNew
                  ? 'border-[#0066FF] bg-[#0066FF]/10 text-[#0066FF] dark:text-[#4D94FF]'
                  : 'border-[#E5E7EB] dark:border-white/20 text-[#636873] dark:text-[#8B8F99] hover:border-[#0066FF]'
              }`}
            >
              <Plus className="h-4 w-4" />
              Nouveau jeu de roues…
            </button>
          </div>
        </div>

        {/* Formulaire nouveau jeu inline */}
        {creatingNew && (
          <div className="rounded-md border border-[#0066FF]/30 p-3 space-y-2.5">
            <div className="grid grid-cols-3 gap-1.5">
              {(['winter', 'summer', 'allseason'] as TireSeason[]).map((se) => (
                <button
                  key={se}
                  type="button"
                  onClick={() => setNewSeason(se)}
                  className={`rounded-md py-1.5 text-xs font-medium border ${
                    newSeason === se
                      ? 'border-[#0066FF] bg-[#0066FF] text-white'
                      : 'border-[#E5E7EB] dark:border-white/[0.14]'
                  }`}
                >
                  {seasonLabel(se)}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Désignation (ex. Jantes 19&quot; Hiver Pirelli)"
              className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={newSizeFront}
                onChange={(e) => setNewSizeFront(e.target.value)}
                placeholder="Dim. AV (ex. 245/50 R19)"
                className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-2.5 py-2 text-xs"
              />
              <input
                type="text"
                value={newSizeRear}
                onChange={(e) => setNewSizeRear(e.target.value)}
                placeholder="Dim. AR (si différent)"
                className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-2.5 py-2 text-xs"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="Marque"
                className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-2.5 py-2 text-xs"
              />
              <input
                type="text"
                value={newDot}
                onChange={(e) => setNewDot(e.target.value)}
                placeholder="DOT"
                className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-2.5 py-2 text-xs"
              />
              <input
                type="number"
                step="0.5"
                min="0"
                max="12"
                value={newTread}
                onChange={(e) => setNewTread(e.target.value)}
                placeholder="Prof. mm"
                className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-2.5 py-2 text-xs"
              />
            </div>
          </div>
        )}

        {/* Date, km, exécutant, coût */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
              Date et heure
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
            <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
              Kilométrage (km)
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={kmInput}
              onChange={(e) => setKmInput(e.target.value)}
              required
              className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-3 py-2 font-display text-xs font-semibold tabular-nums"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 items-end">
          <div>
            <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
              Réalisé par
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
          <div>
            <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
              Coût (CHF)
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              value={costInput}
              onChange={(e) => setCostInput(e.target.value)}
              className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs tabular-nums"
            />
          </div>
        </div>

        {/* Checklist DIY */}
        <div className="border-t border-[#E5E7EB] dark:border-white/[0.08] pt-3 space-y-2">
          <div className="text-xs font-medium">
            Checklist montage BMW X3 (G01)
          </div>
          <label className="flex items-start gap-2.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={torque}
              onChange={(e) => setTorque(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[#0066FF]"
            />
            <span>
              <strong>Serrage en étoile à {tires.wheelBoltTorqueNm} Nm</strong>{' '}
              (clé dynamométrique)
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={pressure}
              onChange={(e) => setPressure(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[#0066FF]"
            />
            <span>
              Pression à froid contrôlée selon étiquette montant de porte
              conducteur
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={rdcReset}
              onChange={(e) => setRdcReset(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[#0066FF]"
            />
            <span>
              Réinitialisation RDC iDrive :{' '}
              <span className="text-[#636873] dark:text-[#8B8F99]">
                Menu, Véhicule, Statut du véhicule, Contrôle pression pneus,
                Effectuer réinitialisation puis rouler
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={treadCheck}
              onChange={(e) => setTreadCheck(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[#0066FF]"
            />
            <span>
              Sculpture contrôlée (hiver ≥ 4.0 mm recommandé, min. légal 1.6 mm)
            </span>
          </label>
          <label className="flex items-start gap-2.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={storageCheck}
              onChange={(e) => setStorageCheck(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[#0066FF]"
            />
            <span>Jeu démonté repéré (AVG/AVD/ARG/ARD) et stocké</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
              Stockage jeu démonté
            </label>
            <input
              type="text"
              value={unmountedStorage}
              onChange={(e) => setUnmountedStorage(e.target.value)}
              className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-2.5 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
              Notes (optionnel)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="État plaquettes, jantes..."
              className="w-full rounded-md border border-[#E5E7EB] dark:border-white/[0.14] bg-transparent px-2.5 py-2 text-xs"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setTireChangeOpen(false)}
            className="flex-1 rounded-md border border-[#E5E7EB] dark:border-white/[0.14] py-2.5 text-sm font-medium"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="flex-1 rounded-md bg-[#0066FF] py-2.5 text-sm font-medium text-white hover:bg-[#0052CC]"
          >
            Valider le montage
          </button>
        </div>
      </form>
    </Modal>
  );
};
