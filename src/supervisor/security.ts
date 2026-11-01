// src/supervisor/security.ts
// Adapted from microsoft/agent-framework + crewAI security notes (MIT).
const PRIVATE_RANGES = [
  /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./, /^0\./, /^localhost$/i, /^::1$/, /^fc00:/i, /^fe80:/i,
];

export function isSafeUrl(raw: string): { ok: boolean; reason?: string } {
  let u: URL;
  try { u = new URL(raw); } catch { return { ok: false, reason: 'invalid url' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, reason: 'bad protocol' };
  const host = u.hostname;
  if (PRIVATE_RANGES.some(r => r.test(host))) return { ok: false, reason: 'private host' };
  if (host === '' ) return { ok: false, reason: 'empty host' };
  return { ok: true };
}

const SECRET_PATTERNS: RegExp[] = [
  /sk-[A-Za-z0-9]{20,}/g,
  /ghp_[A-Za-z0-9]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  /AIza[0-9A-Za-z_-]{35}/g,
];

export function redactSecrets(text: string): string {
  let out = text;
  for (const p of SECRET_PATTERNS) out = out.replace(p, '[REDACTED]');
  return out;
}

export function escapeHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
