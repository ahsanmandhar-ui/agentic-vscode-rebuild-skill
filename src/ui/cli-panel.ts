// src/ui/cli-panel.ts
// Pure HTML renderer for the "CLI runner" panel.
// CSS classes only (no inline styles); accessible, keyboard-navigable.

export interface CliPanelBinary {
  id?: string;
  name?: string;
  label?: string;
  path?: string;
  [key: string]: unknown;
}

export interface CliPanelHistoryEntry {
  binary?: string;
  args?: string;
  command?: string;
  exitCode?: number | null;
  durationMs?: number;
  output?: string;
  startedAt?: string;
  [key: string]: unknown;
}

export interface RenderCliPanelArgs {
  binaries?: Array<string | CliPanelBinary | null | undefined> | null;
  history?: CliPanelHistoryEntry[] | null;
}

const esc = (v: unknown): string =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function binaryId(b: string | CliPanelBinary, i: number): string {
  if (typeof b === 'string') return b;
  return String(b?.id ?? b?.name ?? b?.label ?? b?.path ?? `binary-${i}`);
}

function binaryLabel(b: string | CliPanelBinary, i: number): string {
  if (typeof b === 'string') return b;
  return String(b?.name ?? b?.label ?? b?.id ?? b?.path ?? `Binary ${i + 1}`);
}

export function renderCliPanel({ binaries, history }: RenderCliPanelArgs = {}): string {
  const list = Array.isArray(binaries) ? binaries.filter((b) => b != null) : [];
  const hist = Array.isArray(history) ? history.filter((h) => h != null) : [];

  const options =
    list.length === 0
      ? '<option value="" disabled selected>No binaries available</option>'
      : list
          .map((b, i) => {
            const id = binaryId(b as string | CliPanelBinary, i);
            const label = binaryLabel(b as string | CliPanelBinary, i);
            return `<option value="${esc(id)}">${esc(label)}</option>`;
          })
          .join('');

  const historyItems = hist.length === 0
    ? '<li class="vc-cli-history-empty cli-history-empty"><span class="vc-empty-msg">No CLI runs yet.</span></li>'
    : hist.map((h, i) => {
        const cmd = String(h.command ?? (h.binary ? `${h.binary} ${h.args ?? ''}`.trim() : `run-${i}`));
        const code = h.exitCode;
        const codeLabel = code == null ? 'n/a' : String(code);
        const codeClass = code === 0 ? 'vc-cli-exit-ok' : (code == null ? 'vc-cli-exit-na' : 'vc-cli-exit-fail');
        const dur = typeof h.durationMs === 'number' ? `${Math.round(h.durationMs)} ms` : '—';
        const out = h.output ? `<pre class="vc-cli-history-output cli-history-output">${esc(h.output)}</pre>` : '';
        return [
          `<li class="vc-cli-history-item cli-history-item" data-index="${i}">`,
          `  <div class="vc-cli-history-head cli-history-head">`,
          `    <code class="vc-cli-history-cmd cli-history-cmd">${esc(cmd)}</code>`,
          `    <span class="vc-cli-history-exit ${codeClass} cli-history-exit" aria-label="Exit code ${esc(codeLabel)}">exit: ${esc(codeLabel)}</span>`,
          `    <span class="vc-cli-history-duration cli-history-duration" aria-label="Duration ${esc(dur)}">${esc(dur)}</span>`,
          `  </div>`,
          out,
          `</li>`,
        ].join('\n');
      }).join('\n');

  return [
    '<section class="vc-cli-panel cli-panel" aria-label="CLI runner">',
    '  <form class="vc-cli-form cli-form" aria-label="CLI runner form">',
    '    <div class="vc-cli-field cli-field">',
    '      <label class="vc-cli-label cli-label" for="vc-cli-binary">Binary</label>',
    '      <select id="vc-cli-binary" name="binary" class="vc-cli-binary-select cli-binary-select" aria-label="Select binary">',
    `      ${options}`,
    '      </select>',
    '    </div>',
    '    <div class="vc-cli-field cli-field">',
    '      <label class="vc-cli-label cli-label" for="vc-cli-args">Arguments</label>',
    '      <input id="vc-cli-args" name="args" type="text" class="vc-cli-args-input cli-args-input" aria-label="Arguments" />',
    '    </div>',
    '    <div class="vc-cli-field cli-field">',
    '      <label class="vc-cli-label cli-label" for="vc-cli-cwd">Working directory</label>',
    '      <input id="vc-cli-cwd" name="cwd" type="text" class="vc-cli-cwd-input cli-cwd-input" aria-label="Working directory" />',
    '    </div>',
    '    <fieldset class="vc-cli-multi-run cli-multi-run" aria-label="Multi-run options">',
    '      <legend>Multi-run</legend>',
    '      <label class="vc-cli-checkbox-label cli-checkbox-label"><input type="checkbox" name="multiRun" value="parallel" class="vc-cli-multi-run-checkbox cli-multi-run-checkbox" /> Parallel</label>',
    '      <label class="vc-cli-checkbox-label cli-checkbox-label"><input type="checkbox" name="multiRun" value="stopOnError" class="vc-cli-multi-run-checkbox cli-multi-run-checkbox" /> Stop on error</label>',
    '    </fieldset>',
    '    <div class="vc-cli-actions cli-actions">',
    '      <button type="button" class="vc-btn vc-cli-run cli-run" data-action="cli-run" aria-label="Run command">Run</button>',
    '    </div>',
    '  </form>',
    '  <section class="vc-cli-output cli-output-section" aria-label="Command output">',
    '    <pre class="vc-cli-output-panel cli-output" aria-live="polite" aria-atomic="true"></pre>',
    '  </section>',
    '  <section class="vc-cli-history cli-history-section" aria-label="Run history">',
    '    <h3 class="vc-cli-history-title cli-history-title">History</h3>',
    `    <ul class="vc-cli-history-list cli-history">${historyItems}</ul>`,
    '  </section>',
    '</section>',
  ].join('\n');
}

export default renderCliPanel;
