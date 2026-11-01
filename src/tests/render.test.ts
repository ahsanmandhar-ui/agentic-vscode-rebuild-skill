import { describe, it, expect } from 'vitest';

import { renderChatPanel } from '../ui/chat-panel';
import { renderCliPanel } from '../ui/cli-panel';
import { renderContextViewer } from '../ui/context-viewer';
import { renderDiagnosticsPanel } from '../ui/diagnostics-panel';
import { renderHomePanel } from '../ui/home-panel';
import { renderModelsAccounts } from '../ui/models-accounts';
import { renderOnboarding } from '../ui/onboarding';
import { renderPermissionsPanel } from '../ui/permissions-panel';
import { renderPlanViewer } from '../ui/plan-viewer';
import { renderProgressViewer } from '../ui/progress-viewer';
import { renderRouterPanel } from '../ui/router-panel';
import { renderSearchPanel } from '../ui/search-panel';
import { renderSettingsPanel } from '../ui/settings-panel';
import { renderTasksPanel } from '../ui/tasks-panel';
import {
  emptyStateHtml,
  failureCardHtml,
  loadingHtml,
  disabledHtml,
  clearErrorHtml,
  retryUndoHtml,
  renderApprovalCard,
  renderDestructiveConfirm,
  panelStateMessage,
  EMPTY_STATES,
} from '../ui/failure';

const panels: { name: string; fn: (a?: any) => string }[] = [
  { name: 'chat', fn: (a) => renderChatPanel(a ?? {}) },
  { name: 'cli', fn: (a) => renderCliPanel(a ?? {}) },
  { name: 'context', fn: (a) => renderContextViewer(a ?? {}) },
  { name: 'diagnostics', fn: (a) => renderDiagnosticsPanel(a ?? {}) },
  { name: 'home', fn: (a) => renderHomePanel(a ?? {}) },
  { name: 'models-accounts', fn: (a) => renderModelsAccounts(a ?? {}) },
  { name: 'onboarding', fn: (a) => renderOnboarding(a ?? {}) },
  { name: 'permissions', fn: (a) => renderPermissionsPanel(a ?? {}) },
  { name: 'plan', fn: (a) => renderPlanViewer(a ?? {}) },
  { name: 'progress', fn: (a) => renderProgressViewer(a ?? {}) },
  { name: 'router', fn: (a) => renderRouterPanel(a ?? {}) },
  { name: 'search', fn: (a) => renderSearchPanel(a ?? {}) },
  { name: 'settings', fn: (a) => renderSettingsPanel(a ?? {}) },
  { name: 'tasks', fn: (a) => renderTasksPanel(a ?? {}) },
];

describe('render-output: all panels', () => {
  for (const p of panels) {
    it(`${p.name} renders a non-empty string with no args`, () => {
      const html = p.fn({});
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });
  }

  it('renders each panel with sample data without throwing', () => {
    const samples: Record<string, any> = {
      chat: { messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }] },
    };
    for (const p of panels) {
      const html = p.fn(samples[p.name] ?? {});
      expect(typeof html).toBe('string');
    }
  });

});

describe('render-output: failure helpers', () => {
  it('emptyStateHtml for all panels', () => {
    for (const id of Object.keys(EMPTY_STATES)) {
      const html = emptyStateHtml(EMPTY_STATES[id as keyof typeof EMPTY_STATES]);
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    }
  });
  it('failureCardHtml', () => {
    const html = failureCardHtml({ cause: 'c', impact: 'i', action: { label: 'retry', id: 'vibecode.retry' } });
    expect(html).toContain('c');
  });
  it('loadingHtml / disabledHtml / clearErrorHtml', () => {
    expect(loadingHtml().length).toBeGreaterThan(0);
    expect(disabledHtml('reason').length).toBeGreaterThan(0);
    expect(clearErrorHtml().length).toBeGreaterThan(0);
  });
  it('retryUndoHtml', () => {
    expect(retryUndoHtml().length).toBeGreaterThan(0);
  });
  it('renderApprovalCard', () => {
    const html = renderApprovalCard({ title: 'T', message: 'M' });
    expect(html).toContain('T');
  });
  it('renderDestructiveConfirm', () => {
    const html = renderDestructiveConfirm({ target: 'foo', expected: 'foo' });
    expect(html).toContain('foo');
  });
  it('panelStateMessage normalizes', () => {
    const m = panelStateMessage({ v: 1, kind: 'panelState', panel: 'home', status: 'ready', updatedAt: 'now' } as any);
    expect(m.state).toBe('ready');
  });
});
