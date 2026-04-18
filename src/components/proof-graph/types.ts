// Proof Graph types.
// A claim is a declarative statement the candidate is making about themselves.
// Evidence backs it up. The board is a corkboard of claims.

export type ClaimSection = "projects" | "education" | "work";

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
}

export interface Claim {
  id: string;
  /** Short, declarative sentence. The headline of the card. */
  text: string;
  section: ClaimSection;
  /** Filter ids this claim matches. */
  tags: string[];
  evidence: Evidence[];
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
