// Tests for remote feedback delivery (Web3Forms POST) and the offline retry queue.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FeedbackCollector } from '../../src/analytics/feedback.js';

const validFeedback = { rating: 5, category: 'general', comment: 'Great app', allowContact: false };

describe('FeedbackCollector — remote delivery', () => {
  let collector;

  beforeEach(() => {
    localStorage.clear();
    collector = new FeedbackCollector();
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not POST when no access key is configured', async () => {
    collector.remoteAccessKey = '';
    collector.submitFeedback({ ...validFeedback });
    await Promise.resolve();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('POSTs to the configured endpoint with the expected payload', async () => {
    collector.remoteAccessKey = 'test-key';
    const fb = collector.submitFeedback({ ...validFeedback });
    await collector.sendToRemote(fb); // deterministic await

    expect(global.fetch).toHaveBeenCalled();
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.web3forms.com/submit');
    const body = JSON.parse(opts.body);
    expect(body.access_key).toBe('test-key');
    // The payload reflects the stored (sanitized) values.
    expect(body.rating).toBe(fb.rating);
    expect(body.category).toBe(fb.category);
    expect(body.subject).toContain('ProfitPath Feedback');
  });

  it('marks the stored item synced after a successful send', async () => {
    collector.remoteAccessKey = 'test-key';
    const fb = collector.submitFeedback({ ...validFeedback });
    await collector.sendToRemote(fb);
    const stored = collector.getAllFeedback().find((f) => f.id === fb.id);
    expect(stored.synced).toBe(true);
  });

  it('leaves the item unsynced when the endpoint fails, and retries on flush', async () => {
    collector.remoteAccessKey = 'test-key';
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => ({ success: false, message: 'nope' }) }));
    const fb = collector.submitFeedback({ ...validFeedback });
    await collector.sendToRemote(fb);
    expect(collector.getAllFeedback().find((f) => f.id === fb.id).synced).toBe(false);

    // Endpoint recovers; flush should re-deliver the queued item.
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) }));
    collector.flushUnsyncedFeedback();
    await Promise.resolve();
    await Promise.resolve();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
