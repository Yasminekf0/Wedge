export type CardType = "project" | "education" | "work";

export interface ProjectMeta {
  language?: string;
  languageColor?: string; // hex
  url?: string;
  topic?: string; // drives generated visual
}

export interface EducationMeta {
  institution: string;
  program: string;
  years?: string;
  crestColor?: string;
}

export interface WorkMeta {
  company: string;
  role: string;
  logoUrl?: string;
  accentColor?: string;
}

export type CardMeta = ProjectMeta | EducationMeta | WorkMeta;

export interface ProofCard {
  id: string;
  type: CardType;
  title: string;
  description: string;
  /** Optional pre-rendered image url. If absent, an abstract visual is generated from `meta`. */
  visual?: string;
  meta: CardMeta;
  relevant?: boolean;
  /** Long-form detail shown in the side panel. Markdown-ish plain text. */
  detail?: string;
}

export interface ProofGroup {
  id: string;
  label: string;
  items: ProofCard[];
}

export interface ProofHeader {
  name: string;
  avatar?: string;
  location?: string;
  bio?: string;
  linkedin?: string;
  github?: string;
}

export interface ProofProfile {
  header: ProofHeader;
  groups: ProofGroup[];
  /** When true, highlight behaviour is active. */
  jobLoaded?: boolean;
}
