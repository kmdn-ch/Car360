import { APP_SCHEMA_VERSION, INITIAL_STATE } from '../data/initialData';
import type { AppState, TabId } from '../types';

export const STATE_STORAGE_KEY = 'x3_g01_app_state_v1';
export const TAB_STORAGE_KEY = 'x3_g01_active_tab_v1';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepMerge<T>(defaults: T, incoming: unknown): T {
  if (!isPlainObject(defaults) || !isPlainObject(incoming)) {
    return (incoming !== undefined ? incoming : defaults) as T;
  }
  const result: Record<string, unknown> = { ...defaults };
  for (const key of Object.keys(defaults)) {
    const defVal = defaults[key];
    const incVal = incoming[key];
    if (incVal === undefined) {
      result[key] = defVal;
    } else if (Array.isArray(defVal)) {
      result[key] = Array.isArray(incVal) ? incVal : defVal;
    } else if (isPlainObject(defVal) && isPlainObject(incVal)) {
      result[key] = deepMerge(defVal, incVal);
    } else {
      result[key] = incVal;
    }
  }
  return result as T;
}

export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STATE_STORAGE_KEY);
    if (!raw) return structuredClone(INITIAL_STATE);
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed) || !isPlainObject(parsed.vehicle)) {
      return structuredClone(INITIAL_STATE);
    }
    const merged = deepMerge(structuredClone(INITIAL_STATE), parsed);
    merged.schemaVersion = APP_SCHEMA_VERSION;
    return merged;
  } catch {
    return structuredClone(INITIAL_STATE);
  }
}

export function saveAppState(state: AppState): void {
  try {
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors cleanly; user sees toast on explicit actions if needed
  }
}

export function loadActiveTab(): TabId {
  try {
    const v = localStorage.getItem(TAB_STORAGE_KEY);
    if (
      v === 'dashboard' ||
      v === 'insurance' ||
      v === 'maintenance' ||
      v === 'leasing' ||
      v === 'documents'
    ) {
      return v;
    }
  } catch {
    // ignore
  }
  return 'dashboard';
}

export function saveActiveTab(tab: TabId): void {
  try {
    localStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {
    // ignore
  }
}

export interface BackupAttachmentPayload {
  meta: {
    id: string;
    name: string;
    category: 'Assurance' | 'Leasing' | 'TCS' | 'Entretien' | 'Autre';
    mimeType: string;
    size: number;
    addedAt: string;
  };
  base64: string;
}

export interface BackupPackage {
  app: 'x3-g01';
  schemaVersion: number;
  exportedAt: string;
  state: AppState;
  attachments?: BackupAttachmentPayload[];
}

export function validateBackupPayload(raw: unknown): BackupPackage {
  if (!isPlainObject(raw)) {
    throw new Error('Fichier JSON invalide.');
  }
  if (raw.app !== 'x3-g01') {
    throw new Error("Ce fichier n'est pas une sauvegarde BMW X3 (x3-g01).");
  }
  if (typeof raw.schemaVersion !== 'number' || raw.schemaVersion < 1) {
    throw new Error('Version de schéma absente ou invalide.');
  }
  if (!isPlainObject(raw.state) || !isPlainObject(raw.state.vehicle)) {
    throw new Error('Données véhicule absentes dans la sauvegarde.');
  }
  const mergedState = deepMerge(structuredClone(INITIAL_STATE), raw.state);
  mergedState.schemaVersion = APP_SCHEMA_VERSION;

  const attachments = Array.isArray(raw.attachments)
    ? (raw.attachments as BackupAttachmentPayload[])
    : undefined;

  return {
    app: 'x3-g01',
    schemaVersion: mergedState.schemaVersion,
    exportedAt:
      typeof raw.exportedAt === 'string'
        ? raw.exportedAt
        : new Date().toISOString(),
    state: mergedState,
    attachments,
  };
}
