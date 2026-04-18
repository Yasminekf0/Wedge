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

export interface ArtifactIdea {
  title: string;
  pattern: ArtifactPattern;
  why_it_lands: string;
  estimated_hours: number;
  what_to_build: string;
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
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5";
const FAST_MODEL = "claude-haiku-4-5";

const EXTRACT_SYSTEM = `Extract the company name from this job post. Return only the company name, nothing else. No quotes, no labels, no explanation. If you can't find a clear company name, return exactly: UNKNOWN`;

const IDEAS_SYSTEM = `You are helping a developer generate artifact ideas for cold outreach to a company. An "artifact" is something small (2–8 hours of work) that a candidate can build or write to earn a response from a hiring manager or engineering leader. The artifact should reference something specific the company has published or built — not generic.

You will receive three sources of context:
1. The full job post markdown
2. The company's GitHub org activity (recent repos, releases, languages)
3. The candidate's GitHub profile (their top repos, languages, stars)

Your job: propose exactly 3 artifact ideas. Each idea must:
- Reference something specific from source 1 or 2 (cite it in why_it_lands)
- Be plausibly achievable by the candidate given their skills from source 3
- Take 2–8 hours
- Fall into one of these patterns: teardown, contribution, extension, response, bridge, benchmark, translation, missing piece, steelman

The BEST ideas bridge two sources — e.g. "you said X in the job post, your repo Y does Z, here's an artifact connecting them."

Avoid generic ideas (e.g. "write a blog post about their product"). Specificity is the entire point.

Return only valid JSON, no preamble, no markdown code fences:
{
  "ideas": [
    {
      "title": "short, concrete",
      "pattern": "one of: teardown | contribution | extension | response | bridge | benchmark | translation | missing_piece | steelman",
      "why_it_lands": "one sentence citing the specific thing from the job post or company repos that makes this land",
      "estimated_hours": integer 2-8,
      "what_to_build": "2-3 sentences of concrete scope. What exactly do they build? What does 'done' look like?"
    }
  ]
}`;

const EMAIL_SYSTEM = `You are drafting a cold outreach email for a developer applying to a specific role. The email must not sound like AI wrote it. It should sound like a thoughtful technical person writing to a peer.

Rules:
- Subject line: max 8 words, no exclamation marks, no "quick question", no "re:", no "introducing"
- Body: 110–140 words, 3 short paragraphs
- Paragraph 1: reference one specific thing from the job post OR the company's recent GitHub activity. Not generic. Cite a repo name, a release, a line from the job post, or a specific technical choice. Never say "I'm impressed by your work" or "I've been following your company."
- Paragraph 2: describe the artifact the candidate is building. Frame it as "I'm putting together X because Y" where Y references paragraph 1. Present tense, not "I would build" — it's being made.
- Paragraph 3: link to the proof graph (use the literal placeholder {proof-graph-url}), offer a short call, sign off. No "looking forward to hearing from you." No "best regards."

Voice: direct, specific, zero hype. Write like a smart person explaining to a friend. No "excited," no "passionate," no "thrilled," no "amazing opportunity."

Return only valid JSON, no preamble:
{
  "subject": "string",
  "body": "string with \\n\\n between paragraphs"
}`;

function ideasUser(input: CallInput) {
  const job = (input.jobMarkdown || "").slice(0, 14000);
  const company = (input.companySignalJson || "").slice(0, 14000);
  const candidate = (input.candidateSummary || "").slice(0, 4000);
  return `=== JOB POST ===
${job || "(none provided)"}

=== COMPANY GITHUB ===
${company || "(none provided)"}

=== CANDIDATE GITHUB ===
${candidate || "(none provided)"}`;
}

function emailUser(input: CallInput) {
  const job = (input.jobMarkdown || "").slice(0, 10000);
  const company = (input.companySignalJson || "").slice(0, 10000);
  const candidate = (input.candidateSummary || "").slice(0, 3000);
  const idea = (input.ideaJson || "").slice(0, 2000);
  return `=== JOB POST ===
${job || "(none provided)"}

=== COMPANY GITHUB ===
${company || "(none provided)"}

=== CANDIDATE GITHUB ===
${candidate || "(none provided)"}

=== CHOSEN ARTIFACT IDEA ===
${idea || "(none provided)"}`;
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
        max_tokens: 1500,
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
