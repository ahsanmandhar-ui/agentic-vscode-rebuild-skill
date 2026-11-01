// src/routing/router.ts
// Account/provider selection. Pure (no vscode). Never bypasses provider limits.

import {
  AccountRecord, AccountStatus, RouteRequest, RouteDecision, FallbackPolicy,
} from './types';

const USABLE_STATUSES: AccountStatus[] = ['ok', 'auth_expired'];

function isCoolingDown(a: AccountRecord, now: Date): boolean {
  if (a.status !== 'cooling_down') return false;
  if (!a.cooldownUntil) return true;
  return new Date(a.cooldownUntil).getTime() > now.getTime();
}

function eligible(a: AccountRecord, req: RouteRequest, now: Date): boolean {
  if (!USABLE_STATUSES.includes(a.status) && a.status !== 'cooling_down') return false;
  if (a.status === 'cooling_down' && isCoolingDown(a, now)) return false;
  if (a.status === 'quota_exhausted' || a.status === 'revoked') return false;
  if (req.preferredProvider && a.provider !== req.preferredProvider) return false;
  return true;
}

export class Router {
  private accounts: AccountRecord[];
  private policy: FallbackPolicy;
  private now: () => Date;

  constructor(accounts: AccountRecord[], policy: FallbackPolicy, now: () => Date = () => new Date()) {
    this.accounts = accounts;
    this.policy = policy;
    this.now = now;
  }

  setAccounts(accounts: AccountRecord[]): void { this.accounts = accounts; }
  setPolicy(policy: FallbackPolicy): void { this.policy = policy; }

  decide(req: RouteRequest): RouteDecision {
    const now = this.now();
    const candidates = this.accounts.filter((a) => eligible(a, req, now));

    // Explicit preferred account wins if eligible.
    if (req.preferredAccount) {
      const pref = candidates.find((a) => a.id === req.preferredAccount);
      if (pref) {
        return { provider: pref.provider, account: pref, reason: 'preferred account eligible', fallbackUsed: false, consentRequired: false };
      }
    }

    if (candidates.length === 0) {
      return {
        provider: req.preferredProvider ?? 'none',
        reason: 'no eligible account',
        fallbackUsed: false,
        consentRequired: true,
        blockedReason: 'No eligible account (check auth status, cooldowns, or quota).',
      };
    }

    // Single unambiguous candidate.
    if (candidates.length === 1) {
      const a = candidates[0];
      return { provider: a.provider, account: a, reason: 'only eligible account', fallbackUsed: false, consentRequired: false };
    }

    // Score: user priority is not modelled; prefer non-fallback-authorized? Keep deterministic by addedAt then id.
    const sorted = [...candidates].sort((x, y) => {
      // Prefer accounts NOT requiring fallback authorization for the primary path? Actually primary path uses any eligible.
      if (x.authorizedForFallback !== y.authorizedForFallback) return x.authorizedForFallback ? 1 : -1;
      return x.addedAt < y.addedAt ? -1 : 1;
    });
    const chosen = sorted[0];
    const ambiguous = candidates.length > 1;

    // Automatic fallback only if policy allows AND account authorized for fallback.
    const fallbackUsed = chosen.authorizedForFallback && this.policy.allowAutomaticFallback;

    return {
      provider: chosen.provider,
      account: chosen,
      reason: ambiguous ? 'multiple eligible accounts; picked by priority' : 'eligible account',
      fallbackUsed,
      consentRequired: ambiguous && this.policy.requireConsentWhenAmbiguous,
    };
  }
}
