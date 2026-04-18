import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import * as React from "react";
import { CompanySignalView } from "@/components/wedge/CompanySignalView";
import { IdeaBlock } from "@/components/wedge/IdeaBlock";
import { ProofGraphView } from "@/components/wedge/ProofGraphView";
import {
  ErrorLine,
  Field,
  Section,
  SkeletonRows,
} from "@/components/wedge/primitives";
import {
  fetchCandidateProof,
  fetchCompanySignal,
  getRateLimitRemaining,
  type CandidateProof,
  type CompanySignal,
} from "@/lib/github";
import { callClaude, type ArtifactIdea } from "@/server/claude.functions";

export const Route = createFileRoute("/")({
  component: WedgePage,
});

interface EmailDraft {
  subject: string;
  body: string;
}

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

// ---------- page ----------

function WedgePage() {
  const callClaudeFn = useServerFn(callClaude);

  const [jobUrl, setJobUrl] = React.useState("");
  const [ghUser, setGhUser] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [companyOrg, setCompanyOrg] = React.useState("");
  const [urlError, setUrlError] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [longLoading, setLongLoading] = React.useState(false);
  const [hasResults, setHasResults] = React.useState(false);
  const [showCompanySection, setShowCompanySection] = React.useState(false);
  const [orgLabel, setOrgLabel] = React.useState("");

  // Per-source state
  const [companyState, setCompanyState] = React.useState<
    "idle" | "loading" | "missing" | "ready"
  >("idle");
  const [company, setCompany] = React.useState<CompanySignal | null>(null);
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
  const [copied, setCopied] = React.useState(false);

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
  ) {
    setEmailError(false);
    setEmailLoading(true);
    try {
      const res = await callClaudeFn({
        data: {
          mode: "email",
          jobMarkdown,
          companySignalJson: c ? JSON.stringify(c, null, 2) : "",
          candidateSummary: summariseCandidate(p),
          ideaJson: JSON.stringify(idea, null, 2),
        },
      });
      if (res.mode === "email") {
        setEmail({ subject: res.subject, body: res.body });
      }
    } catch (e) {
      console.error(e);
      setEmailError(true);
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleGenerate() {
    if (!isValidUrl(jobUrl)) {
      setUrlError("Needs a full URL starting with https://");
      return;
    }
    setUrlError(null);

    const orgTrim = companyOrg.trim();
    const ghTrim = ghUser.trim();

    setHasResults(true);
    setLoading(true);
    setShowCompanySection(orgTrim.length > 0);
    setOrgLabel(orgTrim);
    setRateLow(false);

    setCompanyState(orgTrim ? "loading" : "idle");
    setCompany(null);
    setProofState(ghTrim ? "loading" : "skipped");
    setProof(null);
    setJobMd("");
    setJobFailed(false);
    setIdeas(null);
    setIdeasError(false);
    setEmail(null);
    setEmailError(false);

    // Kick off all three fetches in parallel.
    const jobP = fetchJobMarkdown(jobUrl)
      .then((md) => {
        setJobMd(md);
        return md;
      })
      .catch((e) => {
        console.error(e);
        setJobFailed(true);
        return "";
      });

    const companyP = orgTrim
      ? fetchCompanySignal(orgTrim)
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

    const proofP = ghTrim
      ? fetchCandidateProof(ghTrim)
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
          })
      : Promise.resolve(null);

    const [jobMarkdown, c, p] = await Promise.all([jobP, companyP, proofP]);

    // After GitHub calls land, check rate limit.
    const remaining = getRateLimitRemaining();
    if (remaining !== null && remaining < 5) setRateLow(true);

    // If the job post failed, hide sections 03/04 by leaving ideas null
    // and surfacing the message via jobFailed.
    if (!jobMarkdown) {
      setLoading(false);
      return;
    }

    // Ideas
    let firstIdea: ArtifactIdea | null = null;
    try {
      const res = await callClaudeFn({
        data: {
          mode: "ideas",
          jobMarkdown,
          companySignalJson: c ? JSON.stringify(c, null, 2) : "",
          candidateSummary: summariseCandidate(p),
        },
      });
      if (res.mode === "ideas") {
        setIdeas(res.ideas);
        firstIdea = res.ideas[0] ?? null;
      }
    } catch (e) {
      console.error(e);
      setIdeasError(true);
    }

    setLoading(false);

    if (firstIdea) {
      await generateEmail(jobMarkdown, p, c, firstIdea);
    }
  }

  async function regenerateIdeas() {
    setIdeasError(false);
    try {
      const res = await callClaudeFn({
        data: {
          mode: "ideas",
          jobMarkdown: jobMd,
          companySignalJson: company ? JSON.stringify(company, null, 2) : "",
          candidateSummary: summariseCandidate(proof),
        },
      });
      if (res.mode === "ideas") setIdeas(res.ideas);
    } catch {
      setIdeasError(true);
    }
  }

  async function regenerateEmail() {
    if (!ideas || ideas.length === 0) return;
    await generateEmail(jobMd, proof, company, ideas[0]);
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

  // Section numbering: company section is conditional.
  const n = (i: number) => String(i).padStart(2, "0");
  let idx = 0;
  const companyNum = showCompanySection ? n(++idx) : "";
  const proofNum = n(++idx);
  const ideasNum = n(++idx);
  const emailNum = n(++idx);

  // Hide sections 03/04 when job post failed.
  const hideJobDriven = jobFailed;

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
          label="GitHub username"
          value={ghUser}
          onChange={setGhUser}
          placeholder="torvalds"
        />
        <Field
          label="Target (optional)"
          value={target}
          onChange={setTarget}
          placeholder="VP Eng, hiring manager, etc."
        />
        <Field
          label="Company GitHub org"
          value={companyOrg}
          onChange={setCompanyOrg}
          placeholder="e.g. stripe, vercel, anthropics"
          hint="Leave blank to skip — but this is where the best artifact ideas come from."
        />

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="mt-2 mono h-11 w-full rounded-md bg-accent text-[13px] font-medium tracking-wider uppercase text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (longLoading ? "Still working..." : "Working...") : "Generate"}
        </button>
      </div>

      {/* Output */}
      {hasResults && (
        <div className="mt-24 space-y-20">
          {/* 01 — Company Signal (only if org provided) */}
          {showCompanySection && (
            <Section header={`${companyNum} / Company Signal`}>
              {companyState === "loading" ? (
                <SkeletonRows />
              ) : companyState === "missing" ? (
                <p className="mono text-[13px] text-muted-fg">
                  No public GitHub org found for {orgLabel}.
                </p>
              ) : company ? (
                <CompanySignalView signal={company} rateLow={rateLow} />
              ) : null}
            </Section>
          )}

          {/* Proof Graph */}
          <Section header={`${proofNum} / Proof Graph`}>
            {proofState === "skipped" ? (
              <p className="mono text-[13px] text-tertiary-fg">
                No GitHub username provided.
              </p>
            ) : proofState === "missing" ? (
              <p className="mono text-[13px] text-muted-fg">
                No GitHub profile found for {ghUser}.
              </p>
            ) : proofState === "loading" || !proof ? (
              <SkeletonRows />
            ) : (
              <ProofGraphView graph={proof} />
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
                  <IdeaBlock key={i} index={i + 1} idea={idea} />
                ))}
              </div>
            )}
          </Section>

          {/* Outreach Draft */}
          <Section header={`${emailNum} / Outreach Draft`}>
            {hideJobDriven ? (
              <p className="text-[14px] text-muted-fg">
                Couldn't read the job post. Check the URL?
              </p>
            ) : emailError ? (
              <ErrorLine onRetry={regenerateEmail} />
            ) : emailLoading || !email ? (
              <SkeletonRows />
            ) : (
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="label-mono">Subject:</span>
                  <span className="text-[16px] text-foreground">{email.subject}</span>
                </div>
                <pre className="mono mt-6 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
                  {email.body}
                </pre>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={copyEmail}
                    className="mono h-9 rounded-md bg-accent px-4 text-[12px] font-medium uppercase tracking-wider text-accent-fg transition-opacity hover:opacity-90"
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <button
                    type="button"
                    onClick={regenerateEmail}
                    disabled={emailLoading}
                    className="mono h-9 rounded-md border border-border bg-transparent px-4 text-[12px] font-medium uppercase tracking-wider text-foreground transition-colors hover:border-muted-fg disabled:opacity-60"
                  >
                    {emailLoading ? "Working..." : "Regenerate"}
                  </button>
                </div>
              </div>
            )}
          </Section>
        </div>
      )}
    </main>
  );
}
