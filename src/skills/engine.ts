// src/skills/engine.ts
import {
  SkillCandidate, CandidateCard, InspectionResult, ApprovalDecision,
  ManageSkillsAction, SkillLifecycleState,
} from './types';

export interface SkillStore {
  listCandidates(): Promise<SkillCandidate[]>;
  getCandidate(id: string): Promise<SkillCandidate | undefined>;
  save(candidate: SkillCandidate): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface SkillInspector {
  inspect(candidate: SkillCandidate): Promise<InspectionResult>;
  validate(candidate: SkillCandidate): Promise<{ ok: boolean; errors: string[] }>;
}

export interface SkillInstaller {
  install(candidate: SkillCandidate): Promise<{ ok: boolean; error?: string }>;
  enable(candidate: SkillCandidate): Promise<{ ok: boolean; error?: string }>;
}

export interface SkillUIPort {
  showCandidateCard(card: CandidateCard): Promise<void>;
  quickPickActions(candidate: SkillCandidate): Promise<ManageSkillsAction | undefined>;
  confirmApproval(card: CandidateCard, scopes: string[]): Promise<boolean>;
}

export interface SkillSelector { select(candidate: SkillCandidate): Promise<void>; }
export interface SkillActivator { activate(candidate: SkillCandidate): Promise<void>; deactivate(candidate: SkillCandidate): Promise<void>; }

export class IllegalTransition extends Error {
  constructor(from: SkillLifecycleState, to: SkillLifecycleState) { super(`Illegal skill transition ${from} -> ${to}`); }
}

const ALLOWED: Record<SkillLifecycleState, SkillLifecycleState[]> = {
  discovered: ['inspected', 'failed', 'quarantined'],
  inspected: ['pending_approval', 'quarantined', 'failed'],
  pending_approval: ['installed', 'failed'],
  installed: ['enabled', 'disabled', 'quarantined', 'failed'],
  enabled: ['disabled', 'quarantined', 'failed'],
  disabled: ['enabled', 'quarantined', 'failed'],
  quarantined: ['inspected', 'failed'],
  failed: ['discovered'],
};

export class SkillEngine {
  constructor(
    private store: SkillStore,
    private inspector: SkillInspector,
    private installer: SkillInstaller,
    private ui: SkillUIPort,
    private selector?: SkillSelector,
    private activator?: SkillActivator,
  ) {}

  async discover(): Promise<SkillCandidate[]> { return this.store.listCandidates(); }

  async cards(): Promise<CandidateCard[]> {
    const cs = await this.discover();
    return cs.map(c => this.toCard(c));
  }

  async validate(candidate: SkillCandidate): Promise<{ ok: boolean; errors: string[] }> {
    const r = await this.inspector.validate(candidate);
    if (!r.ok) await this.transition(candidate, 'failed');
    return r;
  }

  async inspect(candidate: SkillCandidate): Promise<InspectionResult> {
    const result = await this.inspector.inspect(candidate);
    candidate.inspection = result;
    if (result.status === 'fail' || result.findings.some(f => f.severity === 'critical')) {
      candidate.state = 'quarantined';
      candidate.quarantineReason = 'critical inspection finding';
    } else {
      await this.transition(candidate, 'inspected');
    }
    await this.store.save(candidate);
    await this.ui.showCandidateCard(this.toCard(candidate));
    return result;
  }

  async approve(candidate: SkillCandidate, scopesShown: string[]): Promise<ApprovalDecision> {
    if (candidate.state !== 'inspected' && candidate.state !== 'pending_approval') {
      throw new IllegalTransition(candidate.state, 'pending_approval');
    }
    await this.transition(candidate, 'pending_approval');
    const ok = await this.ui.confirmApproval(this.toCard(candidate), scopesShown);
    if (!ok) {
      await this.transition(candidate, 'failed');
      const d: ApprovalDecision = { candidateId: candidate.id, decision: 'cancel', scopesShown, at: new Date().toISOString() };
      await this.store.save(candidate);
      return d;
    }
    const d: ApprovalDecision = { candidateId: candidate.id, decision: 'approve', scopesShown, at: new Date().toISOString() };
    candidate.approvedAt = d.at; candidate.approvedBy = 'user'; candidate.approvedScopes = scopesShown;
    const installRes = await this.installer.install(candidate);
    if (!installRes.ok) { candidate.state = 'failed'; candidate.quarantineReason = installRes.error; await this.store.save(candidate); throw new Error(installRes.error ?? 'install failed'); }
    candidate.installedAt = new Date().toISOString();
    await this.transition(candidate, 'installed');
    await this.store.save(candidate);
    return d;
  }

  async install(candidate: SkillCandidate): Promise<void> {
    if (candidate.state !== 'pending_approval') throw new IllegalTransition(candidate.state, 'installed');
    const res = await this.installer.install(candidate);
    if (!res.ok) { candidate.state = 'failed'; candidate.quarantineReason = res.error; await this.store.save(candidate); throw new Error(res.error ?? 'install failed'); }
    candidate.installedAt = new Date().toISOString();
    await this.transition(candidate, 'installed');
    await this.store.save(candidate);
  }

  async cancel(candidate: SkillCandidate): Promise<void> {
    if (candidate.state === 'pending_approval') await this.transition(candidate, 'failed');
    await this.store.save(candidate);
  }

  async enable(candidate: SkillCandidate): Promise<void> {
    if (candidate.state !== 'installed' && candidate.state !== 'disabled') throw new IllegalTransition(candidate.state, 'enabled');
    const res = await this.installer.enable(candidate);
    if (!res.ok) { candidate.state = 'failed'; candidate.quarantineReason = res.error; await this.store.save(candidate); throw new Error(res.error ?? 'enable failed'); }
    candidate.enabledAt = new Date().toISOString();
    await this.transition(candidate, 'enabled');
    await this.store.save(candidate);
  }

  async select(candidate: SkillCandidate): Promise<void> {
    if (candidate.state !== 'enabled') throw new IllegalTransition(candidate.state, 'enabled');
    await this.selector?.select(candidate);
  }

  async activate(candidate: SkillCandidate): Promise<void> {
    if (candidate.state !== 'enabled') throw new IllegalTransition(candidate.state, 'enabled');
    await this.activator?.activate(candidate);
    candidate.activatedAt = new Date().toISOString();
    await this.store.save(candidate);
  }
  // ---- Skills store UI actions ----
  async inspectSkill(id: string): Promise<CandidateCard> {
    const c = await this.store.getCandidate(id);
    if (!c) throw new Error('candidate not found');
    await this.inspect(c);
    return this.toCard(c);
  }

  async installSkill(id: string): Promise<CandidateCard> {
    const c = await this.store.getCandidate(id);
    if (!c) throw new Error('candidate not found');
    if (!c.inspection) await this.inspect(c);
    if (c.state === 'quarantined') throw new Error(c.quarantineReason ?? 'quarantined');
    if (c.state === 'inspected') await this.approve(c, this.scopesFor(c));
    if (c.state === 'pending_approval') await this.install(c);
    await this.store.save(c);
    return this.toCard(c);
  }

  async skipSkill(id: string): Promise<void> {
    await this.store.remove(id);
  }

  async quarantineSkill(id: string, reason = 'manual quarantine'): Promise<CandidateCard> {
    const c = await this.store.getCandidate(id);
    if (!c) throw new Error('candidate not found');
    c.state = 'quarantined';
    c.quarantineReason = reason;
    await this.store.save(c);
    return this.toCard(c);
  }

  async bulkInstall(ids: string[]): Promise<CandidateCard[]> {
    const out: CandidateCard[] = [];
    for (const id of ids) {
      try { out.push(await this.installSkill(id)); } catch { /* continue */ }
    }
    return out;
  }

  async manageSkillsCommand(candidateId?: string): Promise<void> {
    const candidates = await this.discover();
    const target = candidateId ? candidates.find(c => c.id === candidateId) : candidates[0];
    if (!target) return;
    const action = await this.ui.quickPickActions(target);
    if (!action) return;
    switch (action) {
      case 'inspect': await this.inspect(target); break;
      case 'approve': await this.approve(target, this.scopesFor(target)); break;
      case 'cancel': await this.cancel(target); break;
      case 'install': await this.installer.install(target); break;
      case 'enable': await this.enable(target); break;
      case 'activate': await this.activate(target); break;
      case 'disable':
        await this.activator?.deactivate(target);
        await this.transition(target, 'disabled');
        await this.store.save(target);
        break;
    }
  }

  private scopesFor(c: SkillCandidate): string[] {
    const p = c.manifest.permissions;
    const scopes: string[] = [];
    for (const f of p.fs) scopes.push(`fs:${f}`);
    if (p.exec) scopes.push('exec');
    for (const n of p.network) scopes.push(`network:${n}`);
    if (p.secrets) scopes.push('secrets');
    return scopes;
  }

  private async transition(candidate: SkillCandidate, to: SkillLifecycleState): Promise<void> {
    const from = candidate.state;
    if (!ALLOWED[from]?.includes(to)) throw new IllegalTransition(from, to);
    candidate.state = to;
  }

  public toCard(candidate: SkillCandidate): CandidateCard {
    const m = candidate.manifest;
    const badge: CandidateCard['trustBadge'] =
      candidate.state === 'quarantined' ? 'quarantined' :
      m.source?.includes('bundled') ? 'bundled' :
      candidate.inspection?.status === 'passed' ? 'verified' : 'unverified';
    return {
      candidate,
      title: `${m.name} v${m.version}`,
      trustBadge: badge,
      summary: `${m.license} · ${m.source} · risk ${candidate.inspection?.riskScore ?? '?'}`,
    };
  }
}

