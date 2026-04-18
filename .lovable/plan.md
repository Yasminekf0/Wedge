

## Goal

Make `/proof-graph` the landing page (currently at `/`), and move the outreach workflow to its own route. Drop the GitHub username and pitch inputs from the outreach form — derive Sasha's GitHub handle from the proof graph's example profile instead.

## Routing change

- `/` → renders the proof graph (what's currently at `/proof-graph`)
- `/outreach` → renders the outreach workflow (what's currently at `/`)
- `/proof-graph` → remove this route file (consolidated into `/`)

Implementation: swap the contents of `src/routes/index.tsx` and `src/routes/proof-graph.tsx`, then delete the proof-graph route. The TanStack Router plugin will regenerate `routeTree.gen.ts` on the next build.

## Entry point on `/` (proof graph)

Add a single CTA on the proof graph page that links to `/outreach`:
- Place it near the existing demo toggle (bottom-right) OR as a small button in the header area of the proof graph.
- Label: `Draft outreach for a job` (or similar).
- Uses `<Link to="/outreach">`.

Decision: put it next to the existing "simulate job match" toggle in the bottom-right corner so it doesn't disturb the proof graph layout. Same visual style as that toggle.

## Outreach page (`/outreach`)

Move all current `src/routes/index.tsx` content here. Two changes inside it:

1. **Remove the GitHub username input field.** Hardcode the handle by importing it from the example profile — read `exampleProfile.header.github` (or fall back to a constant if that field isn't a clean handle) and pass it to `fetchCandidateProof`. No user-facing field.

2. **Remove the "Your 1-line pitch" input field** and the helper text below it. Pass `pitch: ""` to the email generation call (the existing prompt already handles empty pitch by skipping the self-intro line).

Everything else stays identical: job URL input, target name input, Generate button, Research section, Proof graph view, 3 ideas, outreach draft, blunter/warmer, regenerate, copy buttons, slop filter, prompts. No prompt changes. No proof graph changes beyond the new CTA link.

## Files touched

- `src/routes/index.tsx` — replace with the proof graph page content + add `Link to="/outreach"` CTA.
- `src/routes/outreach.tsx` — new file, contains the current index.tsx content with the two input fields removed and Sasha's GitHub handle hardcoded.
- `src/routes/proof-graph.tsx` — delete.

## Verification

- Visiting `/` shows the proof graph.
- Clicking the new CTA navigates to `/outreach` and shows the trimmed outreach form (only Job URL + Target name).
- Generating an email still fetches Sasha's GitHub data correctly and produces a draft with no self-intro line.
- Old `/proof-graph` URL 404s (acceptable since this is an internal tool, but note it).

