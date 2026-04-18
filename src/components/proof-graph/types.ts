// Proof Graph types.
// A claim is a declarative statement the candidate is making about themselves.
// Evidence backs it up. The board is a corkboard of claims.

export type ClaimSection = "projects" | "achievements" | "education" | "work";

export type EvidenceType = "repo" | "deploy" | "work" | "education" | "link";

export interface Evidence {
  type: EvidenceType;
  title: string;
  description?: string;
  url?: string;
  /** Free-form meta line, e.g. "2021 — 2024" or "Series B fintech". */
  meta?: string;
  /** Primary language (for repo evidence). Used as a colored dot. */
  language?: string;
  /** Optional logo URL. If omitted, a favicon is derived from `url` when possible. */
  logo?: string;
}

export interface ClaimMetric {
  label: string;
  value: string;
}

export interface ClaimDetails {
  /** Longer narrative shown at the top of the side panel. */
  story?: string;
  /** Quick stat tiles: stars, users, latency, etc. */
  metrics?: ClaimMetric[];
  /** Bullet list of specific highlights. */
  highlights?: string[];
  /** Tech stack badges. */
  stack?: string[];
  /** Date or date range, e.g. "Aug 2023 — present" or "Summer 2019". */
  timeline?: string;
  /** Current status, e.g. "Live", "Archived", "In progress". */
  status?: string;
  /** Optional pull-quote. */
  quote?: { text: string; attribution?: string };
}

export interface Claim {
  id: string;
  /** Short, declarative sentence. The headline of the card. */
  text: string;
  /** Optional secondary line shown under the headline (smaller, muted). */
  subtext?: string;
  section: ClaimSection;
  /** Filter ids this claim matches. */
  tags: string[];
  evidence: Evidence[];
  /** Rich, varied side-panel content. */
  details?: ClaimDetails;
  /**
   * Optional absolute position on the board (in px). If omitted, the layout
   * pass auto-places the claim within its section zone.
   */
  position?: { x: number; y: number };
  /** Visual weight — affects card width. "lg" implies a hero claim. */
  size?: "sm" | "md" | "lg";
}

export interface FilterChip {
  id: string;
  label: string;
}

export interface ProofHeader {
  name: string;
  avatar: string;
  location: string;
  bio: string;
  linkedin?: string;
  github?: string;
}

export interface ProofProfile {
  header: ProofHeader;
  filters: FilterChip[];
  claims: Claim[];
  /** When true, defaults filters to active and indicates a job context. */
  jobLoaded?: boolean;
  /** Subset of filter ids that the loaded job post highlighted. */
  jobActiveFilterIds?: string[];
}
