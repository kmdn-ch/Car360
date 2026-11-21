import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarPlus,
  Download,
  Edit3,
  Eye,
  FileText,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { useApp } from '../context/AppContext';
import { BUILTIN_DOCUMENTS } from '../data/builtinDocs';
import {
  addVaultDocument,
  clearVaultDocuments,
  deleteVaultDocument,
  exportVaultAttachments,
  getVaultDocumentBlob,
  importVaultAttachments,
  listVaultDocuments,
} from '../storage/documentVault';
import {
  validateBackupPayload,
  type BackupPackage,
} from '../storage/stateStorage';
import type { VaultDocumentMeta, WarrantyItem } from '../types';
import { diffDaysLocal, parseLocalDate, toLocalDateStr } from '../utils/dates';
import { formatDateCH } from '../utils/format';
import { downloadIcsEvent } from '../utils/ics';
import {
  isNativeAndroid,
  openBundledPdf,
  shareTextFile,
} from '../utils/nativeFiles';

export const DocumentsView: React.FC = () => {
  const {
    state,
    upsertWarranty,
    deleteWarranty,
    replaceFullState,
    resetToDefault,
    setActiveTab,
    showToast,
  } = useApp();

  const now = useMemo(() => new Date(), []);

  const [docCat, setDocCat] = useState<
    'Tous' | 'Assurance' | 'Leasing' | 'TCS' | 'Véhicule'
  >('Tous');

  const [vaultDocs, setVaultDocs] = useState<VaultDocumentMeta[]>([]);
  const [uploadCat, setUploadCat] =
    useState<VaultDocumentMeta['category']>('Entretien');
  const [previewImgUrl, setPreviewImgUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>('');

  const [includeAttachments, setIncludeAttachments] = useState(true);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const vaultFileInputRef = useRef<HTMLInputElement>(null);

  const [warModalOpen, setWarModalOpen] = useState(false);
  const [warForm, setWarForm] = useState<WarrantyItem>({
    id: '',
    title: '',
    provider: '',
    coverage: '',
    startDate: toLocalDateStr(new Date()),
    endDate: toLocalDateStr(new Date()),
    notes: '',
  });

  const [pendingBackup, setPendingBackup] = useState<BackupPackage | null>(
    null
  );
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const refreshVault = async () => {
    try {
      const list = await listVaultDocuments();
      setVaultDocs(list);
    } catch {
      // ignore if indexedDB unavailable
    }
  };

  useEffect(() => {
    void refreshVault();
  }, []);

  const filteredBuiltin = useMemo(() => {
    if (docCat === 'Tous') return BUILTIN_DOCUMENTS;
    return BUILTIN_DOCUMENTS.filter((d) => d.category === docCat);
  }, [docCat]);

  const totalVaultSizeKB = useMemo(
    () => Math.round(vaultDocs.reduce((s, d) => s + d.size, 0) / 1024),
    [vaultDocs]
  );

  const handleVaultUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      await addVaultDocument(file, uploadCat);
      await refreshVault();
      showToast(`Document ajouté hors-ligne : ${file.name}`);
    } catch {
      showToast("Erreur lors de l'enregistrement local", 'warning');
    }
  };

  const handlePreviewVault = async (doc: VaultDocumentMeta) => {
    const blob = await getVaultDocumentBlob(doc.id);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    if (doc.mimeType.startsWith('image/')) {
      setPreviewTitle(doc.name);
      setPreviewImgUrl(url);
    } else {
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  };

  const handleDeleteVault = async (id: string) => {
    await deleteVaultDocument(id);
    await refreshVault();
    showToast('Pièce jointe supprimée', 'info');
  };

  const handleExportJson = async () => {
    try {
      const attachments = includeAttachments
        ? await exportVaultAttachments()
        : undefined;
      const pkg: BackupPackage = {
        app: 'x3-g01',
        schemaVersion: state.schemaVersion,
        exportedAt: new Date().toISOString(),
        state,
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      };
      const jsonText = JSON.stringify(pkg, null, 2);
      const filename = `car360-backup-${toLocalDateStr(new Date())}.json`;
      if (isNativeAndroid()) {
        await shareTextFile(jsonText, filename, 'Sauvegarde Car360 (JSON)');
        showToast('Sauvegarde JSON exportée');
        return;
      }
      const blob = new Blob([jsonText], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Sauvegarde JSON exportée');
    } catch {
      showToast("Erreur lors de l'export JSON", 'warning');
    }
  };

  const handleImportJsonChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const validated = validateBackupPayload(parsed);
      setPendingBackup(validated);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Sauvegarde JSON invalide',
        'warning'
      );
    }
  };

  const confirmImportBackup = async () => {
    if (!pendingBackup) return;
    replaceFullState(pendingBackup.state);
    if (pendingBackup.attachments) {
      await importVaultAttachments(pendingBackup.attachments);
      await refreshVault();
    }
    setPendingBackup(null);
  };

  const warrantyStatus = (w: WarrantyItem) => {
    const start = parseLocalDate(w.startDate);
    const end = parseLocalDate(w.endDate);
    const daysLeft = diffDaysLocal(now, end);
    if (now < start) return { label: 'À venir', color: '#0066FF' };
    if (daysLeft < 0) return { label: 'Expirée', color: '#E53935' };
    if (daysLeft <= 60)
      return { label: `Expire dans ${daysLeft} j`, color: '#E59A1A' };
    return {
      label: w.toConfirm ? 'Active (à confirmer)' : 'Active',
      color: '#18A96B',
    };
  };

  const openNewWarranty = () => {
    setWarForm({
      id: `war-${Date.now()}`,
      title: '',
      provider: '',
      coverage: '',
      startDate: toLocalDateStr(new Date()),
      endDate: toLocalDateStr(new Date()),
      notes: '',
    });
    setWarModalOpen(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
      {/* Colonne gauche (7 cols) : Documents officiels + Coffre local */}
      <div className="lg:col-span-7 space-y-8">
        {/* 1. Documents embarqués hors-ligne */}
        <section className="space-y-4">
          <div className="border-b border-[#E5E7EB] dark:border-white/[0.08] pb-3">
            <h1 className="font-display text-base font-semibold tracking-tight">
              {BUILTIN_DOCUMENTS.length > 0
                ? `Documents officiels (${BUILTIN_DOCUMENTS.length} PDF hors-ligne)`
                : 'Documents officiels'}
            </h1>
            <p className="text-xs text-[#636873] dark:text-[#8B8F99]">
              {BUILTIN_DOCUMENTS.length > 0
                ? 'Précachés sur l’appareil pour consultation sans réseau'
                : 'Aucun document PDF pré-embarqué dans cette version démo anonymisée'}
            </p>
          </div>

          {BUILTIN_DOCUMENTS.length === 0 ? (
            <p className="text-xs text-[#636873] dark:text-[#8B8F99] leading-relaxed">
              Aucun document PDF pré-embarqué dans cette version démo
              anonymisée. Ajoutez vos propres fichiers hors-ligne dans le coffre
              local ci-dessous.
            </p>
          ) : (
            <>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {(
                  ['Tous', 'Assurance', 'Leasing', 'TCS', 'Véhicule'] as const
                ).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setDocCat(cat)}
                    className={`shrink-0 rounded-md min-h-[34px] px-3 py-1.5 text-xs font-medium transition-colors ${
                      docCat === cat
                        ? 'bg-[#0B0C0F] text-white dark:bg-[#F5F5F7] dark:text-[#050507]'
                        : 'border border-[#D8DFE9] dark:border-white/[0.1] text-[#636873] dark:text-[#8B8F99] hover:text-[#0B0C0F] dark:hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
                {filteredBuiltin.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.file}
                    target="_blank"
                    rel="noopener"
                    onClick={(e) => {
                      if (isNativeAndroid()) {
                        e.preventDefault();
                        void openBundledPdf(
                          doc.file,
                          doc.title,
                          doc.file.split('/').pop() || 'document.pdf'
                        );
                      }
                    }}
                    className="group py-3 flex items-center justify-between gap-3 text-xs hover:text-[#0066FF] dark:hover:text-[#4D94FF] transition-colors"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-[#636873] dark:text-[#8B8F99] group-hover:text-[#0066FF] dark:group-hover:text-[#4D94FF] mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {doc.title}
                        </div>
                        <div className="text-[11px] text-[#636873] dark:text-[#8B8F99] truncate">
                          {doc.category}, {doc.sizeKB} Ko
                          {doc.subtitle ? ` — ${doc.subtitle}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-[#0066FF] dark:text-[#4D94FF]">
                      Ouvrir
                    </span>
                  </a>
                ))}
              </div>
            </>
          )}
        </section>

        {/* 2. Mes pièces jointes locales (IndexedDB) */}
        <section className="panel p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight">
              Pièces jointes personnelles
            </h2>
            <p className="text-xs text-[#636873] dark:text-[#8B8F99] tabular-nums">
              Stockage local IndexedDB : {vaultDocs.length} fichier(s),{' '}
              {totalVaultSizeKB} Ko
            </p>
          </div>

          <div className="flex gap-2">
            <select
              value={uploadCat}
              onChange={(e) =>
                setUploadCat(e.target.value as VaultDocumentMeta['category'])
              }
              aria-label="Catégorie pièce jointe"
              className="rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-white dark:bg-[#0D1119] px-3 py-2 text-xs"
            >
              <option value="Entretien">Entretien</option>
              <option value="Assurance">Assurance</option>
              <option value="Leasing">Leasing</option>
              <option value="TCS">TCS</option>
              <option value="Autre">Autre</option>
            </select>

            <input
              ref={vaultFileInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={handleVaultUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => vaultFileInputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-md bg-[#0066FF] min-h-[38px] py-2 px-3 text-xs font-medium text-white hover:bg-[#0052CC] transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter PDF ou photo
            </button>
          </div>

          {vaultDocs.length === 0 ? (
            <p className="py-2 text-xs text-[#636873] dark:text-[#8B8F99]">
              Ajoutez vos factures d’entretien, photos de pneus ou quittances
              pour les garder hors-ligne.
            </p>
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
              {vaultDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="py-2.5 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{doc.name}</div>
                    <div className="text-[11px] text-[#636873] dark:text-[#8B8F99]">
                      {doc.category}, {Math.max(1, Math.round(doc.size / 1024))}{' '}
                      Ko
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePreviewVault(doc)}
                      aria-label={`Ouvrir ${doc.name}`}
                      className="rounded-md p-1.5 text-[#0066FF] dark:text-[#4D94FF]"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteVault(doc.id)}
                      aria-label={`Supprimer ${doc.name}`}
                      className="rounded-md p-1.5 text-[#636873] hover:text-[#E53935]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Colonne droite (5 cols) : Garanties + Sauvegarde */}
      <div className="lg:col-span-5 space-y-8">
        {/* 3. Garanties */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between gap-2 border-b border-[#E5E7EB] dark:border-white/[0.08] pb-3">
            <h2 className="font-display text-base font-semibold tracking-tight">
              Garanties actives
            </h2>
            <button
              type="button"
              onClick={openNewWarranty}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#0066FF] dark:text-[#4D94FF] hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </button>
          </div>

          <div className="divide-y divide-[#E5E7EB] dark:divide-white/[0.08]">
            {state.warranties.map((w) => {
              const st = warrantyStatus(w);
              return (
                <div
                  key={w.id}
                  className="py-3.5 text-xs flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: st.color }}
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-sm leading-snug">
                        {w.title}
                      </div>
                      <div className="mt-0.5 text-[#636873] dark:text-[#8B8F99]">
                        <span
                          style={{ color: st.color }}
                          className="font-medium"
                        >
                          {st.label}
                        </span>{' '}
                        — {w.provider}, {w.coverage}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#636873] dark:text-[#8B8F99] tabular-nums">
                        Du {formatDateCH(w.startDate)} au{' '}
                        {formatDateCH(w.endDate)}
                      </div>
                      {w.notes && (
                        <div className="mt-0.5 text-[11px] text-[#636873] dark:text-[#8B8F99]">
                          {w.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        downloadIcsEvent({
                          title: `BMW X3 : Échéance ${w.title}`,
                          description: `${w.provider} — ${w.coverage}`,
                          startLocal: `${w.endDate}T09:00`,
                          filename: `bmw-x3-${w.id}.ics`,
                        });
                        showToast('Rappel .ics téléchargé');
                      }}
                      aria-label="Rappel échéance"
                      className="p-1.5 rounded-md text-[#636873] hover:text-[#0066FF]"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                    </button>
                    {w.syncedWithAlphera ? (
                      <button
                        type="button"
                        onClick={() => setActiveTab('insurance')}
                        className="text-[11px] font-medium text-[#0066FF] dark:text-[#4D94FF] px-1.5 py-1"
                      >
                        Assurances
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setWarForm({ ...w });
                          setWarModalOpen(true);
                        }}
                        aria-label={`Modifier ${w.title}`}
                        className="p-1.5 rounded-md text-[#636873] dark:text-[#8B8F99] hover:text-[#0B0C0F] dark:hover:text-white"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. Sauvegarde JSON */}
        <section className="panel p-5 sm:p-6 space-y-4">
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight">
              Sauvegarde et transfert
            </h2>
            <p className="text-xs text-[#636873] dark:text-[#8B8F99]">
              Export complet en JSON avec pièces jointes optionnelles
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={includeAttachments}
              onChange={(e) => setIncludeAttachments(e.target.checked)}
              className="h-4 w-4 accent-[#0066FF]"
            />
            Inclure les pièces jointes locales (Base64)
          </label>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#0B0C0F] dark:bg-white/[0.12] min-h-[40px] py-2.5 px-3 text-xs font-medium text-white hover:opacity-85 transition-opacity"
            >
              <Download className="h-4 w-4" />
              Exporter JSON
            </button>

            <input
              ref={jsonInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportJsonChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[#D8DFE9] dark:border-white/[0.14] min-h-[40px] py-2.5 px-3 text-xs font-medium hover:bg-black/[0.03] dark:hover:bg-white/[0.05] transition-colors"
            >
              <Upload className="h-4 w-4" />
              Importer JSON
            </button>
          </div>

          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-[#E53935]/30 min-h-[40px] py-2.5 text-xs font-medium text-[#E53935] hover:bg-[#E53935]/10 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Réinitialiser aux données de démonstration
          </button>
        </section>
      </div>

      {/* Modal Aperçu Image */}
      <Modal
        open={Boolean(previewImgUrl)}
        onClose={() => {
          if (previewImgUrl) URL.revokeObjectURL(previewImgUrl);
          setPreviewImgUrl(null);
        }}
        title={previewTitle}
      >
        {previewImgUrl && (
          <img
            src={previewImgUrl}
            alt={previewTitle}
            className="w-full rounded-md object-contain max-h-[70vh]"
          />
        )}
      </Modal>

      {/* Modal Garantie */}
      <Modal
        open={warModalOpen}
        onClose={() => setWarModalOpen(false)}
        title="Garantie véhicule / pièce"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!warForm.title.trim()) return;
            upsertWarranty(warForm);
            setWarModalOpen(false);
          }}
          className="space-y-3"
        >
          <input
            type="text"
            required
            value={warForm.title}
            onChange={(e) => setWarForm({ ...warForm, title: e.target.value })}
            placeholder="Titre de la garantie"
            className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={warForm.provider}
            onChange={(e) =>
              setWarForm({ ...warForm, provider: e.target.value })
            }
            placeholder="Prestataire / Assureur"
            className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
          />
          <input
            type="text"
            value={warForm.coverage}
            onChange={(e) =>
              setWarForm({ ...warForm, coverage: e.target.value })
            }
            placeholder="Couverture / Pièces"
            className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                Début
              </label>
              <input
                type="date"
                value={warForm.startDate}
                onChange={(e) =>
                  setWarForm({ ...warForm, startDate: e.target.value })
                }
                required
                className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-2.5 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-[#636873] dark:text-[#8B8F99] mb-1">
                Expiration
              </label>
              <input
                type="date"
                value={warForm.endDate}
                onChange={(e) =>
                  setWarForm({ ...warForm, endDate: e.target.value })
                }
                required
                className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-2.5 py-2 text-xs"
              />
            </div>
          </div>
          <input
            type="text"
            value={warForm.notes ?? ''}
            onChange={(e) => setWarForm({ ...warForm, notes: e.target.value })}
            placeholder="Notes"
            className="w-full rounded-md border border-[#D8DFE9] dark:border-white/[0.14] bg-transparent px-3 py-2 text-xs"
          />
          <div className="flex gap-2 pt-1">
            {state.warranties.some((w) => w.id === warForm.id) && (
              <button
                type="button"
                onClick={() => {
                  deleteWarranty(warForm.id);
                  setWarModalOpen(false);
                }}
                aria-label="Supprimer garantie"
                className="rounded-md border border-[#E53935]/35 px-3 py-2 text-[#E53935]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setWarModalOpen(false)}
              className="flex-1 rounded-md border border-[#D8DFE9] dark:border-white/[0.14] py-2 text-xs font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-[#0066FF] py-2 text-xs font-medium text-white"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmation Import JSON */}
      <Modal
        open={Boolean(pendingBackup)}
        onClose={() => setPendingBackup(null)}
        title="Confirmer l'importation"
      >
        {pendingBackup && (
          <div className="space-y-3 text-xs">
            <p className="text-[#636873] dark:text-[#8B8F99]">
              Cette action remplacera l’état actuel par la sauvegarde du{' '}
              <strong className="text-[#0B0C0F] dark:text-white">
                {formatDateCH(pendingBackup.exportedAt.slice(0, 10))}
              </strong>{' '}
              (compteur :{' '}
              <strong className="text-[#0B0C0F] dark:text-white">
                {pendingBackup.state.vehicle.currentMileage} km
              </strong>
              {pendingBackup.attachments
                ? `, ${pendingBackup.attachments.length} pièce(s) jointe(s)`
                : ''}
              ).
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPendingBackup(null)}
                className="flex-1 rounded-md border border-[#D8DFE9] dark:border-white/[0.14] py-2 font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmImportBackup}
                className="flex-1 rounded-md bg-[#0066FF] py-2 font-medium text-white"
              >
                Importer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Confirmation Reset */}
      <Modal
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        title="Réinitialiser les données ?"
      >
        <div className="space-y-3 text-xs">
          <p className="text-[#636873] dark:text-[#8B8F99]">
            Toutes les modifications locales (relevés km, journal d’entretien,
            changements de roues) seront remises aux données de démonstration.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmResetOpen(false)}
              className="flex-1 rounded-md border border-[#D8DFE9] dark:border-white/[0.14] py-2 font-medium"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={async () => {
                resetToDefault();
                await clearVaultDocuments();
                await refreshVault();
                setConfirmResetOpen(false);
              }}
              className="flex-1 rounded-md bg-[#E53935] py-2 font-medium text-white"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
