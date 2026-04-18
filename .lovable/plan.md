

## Goal

Stop calling GitHub for Sasha. Replace every use of the live `CandidateProof` with a hardcoded summary derived from `exampleProfile` (the proof graph data), so the LLM "knows the candidate" from the proof graph, not from GitHub API output.

## What feeds off candidate GitHub today (in `src/routes/outreach.tsx`)

1. `fetchCandidateProof(SASHA_GH)` → sets `proof`, `proofState`. Used in:
   - `summariseCandidate(p)` → injected into the ideas prompt and the email prompt as `=== CANDIDATE GITHUB ===`.
   - `candidateName = p?.user?.login` → sign-off name in the email payload.
   - `proofState` UI ("loading / missing / ready") — but there's no longer a Section that renders this (proof section now embeds the proof-graph). Dead state.
2. `getRateLimitRemaining()` post-fetch — only meaningful for the candidate fetch + company fetch; we keep it for company.

## Plan

### 1. New helper: `candidateSummaryFromProfile()`

Add a small pure function (top of `outreach.tsx`, or a new `src/lib/candidateFromProfile.ts` — prefer the lib file to keep the route lean) that takes `exampleProfile` and produces a plain-text block in roughly the same shape `summariseCandidate` produces today:

```
Name: Sasha Lindqvist
Location: Stockholm, Sweden
Bio: Backend engineer. Distributed systems, Rust, infrastructure.

Top claims:
- [Work] Senior Backend Engineer, Klarna — Led the payments infra rewrite, cut p99 latency by 60%. (Rust, Tokio, Postgres, Kafka, gRPC)
- [Project] kvraft — distributed key-value store in Rust to learn Raft. (Rust, Tokio, RocksDB) — github.com/...
- [Achievement] Won the Rust Foundation Community Grant for OSS work.
- ...etc
```

Build it from `exampleProfile.claims`: include section, headline `text`, optional `subtext`, `details.stack` (joined), and the first repo/deploy `evidence.url` if present. Cap at ~10 claims.

This block is what we pass to the LLM as `candidateSummary` — same field name, same prompt slot, no Claude prompt changes.

### 2. Strip GitHub fetching for the candidate

In `outreach.tsx`:
- Remove `SASHA_GH`, `fetchCandidateProof`, `CandidateProof` import, `proof` / `proofState` state, the `proofP` promise, and the `setProof*` calls.
- In `handleGenerate`, drop `proofP` from the `Promise.all`. Pass `null` (or a lightweight stub object — see below) wherever `proof` was passed.
- Replace the `summariseCandidate(p)` call sites with a single module-level constant: `const CANDIDATE_SUMMARY = candidateSummaryFromProfile(exampleProfile);` and use that.
- For `candidateName`, hardcode from `exampleProfile.header.name.split(" ")[0]` (i.e. "Sasha").
- Delete `summariseCandidate` (no longer used).
- `runIdeasAndEmail` and `generateEmail` signatures: drop the `p: CandidateProof | null` parameter. Update internal references and the call sites (`regenerateIdeas`, `selectIdea`, `regenerateEmail`, `setMode`, `rerunWithHandle`).

### 3. UI cleanup

- The proof-graph section already renders the proof graph preview from `exampleProfile`, independent of any fetch. No UI change needed there.
- Remove the now-dead `proofState`-driven branches if any exist (skim and delete).
- Loading copy that referenced "pulling your proof graph" stays accurate (the proof graph is the source).

### 4. Files touched

- `src/routes/outreach.tsx` — the bulk of the change.
- `src/lib/candidateFromProfile.ts` — new, ~30 lines.
- No changes to `claude.functions.ts`, `github.ts`, `proof-graph/*`, prompts, or routes.

## Verification

- Network tab on `/outreach` Generate: no `api.github.com/users/...` or `/repos/...` calls for Sasha. Only the company-org calls remain.
- Generated email body still references Sasha's specific work (Klarna rewrite, kvraft, Rust grant, etc.) because those claims are now in the candidate summary the LLM sees.
- Sign-off line still ends with "Thanks, Sasha".
- Removing the `GITHUB_TOKEN` would not break candidate flow (only affects company resolution, unchanged).

