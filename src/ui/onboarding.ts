// src/ui/onboarding.ts
// Pure HTML renderer for the Onboarding flow (U9): 4 steps (Welcome, System check,
// Connect a model, Safety), skippable. CSS classes only.

export interface RenderOnboardingArgs {
  step?: number | string;
  currentStep?: number | string;
  skippable?: boolean;
  steps?: Array<{ title?: string; body?: string }> | null;
  completed?: boolean;
  done?: boolean;
  persisted?: boolean;
  persistedStep?: number | string;
  completedSteps?: Array<number | string> | null;
  storageKey?: string;
  [key: string]: unknown;
}

const esc = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const DEFAULT_STEPS = [
  { title: 'Welcome', body: 'VibeCode is your agentic coding engine. Nothing to configure to get started.' },
  { title: 'System check', body: 'Environment detected. Re-run the check any time.' },
  { title: 'Connect a model', body: 'Use a local model, an API key, or skip for now.' },
  { title: 'Safety', body: 'Permissions are deny-by-default. Security skills are offered first.' },
];

export function renderOnboarding(args: RenderOnboardingArgs = {}): string {
  const steps = Array.isArray(args?.steps) && args.steps.length ? args.steps : DEFAULT_STEPS;
  const current = Number(args?.step ?? args?.currentStep ?? args?.persistedStep ?? 1);
  const skippable = args?.skippable !== false;
  const completed = args?.completed === true || args?.done === true || args?.persisted === true;
  const completedSteps = Array.isArray(args?.completedSteps) ? args.completedSteps.map(Number) : [];
  const storageKey = String(args?.storageKey ?? 'vibecode.onboarding');

  const renderedSteps = steps
    .map((s, i) => {
      const n = i + 1;
      const active = n === current;
      const isCompleted = completed || completedSteps.includes(n) || n < current;
      return [
        '<section class="vc-onboarding__step onboarding-step' + (active ? ' is-active' : '') + (isCompleted ? ' is-completed' : '') + '" data-step="' + n + '" data-completed="' + isCompleted + '" aria-label="' + esc(s?.title ?? 'Step ' + n) + '"' + (active ? ' aria-current="step"' : '') + '>',
        '  <header class="vc-onboarding__step-header onboarding-step-header"><h3 class="vc-onboarding__step-title">' + esc(s?.title ?? 'Step ' + n) + '</h3><span class="vc-onboarding__step-number" aria-hidden="true">' + n + '/' + steps.length + '</span>' + (isCompleted ? '<span class="vc-onboarding__step-check" aria-hidden="true">OK</span>' : '') + '</header>',
        '  <p class="vc-onboarding__step-body onboarding-step-body">' + esc(s?.body ?? '') + '</p>',
        '</section>',
      ].join('\\n');
    })
    .join('\\n');

  const skip = skippable
    ? '<button type="button" class="vc-btn vc-onboarding__skip onboarding-skip" data-action="vibecode.onboarding.skip" aria-label="Skip onboarding">Skip</button>'
    : '';

  return [
    '<section class="vc-onboarding onboarding onboarding-panel" aria-label="Onboarding" data-persist="' + completed + '" data-storage-key="' + esc(storageKey) + '" data-completed="' + completed + '" data-step="' + current + '">',
    '  <header class="vc-onboarding__header onboarding-header"><h2>Onboarding</h2></header>',
    '  <div class="vc-onboarding__steps onboarding-steps" aria-live="polite" aria-atomic="true">' + renderedSteps + '</div>',
    '  <div class="vc-onboarding__actions onboarding-actions">',
    '    <button type="button" class="vc-btn vc-onboarding__next onboarding-next" data-action="vibecode.onboarding.next" aria-label="Next step">Next</button>',
    '    ' + skip,
    '  </div>',
    '</section>',
  ].join('\\n');
}

export default renderOnboarding;
