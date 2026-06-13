// Regression test for the toast queue cap. In verbose mode a burst of actions can
// flood the queue; only the most recent few should survive (oldest dropped).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showToast } from '../../assets/services/modalService.js';

describe('Toast queue cap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('shows at most 6 toasts (1 active + 5 queued) when flooded with 10', () => {
    let created = 0;
    const realAppend = document.body.appendChild.bind(document.body);
    const spy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node && node.classList && node.classList.contains('toast')) created++;
      return realAppend(node);
    });

    for (let i = 0; i < 10; i++) {
      showToast('message ' + i, 'info', 1000);
    }

    // Drain the queue: each toast shows, auto-dismisses after its duration, then
    // the next one is shown. Advance well past the total lifetime.
    vi.advanceTimersByTime(30000);

    // 1 shown immediately + a queue capped at 5 = 6 total; the other 4 are dropped.
    expect(created).toBe(6);
    spy.mockRestore();
  });
});
