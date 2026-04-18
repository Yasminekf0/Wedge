import { createServerFn } from "@tanstack/react-start";

type Mode = "ideas" | "email" | "extract_company";

export type ArtifactPattern =
  | "teardown"
  | "contribution"
  | "extension"
  | "response"
  | "bridge"
  | "benchmark"
  | "translation"
  | "missing_piece"
  | "steelman";

export type CitationSource =
  | "job_post"
  | "company_github"
  | "company_blog"
  | "hn"
  | "candidate_github";

export interface Citation {
  source: CitationSource;
  // Exactly one set of ref fields populated, depending on `source`:
  repo_name?: string; // company_github
  release_tag?: string; // company_github (optional, pairs with repo_name)
  post_title?: string; // company_blog
  post_url?: string; // company_blog
  hn_thread_title?: string; // hn
  hn_thread_url?: string; // hn
  job_post_quote?: string; // job_post (≤140 chars verbatim)
  candidate_repo?: string; // candidate_github
  /** Why this specific source drove this specific idea. One sentence. */
  relevance: string;
}

export interface ArtifactIdea {
  title: string;
  pattern: ArtifactPattern;
  why_it_lands: string;
  estimated_hours: number;
  what_to_build: string;
  citations: Citation[];
}

export interface IdeasResult {
  ideas: ArtifactIdea[];
}

export interface EmailResult {
  subject: string;
  body: string;
}

interface CallInput {
  mode: Mode;
  jobMarkdown: string;
  // JSON-serialized strings sent from the client so we don't have to redeclare
  // the full type tree on the server.
  companySignalJson?: string; // "" if none
  blogSignalJson?: string; // "" if none
  hnSignalJson?: string; // "" if none
  candidateSummary?: string; // "" if none
  // For email mode:
  ideaJson?: string;
  companyName?: string; // "" if none — explicit company name for the email
  targetName?: string; // "" if none — recipient first name
  candidatePitch?: string; // "" if none — optional 1-line self-intro
  candidateName?: string; // "" if none — for the sign-off line
  // For ideas mode regeneration: extra instruction appended to user message.
  extraUserInstruction?: string;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5";
const FAST_MODEL = "claude-haiku-4-5";

const EXTRACT_SYSTEM = `Extract the company name from this job post. Return only the company name, nothing else. No quotes, no labels, no explanation. If you can't find a clear company name, return exactly: UNKNOWN`;

const IDEAS_SYSTEM = `You are helping a developer generate artifact ideas for cold outreach to a company. An "artifact" is something small (2–8 hours of work) that a candidate can build or write to earn a response from a hiring manager or engineering leader. The artifact should reference something specific the company has published or built — not generic.

You will receive up to five sources of context:
1. The full job post markdown (always present)
2. The company's GitHub org activity — recent repos, releases, languages (usually present)
3. The company's recent engineering blog posts (sometimes present — may include recruiting posts or low-signal content, use judgment)
4. Hacker News threads about the company (rarely present, but when present these have been pre-filtered for quality — treat them as high-signal)
5. The candidate's GitHub profile (always present)

Your job: propose up to 3 artifact ideas. Each idea must:
- Reference something specific from sources 1–4 (cite it in why_it_lands)
- Be plausibly achievable by the candidate given their skills from source 5
- Take 2–8 hours
- Fall into one of these patterns: teardown, contribution, extension, response, bridge, benchmark, translation, missing_piece, steelman

The BEST ideas bridge two sources — e.g. "you said X in the job post, your repo Y does Z, here's an artifact connecting them."

Source weighting:
- Prefer specificity over coverage. One artifact idea that drills deep into the strongest signal beats three shallow ideas that each cite a different source.
- Engineering blog posts are useful when they're technical (architecture decisions, postmortems, deep dives). Ignore blog posts that are clearly recruiting or PR content ("meet our new VP", "we're hiring", generic thought leadership).
- Hacker News comments reveal what technical users actually want that the company isn't delivering. When present, these are often the best source for "missing piece" or "bridge" pattern artifacts.
- If a source is empty or thin, don't force an idea from it. It's fine if all 3 ideas cite the same source, as long as they cite different specific things within it.

Avoid generic ideas (e.g. "write a blog post about their product"). Specificity is the entire point.

CITATIONS — read carefully, this is the most important rule:

Every idea you generate MUST be grounded in specific content from the sources provided. Generic ideas are not acceptable.

For each idea, include 1-3 citations that point to the exact things you used:
- If you're referencing a company repo, cite it by full name (e.g. "stripe/smokescreen") and if a release drove the idea, include the release tag.
- If you're referencing a blog post, cite its title AND url — copy them verbatim from the provided blog signal. Do not paraphrase titles.
- If you're referencing an HN thread, cite its title AND url verbatim.
- If you're referencing the job post, quote the specific sentence or phrase (≤140 chars, verbatim from the job post).
- If you're referencing the candidate's skills, cite the specific repo of theirs that demonstrates the skill.

For each citation, the "relevance" field must explain in one sentence WHY that specific source drove this specific idea. Not "this is relevant to the company" — that's useless. Something like "their Jan 2024 postmortem explicitly called out observability in gRPC as an open problem, which this artifact addresses."

CRITICAL: Do not fabricate citations. If you cannot find a specific, real item in the sources to cite, do not invent one. It is better to generate fewer ideas with real citations than three ideas with made-up references. If you genuinely cannot ground an idea in the provided sources, omit it — return only the ideas you can cite.

"bridge" pattern ideas MUST have at least 2 citations from different sources (that's what makes them bridges).

Return only valid JSON, no preamble, no markdown code fences:
{
  "ideas": [
    {
      "title": "short, concrete",
      "pattern": "one of: teardown | contribution | extension | response | bridge | benchmark | translation | missing_piece | steelman",
      "why_it_lands": "one sentence citing the specific thing from the job post, repos, blog, or HN that makes this land",
      "estimated_hours": integer 2-8,
      "what_to_build": "2-3 sentences of concrete scope. What exactly do they build? What does 'done' look like?",
      "citations": [
        {
          "source": "job_post | company_github | company_blog | hn | candidate_github",
          "repo_name": "owner/repo (only for company_github)",
          "release_tag": "v1.2.3 (optional, only for company_github)",
          "post_title": "verbatim title (only for company_blog)",
          "post_url": "verbatim url (only for company_blog)",
          "hn_thread_title": "verbatim title (only for hn)",
          "hn_thread_url": "verbatim url (only for hn)",
          "job_post_quote": "verbatim ≤140 char quote (only for job_post)",
          "candidate_repo": "repo name (only for candidate_github)",
          "relevance": "one sentence on why this source drove this idea"
        }
      ]
    }
  ]
}`;

const EMAIL_SYSTEM = `You are drafting a cold outreach email for a developer applying to a specific job. The candidate wants the reader to know they're interested in the role and wants a conversation. The email must sound human, not AI-generated.

VOCABULARY BANS — do not use any of these words or phrases, ever:

- "delve", "delve into", "unpack", "dive into", "explore"
- "leverage", "leveraging", "synergy", "synergies", "holistic"
- "navigate", "navigating the complexities of", "in an ever-changing landscape"
- "signals that", "underscores", "highlights the importance of"
- "powerful", "robust", "seamless", "cutting-edge", "innovative", "impactful"
- "passionate", "excited", "thrilled", "eager", "enthusiastic"
- "touch base", "circle back", "connect" (as a verb)
- "ecosystem", "landscape", "space" (as in "the AI space")
- "journey", "unlock", "empower", "elevate", "amplify"
- "foster", "cultivate", "drive value", "move the needle"
- "at the end of the day", "ultimately", "fundamentally"
- "learnings" (the noun), "takeaways"

TRANSITION WORD BANS — do not start any sentence or paragraph with:
- "Moreover", "Furthermore", "Additionally", "That said", "Importantly", "Notably"
- "In conclusion", "To summarize", "Overall"

STRUCTURAL BANS:
- No "not X but Y" constructions. No "instead of X, Y" framings.
- No staccato lists of three.
- No adverb-heavy phrasing.
- No tidy closing line that could apply to any email ("Looking forward to hearing your thoughts", "Happy to chat whenever works", etc.).
- No bulleted lists, no bold text, no headers.
- NO EM-DASHES. Zero. None. Not one. The em-dash character (—) is strictly forbidden anywhere in the subject or body. Use a period, a comma, parentheses, or restructure. En-dashes and hyphens in compound words ("full-time") are fine. This rule has no exceptions.

VOICE:
Smart engineer firing off an email between meetings. Slightly clipped. Specific. Contractions are fine. Peer-to-peer, not applicant-to-gatekeeper. If a sentence sounds like a LinkedIn post or a cover letter, delete it. Don't hedge ("I might be interested" is weaker than "I'm interested"). Don't over-qualify ("I've been casually exploring" is weaker than "I built this").

TEMPLATE — follow this structure exactly:

1. Greeting line. "Hi {first name}," if a target name is provided. If no target name, use "Hi there,". No "Dear", no "Hello".

2. Opening line (1 sentence): state that you came across the specific role, and that you wanted to reach out. Name the role and the company. This makes the ask obvious from sentence one. Example: "I came across the {role} opening at {company} and wanted to reach out directly."

3. Self-intro (1 sentence, CONDITIONAL):
   - If a candidate pitch is provided in the input, use it verbatim or near-verbatim as: "I'm {candidate name}, {pitch}." Do NOT rephrase the pitch into corporate language. The candidate wrote it. Trust it. If the candidate name is unknown, just write "{pitch}." as a standalone sentence.
   - If no pitch is provided, SKIP THIS LINE ENTIRELY. Do not invent a self-description from the GitHub profile. Do not write generic filler like "I'm a developer interested in your work." The absence of a self-intro is better than a weak one. Move directly from the opening line to the technical hook.

4. Technical hook (1-2 sentences): reference one specific thing from the chosen artifact's citations. Cite it by name — the post title, repo name, release tag, or the exact quote from the job post. "I saw your postmortem on the Jan Postgres incident" is good. "I've been following your engineering work" is not. Do not use the word "artifact" — that's internal language.

5. Artifact description (1-2 sentences): what you built or are building, in plain terms, tied to the hook. Present tense. "So I put together {X} that {does Y}." One sentence of what it is, one sentence of why. Do not over-explain.

6. Proof graph introduction (1-2 sentences): introduce the proof graph as evidence rather than a resume, in plain language. The reader does NOT know what a "proof graph" is — that is internal product language and must not appear in the email. Vary the phrasing across generations. Good framings:
   - "Instead of a CV, I keep a page that links to the actual code behind every skill I'd claim: {proof-graph-url}"
   - "Rather than a resume, this is a page where every claim links back to the repo that proves it: {proof-graph-url}"
   - "I've been keeping a running page with links to the work behind each thing I've built, in place of a CV: {proof-graph-url}"

7. The ask (1 sentence): explicitly invite a conversation, tied to the role. Good: "Would love to hop on a quick call if the role is still open, or if you just want to walk through the thought process." Not: "Let me know if you'd like to chat" (too vague). Not: "Looking forward to your thoughts" (banned closer).

8. Sign-off: "Thanks," or "Thank you," on its own line, then the candidate's first name on the next line. No "Best regards", no "Cheers", no "All the best".

LENGTH: 100-150 words in the body. Tighter is better.

Subject line: 4-8 words. References the role, the company, or the specific cited thing. Lowercase is fine. No "Quick question", no "Re:", no "Reaching out".

Return only valid JSON, no preamble, no markdown fences:
{
  "subject": "string",
  "body": "string with \\n\\n between paragraphs"
}`;

function ideasUser(input: CallInput) {
  const job = (input.jobMarkdown || "").slice(0, 14000);
  const company = (input.companySignalJson || "").slice(0, 12000);
  const blog = (input.blogSignalJson || "").slice(0, 6000);
  const hn = (input.hnSignalJson || "").slice(0, 6000);
  const candidate = (input.candidateSummary || "").slice(0, 4000);
  const extra = (input.extraUserInstruction || "").slice(0, 1500);
  return `=== JOB POST ===
${job || "(none provided)"}

=== COMPANY GITHUB ===
${company || "(none provided)"}

=== COMPANY BLOG ===
${blog || "No blog signal available"}

=== COMMUNITY DISCUSSION (HN) ===
${hn || "No HN signal available"}

=== CANDIDATE GITHUB ===
${candidate || "(none provided)"}${extra ? `\n\n=== ADDITIONAL INSTRUCTION ===\n${extra}` : ""}`;
}

function emailUser(input: CallInput) {
  const job = (input.jobMarkdown || "").slice(0, 10000);
  const company = (input.companySignalJson || "").slice(0, 10000);
  const candidate = (input.candidateSummary || "").slice(0, 3000);
  const idea = (input.ideaJson || "").slice(0, 2000);
  const extra = (input.extraUserInstruction || "").slice(0, 2000);
  const companyName = (input.companyName || "").trim();
  const targetName = (input.targetName || "").trim();
  const pitch = (input.candidatePitch || "").trim();
  const candidateName = (input.candidateName || "").trim();
  return `=== TARGET NAME ===
${targetName || "(none provided — use \"Hi there,\")"}

=== COMPANY NAME ===
${companyName || "(none provided — infer from job post)"}

=== CANDIDATE NAME (for sign-off) ===
${candidateName || "(none provided — sign with first name only if you can infer one, otherwise omit)"}

=== CANDIDATE 1-LINE PITCH ===
${pitch || "(none provided — SKIP the self-intro sentence entirely. Do NOT invent one.)"}

=== JOB POST ===
${job || "(none provided)"}

=== COMPANY GITHUB ===
${company || "(none provided)"}

=== CANDIDATE GITHUB ===
${candidate || "(none provided)"}

=== CHOSEN ARTIFACT IDEA ===
${idea || "(none provided)"}${extra ? `\n\n=== ADDITIONAL INSTRUCTION ===\n${extra}` : ""}`;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in model reply");
  return JSON.parse(candidate.slice(start, end + 1));
}

export const callClaude = createServerFn({ method: "POST" })
  .inputValidator((input: CallInput) => {
    if (
      !input ||
      (input.mode !== "ideas" &&
        input.mode !== "email" &&
        input.mode !== "extract_company")
    ) {
      throw new Error("invalid mode");
    }
    if (typeof input.jobMarkdown !== "string") {
      throw new Error("jobMarkdown required");
    }
    return input;
  })
  .handler(async ({ data }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY missing on server");
    }

    // ---------- extract_company: tiny, fast, plain text response ----------
    if (data.mode === "extract_company") {
      const snippet = (data.jobMarkdown || "").slice(0, 3000);
      const res = await fetch(ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: FAST_MODEL,
          max_tokens: 50,
          system: EXTRACT_SYSTEM,
          messages: [{ role: "user", content: snippet }],
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error("Anthropic extract error", res.status, errText);
        throw new Error(`Anthropic ${res.status}`);
      }
      const json = (await res.json()) as {
        content?: Array<{ type: string; text?: string }>;
      };
      let text =
        json.content
          ?.filter((c) => c.type === "text")
          .map((c) => c.text || "")
          .join("")
          .trim() || "";
      // Strip surrounding quotes
      text = text.replace(/^["'`]+|["'`]+$/g, "").trim();
      const ok =
        text.length > 0 && text.length <= 60 && text.toUpperCase() !== "UNKNOWN";
      return {
        mode: "extract_company" as const,
        company: ok ? text : null,
      };
    }

    const system = data.mode === "ideas" ? IDEAS_SYSTEM : EMAIL_SYSTEM;
    const user = data.mode === "ideas" ? ideasUser(data) : emailUser(data);

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: data.mode === "ideas" ? 3000 : 1500,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic error", res.status, errText);
      throw new Error(`Anthropic ${res.status}`);
    }

    const json = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const text =
      json.content?.filter((c) => c.type === "text").map((c) => c.text || "").join("\n") || "";

    const parsed = extractJson(text);
    if (data.mode === "ideas") {
      const r = parsed as IdeasResult;
      return { mode: "ideas" as const, ideas: r.ideas };
    }
    const e = parsed as EmailResult;
    return { mode: "email" as const, subject: e.subject, body: e.body };
  });
