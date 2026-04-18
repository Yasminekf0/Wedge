import type { ProofProfile } from "@/components/proof-graph/types";

/**
 * Build a plain-text candidate summary from the proof graph profile.
 * Replaces the previous live-GitHub `summariseCandidate` — same prompt slot.
 */
export function candidateSummaryFromProfile(profile: ProofProfile): string {
  const claims = profile.claims.slice(0, 10).map((c) => {
    const stack = c.details?.stack?.length
      ? ` (${c.details.stack.join(", ")})`
      : "";
    const firstUrl = c.evidence.find(
      (e) => e.type === "repo" || e.type === "deploy",
    )?.url;
    const sub = c.subtext ? ` — ${c.subtext}` : "";
    const url = firstUrl ? ` — ${firstUrl}` : "";
    const sectionLabel = c.section.charAt(0).toUpperCase() + c.section.slice(1);
    return `- [${sectionLabel}] ${c.text}${sub}${stack}${url}`;
  });

  return `Name: ${profile.header.name}
Location: ${profile.header.location}
Bio: ${profile.header.bio}

Top claims:
${claims.join("\n") || "—"}`;
}
