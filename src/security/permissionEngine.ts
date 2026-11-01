// src/security/permissionEngine.ts
// Pure policy engine. No vscode imports.

export type PermissionAction = 'read' | 'write' | 'delete' | 'exec' | 'eval' | 'network' | 'git' | 'install' | 'secret';
export type PermissionScope = 'once' | 'session' | 'workspace';
export type PermissionDecision = 'allow' | 'deny' | 'ask';
export type PermissionVerdict = { decision: PermissionDecision; reason: string; remembered: boolean };

export interface PermissionRequest {
  action: PermissionAction;
  target: string;
  reason: string;
  scope: PermissionScope;
}

export interface PermissionPolicy {
  defaultDecision: PermissionDecision;
  allowReadWithinWorkspace: boolean;
  denyDestructiveOutsideWorkspace: boolean;
}

export interface RememberedDecision {
  action: PermissionAction;
  targetPattern: string; // exact or prefix with trailing '*'
  decision: 'allow' | 'deny';
  scope: PermissionScope;
  at: string;
}

export interface AuditEntry {
  ts: string;
  kind: 'decision' | 'remember' | 'reset' | 'policy';
  detail: string;
}

const DEFAULT_POLICY: PermissionPolicy = {
  defaultDecision: 'ask',
  allowReadWithinWorkspace: true,
  denyDestructiveOutsideWorkspace: true,
};

function matchPattern(pattern: string, target: string): boolean {
  if (pattern.endsWith('*')) return target.startsWith(pattern.slice(0, -1));
  return pattern === target;
}

export class PermissionEngine {
  private policy: PermissionPolicy;
  private remembered: RememberedDecision[] = [];
  private audit: AuditEntry[] = [];

  constructor(policy: Partial<PermissionPolicy> = {}) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
  }

  getPolicy(): PermissionPolicy { return { ...this.policy }; }
  setPolicy(p: Partial<PermissionPolicy>): void {
    this.policy = { ...this.policy, ...p };
    this.audit.push({ ts: new Date().toISOString(), kind: 'policy', detail: JSON.stringify(this.policy) });
  }

  decide(req: PermissionRequest, isWithinWorkspace: (t: string) => boolean = () => true): PermissionVerdict {
    // new Function / eval requires per-invocation approval; never remembered.
    if (req.action === 'eval') {
      this.audit.push({ ts: new Date().toISOString(), kind: 'decision', detail: `${req.action} ${req.target} -> ask (per-invocation)` });
      return { decision: 'ask', reason: 'per-invocation approval required for eval', remembered: false };
    }
    // remembered decisions first
    for (const r of this.remembered) {
      if (r.action === req.action && matchPattern(r.targetPattern, req.target)) {
        this.audit.push({ ts: new Date().toISOString(), kind: 'decision', detail: `${req.action} ${req.target} -> ${r.decision} (remembered)` });
        return { decision: r.decision, reason: 'remembered decision', remembered: true };
      }
    }
    // built-in rails
    if (req.action === 'read' && this.policy.allowReadWithinWorkspace && isWithinWorkspace(req.target)) {
      this.audit.push({ ts: new Date().toISOString(), kind: 'decision', detail: `${req.action} ${req.target} -> allow (workspace read)` });
      return { decision: 'allow', reason: 'read within workspace', remembered: false };
    }
    if ((req.action === 'delete' || req.action === 'exec') && this.policy.denyDestructiveOutsideWorkspace && !isWithinWorkspace(req.target)) {
      this.audit.push({ ts: new Date().toISOString(), kind: 'decision', detail: `${req.action} ${req.target} -> deny (outside workspace)` });
      return { decision: 'deny', reason: 'destructive action outside workspace', remembered: false };
    }
    this.audit.push({ ts: new Date().toISOString(), kind: 'decision', detail: `${req.action} ${req.target} -> ${this.policy.defaultDecision}` });
    return { decision: this.policy.defaultDecision, reason: 'default policy', remembered: false };
  }

  remember(d: Omit<RememberedDecision, 'at'>): void {
    // eval / new Function require per-invocation approval and must never be remembered.
    if (d.action === 'eval') return;
    const entry: RememberedDecision = { ...d, at: new Date().toISOString() };
    this.remembered.push(entry);
    this.audit.push({ ts: entry.at, kind: 'remember', detail: `${d.action} ${d.targetPattern} -> ${d.decision} (${d.scope})` });
  }

  revokeRemembered(index: number): boolean {
    if (index < 0 || index >= this.remembered.length) return false;
    this.remembered.splice(index, 1);
    this.audit.push({ ts: new Date().toISOString(), kind: 'reset', detail: `revoked remembered decision #${index}` });
    return true;
  }

  getRemembered(): RememberedDecision[] { return [...this.remembered]; }
  getAuditLog(): AuditEntry[] { return [...this.audit]; }

  reset(): void {
    this.remembered = [];
    this.audit = [];
    this.audit.push({ ts: new Date().toISOString(), kind: 'reset', detail: 'permission engine reset' });
  }
}
