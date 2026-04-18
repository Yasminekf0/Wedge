

## Why candidate citations don't show

In `outreach.tsx` the validator's `candidateProfile` is hardcoded to `null` (line 287). `validateCandidateGithub` requires a non-null proof with `topRepos`, so every `candidate_github` citation Claude produces is dropped silently. Result: ideas show job/repo/blog/hn citations only.

Secondary issue: the Claude prompt still tells the model to cite `candidate_repo` (a GitHub repo name), but our new `CANDIDATE_SUMMARY` is proof-graph claims, not a repo list. So even if validation passed, the model is grounding on the wrong shape.

## Fix

### 1. Build a candidate-claim source for validation

Extend `candidateFromProfile.ts` to also export a structured list of "candidate claim refs" — one entry per claim, with a stable id (e.g. claim section + first 6 words slugified, or the existing `claim.id` if present in the proof type) and the raw claim text. This becomes the validator's source-of-truth.

### 2. Update the citation schema

In `claude.functions.ts`:
- Rename `candidate_github` → `candidate_proof` (the source name in the prompt and `CitationSource` union).
- Replace `candidate_repo` with `candidate_claim` (the slug/id of the cited claim).
- Update `IDEAS_SYSTEM` text: instead of "cite the specific repo of theirs", say "cite the specific claim from the candidate's proof graph by its id".
- Update the `=== CANDIDATE GITHUB ===` block label to `=== CANDIDATE PROOF GRAPH ===` and include the claim ids alongside text so Claude can reference them.

### 3. Update the validator

In `validation.ts`:
- Drop the `CandidateProof` import.
- Change `candidateProfile` field on `ValidationSources` to `candidateClaims: { id: string; text: string }[]`.
- Replace `validateCandidateGithub` with `validateCandidateProof`: accept the citation if `candidate_claim` matches a known claim id (case/space-insensitive).

### 4. Wire it in `outreach.tsx`

- Build `CANDIDATE_CLAIMS` once at module level alongside `CANDIDATE_SUMMARY`.
- Pass `candidateClaims: CANDIDATE_CLAIMS` into the `sources` object on both validation calls.

### 5. Update `IdeaBlock.tsx` rendering

- Add `candidate_proof` to `SOURCE_PREFIX` (e.g. `"[you]"`).
- Render the `candidate_claim` text (look up the claim by id from the same module-level list passed via prop or imported directly) instead of `candidate_repo`.

## Files touched

- `src/lib/candidateFromProfile.ts` — add `candidateClaimsFromProfile()`.
- `src/server/claude.functions.ts` — rename source/field, update prompt + user message label.
- `src/lib/validation.ts` — swap candidate validator and source shape.
- `src/routes/outreach.tsx` — pass real candidate claims into validation sources.
- `src/components/wedge/IdeaBlock.tsx` — render the new citation type.

## Verification

- Generate ideas for any job. At least one idea should now include a `[you]` citation referencing a specific Sasha claim (e.g. "kvraft" or "Klarna payments rewrite").
- The citation's "relevance" line connects that claim to the idea.
- "bridge" pattern ideas can now include candidate-proof + company-source pairs without being downgraded.

