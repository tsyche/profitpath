import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hybridFixture } from '../../assets/prototypes/fixtures';
import { calc } from '../calculations/index';
import { exportAsCSV, exportAsExcel, exportAsFinancialReport, exportAsHTML, exportAsPDF } from '../../assets/services/miscService';
import { downloadOrShare } from '../../assets/services/reportDelivery';

const native = vi.hoisted(() => ({
  platform: 'android',
  shareFile: vi.fn<(options: { filename: string; mimeType: string; data: string }) => Promise<{ handedOff: boolean }>>().mockResolvedValue({ handedOff: true }),
  printHtml: vi.fn<(options: { html: string; jobName: string }) => Promise<{ handedOff: boolean }>>().mockResolvedValue({ handedOff: true })
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { getPlatform: () => native.platform },
  registerPlugin: () => native
}));

beforeEach(() => {
  vi.clearAllMocks();
  native.platform = 'android';
  window.state = hybridFixture();
  window.calc = calc;
  window.lastMetrics = calc(window.state);
  document.body.innerHTML = '';
});

// The toast queue is module state: dismiss any live toast so it can't block the next test's toast.
afterEach(async () => {
  document.querySelector<HTMLButtonElement>('.toast-close')?.click();
  await new Promise(resolve => setTimeout(resolve, 350));
  vi.restoreAllMocks();
});

/** Fake timers for the 500ms print delay; expire any toast before real timers return. */
async function withFakeTimers(run: () => Promise<void>) {
  vi.useFakeTimers();
  try { await run(); } finally {
    await vi.advanceTimersByTimeAsync(4000);
    vi.useRealTimers();
  }
}

describe('Android report delivery', () => {
  it.each([
    [exportAsCSV, 'text/csv', '.csv'],
    [exportAsExcel, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.xlsx'],
    [exportAsHTML, 'text/html', '.html']
  ] as const)('hands the generated file to the native chooser', async (exportReport, mimeType, suffix) => {
    await exportReport();
    expect(native.shareFile).toHaveBeenCalledOnce();
    const payload = native.shareFile.mock.calls[0][0];
    expect(payload.filename.endsWith(suffix)).toBe(true);
    expect(payload.mimeType).toBe(mimeType);
    expect(atob(payload.data).length).toBeGreaterThan(100);
  });

  it.each([exportAsPDF, exportAsFinancialReport])('prints the reviewed annual conclusion through the native bridge', async exportReport => {
    await withFakeTimers(async () => {
      exportReport();
      await vi.advanceTimersByTimeAsync(600);
      expect(native.printHtml).toHaveBeenCalledOnce();
      const payload = native.printHtml.mock.calls[0][0];
      expect(payload.html).toContain('Annual');
      expect(payload.html).toContain('Synthetic hybrid studio');
      expect(payload.jobName).toContain('ProfitPath');
    });
  });

  it('reports a failed native file handoff without falling through to a broken download', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    native.shareFile.mockRejectedValueOnce(new Error('No share handler'));
    expect(await downloadOrShare(new Blob(['report'], { type: 'text/csv' }), 'report.csv')).toBe(false);
    expect(click).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('Could not export');
  });

  it('keeps the browser download fallback', async () => {
    native.platform = 'web';
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    expect(await downloadOrShare(new Blob(['report'], { type: 'text/csv' }), 'report.csv')).toBe(true);
    expect(click).toHaveBeenCalledOnce();
    expect(native.shareFile).not.toHaveBeenCalled();
  });

  it('reports a failed print handoff without announcing success', async () => {
    await withFakeTimers(async () => {
      native.printHtml.mockRejectedValueOnce(new Error('Print service unavailable'));
      exportAsPDF();
      await vi.advanceTimersByTimeAsync(600); // past the 500ms print delay, before the toast expires
      expect(document.body.textContent).toContain('Could not open print preview');
      expect(document.body.textContent).not.toContain('PDF print dialog opened');
    });
  });
});
