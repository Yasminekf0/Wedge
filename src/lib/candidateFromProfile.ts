import type { ProofProfile } from "@/components/proof-graph/types";

export interface CandidateClaimRef {
  id: string;
  text: string;
}

/**
 * Structured list of claim refs (id + headline). Used by the validator to
 * accept `candidate_proof` citations from the model, and by the UI to render
 * the cited claim text by id.
 */
export function candidateClaimsFromProfile(
  profile: ProofProfile,
): CandidateClaimRef[] {
  return profile.claims.map((c) => ({ id: c.id, text: c.text }));
}

/**
 * Build a plain-text candidate summary from the proof graph profile.
 * Replaces the previous live-GitHub `summariseCandidate` — same prompt slot.
 * Each claim line is prefixed with its stable id so the LLM can cite by id.
 */
export function candidateSummaryFromProfile(profile: ProofProfile): string {
  const claims = profile.claims.slice(0, 12).map((c) => {
    const stack = c.details?.stack?.length
      ? ` (${c.details.stack.join(", ")})`
      : "";
    const firstUrl = c.evidence.find(
      (e) => e.type === "repo" || e.type === "deploy",
    )?.url;
    const sub = c.subtext ? ` — ${c.subtext}` : "";
    const url = firstUrl ? ` — ${firstUrl}` : "";
    const sectionLabel = c.section.charAt(0).toUpperCase() + c.section.slice(1);
    return `- id="${c.id}" [${sectionLabel}] ${c.text}${sub}${stack}${url}`;
  });

  return `Name: ${profile.header.name}
Location: ${profile.header.location}
Bio: ${profile.header.bio}

Top claims (cite by id):
${claims.join("\n") || "—"}`;
}
