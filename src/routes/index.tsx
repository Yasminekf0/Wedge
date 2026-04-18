import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import * as React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { callClaude, type ArtifactIdea } from "@/server/claude.functions";

export const Route = createFileRoute("/")({
  component: WedgePage,
});

// ---------- types ----------

interface GhRepo {
  name: string;
  description: string | null;
  stargazers_count: number;
  pushed_at: string;
  language: string | null;
  fork: boolean;
}

interface GhUser {
  login: string;
  location: string | null;
  followers: number;
  public_repos: number;
}

interface ProofGraph {
  user: GhUser;
  topRepos: GhRepo[];
  topLanguages: string[];
  totalStars: number;
  fetchedOn: string;
}

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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchProofGraph(username: string): Promise<ProofGraph | null> {
  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`);
  if (userRes.status === 404) return null;
  if (!userRes.ok) throw new Error(`GitHub ${userRes.status}`);
  const user = (await userRes.json()) as GhUser;

  const reposRes = await fetch(
    `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`,
  );
  if (!reposRes.ok) throw new Error(`GitHub repos ${reposRes.status}`);
  const reposRaw = (await reposRes.json()) as GhRepo[];
  const repos = reposRaw.filter((r) => !r.fork);

  const totalStars = repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
  const topRepos = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 3);

  const langCount = new Map<string, number>();
  for (const r of repos) {
    if (!r.language) continue;
    langCount.set(r.language, (langCount.get(r.language) || 0) + 1);
  }
  const topLanguages = [...langCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang]) => lang);

  return {
    user,
    topRepos,
    topLanguages,
    totalStars,
    fetchedOn: todayStr(),
  };
}

async function fetchJobMarkdown(url: string): Promise<string> {
  const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`Jina ${res.status}`);
  return res.text();
}

function summariseProof(p: ProofGraph): string {
  const repos = p.topRepos
    .map((r) => `${r.name} (★${r.stargazers_count}) — ${r.description || "no description"}`)
    .join("; ");
  return `GitHub @${p.user.login}, ${p.user.followers} followers, ${p.user.public_repos} public repos, ${p.totalStars} stars total. Top languages: ${p.topLanguages.join(", ") || "—"}. Top repos: ${repos || "—"}.`;
}

// ---------- page ----------

function WedgePage() {
  const callClaudeFn = useServerFn(callClaude);

  const [jobUrl, setJobUrl] = React.useState("");
  const [ghUser, setGhUser] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [urlError, setUrlError] = React.useState<string | null>(null);

  const [loading, setLoading] = React.useState(false);
  const [hasResults, setHasResults] = React.useState(false);

  const [proof, setProof] = React.useState<ProofGraph | null>(null);
  const [proofMissing, setProofMissing] = React.useState(false);

  const [jobMd, setJobMd] = React.useState<string>("");
  const [ideas, setIdeas] = React.useState<ArtifactIdea[] | null>(null);
  const [ideasError, setIdeasError] = React.useState(false);

  const [email, setEmail] = React.useState<EmailDraft | null>(null);
  const [emailError, setEmailError] = React.useState(false);
  const [emailLoading, setEmailLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  async function generateEmail(jobMarkdown: string, p: ProofGraph | null, idea: ArtifactIdea) {
    setEmailError(false);
    setEmailLoading(true);
    try {
      const res = await callClaudeFn({
        data: {
          mode: "email",
          jobMarkdown,
          proofSummary: p ? summariseProof(p) : "No public GitHub profile available.",
          artifactTitle: idea.title,
          artifactWhatToBuild: idea.what_to_build,
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
    setLoading(true);
    setHasResults(true);
    setProof(null);
    setProofMissing(false);
    setIdeas(null);
    setIdeasError(false);
    setEmail(null);
    setEmailError(false);

    // Proof graph (parallel with job scrape)
    const proofPromise = ghUser.trim()
      ? fetchProofGraph(ghUser.trim()).catch(() => null)
      : Promise.resolve(null);

    let jobMarkdown = "";
    try {
      jobMarkdown = await fetchJobMarkdown(jobUrl);
      setJobMd(jobMarkdown);
    } catch (e) {
      console.error(e);
    }

    const p = await proofPromise;
    if (ghUser.trim() && !p) setProofMissing(true);
    setProof(p);

    // Ideas
    let firstIdea: ArtifactIdea | null = null;
    try {
      const res = await callClaudeFn({
        data: { mode: "ideas", jobMarkdown },
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

    // Email (after ideas land)
    if (firstIdea) {
      await generateEmail(jobMarkdown, p, firstIdea);
    }
  }

  async function regenerateEmail() {
    if (!ideas || ideas.length === 0) return;
    await generateEmail(jobMd, proof, ideas[0]);
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

  return (
    <main className="mx-auto w-full max-w-[720px] px-6 pt-24 pb-32">
      {/* Wordmark */}
      <div className="mono text-[28px] font-medium tracking-wide text-foreground">wedge</div>

      <p className="mt-10 text-[20px] leading-snug text-foreground">
        Cold outreach that references something you actually built for them.
      </p>
      <p className="mt-3 text-[15px] text-muted-fg">
        Paste a job post. We'll read it, pull your GitHub proof graph, and suggest what to build
        before you write.
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

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="mt-2 mono h-11 w-full rounded-md bg-accent text-[13px] font-medium tracking-wider uppercase text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Working..." : "Generate"}
        </button>
      </div>

      {/* Output */}
      {hasResults && (
        <div className="mt-24 space-y-20">
          {/* Section 1: Proof Graph */}
          <Section header="01 / Proof Graph">
            {!ghUser.trim() ? (
              <p className="mono text-[13px] text-tertiary-fg">
                No GitHub username provided.
              </p>
            ) : proofMissing ? (
              <p className="mono text-[13px] text-muted-fg">
                No GitHub profile found for {ghUser}.
              </p>
            ) : !proof ? (
              <SkeletonRows />
            ) : (
              <ProofGraphView graph={proof} />
            )}
          </Section>

          {/* Section 2: Artifact Ideas */}
          <Section header="02 / Artifact Ideas">
            {ideasError ? (
              <ErrorLine
                onRetry={async () => {
                  setIdeasError(false);
                  try {
                    const res = await callClaudeFn({
                      data: { mode: "ideas", jobMarkdown: jobMd },
                    });
                    if (res.mode === "ideas") setIdeas(res.ideas);
                  } catch {
                    setIdeasError(true);
                  }
                }}
              />
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

          {/* Section 3: Outreach Draft */}
          <Section header="03 / Outreach Draft">
            {emailError ? (
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

// ---------- subcomponents ----------

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string | null;
}) {
  return (
    <div>
      <label className="label-mono block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-md border border-border bg-transparent px-3 text-[15px] text-foreground placeholder:text-tertiary-fg focus:border-muted-fg focus:outline-none"
      />
      {error && <p className="mt-2 text-[13px] text-error">{error}</p>}
    </div>
  );
}

function Section({ header, children }: { header: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-10">
      <h2 className="section-header">{header}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      <div className="h-4 w-3/4 rounded-sm" style={{ backgroundColor: "rgb(76 110 245 / 0.10)" }} />
      <div className="h-4 w-1/2 rounded-sm" style={{ backgroundColor: "rgb(76 110 245 / 0.10)" }} />
      <div className="h-4 w-2/3 rounded-sm" style={{ backgroundColor: "rgb(76 110 245 / 0.10)" }} />
    </div>
  );
}

function ErrorLine({ onRetry }: { onRetry: () => void | Promise<void> }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[14px] text-muted-fg">Couldn't generate this right now. Try again.</span>
      <button
        type="button"
        onClick={() => onRetry()}
        className="mono text-[12px] uppercase tracking-wider text-foreground underline-offset-4 hover:underline"
      >
        Retry
      </button>
    </div>
  );
}

function ProofGraphView({ graph }: { graph: ProofGraph }) {
  const { user, topRepos, topLanguages, totalStars, fetchedOn } = graph;
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Stat label="Handle" value={`@${user.login}`} />
        <Stat label="Location" value={user.location || "—"} />
        <Stat label="Followers" value={String(user.followers)} />
        <Stat label="Public repos" value={String(user.public_repos)} />
        <Stat label="Total stars" value={String(totalStars)} />
        <Stat
          label="Top languages"
          value={topLanguages.length ? topLanguages.join(" · ") : "—"}
        />
      </div>

      <div>
        <h3 className="label-mono">Top Repos</h3>
        <ul className="mt-3 space-y-4">
          {topRepos.length === 0 && (
            <li className="mono text-[13px] text-tertiary-fg">—</li>
          )}
          {topRepos.map((r) => (
            <li key={r.name}>
              <div className="flex items-baseline justify-between gap-4">
                <span className="text-[16px] text-foreground">{r.name}</span>
                <span className="mono text-[12px] text-muted-fg">
                  ★ {r.stargazers_count} · {r.pushed_at.slice(0, 10)}
                </span>
              </div>
              <p className="mt-1 text-[14px] text-muted-fg">{r.description || "—"}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="mono text-[12px] text-tertiary-fg">
        Verified from api.github.com/users/{user.login} on {fetchedOn}.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="label-mono">{label}</div>
      <div className="mt-1 text-[15px] text-foreground">{value}</div>
    </div>
  );
}

function IdeaBlock({ index, idea }: { index: number; idea: ArtifactIdea }) {
  const [open, setOpen] = React.useState(false);
  const num = String(index).padStart(2, "0");
  const firstWords = idea.what_to_build.split(/\s+/).slice(0, 8).join(" ");
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="group block w-full cursor-pointer text-left">
        <div className="flex items-baseline gap-4">
          <span className="mono text-[12px] text-tertiary-fg">{num}</span>
          <span className="text-[20px] font-medium text-foreground">{idea.title}</span>
        </div>
        <p className="mt-2 pl-10 text-[15px] text-muted-fg">{idea.why_it_lands}</p>
        <p className="mt-2 pl-10 mono text-[12px] text-tertiary-fg">
          {idea.estimated_hours}h · {firstWords}
          {idea.what_to_build.split(/\s+/).length > 8 ? "..." : ""}
        </p>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-10">
        <p className="mt-4 text-[15px] leading-relaxed text-foreground">{idea.what_to_build}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}
