// src/supervisor/eval.ts
// Eval harness for supervisor scenarios.
export interface EvalCase { name: string; input: string; expectedContains?: string[]; expectedAgent?: string; }
export interface EvalResult { name: string; passed: boolean; reason?: string; }

export async function runEval(cases: EvalCase[], runner: (input: string) => Promise<{ output: string; agent?: string }>): Promise<EvalResult[]> {
  const results: EvalResult[] = [];
  for (const c of cases) {
    try {
      const r = await runner(c.input);
      let ok = true; let reason: string | undefined;
      if (c.expectedContains) {
        for (const e of c.expectedContains) {
          if (!r.output.includes(e)) { ok = false; reason = `missing "${e}"`; break; }
        }
      }
      if (ok && c.expectedAgent && r.agent !== c.expectedAgent) {
        ok = false; reason = `expected agent ${c.expectedAgent}, got ${r.agent}`;
      }
      results.push({ name: c.name, passed: ok, reason });
    } catch (e) {
      results.push({ name: c.name, passed: false, reason: String(e) });
    }
  }
  return results;
}
