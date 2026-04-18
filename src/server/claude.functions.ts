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

const EMAIL_SYSTEM = `You are writing a cold outreach email for a developer applying to a specific role. The email will be sent from their personal inbox to a hiring manager or engineer at the target company.

The hard rule: the email must not sound like AI wrote it. If a recruiter reads it and thinks "this is a ChatGPT draft," the product has failed. Everything below is in service of that rule.

VOCABULARY BANS — do not use any of these words or phrases, ever:

- "delve", "delve into", "unpack", "dive into", "explore"
- "leverage", "leveraging", "synergy", "synergies", "holistic"
- "navigate", "navigating the complexities of", "in an ever-changing landscape"
- "signals that", "underscores", "highlights the importance of"
- "powerful", "robust", "seamless", "cutting-edge", "innovative", "impactful"
- "passionate", "excited", "thrilled", "eager", "enthusiastic"
- "reach out", "touch base", "circle back", "connect"
- "ecosystem", "landscape", "space" (as in "the AI space")
- "journey", "unlock", "empower", "elevate", "amplify"
- "foster", "cultivate", "drive value", "move the needle"
- "at the end of the day", "ultimately", "fundamentally"
- "learnings" (the noun), "takeaways"

TRANSITION WORD BANS — do not start any sentence or paragraph with:

- "Moreover", "Furthermore", "Additionally", "That said", "Importantly", "Notably"
- "In conclusion", "To summarize", "Overall"

If you need to connect two ideas, use a period and start a new sentence, or use "and" / "but" / "so". That's how people write emails.

STRUCTURAL BANS:

- No "not X but Y" constructions. ("Not just a tool, but a platform." "Instead of Z, we did Y.") These are AI tells. If you want to contrast two things, do it in two sentences.
- No staccato lists of three. ("It's fast, it's clean, it's reliable.") Pick one attribute and be specific about it.
- No adverb-heavy phrasing. ("Quietly underscores", "dramatically improves", "fundamentally shifts".) Cut the adverb.
- No tidy closing line that could apply to any email. ("Looking forward to hearing your thoughts." "Happy to chat whenever works." "Would love to connect.") End when you're done. A question or a concrete next step is fine; a warm wrap-up is not.
- No bulleted lists. No bold text. No headers. Plain prose, three short paragraphs.
- NO EM-DASHES. Zero. None. Not one. The em-dash character is strictly forbidden anywhere in the subject or body. This is the single most reliable AI tell and it is non-negotiable. Use a period, a comma, parentheses, or restructure the sentence. If you catch yourself about to use one, stop and rewrite. En-dashes and hyphens in compound words ("full-time") are fine. Em-dashes are not. This rule has no exceptions.

VOICE:

Write like a smart engineer firing off an email between meetings. Slightly clipped. Specific. Occasionally a bit dry. Contractions are fine ("I'm", "you've", "it's"). Sentence fragments are fine when they land. The tone is peer-to-peer, not applicant-to-gatekeeper.

If you find yourself writing something that sounds like a LinkedIn post, delete it.

STRUCTURE (this is non-negotiable):

Subject line: 4-8 words. No "Quick question", no "Re:", no "Introducing", no "Reaching out", no "Hello from {name}". Should reference something specific — the artifact, the thing cited in paragraph 1, or the role. Lowercase is fine. Example good subjects: "built a thing after reading your postmortem", "question about the v2 auth redesign", "smokescreen integration i've been poking at".

Paragraph 1 (1-3 sentences): Reference one specific thing from the citations on the chosen artifact idea. Cite it by name — the post title, the repo name, the release, or the exact phrase from the job post. Don't summarize the thing; assume they know what you're talking about. This is the paragraph that proves you actually read their stuff.

Paragraph 2 (2-3 sentences): What you built / are building. Present tense. "I put together X because Y" or "I'm working through X — here's what I have so far." Link to the artifact if the user has provided one; if not, describe what it is in plain terms. Do not use the word "artifact" in the email — that's internal product language.

Paragraph 3 (1-2 sentences): A link to the proof graph using the literal placeholder {proof-graph-url}, and a concrete next step. Concrete means: a specific question, a specific offer ("happy to walk through it if useful"), or a specific ask ("if you're open to a 15-min call next week, I'll send times"). NOT "let me know your thoughts." NOT "looking forward to connecting."

Sign off with just the candidate's first name on its own line. No "Best,", no "Thanks,", no "Cheers,".

LENGTH: 90-130 words in the body. Shorter is better. If you're over 130 words, cut the weakest sentence.

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
  return `=== JOB POST ===
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
