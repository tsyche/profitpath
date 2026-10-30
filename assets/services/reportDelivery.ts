import { Capacitor, registerPlugin } from '@capacitor/core';
import { showToast } from './modalService';

interface NativeExport {
  shareFile(options: { filename: string; mimeType: string; data: string }): Promise<{ handedOff: boolean }>;
  printHtml(options: { html: string; jobName: string }): Promise<{ handedOff: boolean }>;
}

const nativeExport = registerPlugin<NativeExport>('NativeExport');
export const isAndroidApp = () => Capacitor.getPlatform() === 'android';

function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error || new Error('Could not read report'));
    reader.readAsDataURL(blob);
  });
}

/** Android has no Web Share API or blob-download handler; use its explicit native handoff. */
export async function downloadOrShare(blob: Blob, filename: string): Promise<boolean> {
  try {
    if (isAndroidApp()) {
      if (blob.size > 16 * 1024 * 1024) throw new Error('Report exceeds the native export limit');
      const result = await nativeExport.shareFile({ filename, mimeType: blob.type.split(';')[0], data: await base64(blob) });
      return result.handedOff;
    }
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return true;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return false;
      }
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return true;
  } catch {
    showToast('Could not export the report. Try again or share a snapshot link.', 'error');
    return false;
  }
}

interface PrintTarget {
  document: { write(...html: string[]): void; close(): void };
  opener: unknown;
  focus(): void;
  print(): boolean | Promise<boolean>;
}

/** Retain the existing report builders and browser popup, using Android's PrintManager in the APK. */
export function openPrintTarget(jobName: string): PrintTarget | null {
  if (!isAndroidApp()) {
    const target = window.open('', '_blank');
    if (!target) return null;
    target.opener = null;
    return {
      document: target.document,
      opener: null,
      focus: () => target.focus(),
      print: () => { target.print(); return true; }
    };
  }
  let html = '';
  return {
    document: { write: (...parts) => { html += parts.join(''); }, close() {} },
    opener: null,
    focus() {},
    async print() {
      try {
        return (await nativeExport.printHtml({ html, jobName })).handedOff;
      } catch {
        showToast('Could not open print preview. Export HTML or share a snapshot link.', 'error');
        return false;
      }
    }
  };
}
