import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import * as React from "react";
import { CompanySignalView } from "@/components/wedge/CompanySignalView";
import { IdeaBlock } from "@/components/wedge/IdeaBlock";
import { ProofGraph } from "@/components/proof-graph/ProofGraph";
import { exampleProfile } from "@/components/proof-graph/exampleProfile";
import {
  ErrorLine,
  Field,
  Section,
  SkeletonRows,
} from "@/components/wedge/primitives";
import {
  fetchCompanySignal,
  getRateLimitRemaining,
  resolveGitHubOrg,
  type CompanySignal,
  type ResolvedOrg,
} from "@/lib/github";
import { fetchCompanyBlog, extractDomain, type BlogSignal } from "@/lib/blog";
import { fetchHNSignal, type HNSignal } from "@/lib/hn";
import { callClaude, type ArtifactIdea } from "@/server/claude.functions";
import { validateCitations } from "@/lib/validation";
import { detectSlop, slopRegenInstruction, type SlopMode } from "@/lib/slopFilter";
import { candidateSummaryFromProfile } from "@/lib/candidateFromProfile";

// Candidate identity is sourced from the proof graph, not a live GitHub fetch.
const CANDIDATE_SUMMARY = candidateSummaryFromProfile(exampleProfile);
const CANDIDATE_FIRST_NAME = exampleProfile.header.name.split(" ")[0] || "";

// ---------- voice modes ----------

const BLUNTER_INSTRUCTION = `Rewrite this as a single paragraph. 50-90 words total. No three-paragraph structure. No separate greeting or signoff line on its own — the greeting opens the paragraph, the signoff closes it. One continuous block.

Keep these beats in order, fused into one paragraph:
1. "Hi {name}, I came across the {role} at {company} and wanted to reach out." (or "Hi there," if no target name)
2. If a candidate pitch was provided, one quick clause using it (verbatim or near-verbatim, no corporate rewording). If no pitch, skip.
3. One specific citation reference (post title, repo name, release tag, or exact job-post phrase) — by name, not generic.
4. One clause on what you built or are building, tied to the citation.
5. One clause introducing the proof graph in plain language before the URL. Do not drop the URL naked. Example: "instead of a CV, here's a page that links to the actual code behind every claim: {proof-graph-url}".
6. One clause asking for a call if the role is still open. The ask must survive the compression — never cut it.
7. End with "Thanks, {first name}" as the final clause/sentence.

Short sentences. Zero adverbs. Zero em-dashes (still banned). No hedges, no filler, no tidy closer. It should feel like a fast email someone typed on their phone between meetings.

Return the same JSON shape: { subject, body }. Body is one paragraph, no \\n\\n breaks.`;

const WARMER_INSTRUCTION = `Rewrite this keeping the FULL template structure (greeting, opening line naming role + company, optional self-intro from pitch, technical hook, artifact description, proof graph intro + link, explicit ask, "Thanks," + first name), but add ONE sentence of specific appreciation for what the company is working on.

Rules for the appreciation sentence:
- Place it between the technical hook (step 4) and the artifact description (step 5).
- It must name something specific the company is doing — cite a product direction, a technical bet, a recent launch, or something concrete from the company signal. Not "I love what you're doing" (meaningless). Something like: "The direction you're taking with {specific thing} is one of the more interesting bets in {specific space}, and it's part of why I wanted to reach out."
- One sentence maximum. Specific, not gushing.
- Cannot use any banned vocabulary (excited, passionate, thrilled, amazing, powerful, etc.). Warmth comes from specificity, not hype.

Keep everything else in the template. The opening line still states the role and intent to reach out. The explicit ask still closes the email. The proof graph intro still appears in plain language before the URL. 100-150 words in the body.

Return the same JSON shape: { subject, body }.`;

function instructionForMode(mode: SlopMode): string | undefined {
  if (mode === "blunter") return BLUNTER_INSTRUCTION;
  if (mode === "warmer") return WARMER_INSTRUCTION;
  return undefined;
}

export const Route = createFileRoute("/outreach")({
  component: WedgePage,
  head: () => ({
    meta: [
      { title: "Outreach — Wedge" },
      {
        name: "description",
        content:
          "Cold outreach that references something you actually built for them.",
      },
    ],
  }),
});

interface EmailDraft {
  subject: string;
  body: string;
}

type ResolveStage =
  | "idle"
  | "reading"
  | "identifying"
  | "finding"
  | "done";

// ---------- helpers ----------

function isValidUrl(s: string) {
  if (!s.startsWith("https://") && !s.startsWith("http://")) return false;
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

async function fetchJobMarkdown(url: string): Promise<string> {
  const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`Jina ${res.status}`);
  return res.text();
}

function summariseCandidate(p: CandidateProof | null): string {
  if (!p) return "(no public GitHub profile available)";
  const repos = p.topRepos
    .slice(0, 5)
    .map(
      (r) =>
        `- ${r.name} (★${r.stargazers_count}, ${r.language || "unknown"}): ${r.description || "no description"}`,
    )
    .join("\n");
  return `Handle: @${p.user.login}
Followers: ${p.user.followers}
Public repos: ${p.user.public_repos}
Total stars: ${p.totalStars}
Top languages overall: ${p.topLanguages.join(", ") || "—"}
Top repos:
${repos || "—"}`;
}

const RESOLVE_LABEL: Record<Exclude<ResolveStage, "idle" | "done">, string> = {
  reading: "RESOLVING · reading job post",
  identifying: "RESOLVING · identifying company",
  finding: "RESOLVING · finding github org",
};

// ---------- page ----------

function WedgePage() {
  const callClaudeFn = useServerFn(callClaude);

  const [jobUrl, setJobUrl] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [urlError, setUrlError] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [longLoading, setLongLoading] = React.useState(false);
  const [hasResults, setHasResults] = React.useState(false);
  const [ideasStage, setIdeasStage] = React.useState<
    "idle" | "verifying" | "regenerating"
  >("idle");
  const [shortIdeasNote, setShortIdeasNote] = React.useState<string | null>(null);

  // Resolution state
  const [resolveStage, setResolveStage] = React.useState<ResolveStage>("idle");
  const [resolved, setResolved] = React.useState<ResolvedOrg | null>(null);
  const [companyName, setCompanyName] = React.useState<string | null>(null);
  const [handleOverride, setHandleOverride] = React.useState("");

  // Per-source state
  const [companyState, setCompanyState] = React.useState<
    "idle" | "loading" | "missing" | "ready"
  >("idle");
  const [company, setCompany] = React.useState<CompanySignal | null>(null);
  const [blog, setBlog] = React.useState<BlogSignal | null>(null);
  const [hn, setHn] = React.useState<HNSignal | null>(null);
  const [rateLow, setRateLow] = React.useState(false);

  const [proofState, setProofState] = React.useState<
    "idle" | "loading" | "missing" | "skipped" | "ready"
  >("idle");
  const [proof, setProof] = React.useState<CandidateProof | null>(null);

  const [jobMd, setJobMd] = React.useState<string>("");
  const [jobFailed, setJobFailed] = React.useState(false);

  const [ideas, setIdeas] = React.useState<ArtifactIdea[] | null>(null);
  const [ideasError, setIdeasError] = React.useState(false);

  const [email, setEmail] = React.useState<EmailDraft | null>(null);
  const [emailError, setEmailError] = React.useState(false);
  const [emailLoading, setEmailLoading] = React.useState(false);
  const [emailStage, setEmailStage] = React.useState<
    "idle" | "drafting" | "checking" | "rewriting"
  >("idle");
  const [slopHint, setSlopHint] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [copiedSubject, setCopiedSubject] = React.useState(false);

  // Artifact selection + voice mode
  const [selectedIdeaIndex, setSelectedIdeaIndex] = React.useState<number | null>(
    null,
  );
  const [voiceMode, setVoiceMode] = React.useState<SlopMode>("default");
  const outreachRef = React.useRef<HTMLDivElement>(null);
  const [proofExpanded, setProofExpanded] = React.useState(false);

  // Long-loading label timer
  React.useEffect(() => {
    if (!loading) {
      setLongLoading(false);
      return;
    }
    const t = setTimeout(() => setLongLoading(true), 8000);
    return () => clearTimeout(t);
  }, [loading]);

  async function generateEmail(
    jobMarkdown: string,
    p: CandidateProof | null,
    c: CompanySignal | null,
    idea: ArtifactIdea,
    mode: SlopMode = "default",
  ) {
    setEmailError(false);
    setEmailLoading(true);
    setSlopHint(null);
    setEmailStage("drafting");
    const voiceInstruction = instructionForMode(mode);
    const candidateName = p?.user?.login || "";
    const baseData = {
      mode: "email" as const,
      jobMarkdown,
      companySignalJson: c ? JSON.stringify(c, null, 2) : "",
      candidateSummary: summariseCandidate(p),
      ideaJson: JSON.stringify(idea, null, 2),
      companyName: companyName || c?.org?.name || "",
      targetName: target.trim(),
      candidatePitch: "",
      candidateName,
    };
    // Best-effort role title for the slop filter — first ~6 words from job post H1.
    const roleTitle =
      jobMarkdown
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("# "))
        ?.replace(/^#\s+/, "")
        .split(/\s+/)
        .slice(0, 6)
        .join(" ") || "";
    try {
      const res = await callClaudeFn({
        data: voiceInstruction
          ? { ...baseData, extraUserInstruction: voiceInstruction }
          : baseData,
      });
      if (res.mode !== "email") return;

      let draft = { subject: res.subject, body: res.body };

      // Slop filter — one-shot correction loop.
      setEmailStage("checking");
      const violations = detectSlop(draft, {
        mode,
        companyName: baseData.companyName,
        roleTitle,
      });
      if (violations.length > 0) {
        setEmailStage("rewriting");
        try {
          const fixInstruction = [
            voiceInstruction || "",
            slopRegenInstruction(violations, { mode }),
          ]
            .filter(Boolean)
            .join("\n\n");
          const res2 = await callClaudeFn({
            data: { ...baseData, extraUserInstruction: fixInstruction },
          });
          if (res2.mode === "email") {
            draft = { subject: res2.subject, body: res2.body };
            const second = detectSlop(draft, {
              mode,
              companyName: baseData.companyName,
              roleTitle,
            });
            if (second.length > 0) {
              setSlopHint(
                "Draft may still read slightly generic — tap Regenerate or edit before sending.",
              );
            }
          }
        } catch (e) {
          console.error("slop regen failed", e);
        }
      }

      setEmail(draft);
    } catch (e) {
      console.error(e);
      setEmailError(true);
    } finally {
      setEmailLoading(false);
      setEmailStage("idle");
    }
  }

  async function runIdeasAndEmail(
    jobMarkdown: string,
    c: CompanySignal | null,
    p: CandidateProof | null,
    b: BlogSignal | null,
    h: HNSignal | null,
  ) {
    let firstIdea: ArtifactIdea | null = null;
    setShortIdeasNote(null);
    const sources = {
      companySignal: c,
      blogSignal: b,
      hnSignal: h,
      jobPostMarkdown: jobMarkdown,
      candidateProfile: p,
    };
    try {
      const res = await callClaudeFn({
        data: {
          mode: "ideas",
          jobMarkdown,
          companySignalJson: c ? JSON.stringify(c, null, 2) : "",
          blogSignalJson: b ? JSON.stringify(b, null, 2) : "",
          hnSignalJson: h ? JSON.stringify(h, null, 2) : "",
          candidateSummary: summariseCandidate(p),
        },
      });
      let validated: ArtifactIdea[] = [];
      if (res.mode === "ideas") {
        setIdeasStage("verifying");
        validated = validateCitations(res.ideas, sources);
      }

      // Regenerate once if validation left fewer than 3 ideas.
      if (validated.length < 3) {
        setIdeasStage("regenerating");
        const need = 3 - validated.length;
        try {
          const res2 = await callClaudeFn({
            data: {
              mode: "ideas",
              jobMarkdown,
              companySignalJson: c ? JSON.stringify(c, null, 2) : "",
              blogSignalJson: b ? JSON.stringify(b, null, 2) : "",
              hnSignalJson: h ? JSON.stringify(h, null, 2) : "",
              candidateSummary: summariseCandidate(p),
              extraUserInstruction: `Your previous response contained ideas with fabricated or unverifiable citations, which have been dropped. Generate ${need} more ideas, grounded only in the sources provided. Do not invent citations.`,
            },
          });
          if (res2.mode === "ideas") {
            const more = validateCitations(res2.ideas, sources);
            // Merge by title to avoid duplicates from the same idea pool.
            const seen = new Set(validated.map((i) => i.title.toLowerCase()));
            for (const m of more) {
              if (!seen.has(m.title.toLowerCase())) {
                validated.push(m);
                seen.add(m.title.toLowerCase());
              }
              if (validated.length >= 3) break;
            }
          }
        } catch (e) {
          console.error("regeneration failed", e);
        }
      }

      validated = validated.slice(0, 3);
      setIdeas(validated);
      if (validated.length > 0 && validated.length < 3) {
        setShortIdeasNote(
          `Only ${validated.length} idea${validated.length === 1 ? "" : "s"} with verifiable citations this run. Regenerate to try again.`,
        );
      }
      if (validated.length === 0) {
        setIdeasError(true);
      } else {
        firstIdea = validated[0];
      }
    } catch (e) {
      console.error(e);
      setIdeasError(true);
    } finally {
      setIdeasStage("idle");
    }

    // Selection drives outreach: do NOT auto-generate the email here.
    // Section 04 stays empty until the user picks an artifact.
    void firstIdea;
  }

  async function handleGenerate() {
    if (!isValidUrl(jobUrl)) {
      setUrlError("Needs a full URL starting with https://");
      return;
    }
    setUrlError(null);

    const ghTrim = SASHA_GH;

    setHasResults(true);
    setLoading(true);
    setRateLow(false);

    setResolveStage("reading");
    setResolved(null);
    setCompanyName(null);
    setHandleOverride("");

    setCompanyState("idle");
    setCompany(null);
    setBlog(null);
    setHn(null);
    setProofState("loading");
    setProof(null);
    setJobMd("");
    setJobFailed(false);
    setIdeas(null);
    setIdeasError(false);
    setEmail(null);
    setEmailError(false);
    setSelectedIdeaIndex(null);
    setVoiceMode("default");

    // ---------- Step 0a: Jina ----------
    let jobMarkdown = "";
    try {
      jobMarkdown = await fetchJobMarkdown(jobUrl);
      setJobMd(jobMarkdown);
    } catch (e) {
      console.error(e);
      setJobFailed(true);
      setResolveStage("idle");
      setLoading(false);
      return;
    }

    // ---------- Step 0b: extract company name ----------
    setResolveStage("identifying");
    let extractedName: string | null = null;
    try {
      const ext = await callClaudeFn({
        data: { mode: "extract_company", jobMarkdown },
      });
      if (ext.mode === "extract_company") extractedName = ext.company;
    } catch (e) {
      console.error("extract_company failed", e);
    }
    setCompanyName(extractedName);

    // ---------- Step 0c: resolve org ----------
    let orgResolved: ResolvedOrg | null = null;
    if (extractedName) {
      setResolveStage("finding");
      try {
        orgResolved = await resolveGitHubOrg(extractedName);
      } catch (e) {
        console.error("resolveGitHubOrg failed", e);
      }
    }
    setResolved(orgResolved);
    setHandleOverride(orgResolved?.handle ?? "");
    setResolveStage("done");

    // ---------- Step 1: parallel fan-out ----------
    if (orgResolved) {
      setCompanyState("loading");
    }

    const companyP: Promise<CompanySignal | null> = orgResolved
      ? fetchCompanySignal(orgResolved.handle)
          .then((c) => {
            if (!c) {
              setCompanyState("missing");
              return null;
            }
            setCompany(c);
            setCompanyState("ready");
            return c;
          })
          .catch((e) => {
            console.error(e);
            setCompanyState("missing");
            return null;
          })
      : Promise.resolve(null);

    const proofP: Promise<CandidateProof | null> = fetchCandidateProof(ghTrim)
      .then((p) => {
        if (!p) {
          setProofState("missing");
          return null;
        }
        setProof(p);
        setProofState("ready");
        return p;
      })
      .catch((e) => {
        console.error(e);
        setProofState("missing");
        return null;
      });

    // Blog + HN: kick off in parallel. Domain is best-effort: prefer the
    // org's `blog` field once company resolves, otherwise fall back to the
    // job post URL's host.
    const jobDomain = extractDomain(jobUrl);
    const blogP: Promise<BlogSignal | null> = extractedName
      ? companyP
          .then((c) =>
            fetchCompanyBlog({
              companyName: extractedName!,
              orgBlogUrl: c?.org.blog ?? null,
              orgWebsiteDomain:
                extractDomain(c?.org.blog ?? null) || jobDomain,
            }),
          )
          .then((b) => {
            setBlog(b);
            return b;
          })
          .catch((e) => {
            console.error("blog fetch failed", e);
            return null;
          })
      : Promise.resolve(null);

    const hnP: Promise<HNSignal | null> = extractedName
      ? companyP
          .then((c) =>
            fetchHNSignal({
              companyName: extractedName!,
              orgWebsiteDomain:
                extractDomain(c?.org.blog ?? null) || jobDomain,
            }),
          )
          .then((h) => {
            setHn(h);
            return h;
          })
          .catch((e) => {
            console.error("hn fetch failed", e);
            return null;
          })
      : Promise.resolve(null);

    const [c, p, b, h] = await Promise.all([companyP, proofP, blogP, hnP]);

    const remaining = getRateLimitRemaining();
    if (remaining !== null && remaining < 5) setRateLow(true);

    // ---------- Step 2: ideas + email ----------
    await runIdeasAndEmail(jobMarkdown, c, p, b, h);
    setLoading(false);
  }

  /**
   * Re-fetch only company signal for a user-supplied handle, then regenerate
   * ideas + email. Keeps job post and candidate profile in memory.
   */
  async function rerunWithHandle(handle: string) {
    const h = handle.trim();
    if (!h || !jobMd) return;
    setLoading(true);
    setIdeas(null);
    setIdeasError(false);
    setEmail(null);
    setEmailError(false);
    setCompanyState("loading");
    setCompany(null);
    setBlog(null);
    setHn(null);

    let c: CompanySignal | null = null;
    try {
      c = await fetchCompanySignal(h);
      if (!c) {
        setCompanyState("missing");
      } else {
        setCompany(c);
        setCompanyState("ready");
      }
    } catch (e) {
      console.error(e);
      setCompanyState("missing");
    }

    // Update the resolved indicator to reflect the user's correction.
    setResolved({
      handle: h,
      confidence: "high",
      name: c?.org.name ?? h,
    });

    // Re-fetch blog + HN against the corrected org/domain in parallel.
    const jobDomain = extractDomain(jobUrl);
    const nameForFetch = companyName || c?.org.name || h;
    const domainForFetch = extractDomain(c?.org.blog ?? null) || jobDomain;
    const [b, hSig] = await Promise.all([
      fetchCompanyBlog({
        companyName: nameForFetch,
        orgBlogUrl: c?.org.blog ?? null,
        orgWebsiteDomain: domainForFetch,
      })
        .then((x) => {
          setBlog(x);
          return x;
        })
        .catch(() => null),
      fetchHNSignal({
        companyName: nameForFetch,
        orgWebsiteDomain: domainForFetch,
      })
        .then((x) => {
          setHn(x);
          return x;
        })
        .catch(() => null),
    ]);

    const remaining = getRateLimitRemaining();
    if (remaining !== null && remaining < 5) setRateLow(true);

    await runIdeasAndEmail(jobMd, c, proof, b, hSig);
    setLoading(false);
  }

  async function regenerateIdeas() {
    setIdeasError(false);
    setIdeas(null);
    setShortIdeasNote(null);
    await runIdeasAndEmail(jobMd, company, proof, blog, hn);
  }

  // The currently-selected idea, or null when none picked.
  const selectedIdea =
    ideas && selectedIdeaIndex !== null ? ideas[selectedIdeaIndex] ?? null : null;

  async function selectIdea(i: number) {
    if (!ideas || i < 0 || i >= ideas.length) return;
    setSelectedIdeaIndex(i);
    // Reset to default mode whenever the artifact changes — modes are tied
    // to a single drafting context.
    setVoiceMode("default");
    // Scroll Section 04 into view (small delay so the empty-state -> draft
    // swap doesn't cause a jarring jump).
    requestAnimationFrame(() => {
      outreachRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    await generateEmail(jobMd, proof, company, ideas[i], "default");
  }

  async function regenerateEmail() {
    if (!selectedIdea) return;
    await generateEmail(jobMd, proof, company, selectedIdea, voiceMode);
  }

  async function setMode(next: SlopMode) {
    if (!selectedIdea) return;
    setVoiceMode(next);
    await generateEmail(jobMd, proof, company, selectedIdea, next);
  }

  async function copyEmail() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  async function copySubject() {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email.subject);
      setCopiedSubject(true);
      setTimeout(() => setCopiedSubject(false), 1600);
    } catch {
      /* ignore */
    }
  }

  // Section numbering: company section is conditional.
  // It renders if we have a resolved org OR a correction-prompt to show
  // (which appears whenever resolveStage === "done" and we attempted resolution).
  const showCompanySection = resolveStage === "done" || companyState !== "idle";
  const n = (i: number) => String(i).padStart(2, "0");
  let idx = 0;
  const companyNum = showCompanySection ? n(++idx) : "";
  const proofNum = n(++idx);
  const ideasNum = n(++idx);
  const emailNum = n(++idx);

  const hideJobDriven = jobFailed;

  // Inline correction input (used in three places).
  const correctionInput = (
    <span className="inline-flex items-center gap-2 align-middle">
      <input
        type="text"
        value={handleOverride}
        onChange={(e) => setHandleOverride(e.target.value)}
        placeholder="org-handle"
        className="mono h-7 w-[140px] rounded-sm border border-border bg-transparent px-2 text-[13px] text-foreground outline-none focus:border-muted-fg"
      />
      <button
        type="button"
        onClick={() => rerunWithHandle(handleOverride)}
        disabled={loading || !handleOverride.trim()}
        className="mono text-[12px] uppercase tracking-wider text-foreground underline-offset-4 hover:underline disabled:opacity-40"
      >
        Rerun
      </button>
    </span>
  );

  return (
    <main className="mx-auto w-full max-w-[720px] px-6 pt-24 pb-32">
      {/* Wordmark */}
      <div className="mono text-[28px] font-medium tracking-wide text-muted-fg">
        wedge
      </div>

      <p className="mt-10 text-[20px] leading-snug text-foreground">
        Cold outreach that references something you actually built for them.
      </p>
      <p className="mt-3 text-[15px] text-muted-fg">
        Paste a job post. We'll read it, pull the company's GitHub activity and your
        proof graph, then suggest what to build before you write.
      </p>

      {/* Inputs */}
      <div className="mt-16 space-y-4">
        <Field
          label="Job post URL"
          value={jobUrl}
          onChange={setJobUrl}
          placeholder="https://example.com/jobs/staff-engineer"
          error={urlError}
        />
        <Field
          label="Target name (optional)"
          value={target}
          onChange={setTarget}
          placeholder="VP Eng, hiring manager, etc."
        />

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="mt-2 mono h-11 w-full rounded-md bg-accent text-[13px] font-medium tracking-wider uppercase text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? ideasStage === "regenerating"
              ? "Regenerating grounded ideas..."
              : ideasStage === "verifying"
                ? "Verifying sources..."
                : longLoading
                  ? "Still working..."
                  : "Working..."
            : "Generate"}
        </button>
      </div>

      {/* Output */}
      {hasResults && (
        <div className="mt-24 space-y-20">
          {/* Resolver progress line (only during step 0) */}
          {resolveStage !== "idle" && resolveStage !== "done" && (
            <div className="label-mono">{RESOLVE_LABEL[resolveStage]}</div>
          )}

          {/* 01 — Company Signal (only if we attempted resolution) */}
          {showCompanySection && (
            <Section header={`${companyNum} / Company Signal`}>
              {/* Resolution status line */}
              {resolveStage === "done" && (
                <div className="mb-6 text-[13px] text-muted-fg">
                  {resolved && resolved.confidence === "high" && (
                    <span>
                      Found {resolved.name ?? resolved.handle} on GitHub as{" "}
                      <span className="mono text-foreground">@{resolved.handle}</span>.
                    </span>
                  )}
                  {resolved && resolved.confidence === "medium" && (
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-2">
                      Best guess:{" "}
                      <span className="mono text-foreground">@{resolved.handle}</span>.
                      If that's wrong, the company signal below will be off — tell me
                      the right handle and I'll rerun. {correctionInput}
                    </span>
                  )}
                  {!resolved && companyName && (
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-2">
                      Couldn't find a GitHub org for "{companyName}". The artifact
                      ideas below won't have company-specific signal — paste a handle
                      to add it: {correctionInput}
                    </span>
                  )}
                  {!resolved && !companyName && (
                    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-2">
                      Couldn't identify the company from the job post. Add a GitHub
                      org handle to get company signal: {correctionInput}
                    </span>
                  )}
                </div>
              )}

              {companyState === "loading" ? (
                <SkeletonRows />
              ) : companyState === "missing" ? (
                <p className="mono text-[13px] text-muted-fg">
                  No public GitHub org found for @{resolved?.handle ?? handleOverride}.
                </p>
              ) : company ? (
                <CompanySignalView signal={company} blog={blog} hn={hn} rateLow={rateLow} />
              ) : null}
            </Section>
          )}

          {/* Proof Graph — small preview by default, expandable to fullscreen. */}
          <Section header={`${proofNum} / Proof Graph`}>
            <div className="relative">
              {/* Small, non-interactive preview */}
              <div
                className="pointer-events-none relative h-[280px] overflow-hidden rounded-md border border-border bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_*]:[scrollbar-width:none] [&_*::-webkit-scrollbar]:hidden"
                aria-hidden="true"
              >
                <div
                  className="origin-top-left"
                  style={{ transform: "scale(0.32)", width: "312.5%" }}
                >
                  <ProofGraph profile={{ ...exampleProfile, jobLoaded: true }} />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent" />
              </div>
              <button
                type="button"
                onClick={() => setProofExpanded(true)}
                className="mono absolute top-3 right-3 rounded-md border border-border bg-background/90 px-3 py-1.5 text-[11px] uppercase tracking-wider text-foreground backdrop-blur transition-colors hover:bg-foreground/5"
              >
                Expand
              </button>
            </div>

            {proofExpanded && (
              <div className="fixed inset-0 z-50 overflow-auto bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&_*]:[scrollbar-width:none] [&_*::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setProofExpanded(false)}
                  className="mono fixed top-4 right-4 z-10 rounded-md border border-border bg-background/90 px-3 py-1.5 text-[11px] uppercase tracking-wider text-foreground backdrop-blur transition-colors hover:bg-foreground/5"
                >
                  Collapse
                </button>
                <ProofGraph profile={{ ...exampleProfile, jobLoaded: true }} />
              </div>
            )}
          </Section>

          {/* Artifact Ideas */}
          <Section header={`${ideasNum} / Artifact Ideas`}>
            {hideJobDriven ? (
              <p className="text-[14px] text-muted-fg">
                Couldn't read the job post. Check the URL?
              </p>
            ) : ideasError ? (
              <ErrorLine onRetry={regenerateIdeas} />
            ) : !ideas ? (
              <SkeletonRows />
            ) : (
              <div className="space-y-10">
                {ideas.map((idea, i) => (
                  <IdeaBlock
                    key={i}
                    index={i + 1}
                    idea={idea}
                    selected={selectedIdeaIndex === i}
                    onSelect={() => selectIdea(i)}
                  />
                ))}
                {shortIdeasNote && (
                  <p className="mono text-[11px] uppercase tracking-wider text-tertiary-fg">
                    {shortIdeasNote}
                  </p>
                )}
              </div>
            )}
          </Section>

          {/* Outreach Draft */}
          <div ref={outreachRef}>
            <Section header={`${emailNum} / Outreach Draft`}>
              {hideJobDriven ? (
                <p className="text-[14px] text-muted-fg">
                  Couldn't read the job post. Check the URL?
                </p>
              ) : !selectedIdea && !email ? (
                <p className="text-[15px] text-tertiary-fg">
                  Pick an artifact above and the outreach drafts here.
                </p>
              ) : emailError ? (
                <ErrorLine onRetry={regenerateEmail} />
              ) : !email ? (
                <SkeletonRows />
              ) : (
                <div className="relative">
                  {emailLoading && (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end bg-background/60 pt-2 backdrop-blur-[1px]">
                      <span className="mono text-[11px] uppercase tracking-wider text-muted-fg">
                        {emailStage === "rewriting"
                          ? "Rewriting..."
                          : emailStage === "checking"
                            ? "Verifying voice..."
                            : "Working..."}
                      </span>
                    </div>
                  )}
                  <div className={emailLoading ? "opacity-60" : undefined}>
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="label-mono">Subject:</span>
                      <span className="text-[16px] text-foreground">
                        {email.subject}
                      </span>
                    </div>
                    <pre className="mono mt-6 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
                      {email.body}
                    </pre>
                    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <button
                        type="button"
                        onClick={copyEmail}
                        className="mono text-[13px] font-medium uppercase tracking-wider text-accent transition-opacity hover:opacity-80"
                      >
                        {copied ? "Copied" : "Copy"}
                      </button>
                      <button
                        type="button"
                        onClick={copySubject}
                        className="mono text-[13px] uppercase tracking-wider text-tertiary-fg transition-colors hover:text-foreground"
                      >
                        {copiedSubject ? "Copied subject" : "Copy subject"}
                      </button>
                      <button
                        type="button"
                        onClick={regenerateEmail}
                        disabled={emailLoading}
                        className="mono text-[13px] font-medium uppercase tracking-wider text-accent transition-opacity hover:opacity-80 disabled:opacity-40"
                      >
                        {emailLoading
                          ? emailStage === "rewriting"
                            ? "Rewriting..."
                            : emailStage === "checking"
                              ? "Verifying voice..."
                              : "Working..."
                          : "Regenerate"}
                      </button>
                      <span className="mono text-[13px] text-tertiary-fg select-none">·</span>
                      <button
                        type="button"
                        onClick={() => setMode(voiceMode === "blunter" ? "default" : "blunter")}
                        disabled={emailLoading}
                        className={[
                          "mono text-[13px] uppercase tracking-wider transition-colors disabled:opacity-40",
                          voiceMode === "blunter"
                            ? "text-accent underline underline-offset-4"
                            : "text-tertiary-fg hover:text-foreground",
                        ].join(" ")}
                      >
                        Blunter
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode(voiceMode === "warmer" ? "default" : "warmer")}
                        disabled={emailLoading}
                        className={[
                          "mono text-[13px] uppercase tracking-wider transition-colors disabled:opacity-40",
                          voiceMode === "warmer"
                            ? "text-accent underline underline-offset-4"
                            : "text-tertiary-fg hover:text-foreground",
                        ].join(" ")}
                      >
                        Warmer
                      </button>
                    </div>
                    {slopHint && (
                      <p className="mono mt-3 text-[11px] uppercase tracking-wider text-tertiary-fg">
                        {slopHint}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </Section>
          </div>
        </div>
      )}
    </main>
  );
}
