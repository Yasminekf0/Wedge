// Slop filter — second-pass detector for AI tells in outreach drafts.
// The prompt does most of the work; this is the safety net that catches
// what slips through. Each violation includes a `note` that we feed back to
// the model in a one-shot regeneration.

export type SlopViolationType =
  | "banned_word"
  | "banned_transition"
  | "banned_structure"
  | "banned_closing"
  | "em_dash"
  | "adverb_pileup"
  | "length"
  | "missing_role_reference"
  | "missing_explicit_ask";

export interface SlopViolation {
  type: SlopViolationType;
  /** The actual offending text snippet. */
  evidence: string;
  /** Human-readable note used in the regeneration prompt. */
  note: string;
}

// ---------- ban lists ----------

// Word/phrase bans. Matched case-insensitively with word boundaries.
// Multi-word phrases match as substrings (still case-insensitive).
const BANNED_WORDS: string[] = [
  "delve",
  "delve into",
  "unpack",
  "dive into",
  "explore",
  "leverage",
  "leveraging",
  "synergy",
  "synergies",
  "holistic",
  "navigate",
  "navigating the complexities of",
  "in an ever-changing landscape",
  "signals that",
  "underscores",
  "highlights the importance of",
  "powerful",
  "robust",
  "seamless",
  "cutting-edge",
  "innovative",
  "impactful",
  "passionate",
  "excited",
  "thrilled",
  "eager",
  "enthusiastic",
  "touch base",
  "circle back",
  "ecosystem",
  "landscape",
  "space",
  "journey",
  "unlock",
  "empower",
  "elevate",
  "amplify",
  "foster",
  "cultivate",
  "drive value",
  "move the needle",
  "at the end of the day",
  "ultimately",
  "fundamentally",
  "learnings",
  "takeaways",
];

// Sentence-start transitions to ban.
const BANNED_TRANSITIONS: string[] = [
  "Moreover",
  "Furthermore",
  "Additionally",
  "That said",
  "Importantly",
  "Notably",
  "In conclusion",
  "To summarize",
  "Overall",
];

// Tidy closing phrases. Checked against the LAST sentence of the body.
const BANNED_CLOSINGS: string[] = [
  "looking forward",
  "hear your thoughts",
  "let me know",
  "happy to connect",
  "would love to",
  "hope to hear",
  "at your convenience",
  "whenever works",
  "no pressure",
];

// Adverb-pileup allowlist. These end in -ly but aren't actually adverbs.
const ADVERB_ALLOWLIST = new Set([
  "only",
  "family",
  "daily",
  "really",
  "early",
  "july",
  "italy",
  "ally",
  "rally",
]);

// ---------- helpers ----------

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitSentences(body: string): string[] {
  // Split on sentence terminators while keeping things simple.
  return body
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function countWords(body: string): number {
  return body.split(/\s+/).filter(Boolean).length;
}

// ---------- detector ----------

export type SlopMode = "default" | "blunter" | "warmer";

export function detectSlop(
  email: { subject: string; body: string },
  opts: { mode?: SlopMode; companyName?: string | null; roleTitle?: string | null } = {},
): SlopViolation[] {
  const mode = opts.mode || "default";
  const companyName = (opts.companyName || "").trim();
  const roleTitle = (opts.roleTitle || "").trim();
  const violations: SlopViolation[] = [];
  const subject = email.subject || "";
  const body = email.body || "";
  const haystack = `${subject}\n${body}`;

  // 1. Em-dashes — zero tolerance.
  const emDashCount = (haystack.match(/\u2014/g) || []).length;
  if (emDashCount > 0) {
    violations.push({
      type: "em_dash",
      evidence: "—",
      note: `Found ${emDashCount} em-dash(es). Em-dashes are strictly forbidden. Replace every one with a period, comma, parentheses, or restructure the sentence.`,
    });
  }

  // 2. Banned words / phrases.
  for (const phrase of BANNED_WORDS) {
    let pattern: RegExp;
    if (phrase.includes(" ") || phrase.includes("-")) {
      pattern = new RegExp(escapeRegex(phrase), "i");
    } else {
      pattern = new RegExp(`\\b${escapeRegex(phrase)}\\w*`, "i");
    }
    const m = haystack.match(pattern);
    if (m) {
      violations.push({
        type: "banned_word",
        evidence: m[0],
        note: `Banned word/phrase used: "${m[0]}". Cut it or rephrase.`,
      });
    }
  }

  // 3. Banned sentence-start transitions.
  const sentences = splitSentences(body);
  for (const sentence of sentences) {
    const firstWord = sentence.split(/\s+/)[0]?.replace(/[^\w]/g, "") || "";
    if (!firstWord) continue;
    for (const transition of BANNED_TRANSITIONS) {
      const tFirst = transition.split(/\s+/)[0];
      if (firstWord.toLowerCase() === tFirst.toLowerCase()) {
        if (sentence.toLowerCase().startsWith(transition.toLowerCase())) {
          violations.push({
            type: "banned_transition",
            evidence: transition,
            note: `Sentence starts with banned transition "${transition}". Use a period and a new sentence, or "and"/"but"/"so".`,
          });
        }
      }
    }
  }

  // 4. "Not X but Y" / "Instead of X, Y" structures.
  const notButRe = /\bnot\s+[^.!?,;:]{1,40}(,\s*)?but\s+/i;
  const insteadOfRe = /\binstead of\s+[^.!?,;:]{1,40},?\s+[a-z]/i;
  const m1 = body.match(notButRe);
  if (m1) {
    violations.push({
      type: "banned_structure",
      evidence: m1[0].trim(),
      note: `"Not X but Y" construction detected: "${m1[0].trim()}". Split into two sentences instead.`,
    });
  }
  const m2 = body.match(insteadOfRe);
  if (m2) {
    violations.push({
      type: "banned_structure",
      evidence: m2[0].trim(),
      note: `"Instead of X, Y" construction detected: "${m2[0].trim()}". Rewrite as two plain statements.`,
    });
  }

  // 5. Tidy closing detection.
  const lastSentence = sentences[sentences.length - 1] || "";
  const lastLower = lastSentence.toLowerCase();
  for (const phrase of BANNED_CLOSINGS) {
    if (lastLower.includes(phrase)) {
      violations.push({
        type: "banned_closing",
        evidence: lastSentence,
        note: `Tidy closing detected ("${phrase}"). End on a concrete question, offer, or ask — not a warm wrap-up.`,
      });
      break;
    }
  }

  // 6. Length — bounds depend on the mode.
  const wc = countWords(body);
  if (mode === "blunter") {
    if (wc < 40) {
      violations.push({
        type: "length",
        evidence: `${wc} words`,
        note: `Body is too short for blunter mode (${wc} words). Aim for 50-90 words in a single paragraph.`,
      });
    } else if (wc > 100) {
      violations.push({
        type: "length",
        evidence: `${wc} words`,
        note: `Body is too long for blunter mode (${wc} words). Cut to 50-90 words. Single paragraph only.`,
      });
    }
  } else {
    if (wc < 90) {
      violations.push({
        type: "length",
        evidence: `${wc} words`,
        note: `Body is too short (${wc} words). Aim for 100-150 words, with a hard floor at 90.`,
      });
    } else if (wc > 160) {
      violations.push({
        type: "length",
        evidence: `${wc} words`,
        note: `Body is too long (${wc} words). Cut to 100-150 words by removing the weakest sentence.`,
      });
    }
  }

  // 7. Adverb -ly pileup.
  const lyMatches = body.match(/\b\w+ly\b/gi) || [];
  const lyCount = lyMatches.filter(
    (w) => !ADVERB_ALLOWLIST.has(w.toLowerCase()),
  ).length;
  if (lyCount > 2) {
    violations.push({
      type: "adverb_pileup",
      evidence: lyMatches.join(", "),
      note: `Too many -ly adverbs (${lyCount}). Cut at least ${lyCount - 2} of them; specifics are stronger than adverbs.`,
    });
  }

  // 8. Opening line missing role reference. The opening must signal the
  //    candidate is responding to a specific role at a specific company.
  const bodyLower = body.toLowerCase();
  const ROLE_PHRASES = [
    "came across",
    "saw the opening",
    "saw your opening",
    "reaching out about",
    "wanted to reach out",
    "reach out about",
  ];
  const hasRolePhrase = ROLE_PHRASES.some((p) => bodyLower.includes(p));
  const hasCompanyName =
    companyName.length > 0 && bodyLower.includes(companyName.toLowerCase());
  const hasRoleTitle =
    roleTitle.length > 2 && bodyLower.includes(roleTitle.toLowerCase());
  if (!hasRolePhrase && !hasCompanyName && !hasRoleTitle) {
    violations.push({
      type: "missing_role_reference",
      evidence: body.split(/[.!?]/)[0]?.trim().slice(0, 120) || "(opening)",
      note: `The email must state early that you're writing in response to the specific role at the specific company. The opening should name the role or company, or use a phrase like "came across" or "wanted to reach out about".`,
    });
  }

  // 9. Missing explicit ask. Email must invite a conversation tied to the role.
  const ASK_PHRASES_STRICT = [
    "call",
    "chat",
    "hop on",
    "jump on",
    "15 min",
    "20 min",
    "quick call",
    "open to",
    "available to",
    "if the role",
    "if you're still",
  ];
  const ASK_PHRASES_LOOSE = [
    ...ASK_PHRASES_STRICT,
    "free for",
    "worth a",
    "grab 15",
    "grab 20",
    "talk",
  ];
  const askSet = mode === "blunter" ? ASK_PHRASES_LOOSE : ASK_PHRASES_STRICT;
  const hasAsk = askSet.some((p) => bodyLower.includes(p));
  if (!hasAsk) {
    const lastSentence = sentences[sentences.length - 1] || "(end of body)";
    violations.push({
      type: "missing_explicit_ask",
      evidence: lastSentence.slice(0, 120),
      note: `The email needs a clear invitation to a call or conversation, tied to whether the role is still open. Add a sentence like "Would love to hop on a quick call if the role is still open."`,
    });
  }

  return violations;
}

// Build the regeneration instruction to append to the user message.
export function slopRegenInstruction(
  violations: SlopViolation[],
  opts: { mode?: SlopMode } = {},
): string {
  const mode = opts.mode || "default";
  const lines = violations.map((v) => `- ${v.note} (offending: "${v.evidence}")`);
  const structureReminder =
    mode === "blunter"
      ? "Keep the blunter structure (single paragraph, 50-90 words, opens with the greeting + role/company reference, closes with the ask and \"Thanks, {first name}\", proof graph link still introduced in plain language before the URL)"
      : mode === "warmer"
        ? "Keep the warmer structure (full template with greeting, opening line naming the role and company, optional self-intro from the pitch, technical hook, the one specific appreciation sentence, artifact description, proof graph intro + link, explicit ask, sign-off)"
        : "Keep the full template (greeting, opening line naming the role and company, optional self-intro from the pitch, technical hook, artifact description, proof graph intro + link, explicit ask, \"Thanks,\" + first name)";
  return `Your previous draft had these problems:\n\n${lines.join("\n")}\n\nRewrite the email fixing these specific issues. ${structureReminder}. Keep the artifact reference, keep the proof graph link, keep the voice direct and specific. Do not add new AI-sounding language in the process of fixing the old one.\n\nReturn only valid JSON.`;
}
