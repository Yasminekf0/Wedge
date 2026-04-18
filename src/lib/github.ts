// GitHub REST API wrapper with rate-limit awareness.
// Unauthenticated: 60 req/hour per IP. We track x-ratelimit-remaining
// across calls and surface it via getRateLimitState().

let lastRemaining: number | null = null;

function recordRateLimit(res: Response) {
  const h = res.headers.get("x-ratelimit-remaining");
  if (h !== null) {
    const n = Number(h);
    if (!Number.isNaN(n)) lastRemaining = n;
  }
}

export function getRateLimitRemaining(): number | null {
  return lastRemaining;
}

const GH_TOKEN = (import.meta.env.VITE_GITHUB_TOKEN as string | undefined)?.trim();

async function ghFetch(path: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  if (GH_TOKEN) headers.Authorization = `Bearer ${GH_TOKEN}`;
  const res = await fetch(`https://api.github.com${path}`, { headers });
  recordRateLimit(res);
  return res;
}

// ---------- types ----------

export interface GhUser {
  login: string;
  location: string | null;
  followers: number;
  public_repos: number;
}

export interface GhRepo {
  name: string;
  description: string | null;
  stargazers_count: number;
  pushed_at: string;
  language: string | null;
  fork: boolean;
}

export interface CandidateProof {
  user: GhUser;
  topRepos: GhRepo[];
  topLanguages: string[];
  totalStars: number;
  fetchedOn: string;
}

export interface CompanyRelease {
  name: string;
  tagName: string;
  publishedAt: string;
  notes: string;
}

export interface CompanyRepoSignal {
  name: string;
  description: string;
  stars: number;
  openIssues: number;
  topics: string[];
  primaryLanguages: string[];
  lastPushed: string;
  recentReleases: CompanyRelease[];
}

export interface CompanySignal {
  org: {
    name: string;
    description: string;
    blog: string | null;
    repoCount: number;
  };
  activeRepos: CompanyRepoSignal[];
  aggregateLanguages: string[];
}

// ---------- candidate ----------

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchCandidateProof(
  username: string,
): Promise<CandidateProof | null> {
  const userRes = await ghFetch(`/users/${encodeURIComponent(username)}`);
  if (userRes.status === 404) return null;
  if (!userRes.ok) throw new Error(`GitHub ${userRes.status}`);
  const user = (await userRes.json()) as GhUser;

  const reposRes = await ghFetch(
    `/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`,
  );
  if (!reposRes.ok) throw new Error(`GitHub repos ${reposRes.status}`);
  const reposRaw = (await reposRes.json()) as GhRepo[];
  const repos = reposRaw.filter((r) => !r.fork);

  const totalStars = repos.reduce((acc, r) => acc + (r.stargazers_count || 0), 0);
  const topRepos = [...repos]
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5);

  const langCount = new Map<string, number>();
  for (const r of repos) {
    if (!r.language) continue;
    langCount.set(r.language, (langCount.get(r.language) || 0) + 1);
  }
  const topLanguages = [...langCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang);

  return { user, topRepos, topLanguages, totalStars, fetchedOn: todayStr() };
}

// ---------- company org ----------

interface OrgRaw {
  name: string | null;
  login: string;
  description: string | null;
  blog: string | null;
  public_repos: number;
}

interface RepoRaw {
  name: string;
  description: string | null;
  stargazers_count: number;
  open_issues_count: number;
  topics: string[];
  pushed_at: string;
  language: string | null;
}

interface ReleaseRaw {
  name: string | null;
  tag_name: string;
  published_at: string;
  body: string | null;
}

function stripMarkdown(s: string): string {
  return s
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~#>]+/g, " ")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function topLanguagesByBytes(
  langs: Record<string, number>,
  n: number,
): string[] {
  return Object.entries(langs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

export async function fetchCompanySignal(
  org: string,
): Promise<CompanySignal | null> {
  const orgRes = await ghFetch(`/orgs/${encodeURIComponent(org)}`);
  if (orgRes.status === 404) return null;
  if (!orgRes.ok) throw new Error(`GitHub org ${orgRes.status}`);
  const orgData = (await orgRes.json()) as OrgRaw;

  const reposRes = await ghFetch(
    `/orgs/${encodeURIComponent(org)}/repos?sort=pushed&direction=desc&per_page=10`,
  );
  if (!reposRes.ok) throw new Error(`GitHub org repos ${reposRes.status}`);
  const reposRaw = (await reposRes.json()) as RepoRaw[];

  // For top 5 by pushed_at, fetch releases + languages + repo (already have repo)
  const top5 = reposRaw.slice(0, 5);

  const enriched = await Promise.all(
    top5.map(async (r) => {
      const [releasesRes, langsRes] = await Promise.all([
        ghFetch(`/repos/${encodeURIComponent(org)}/${encodeURIComponent(r.name)}/releases?per_page=3`),
        ghFetch(`/repos/${encodeURIComponent(org)}/${encodeURIComponent(r.name)}/languages`),
      ]);

      let releases: CompanyRelease[] = [];
      if (releasesRes.ok) {
        const raw = (await releasesRes.json()) as ReleaseRaw[];
        releases = raw.slice(0, 3).map((x) => ({
          name: x.name || x.tag_name,
          tagName: x.tag_name,
          publishedAt: x.published_at,
          notes: stripMarkdown(x.body || "").slice(0, 500),
        }));
      }

      let langs: Record<string, number> = {};
      if (langsRes.ok) {
        langs = (await langsRes.json()) as Record<string, number>;
      }

      const repo: CompanyRepoSignal = {
        name: r.name,
        description: r.description || "",
        stars: r.stargazers_count,
        openIssues: r.open_issues_count,
        topics: r.topics || [],
        primaryLanguages: topLanguagesByBytes(langs, 3),
        lastPushed: r.pushed_at,
        recentReleases: releases,
      };
      return { repo, langs };
    }),
  );

  // aggregate languages across top 5 by total bytes
  const totals = new Map<string, number>();
  for (const { langs } of enriched) {
    for (const [k, v] of Object.entries(langs)) {
      totals.set(k, (totals.get(k) || 0) + v);
    }
  }
  const aggregateLanguages = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  return {
    org: {
      name: orgData.name || orgData.login,
      description: orgData.description || "",
      blog: orgData.blog || null,
      repoCount: orgData.public_repos,
    },
    activeRepos: enriched.map((e) => e.repo),
    aggregateLanguages,
  };
}

// ---------- org resolution cascade ----------

export interface ResolvedOrg {
  handle: string;
  confidence: "high" | "medium";
  /** Display name from GitHub if known. */
  name?: string;
}

const resolveCache = new Map<string, ResolvedOrg | null>();

const SUFFIX_RE =
  /\b(inc\.?|labs?|ai|technologies|technology|tech|corp\.?|corporation|gmbh|ltd\.?|llc|sa|s\.a\.|co\.?|company)\b\.?$/i;

export function slugifyCompany(name: string): string {
  let s = name.trim();
  // Strip trailing legal/marketing suffixes (run twice to catch e.g. "Foo Labs Inc.")
  for (let i = 0; i < 3; i++) {
    const next = s.replace(SUFFIX_RE, "").trim().replace(/[,;:]+$/, "");
    if (next === s) break;
    s = next;
  }
  // Lowercase, strip everything but a-z0-9
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function firstWord(s: string): string {
  return (s.trim().split(/\s+/)[0] || "").toLowerCase();
}

interface OrgFull {
  login: string;
  name: string | null;
  description: string | null;
  public_repos: number;
}

async function getOrg(login: string): Promise<OrgFull | null> {
  const res = await ghFetch(`/orgs/${encodeURIComponent(login)}`);
  if (res.status === 404) return null;
  if (!res.ok) return null;
  const j = (await res.json()) as OrgFull;
  return j;
}

function orgMatchesCompany(org: OrgFull, companyName: string): boolean {
  const fw = firstWord(companyName);
  if (!fw) return false;
  const name = (org.name || "").toLowerCase();
  const desc = (org.description || "").toLowerCase();
  return name.includes(fw) || desc.includes(fw);
}

interface SearchUserItem {
  login: string;
  type: string;
}
interface SearchUserResp {
  items: SearchUserItem[];
}

export async function resolveGitHubOrg(
  companyName: string,
): Promise<ResolvedOrg | null> {
  const key = companyName.trim().toLowerCase();
  if (!key) return null;
  if (resolveCache.has(key)) return resolveCache.get(key) ?? null;

  // Attempt 1: direct slug
  const slug = slugifyCompany(companyName);
  if (slug) {
    const org = await getOrg(slug);
    if (org && orgMatchesCompany(org, companyName)) {
      const result: ResolvedOrg = {
        handle: org.login,
        confidence: "high",
        name: org.name || org.login,
      };
      resolveCache.set(key, result);
      return result;
    }
  }

  // Attempt 2: search
  const searchRes = await ghFetch(
    `/search/users?q=${encodeURIComponent(companyName)}+type:org&per_page=5`,
  );
  if (searchRes.ok) {
    const sj = (await searchRes.json()) as SearchUserResp;
    const candidates: Array<{ org: OrgFull; score: number }> = [];
    for (const item of sj.items || []) {
      const full = await getOrg(item.login);
      if (!full) continue;
      const lname = (full.name || "").toLowerCase();
      const ldesc = (full.description || "").toLowerCase();
      const cname = companyName.toLowerCase();
      let score = 0;
      if (lname === cname || lname.startsWith(cname)) score += 2;
      if (ldesc.includes(cname)) score += 1;
      if (full.public_repos > 10) score += 1;
      if (full.public_repos === 0) score -= 2;
      candidates.push({ org: full, score });
    }
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    if (best && best.score >= 2) {
      const result: ResolvedOrg = {
        handle: best.org.login,
        confidence: "medium",
        name: best.org.name || best.org.login,
      };
      resolveCache.set(key, result);
      return result;
    }
  }

  resolveCache.set(key, null);
  return null;
}

