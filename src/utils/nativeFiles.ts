import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export function isNativeAndroid(): boolean {
  return Capacitor.isNativePlatform();
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function openBundledPdf(
  url: string,
  title: string,
  filename: string
): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Impossible de charger ${url} (${res.status})`);
  }
  const base64 = arrayBufferToBase64(await res.arrayBuffer());
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  await Filesystem.writeFile({
    path: safeName,
    data: base64,
    directory: Directory.Cache,
  });

  const { uri } = await Filesystem.getUri({
    path: safeName,
    directory: Directory.Cache,
  });

  await Share.share({
    title,
    url: uri,
    dialogTitle: title,
  });
}

export async function shareTextFile(
  content: string,
  filename: string,
  title: string
): Promise<void> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  await Filesystem.writeFile({
    path: safeName,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });

  const { uri } = await Filesystem.getUri({
    path: safeName,
    directory: Directory.Cache,
  });

  await Share.share({
    title,
    url: uri,
    dialogTitle: title,
  });
}
