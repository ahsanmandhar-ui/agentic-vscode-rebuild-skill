// src/skills/types.ts
export type SkillLifecycleState =
  | 'discovered' | 'inspected' | 'pending_approval' | 'installed'
  | 'enabled' | 'disabled' | 'quarantined' | 'failed';

export type RiskSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface SkillFinding {
  rule: string;
  severity: RiskSeverity;
  file: string;
  line?: number;
  excerpt?: string;
}

export interface InspectionResult {
  status: 'passed' | 'warn' | 'fail';
  findings: SkillFinding[];
  riskScore: number; // 0..1
  inspectedAt: string;
  hash: string;       // sha256 root
  signature?: { algorithm: string; verified: boolean; issuer?: string };
  permissions: {
    fs: string[];
    exec: boolean;
    network: string[];
    secrets: boolean;
  };
  license: string;
  source: string;
  sourceRef?: string;
}

export interface SkillManifest {
  name: string;
  version: string;
  description: string;
  license: string;
  source: string;
  sourceRef?: string;
  requires?: string[];
  permissions: InspectionResult['permissions'];
  tags?: string[];
  activation?: 'auto' | 'manual';
  precedence?: number;
  conflictsWith?: string[];
  minVibecode?: string;
  formatVersion: number;
}

export interface SkillCandidate {
  id: string;
  manifest: SkillManifest;
  state: SkillLifecycleState;
  inspection?: InspectionResult;
  approvedAt?: string;
  approvedBy?: 'user';
  approvedScopes?: string[];
  installedAt?: string;
  enabledAt?: string;
  activatedAt?: string;
  quarantineReason?: string;
}

export interface CandidateCard {
  candidate: SkillCandidate;
  title: string;
  trustBadge: 'bundled' | 'verified' | 'unverified' | 'quarantined';
  summary: string; // one line
}

export type ManageSkillsAction = 'inspect' | 'approve' | 'cancel' | 'install' | 'enable' | 'activate' | 'disable';

export interface ApprovalDecision {
  candidateId: string;
  decision: 'approve' | 'cancel';
  scopesShown: string[];
  at: string;
}
