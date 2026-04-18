// Hacker News Algolia signal: strict filtering, low noise.
// No auth, no key. Returns null when nothing survives the filter — silence
// is the intended outcome more often than not.

export interface HNComment {
  author: string;
  text: string;
  points: number | null;
}

export interface HNThread {
  title: string;
  url: string;
  submissionUrl: string | null;
  points: number;
  commentCount: number;
  createdAt: string;
  topComments: HNComment[];
}

export interface HNSignal {
  threads: HNThread[];
}

interface AlgoliaHit {
  objectID: string;
  title: string | null;
  url: string | null;
  points: number | null;
  num_comments: number | null;
  created_at: string | null;
}
interface AlgoliaSearchResp {
  hits: AlgoliaHit[];
}

interface AlgoliaItemNode {
  id: number;
  author: string | null;
  text: string | null;
  points: number | null;
  children: AlgoliaItemNode[];
  type?: string;
}

const hnCache = new Map<string, HNSignal | null>();

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function threeYearsAgoIso(): number {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d.getTime();
}

function titleMatchesCompany(
  title: string,
  companyName: string,
  domain: string | null,
): boolean {
  const t = title.toLowerCase();
  const c = companyName.toLowerCase();
  if (t.includes(c)) return true;
  if (domain) {
    const root = domain.split(".")[0]?.toLowerCase();
    if (root && t.includes(root)) return true;
  }
  // company first word match (helps multi-word names)
  const fw = c.split(/\s+/)[0];
  if (fw && fw.length >= 4 && t.includes(fw)) return true;
  return false;
}

async function searchAlgolia(
  query: string,
  pointsFloor: number,
): Promise<AlgoliaHit[]> {
  const url = `https://hn.algolia.com/api/v1/search?tags=story&numericFilters=points>${pointsFloor}&query=${encodeURIComponent(query)}&hitsPerPage=20`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = (await res.json()) as AlgoliaSearchResp;
  return json.hits || [];
}

async function fetchItem(objectID: string): Promise<AlgoliaItemNode | null> {
  const res = await fetch(`https://hn.algolia.com/api/v1/items/${objectID}`);
  if (!res.ok) return null;
  return (await res.json()) as AlgoliaItemNode;
}

function topCommentsFromTree(
  root: AlgoliaItemNode,
  n: number,
): HNComment[] {
  const top = (root.children || []).filter(
    (c) => c.type !== "comment" || c.text,
  );
  // Algolia doesn't return per-comment points reliably for nested fetches;
  // sort by length as a proxy for substance, then take top N with text.
  const sorted = [...top]
    .filter((c) => c.text && c.text.trim().length > 20)
    .sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0))
    .slice(0, n);
  return sorted.map((c) => ({
    author: c.author || "anon",
    text: stripHtml(c.text || "").slice(0, 500),
    points: c.points ?? null,
  }));
}

const COMMON_NAMES = new Set([
  "linear",
  "notion",
  "stripe",
  "vercel",
  "arc",
  "loom",
  "ghost",
  "discord",
  "slack",
  "figma",
  "next",
  "react",
]);

export async function fetchHNSignal(args: {
  companyName: string;
  orgWebsiteDomain: string | null;
}): Promise<HNSignal | null> {
  const cacheKey = `${args.companyName.toLowerCase()}|${args.orgWebsiteDomain || ""}`;
  if (hnCache.has(cacheKey)) return hnCache.get(cacheKey) ?? null;

  let hits: AlgoliaHit[] = [];
  let pointsFloor = 50;

  // Preferred: domain search
  if (args.orgWebsiteDomain) {
    try {
      hits = await searchAlgolia(args.orgWebsiteDomain, 50);
    } catch {
      hits = [];
    }
  }

  // Fallback: name search, stricter floor, skip common short words
  if (hits.length === 0) {
    const cn = args.companyName.trim();
    const cnLower = cn.toLowerCase();
    const skip = cn.length < 6 || COMMON_NAMES.has(cnLower);
    if (!skip) {
      pointsFloor = 100;
      try {
        hits = await searchAlgolia(cn, 100);
      } catch {
        hits = [];
      }
    }
  }

  if (hits.length === 0) {
    hnCache.set(cacheKey, null);
    return null;
  }

  const minTime = threeYearsAgoIso();
  const survivors: AlgoliaHit[] = [];
  for (const h of hits) {
    if (!h.title || h.title.length < 10) continue;
    if ((h.points ?? 0) < pointsFloor) continue;
    if ((h.num_comments ?? 0) < 10) continue;
    if (!h.created_at) continue;
    const t = new Date(h.created_at).getTime();
    if (Number.isNaN(t) || t < minTime) continue;
    if (!titleMatchesCompany(h.title, args.companyName, args.orgWebsiteDomain))
      continue;
    survivors.push(h);
    if (survivors.length >= 3) break;
  }

  if (survivors.length === 0) {
    hnCache.set(cacheKey, null);
    return null;
  }

  const threads: HNThread[] = [];
  for (const h of survivors) {
    let topComments: HNComment[] = [];
    try {
      const node = await fetchItem(h.objectID);
      if (node) topComments = topCommentsFromTree(node, 3);
    } catch {
      topComments = [];
    }
    threads.push({
      title: h.title!,
      url: `https://news.ycombinator.com/item?id=${h.objectID}`,
      submissionUrl: h.url,
      points: h.points || 0,
      commentCount: h.num_comments || 0,
      createdAt: h.created_at!,
      topComments,
    });
  }

  const result: HNSignal = { threads };
  hnCache.set(cacheKey, result);
  return result;
}
