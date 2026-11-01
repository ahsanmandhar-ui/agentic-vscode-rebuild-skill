// src/supervisor/guardrails.ts
// Adapted from OpenAI Agents SDK guardrails (MIT).
export interface GuardrailResult { ok: boolean; reason?: string; }

export type InputGuardrail = (input: string) => Promise<GuardrailResult> | GuardrailResult;
export type OutputGuardrail = (output: string) => Promise<GuardrailResult> | GuardrailResult;

export class GuardrailPipeline {
  private inputs: InputGuardrail[] = [];
  private outputs: OutputGuardrail[] = [];

  addInput(g: InputGuardrail): void { this.inputs.push(g); }
  addOutput(g: OutputGuardrail): void { this.outputs.push(g); }

  async checkInput(input: string): Promise<GuardrailResult> {
    for (const g of this.inputs) {
      const r = await g(input);
      if (!r.ok) return r;
    }
    return { ok: true };
  }
  async checkOutput(output: string): Promise<GuardrailResult> {
    for (const g of this.outputs) {
      const r = await g(output);
      if (!r.ok) return r;
    }
    return { ok: true };
  }
}

export function piiGuardrail(): InputGuardrail {
  return (input) => {
    if (/\b\d{3}-\d{2}-\d{4}\b/.test(input) || /\b\d{16}\b/.test(input)) {
      return { ok: false, reason: 'PII detected' };
    }
    return { ok: true };
  };
}

export function lengthGuardrail(max: number): OutputGuardrail {
  return (output) => output.length > max
    ? { ok: false, reason: `output exceeds ${max} chars` }
    : { ok: true };
}
