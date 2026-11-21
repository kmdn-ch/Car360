import type { VaultDocumentMeta } from '../types';
import type { BackupAttachmentPayload } from './stateStorage';

const DB_NAME = 'x3_g01_documents_db';
const DB_VERSION = 1;
const STORE_NAME = 'files';

interface StoredVaultRecord extends VaultDocumentMeta {
  blob: Blob;
}

function openVaultDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listVaultDocuments(): Promise<VaultDocumentMeta[]> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const records = (req.result as StoredVaultRecord[]) ?? [];
      const metas: VaultDocumentMeta[] = records
        .map(({ id, name, category, mimeType, size, addedAt }) => ({
          id,
          name,
          category,
          mimeType,
          size,
          addedAt,
        }))
        .sort((a, b) => b.addedAt.localeCompare(a.addedAt));
      resolve(metas);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function addVaultDocument(
  file: File,
  category: VaultDocumentMeta['category']
): Promise<VaultDocumentMeta> {
  const db = await openVaultDb();
  const id = `vault-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const record: StoredVaultRecord = {
    id,
    name: file.name,
    category,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
    addedAt: new Date().toISOString(),
    blob: file,
  };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  const { blob: _b, ...meta } = record;
  void _b;
  return meta;
}

export async function getVaultDocumentBlob(id: string): Promise<Blob | null> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => {
      const rec = req.result as StoredVaultRecord | undefined;
      resolve(rec?.blob ?? null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteVaultDocument(id: string): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearVaultDocuments(): Promise<void> {
  const db = await openVaultDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result ?? '');
      const comma = res.indexOf(',');
      resolve(comma >= 0 ? res.slice(comma + 1) : res);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

export async function exportVaultAttachments(): Promise<
  BackupAttachmentPayload[]
> {
  const db = await openVaultDb();
  const records = await new Promise<StoredVaultRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () =>
      resolve((req.result as StoredVaultRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  const out: BackupAttachmentPayload[] = [];
  for (const r of records) {
    const base64 = await blobToBase64(r.blob);
    out.push({
      meta: {
        id: r.id,
        name: r.name,
        category: r.category,
        mimeType: r.mimeType,
        size: r.size,
        addedAt: r.addedAt,
      },
      base64,
    });
  }
  return out;
}

export async function importVaultAttachments(
  items: BackupAttachmentPayload[]
): Promise<void> {
  await clearVaultDocuments();
  if (!items.length) return;
  const db = await openVaultDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const item of items) {
      if (!item?.meta?.id || typeof item.base64 !== 'string') continue;
      const blob = base64ToBlob(
        item.base64,
        item.meta.mimeType || 'application/octet-stream'
      );
      store.put({
        ...item.meta,
        blob,
      });
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
