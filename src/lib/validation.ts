// Citation validation. Drops fabricated citations against the actual sources
// that were passed to Claude. Ideas with zero valid citations get dropped too.

import type {
  ArtifactIdea,
  ArtifactPattern,
  Citation,
} from "@/server/claude.functions";
import type { CompanySignal } from "@/lib/github";
import type { BlogSignal } from "@/lib/blog";
import type { HNSignal } from "@/lib/hn";
import type { CandidateClaimRef } from "@/lib/candidateFromProfile";

export interface ValidationSources {
  companySignal: CompanySignal | null;
  blogSignal: BlogSignal | null;
  hnSignal: HNSignal | null;
  jobPostMarkdown: string;
  candidateClaims: CandidateClaimRef[];
}

// ---------- helpers ----------

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Levenshtein distance, iterative, O(n*m). Small inputs only. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

function repoBaseName(name: string): string {
  // Accept "stripe/smokescreen" or "smokescreen"
  const slash = name.lastIndexOf("/");
  return slash === -1 ? name : name.slice(slash + 1);
}

// ---------- per-source validators ----------

function validateCompanyGithub(
  c: Citation,
  signal: CompanySignal | null,
): boolean {
  if (!signal) return false;
  if (!c.repo_name) return false;
  const target = norm(repoBaseName(c.repo_name));
  const repo = signal.activeRepos.find((r) => norm(r.name) === target);
  if (!repo) return false;
  if (c.release_tag) {
    const tag = norm(c.release_tag);
    const has = repo.recentReleases.some(
      (r) => norm(r.tagName) === tag || norm(r.name) === tag,
    );
    if (!has) return false;
  }
  return true;
}

function validateCompanyBlog(
  c: Citation,
  signal: BlogSignal | null,
): boolean {
  if (!signal) return false;
  if (!c.post_url || !c.post_title) return false;
  const url = norm(c.post_url);
  const title = norm(c.post_title);
  const match = signal.posts.find((p) => norm(p.url) === url);
  if (!match) return false;
  // URL match is primary; title match secondary with Levenshtein <= 5
  const titleN = norm(match.title);
  if (titleN === title) return true;
  return levenshtein(titleN, title) <= 5;
}

function validateHN(c: Citation, signal: HNSignal | null): boolean {
  if (!signal) return false;
  if (!c.hn_thread_url) return false;
  const url = norm(c.hn_thread_url);
  return signal.threads.some((t) => norm(t.url) === url);
}

function validateJobPost(c: Citation, jobPostMarkdown: string): boolean {
  if (!c.job_post_quote) return false;
  const haystack = norm(jobPostMarkdown);
  const needle = norm(c.job_post_quote);
  if (needle.length < 4) return false;
  return haystack.includes(needle);
}

function validateCandidateProof(
  c: Citation,
  claims: CandidateClaimRef[],
): boolean {
  if (!claims || claims.length === 0) return false;
  if (!c.candidate_claim) return false;
  const target = norm(c.candidate_claim);
  return claims.some((cl) => norm(cl.id) === target);
}

function isValidCitation(c: Citation, sources: ValidationSources): boolean {
  if (!c || typeof c !== "object") return false;
  switch (c.source) {
    case "company_github":
      return validateCompanyGithub(c, sources.companySignal);
    case "company_blog":
      return validateCompanyBlog(c, sources.blogSignal);
    case "hn":
      return validateHN(c, sources.hnSignal);
    case "job_post":
      return validateJobPost(c, sources.jobPostMarkdown);
    case "candidate_proof":
      return validateCandidateProof(c, sources.candidateClaims);
    default:
      return false;
  }
}

// ---------- pattern downgrade ----------

/**
 * Bridges require ≥2 citations from different sources. If validation leaves
 * a bridge with only one, downgrade to the closest matching pattern.
 */
function downgradeBridge(idea: ArtifactIdea): ArtifactPattern {
  if (idea.pattern !== "bridge") return idea.pattern;
  if (idea.citations.length >= 2) {
    const sources = new Set(idea.citations.map((c) => c.source));
    if (sources.size >= 2) return "bridge";
  }
  const c = idea.citations[0];
  if (!c) return "extension";
  let next: ArtifactPattern;
  switch (c.source) {
    case "company_github":
      next = "contribution";
      break;
    case "company_blog":
      next = "response";
      break;
    case "hn":
      next = "missing_piece";
      break;
    case "job_post":
      next = "response";
      break;
    case "candidate_proof":
      next = "extension";
      break;
    default:
      next = "extension";
  }
  console.warn(
    `Downgraded bridge → ${next}: only ${idea.citations.length} valid citation(s) from ${
      idea.citations[0]?.source ?? "?"
    }`,
  );
  return next;
}

// ---------- main entry ----------

export function validateCitations(
  ideas: ArtifactIdea[] | null | undefined,
  sources: ValidationSources,
): ArtifactIdea[] {
  if (!Array.isArray(ideas)) return [];
  const out: ArtifactIdea[] = [];
  for (const idea of ideas) {
    if (!idea || !Array.isArray(idea.citations)) continue;
    const validCitations = idea.citations.filter((c) =>
      isValidCitation(c, sources),
    );
    if (validCitations.length === 0) {
      console.warn(`Dropped idea "${idea.title}" — no valid citations.`);
      continue;
    }
    const next: ArtifactIdea = {
      ...idea,
      citations: validCitations,
    };
    next.pattern = downgradeBridge(next);
    out.push(next);
  }
  return out;
}
