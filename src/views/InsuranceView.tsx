import React, { useMemo, useState } from 'react';
import {
  CalendarPlus,
  Check,
  Copy,
  FileText,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  addDaysLocal,
  diffDaysLocal,
  parseLocalDate,
  toLocalDateStr,
} from '../utils/dates';
import { formatChf, formatDateCH, telHref } from '../utils/format';
import { downloadIcsEvent } from '../utils/ics';

type IncidentId =
  | 'windshield'
  | 'parking'
  | 'collision'
  | 'tire'
  | 'rim'
  | 'key'
  | 'legal'
  | 'interior'
  | 'rental'
  | 'breakdown';

interface IncidentGuide {
  id: IncidentId;
  label: string;
  brand: 'smile' | 'alphera' | 'tcs';
  insurer: string;
  franchise: string;
  phoneLabel: string;
  phone: string;
  steps: string;
}

const INCIDENT_GUIDES: IncidentGuide[] = [
  {
    id: 'windshield',
    label: 'Pare-brise',
    brand: 'smile',
    insurer: 'Smile Casco partielle (Bris de glace assuré plus)',
    franchise: 'CHF 200.–',
    phoneLabel: 'Smile',
    phone: '+41 844 848 444',
    steps:
      "Déclarer avant réparation via l'application Smile ou par téléphone. Ne pas lancer la réparation sans accord préalable.",
  },
  {
    id: 'parking',
    label: 'Parking',
    brand: 'smile',
    insurer: 'Smile Casco complète (Dommages de parking illimités)',
    franchise: 'Selon CGA (Collision CHF 500.–)',
    phoneLabel: 'Smile',
    phone: '+41 844 848 444',
    steps:
      'Photographier les dégâts et l’emplacement, relever d’éventuels témoins, déclarer à Smile (et à Alphera si supérieur à CHF 1’000.–, CG ch. 13.1).',
  },
  {
    id: 'collision',
    label: 'Collision',
    brand: 'smile',
    insurer: 'Smile RC (CHF 100 mio.) et Casco complète (Bonus protégé)',
    franchise: 'RC CHF 0.– (Jeunes CHF 500.–), Casco CHF 500.–',
    phoneLabel: 'Smile',
    phone: '+41 844 848 444',
    steps:
      'Sécuriser les lieux, remplir le Constat Européen d’Accident. Appeler la police (117) si blessés ou autoroute. Prévenir Smile et Alphera (+41 58 269 66 66).',
  },
  {
    id: 'tire',
    label: 'Pneu',
    brand: 'alphera',
    insurer: 'ALPHERA Protection (AWP P&C SA)',
    franchise: "CHF 0.–, plafond CHF 600.– par pneu (CHF 2'400.– par an)",
    phoneLabel: 'ALPHERA / AWP',
    phone: '+41 44 283 32 22',
    steps:
      'Prendre des photos du pneu endommagé, conserver la facture d’achat et montage puis envoyer la déclaration à claims-car.ch@allianz.com.',
  },
  {
    id: 'rim',
    label: 'Jante',
    brand: 'alphera',
    insurer: 'ALPHERA Protection (Rupture jantes et remboursement franchise casco)',
    franchise: 'Plafond CHF 500.– par jante et par événement',
    phoneLabel: 'ALPHERA / AWP',
    phone: '+41 44 283 32 22',
    steps:
      'Fournir facture de réparation, photos du dommage et justificatif de la franchise imputée par l’assurance casco.',
  },
  {
    id: 'key',
    label: 'Clé',
    brand: 'alphera',
    insurer: 'ALPHERA Protection (Key Protection)',
    franchise: 'Plafond CHF 500.– par événement',
    phoneLabel: 'ALPHERA / AWP',
    phone: '+41 44 283 32 22',
    steps:
      'En cas de vol : déposer une plainte auprès de la police (obligatoire). Transmettre facture, photos et plainte à AWP.',
  },
  {
    id: 'legal',
    label: 'Litige',
    brand: 'alphera',
    insurer: 'ALPHERA Protection (PJ circulation) et TCS Assista (Casco)',
    franchise: "ALPHERA CHF 300'000.–, Assista CHF 250'000.–",
    phoneLabel: 'ALPHERA / AWP',
    phone: '+41 44 283 32 22',
    steps:
      'Smile exclut la protection juridique. Contacter AWP (ou TCS Assista au +41 58 827 21 00 pour un litige casco) avant de mandater un avocat.',
  },
  {
    id: 'interior',
    label: 'Intérieur',
    brand: 'alphera',
    insurer: 'ALPHERA Protection (InteriorSpot Repair)',
    franchise: 'Plafond CHF 300.– par événement',
    phoneLabel: 'ALPHERA / AWP',
    phone: '+41 44 283 32 22',
    steps:
      'Couvre les dommages minimes à l’habitacle. Envoyer photos et facture de réparation via la déclaration AWP.',
  },
  {
    id: 'rental',
    label: 'Location',
    brand: 'alphera',
    insurer: 'ALPHERA Protection (Exclusion franchise CDW)',
    franchise: "Plafond CHF 10'000.– par événement",
    phoneLabel: 'ALPHERA / AWP',
    phone: '+41 44 283 32 22',
    steps:
      'En cas d’accident ou vol avec un véhicule de location, transmettre le contrat de location et le décompte de franchise à AWP.',
  },
  {
    id: 'breakdown',
    label: 'Panne',
    brand: 'tcs',
    insurer: 'Exclu par Smile : couvert par TCS Dépannage / Livret ETI',
    franchise: 'CHF 0.– (selon sociétariat TCS avec dépannage)',
    phoneLabel: 'TCS CH 24/7',
    phone: '0800 140 140',
    steps:
      'Appeler impérativement la centrale TCS avant toute intervention : 0800 140 140 en Suisse ou +41 58 827 22 20 à l’étranger (ETI).',
  },
];

const BRAND_CTA_CLASS: Record<IncidentGuide['brand'], string> = {
  smile: 'bg-[#F26B00] hover:bg-[#D95B00] text-white',
  alphera: 'bg-[#007AB8] hover:bg-[#006699] text-white',
  tcs: 'bg-[#FFD200] hover:bg-[#F0C400] text-[#0B0C0F] font-semibold',
};

export const InsuranceView: React.FC = () => {
  const { state, updateAlpheraDates, updateTcs, setActiveTab, showToast } =
    useApp();
  const { smile, alpheraProtection, tcs } = state;

  const [selectedIncident, setSelectedIncident] =
    useState<IncidentId>('collision');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [editingAlphera, setEditingAlphera] = useState(false);
  const [apStart, setApStart] = useState(alpheraProtection.startDate);
  const [apEnd, setApEnd] = useState(alpheraProtection.endDate);

  const now = useMemo(() => new Date(), []);
  const activeGuide =
    INCIDENT_GUIDES.find((g) => g.id === selectedIncident) ?? INCIDENT_GUIDES[0];

  const alpheraEnd = parseLocalDate(alpheraProtection.endDate);
  const cancelDeadline = addDaysLocal(
    alpheraEnd,
    -alpheraProtection.cancellationNoticeDays
  );
  const daysToCancel = diffDaysLocal(now, cancelDeadline);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      showToast(`Copié : ${text}`);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      showToast('Copie manuelle requise', 'info');
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* 1. Urgences & Assistant sinistre (panneau unifié) */}
      <section className="panel overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Appels directs 1 tap */}
        <div className="lg:col-span-5 p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-4 w-4 text-[#E53935]" />
            <div>
              <h1 className="font-display text-base font-semibold tracking-tight">
                En cas d’incident ou sinistre
              </h1>
              <p className="text-xs text-[#636873] dark:text-[#8B8F99]">
                Appels directs hors-ligne
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <a
              href={telHref(smile.phone)}
              className="rounded-md bg-[#F26B00] p-3 text-white hover:bg-[#D95B00] flex items-center gap-2.5"
            >
              <img
                src="/images/logos/smile.png"
                alt="Smile"
                className="h-7 w-7 rounded-[5px] object-cover shrink-0 ring-1 ring-white/25"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">Smile Car</span>
                </div>
                <div className="mt-0.5 font-display text-xs opacity-95 tabular-nums whitespace-nowrap">
                  {smile.phone}
                </div>
              </div>
            </a>

            <a
              href={telHref(tcs.phoneRoadsideCH)}
              className="rounded-md bg-[#FFD200] p-3 text-[#0B0C0F] hover:bg-[#F0C400] flex items-center gap-2.5"
            >
              <img
                src="/images/logos/tcs.jpg"
                alt="TCS"
                className="h-7 w-7 rounded-[5px] object-cover shrink-0 ring-1 ring-black/15"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#0B0C0F]" />
                  <span className="truncate">TCS Panne CH</span>
                </div>
                <div className="mt-0.5 font-display text-xs font-semibold text-[#0B0C0F]/85 tabular-nums whitespace-nowrap">
                  {tcs.phoneRoadsideCH}
                </div>
              </div>
            </a>

            <a
              href={telHref(alpheraProtection.claimsPhone)}
              className="rounded-md bg-[#007AB8] p-3 text-white hover:bg-[#006699] flex items-center gap-2.5"
            >
              <span className="inline-flex h-7 items-center rounded-[4px] bg-white px-1.5 shrink-0">
                <img
                  src="/images/logos/alphera.png"
                  alt="ALPHERA"
                  className="h-5 w-auto object-contain"
                />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">ALPHERA / AWP</span>
                </div>
                <div className="mt-0.5 font-display text-xs text-white/95 tabular-nums whitespace-nowrap">
                  {alpheraProtection.claimsPhone}
                </div>
              </div>
            </a>

            <a
              href={telHref(tcs.phoneEtiAbroad)}
              className="rounded-md border border-[#C99A00]/50 dark:border-[#FFD200]/55 bg-[#FFD200]/18 dark:bg-[#FFD200]/14 p-3 hover:bg-[#FFD200]/26 dark:hover:bg-[#FFD200]/22 flex items-center gap-2.5"
            >
              <img
                src="/images/logos/tcs.jpg"
                alt="TCS ETI"
                className="h-7 w-7 rounded-[5px] object-cover shrink-0 ring-1 ring-black/10"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0B0C0F] dark:text-[#F5F5F7]">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#9A7400] dark:text-[#FFD200]" />
                  <span className="truncate">TCS ETI Étranger</span>
                </div>
                <div className="mt-0.5 font-display text-xs text-[#4B5563] dark:text-[#D1D5DB] tabular-nums whitespace-nowrap">
                  {tcs.phoneEtiAbroad}
                </div>
              </div>
            </a>
          </div>
        </div>

        {/* Assistant sinistre */}
        <div className="lg:col-span-7 border-t lg:border-t-0 lg:border-l border-[#E5E7EB] dark:border-white/[0.08] p-5 sm:p-6 space-y-4 bg-black/[0.02] dark:bg-white/[0.015]">
          <div className="text-xs text-[#636873] dark:text-[#8B8F99]">
            Marche à suivre selon le sinistre
          </div>

          <div className="flex flex-wrap gap-1.5">
            {INCIDENT_GUIDES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setSelectedIncident(g.id)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  selectedIncident === g.id
                    ? 'bg-[#0B0C0F] text-white dark:bg-[#F5F5F7] dark:text-[#050507]'
                    : 'border border-[#D8DFE9] dark:border-white/[0.1] text-[#636873] dark:text-[#8B8F99] hover:text-[#0B0C0F] dark:hover:text-white'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="space-y-2.5 pt-2">
            <h2 className="font-display text-base font-semibold">
              {activeGuide.insurer}
            </h2>
            <p className="text-xs font-medium text-[#E59A1A]">
              Franchise / Plafond : {activeGuide.franchise}
            </p>
            <p className="text-xs text-[#636873] dark:text-[#8B8F99] leading-relaxed">
              {activeGuide.steps}
            </p>
            <div className="pt-1">
              <a
                href={telHref(activeGuide.phone)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${BRAND_CTA_CLASS[activeGuide.brand]}`}
              >
                <Phone className="h-3.5 w-3.5" />
                Appeler {activeGuide.phoneLabel} ({activeGuide.phone})
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Smile & Carte Verte */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Smile Car */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/images/logos/smile.png"
                alt="Smile"
                className="h-8 w-8 rounded-[5px] object-cover shrink-0"
              />
              <div className="min-w-0">
                <h2 className="font-display text-base font-semibold tracking-tight truncate">
                  Smile Car
                </h2>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-display text-base font-semibold tabular-nums">
                {formatChf(smile.annualPremium)}
              </div>
              <div className="text-[11px] text-[#636873] dark:text-[#8B8F99] tabular-nums">
                {formatChf(smile.monthlyEquivalent)} / mois
              </div>
            </div>
          </div>

          <div className="border-l-2 border-[#E53935] pl-3.5 py-1 space-y-1.5 text-xs">
            <div className="font-medium text-[#E53935]">
              Exclusions explicites Smile
            </div>
            <ul className="space-y-1 text-[#636873] dark:text-[#8B8F99]">
              <li>
                Accidents occupants : non couvert par Smile (vérifier LAA ou
                assurance accidents privée)
              </li>
              <li>Assistance dépannage : assurée via le TCS</li>
              <li>
                Protection juridique : assurée via ALPHERA Protection et TCS
                Assista
              </li>
            </ul>
          </div>

          <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] text-xs">
            <div className="py-3 flex justify-between gap-4">
              <div>
                <div className="font-medium">Responsabilité civile</div>
                <div className="mt-0.5 text-[#636873] dark:text-[#8B8F99]">
                  {smile.liabilityLimit}, degré {smile.liabilityGrade}, bonus
                  protégé. Franchise {formatChf(smile.liabilityDeductibleHabitual)}{' '}
                  (jeunes {formatChf(smile.liabilityDeductibleYoung)}).
                </div>
              </div>
              <div className="font-display font-semibold tabular-nums shrink-0">
                {formatChf(smile.liabilityPremium)}
              </div>
            </div>

            <div className="py-3 flex justify-between gap-4">
              <div>
                <div className="font-medium">
                  Casco partielle et complète (Collision)
                </div>
                <div className="mt-0.5 text-[#636873] dark:text-[#8B8F99]">
                  Partielle {formatChf(smile.partialCascoDeductible)} (bris de
                  glace {smile.glassCoverage}). Collision{' '}
                  {formatChf(smile.fullCascoDeductible)} (degré{' '}
                  {smile.fullCascoGrade}, bonus protégé), parking{' '}
                  {smile.parkingDamage.toLowerCase()}. Indemnisation{' '}
                  {smile.indemnityType}, effets personnels{' '}
                  {smile.personalBelongings.toLowerCase()}.
                </div>
              </div>
              <div className="font-display font-semibold tabular-nums shrink-0">
                {formatChf(smile.cascoPremium)}
              </div>
            </div>

            <div className="py-3 flex justify-between gap-4">
              <div>
                <div className="font-medium">Négligence grave incluse</div>
                <div className="mt-0.5 text-[#636873] dark:text-[#8B8F99]">
                  Prime nette {formatChf(smile.netPremium)} + taxes légales{' '}
                  {formatChf(smile.legalTaxes)}
                </div>
              </div>
              <div className="font-display font-semibold tabular-nums shrink-0">
                {formatChf(smile.grossNegligencePremium)}
              </div>
            </div>
          </div>
        </section>

        {/* Carte Verte Internationale */}
        <section className="lg:col-span-5 panel overflow-hidden">
          <div className="h-[3px] w-full bg-[#18A96B]" />
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#18A96B]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Carte Verte Internationale
                </div>
                <h2 className="mt-1 font-display text-lg font-semibold tracking-tight break-all">
                  {smile.greenCardCode}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => copyText('greencard', smile.greenCardCode)}
                className="shrink-0 inline-flex items-center gap-1 rounded-md border border-[#D8DFE9] dark:border-white/[0.12] px-3 py-1 text-xs font-medium hover:border-[#0066FF]"
              >
                {copiedKey === 'greencard' ? (
                  <Check className="h-3.5 w-3.5 text-[#18A96B]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                Copier
              </button>
            </div>

            <dl className="grid grid-cols-2 gap-4 pt-3 border-t border-[#E5E7EB] dark:border-white/[0.08] text-xs">
              <div>
                <dt className="text-[#636873] dark:text-[#8B8F99]">Validité</dt>
                <dd className="mt-0.5 font-medium tabular-nums">
                  {formatDateCH(smile.startDate)} au{' '}
                  {formatDateCH(smile.endDate)}
                </dd>
              </div>
              <div>
                <dt className="text-[#636873] dark:text-[#8B8F99]">
                  Catégorie et plaque
                </dt>
                <dd className="mt-0.5 font-medium">
                  {smile.category} ({state.vehicle.plate})
                </dd>
              </div>
            </dl>

            <p className="text-xs text-[#636873] dark:text-[#8B8F99]">
              Pays non couverts (barrés) :{' '}
              <span className="font-medium text-[#E53935]">
                {smile.excludedCountries.join(', ')}
              </span>
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('documents')}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#18A96B] px-3.5 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
              >
                <FileText className="h-3.5 w-3.5" />
                Gérer mes PDF dans Documents
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* 3. ALPHERA Protection & TCS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* ALPHERA Protection */}
        <section className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex h-8 items-center rounded-[5px] bg-white px-2 py-1 border border-black/10 shrink-0">
                <img
                  src="/images/logos/alphera.png"
                  alt="ALPHERA Financial Services"
                  className="h-6 w-auto object-contain"
                />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-base font-semibold tracking-tight truncate">
                  ALPHERA Protection
                </h2>
                <p className="text-xs text-[#636873] dark:text-[#8B8F99] truncate">
                  {alpheraProtection.statusLabel}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setApStart(alpheraProtection.startDate);
                setApEnd(alpheraProtection.endDate);
                setEditingAlphera((v) => !v);
              }}
              className="shrink-0 text-xs font-medium text-[#0066FF] dark:text-[#4D94FF] hover:underline"
            >
              {editingAlphera ? 'Fermer' : 'Modifier les dates'}
            </button>
          </div>

          <div className="border-l-2 border-[#E59A1A] pl-3.5 py-1 space-y-2 text-xs">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">
                Période : {formatDateCH(alpheraProtection.startDate)} au{' '}
                {formatDateCH(alpheraProtection.endDate)}
              </span>
              <span className="font-medium text-[#E59A1A]">
                Résiliation J-60 avant le{' '}
                {formatDateCH(toLocalDateStr(cancelDeadline))} ({daysToCancel} j)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  downloadIcsEvent({
                    title: 'BMW X3 : Décider ou résilier ALPHERA Protection',
                    description: `Fin gratuité le ${formatDateCH(alpheraProtection.endDate)}. Résilier min. ${alpheraProtection.cancellationNoticeDays} j avant reconduction.`,
                    startLocal: `${toLocalDateStr(cancelDeadline)}T09:00`,
                    filename: 'bmw-x3-alphera-resiliation.ics',
                  });
                  showToast('Rappel résiliation ALPHERA (.ics) téléchargé');
                }}
                className="inline-flex items-center gap-1 rounded-md border border-[#D8DFE9] dark:border-white/[0.12] px-3 py-1 text-[11px] font-medium hover:border-[#0066FF]"
              >
                <CalendarPlus className="h-3 w-3" />
                Rappel J-60 (.ics)
              </button>
              <a
                href={`mailto:${alpheraProtection.claimsEmail}`}
                className="inline-flex items-center gap-1 rounded-md border border-[#D8DFE9] dark:border-white/[0.12] px-3 py-1 text-[11px] font-medium hover:border-[#0066FF]"
              >
                <Mail className="h-3 w-3" />
                {alpheraProtection.claimsEmail}
              </a>
            </div>
          </div>

          {editingAlphera && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateAlpheraDates(apStart, apEnd);
                setEditingAlphera(false);
              }}
              className="panel p-4 space-y-3"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                    Début gratuité
                  </label>
                  <input
                    type="date"
                    value={apStart}
                    onChange={(e) => setApStart(e.target.value)}
                    required
                    className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                    Fin gratuité
                  </label>
                  <input
                    type="date"
                    value={apEnd}
                    onChange={(e) => setApEnd(e.target.value)}
                    required
                    className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-1.5 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="rounded-md bg-[#0066FF] px-4 py-2 text-xs font-medium text-white"
              >
                Enregistrer les dates
              </button>
            </form>
          )}

          <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] text-xs">
            {alpheraProtection.coverages.map((c) => (
              <div
                key={c.id}
                className="py-2.5 flex items-baseline justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="font-medium">{c.title}</div>
                  <div className="text-[11px] text-[#636873] dark:text-[#8B8F99]">
                    {c.note}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-semibold tabular-nums text-[#0066FF] dark:text-[#4D94FF]">
                    {c.limitPerEvent}
                  </div>
                  {c.limitPerYear && (
                    <div className="text-[10px] text-[#636873] dark:text-[#8B8F99] tabular-nums">
                      {c.limitPerYear}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TCS & Livret ETI */}
        <section className="lg:col-span-5 panel p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <img
              src="/images/logos/tcs.jpg"
              alt="Touring Club Suisse"
              className="h-8 w-8 rounded-[5px] object-cover shrink-0 ring-1 ring-black/10"
            />
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold tracking-tight truncate">
                Touring Club Suisse (TCS)
              </h2>
              <p className="text-xs text-[#636873] dark:text-[#8B8F99] truncate">
                Dépannage Suisse et Livret ETI
              </p>
            </div>
          </div>

          <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08] text-xs">
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#636873] dark:text-[#8B8F99]">
                Sociétariat dépannage
              </span>
              <select
                value={tcs.roadsideStatus}
                onChange={(e) =>
                  updateTcs({
                    roadsideStatus: e.target.value as
                      | 'yes'
                      | 'to_confirm'
                      | 'no',
                  })
                }
                aria-label="Statut dépannage TCS"
                className="rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-white dark:bg-[#0D1119] px-2.5 py-1 text-xs font-medium"
              >
                <option value="to_confirm">À confirmer</option>
                <option value="yes">Oui (actif)</option>
                <option value="no">Non / Base</option>
              </select>
            </div>
            <div className="py-2.5 flex items-center justify-between gap-2">
              <span className="text-[#636873] dark:text-[#8B8F99]">
                N° sociétaire
              </span>
              <input
                type="text"
                value={tcs.membershipNumber}
                onChange={(e) => updateTcs({ membershipNumber: e.target.value })}
                className="w-36 rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-2.5 py-1 text-xs text-right"
              />
            </div>
            <div className="py-2.5">
              <div className="font-medium">
                Jusqu’au {formatDateCH(tcs.etiCurrentUntil)}
              </div>
              <div className="text-[11px] text-[#636873] dark:text-[#8B8F99]">
                {tcs.etiCurrentPlan.replace(/\s*\(CHF[^)]*\)/g, '')}
              </div>
            </div>
            <div className="py-2.5">
              <div className="font-medium text-[#18A96B]">
                Du {formatDateCH(tcs.etiNextStart)} au{' '}
                {formatDateCH(tcs.etiNextEnd)}
              </div>
              <div className="text-[11px] text-[#636873] dark:text-[#8B8F99]">
                {tcs.etiNextPlan.replace(/\s*\(CHF[^)]*\)/g, '')}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
