import { describe, it, expect } from 'vitest';
import {
  GuardrailPipeline, piiGuardrail, lengthGuardrail, Tracer, runEval, LocalSubprocessExecutor,
} from '../supervisor';
import { renderSupervisorPanel } from '../ui/supervisor-panel';

describe('supervisor: guardrails', () => {
  it('blocks PII input', async () => {
    const g = new GuardrailPipeline();
    g.addInput(piiGuardrail());
    const r = await g.checkInput('my ssn 123-45-6789');
    expect(r.ok).toBe(false);
  });
  it('allows clean input', async () => {
    const g = new GuardrailPipeline();
    g.addInput(piiGuardrail());
    expect((await g.checkInput('hello')).ok).toBe(true);
  });
  it('length guardrail on output', async () => {
    const g = new GuardrailPipeline();
    g.addOutput(lengthGuardrail(5));
    expect((await g.checkOutput('toolong')).ok).toBe(false);
    expect((await g.checkOutput('hi')).ok).toBe(true);
  });
});

describe('supervisor: tracing', () => {
  it('tracks spans', async () => {
    const t = new Tracer();
    const r = await t.run('op', async () => 42);
    expect(r).toBe(42);
    expect(t.spans_list().length).toBe(1);
    expect(t.spans_list()[0].attrs.status).toBe('ok');
  });
});

describe('supervisor: eval', () => {
  it('runs eval cases', async () => {
    const res = await runEval(
      [{ name: 'c1', input: 'hi', expectedContains: ['hello'] }],
      async () => ({ output: 'hello world', agent: 'a' })
    );
    expect(res[0].passed).toBe(true);
  });
});

describe('supervisor: sandbox', () => {
  it('runs node code', async () => {
    const ex = new LocalSubprocessExecutor();
    const r = await ex.run('console.log(2+2)', 'javascript', 5000);
    expect(r.stdout.trim()).toBe('4');
    expect(r.exitCode).toBe(0);
  });
});

describe('supervisor: panel', () => {
  it('renders tasks', () => {
    const html = renderSupervisorPanel({ tasks: [{ id: 't1', description: 'do', status: 'done' }], activeAgent: 'w', status: 'running' });
    expect(html).toContain('t1');
    expect(html).toContain('running');
    expect(html).toContain('w');
  });
});
