import type { CalcResult } from '../../src/types';
/**
 * Render-side callbacks that the input handlers call after editing state.
 * app.ts registers them once; handler modules read them at call time, so
 * there is no import cycle with the module that owns render().
 */

interface Hooks {
  render: () => void;
  updateOutputs: (metrics: CalcResult) => void;
  updateValidationDisplay: () => void;
}

let hooks: Hooks | null = null;

export function setHooks(h: Hooks): void {
  hooks = h;
}

export const render = (): void => hooks!.render();
export const updateOutputs = (metrics: CalcResult): void => hooks!.updateOutputs(metrics);
export const updateValidationDisplay = (): void => hooks!.updateValidationDisplay();
