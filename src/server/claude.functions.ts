import { createServerFn } from "@tanstack/react-start";

type Mode = "ideas" | "email";

export interface ArtifactIdea {
  title: string;
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
  proofSummary?: string;
  artifactTitle?: string;
  artifactWhatToBuild?: string;
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-5";

function ideasPrompt(jobMarkdown: string) {
  const trimmed = jobMarkdown.slice(0, 12000);
  return {
    system:
      "You suggest small, weekend-sized build projects a job candidate could ship to earn the attention of the hiring team. Be concrete and reference specific phrases from the job post. Reply with ONLY a JSON object — no prose, no markdown fences.",
    user: `Here is a job post (markdown):\n\n${trimmed}\n\nReturn JSON with this exact shape:\n{\n  "ideas": [\n    {\n      "title": "string (max 60 chars)",\n      "why_it_lands": "one sentence referencing something specific from the job post above",\n      "estimated_hours": integer between 2 and 8,\n      "what_to_build": "2-3 sentences of concrete scope"\n    },\n    ... exactly 3 ideas\n  ]\n}`,
  };
}

function emailPrompt(input: CallInput) {
  const job = (input.jobMarkdown || "").slice(0, 8000);
  return {
    system:
      "You draft cold outreach emails for job candidates. Plain, direct, no hype. Reply with ONLY a JSON object — no prose, no markdown fences.",
    user: `Job post (markdown):\n${job}\n\nCandidate proof graph:\n${input.proofSummary}\n\nArtifact the candidate is going to build:\nTitle: ${input.artifactTitle}\nScope: ${input.artifactWhatToBuild}\n\nDraft an email. Return JSON:\n{\n  "subject": "max 8 words, no exclamation marks, no 'quick question'",\n  "body": "110-140 words across 3 short paragraphs separated by a blank line. Paragraph 1 references one specific thing from the job post or target's recent work. Paragraph 2 mentions the artifact, framed as 'I'm putting together X because Y'. Paragraph 3 links to the proof graph using the literal placeholder {proof-graph-url} and offers a short call."\n}`,
  };
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
    if (!input || (input.mode !== "ideas" && input.mode !== "email")) {
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

    const { system, user } =
      data.mode === "ideas" ? ideasPrompt(data.jobMarkdown) : emailPrompt(data);

    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1000,
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
