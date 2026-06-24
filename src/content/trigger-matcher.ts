import type { Settings } from '../shared/types';

export interface Binding {
  code: string;
  ctrl: boolean;
  alt: boolean;
  /** Base shift requirement (the extra Shift used for reverse cycling is separate). */
  shift: boolean;
}

/**
 * Pure key-event predicates for the active binding. No DOM or Chrome dependencies, so it
 * is unit-testable in isolation.
 */
export class TriggerMatcher {
  private binding: Binding = { code: 'Backquote', ctrl: true, alt: false, shift: false };

  setBinding(binding: Binding): void {
    this.binding = binding;
  }

  static fromSettings(settings: Settings, resolvedCode: string): Binding {
    if (settings.triggerMode === 'custom') {
      return {
        code: settings.customCode,
        ctrl: settings.customCtrl,
        alt: settings.customAlt,
        shift: settings.customShift,
      };
    }
    return { code: resolvedCode, ctrl: true, alt: false, shift: false };
  }

  /** Matches the trigger, ignoring the extra Shift that selects reverse cycling. */
  isTrigger(e: KeyboardEvent): boolean {
    return (
      e.code === this.binding.code &&
      e.ctrlKey === this.binding.ctrl &&
      e.altKey === this.binding.alt &&
      (this.binding.shift ? e.shiftKey : true)
    );
  }

  /** Reverse direction when Shift is added on top of a binding that doesn't already need it. */
  isReverse(e: KeyboardEvent): boolean {
    return e.shiftKey && !this.binding.shift;
  }

  /** The held modifier whose release commits the current selection (Alt+Tab style). */
  get commitModifier(): 'Control' | 'Alt' | 'Shift' {
    if (this.binding.ctrl) return 'Control';
    if (this.binding.alt) return 'Alt';
    return 'Shift';
  }

  isCommitRelease(e: KeyboardEvent): boolean {
    switch (this.commitModifier) {
      case 'Control':
        return !e.ctrlKey || e.key === 'Control';
      case 'Alt':
        return !e.altKey || e.key === 'Alt';
      case 'Shift':
        return !e.shiftKey || e.key === 'Shift';
    }
  }
}
