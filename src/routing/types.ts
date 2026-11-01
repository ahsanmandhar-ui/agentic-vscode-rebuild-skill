// src/routing/types.ts
// Pure types for provider/account routing. No vscode imports.

export type AccountAuthKind = 'api-key' | 'oauth' | 'local';
export type AccountStatus = 'ok' | 'auth_expired' | 'cooling_down' | 'quota_exhausted' | 'revoked' | 'unknown';
export type LimitSource = 'provider-api' | 'header' | 'documentation';

export interface AccountLimits {
  source: LimitSource;
  at: string;          // ISO timestamp
  note: string;        // human-readable, no secrets
}

export interface AccountRecord {
  id: string;
  label: string;
  provider: string;
  secretRef: string;              // SecretStorage key name; never the value
  authKind: AccountAuthKind;
  addedAt: string;
  authorizedForFallback: boolean; // default false; set only by explicit user action
  status: AccountStatus;
  cooldownUntil?: string;
  lastKnownLimits?: AccountLimits;
}

export interface RouteRequest {
  taskKind: 'chat' | 'agent' | 'completion';
  needsTools: boolean;
  preferredProvider?: string;
  preferredAccount?: string;
}

export interface RouteDecision {
  provider: string;
  account?: AccountRecord;
  reason: string;
  fallbackUsed: boolean;
  consentRequired: boolean;       // true when the user must confirm
  blockedReason?: string;         // set when no eligible account exists
}

export interface FallbackPolicy {
  allowAutomaticFallback: boolean; // never bypasses provider limits
  requireConsentWhenAmbiguous: boolean;
}
