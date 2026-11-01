// src/shared/redact.ts
const SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9]{16,}/g,
  /sk-proj-[A-Za-z0-9_-]{20,}/g,
  /sk-svcacct-[A-Za-z0-9_-]{20,}/g,
  /sk-ant-[A-Za-z0-9_-]{20,}/g,
  /ghp_[A-Za-z0-9]{36,}/g,
  /gho_[A-Za-z0-9]{36,}/g,
  /ghu_[A-Za-z0-9]{36,}/g,
  /ghs_[A-Za-z0-9]{36,}/g,
  /ghr_[A-Za-z0-9]{36,}/g,
  /github_pat_[A-Za-z0-9_]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /ASIA[0-9A-Z]{16}/g,
  /AIza[0-9A-Za-z_-]{35}/g,
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  /xapp-[0-9]-[A-Za-z0-9-]{10,}/g,
  /Bearer\s+[A-Za-z0-9._-]{10,}/gi,
  /(api[_-]?key|access[_-]?token|refresh[_-]?token|secret|password|credential)\s*[:=]\s*[\x27"]?[^\x27"\s]{6,}/gi,
];

export function redactSecrets(value: unknown): unknown {
  if (typeof value === 'string') {
    let s = value;
    for (const p of SECRET_PATTERNS) s = s.replace(p, '[REDACTED]');
    return s;
  }
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (/secret|token|key|password|credential/i.test(k)) out[k] = '[REDACTED]';
      else out[k] = redactSecrets(v);
    }
    return out;
  }
  return value;
}
