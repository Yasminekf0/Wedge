// Engineering blog discovery: RSS first, Jina markdown fallback.
// Loose filtering — if we found ≥2 posts with titles + URLs, surface them.

import { XMLParser } from "fast-xml-parser";

export interface BlogPost {
  title: string;
  url: string;
  publishedAt: string | null;
  excerpt: string;
}

export interface BlogSignal {
  sourceUrl: string;
  method: "rss" | "jina";
  posts: BlogPost[];
}

const blogCache = new Map<string, BlogSignal | null>();

function stripHtml(s: string): string {
  return s
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
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

function ensureAbsolute(href: string, base: string): string {
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function pickStartUrl(args: {
  orgBlogUrl: string | null;
  orgWebsiteDomain: string | null;
  companyName: string;
}): string | null {
  if (args.orgBlogUrl) {
    let u = args.orgBlogUrl.trim();
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    return u;
  }
  if (args.orgWebsiteDomain) return `https://${args.orgWebsiteDomain}/blog`;
  const slug = args.companyName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (slug) return `https://${slug}.com/blog`;
  return null;
}

// ---------- Step A: RSS via Jina markdown of HTML ----------
// Direct cross-origin fetch of arbitrary marketing sites is unreliable from
// the browser. Jina returns the page rendered as markdown, but we ALSO ask
// for the raw HTML by setting a header — Jina supports `x-return-format: html`.

async function fetchHtmlViaJina(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { "x-return-format": "html" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function findFeedUrl(html: string, base: string): string | null {
  // Match <link ... rel="alternate" ... type="application/rss+xml" ... href="...">
  // Order of attributes is not guaranteed, so we run two passes.
  const linkRe = /<link\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(html)) !== null) {
    const tag = m[0];
    if (!/rel\s*=\s*["']?alternate/i.test(tag)) continue;
    const typeMatch = tag.match(/type\s*=\s*["']([^"']+)["']/i);
    if (!typeMatch) continue;
    const t = typeMatch[1].toLowerCase();
    if (
      t.includes("rss") ||
      t.includes("atom") ||
      t.includes("application/feed+json")
    ) {
      const hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
      if (hrefMatch) return ensureAbsolute(hrefMatch[1], base);
    }
  }
  return null;
}

interface RssItem {
  title?: string | { "#text"?: string };
  link?: string | { "@_href"?: string; "#text"?: string };
  pubDate?: string;
  published?: string;
  updated?: string;
  description?: string;
  summary?: string;
  content?: string;
  "content:encoded"?: string;
}

function asText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o["#text"] === "string") return o["#text"] as string;
  }
  return "";
}

function asLink(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    // Atom often has an array of <link> elements
    for (const el of v) {
      const o = el as Record<string, unknown>;
      const rel = (o["@_rel"] as string) || "alternate";
      if (rel === "alternate") {
        const href = o["@_href"];
        if (typeof href === "string") return href;
      }
    }
    const first = v[0] as Record<string, unknown>;
    if (first) {
      const href = first["@_href"];
      if (typeof href === "string") return href;
      if (typeof first["#text"] === "string") return first["#text"] as string;
    }
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o["@_href"] === "string") return o["@_href"] as string;
    if (typeof o["#text"] === "string") return o["#text"] as string;
  }
  return "";
}

function parseFeed(xml: string, base: string): BlogPost[] {
  let parsed: unknown;
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });
    parsed = parser.parse(xml);
  } catch {
    return [];
  }
  const root = parsed as Record<string, unknown>;
  const rss = root.rss as Record<string, unknown> | undefined;
  const channel = rss?.channel as Record<string, unknown> | undefined;
  let items: RssItem[] = [];
  if (channel?.item) {
    items = Array.isArray(channel.item)
      ? (channel.item as RssItem[])
      : [channel.item as RssItem];
  } else {
    const feed = root.feed as Record<string, unknown> | undefined;
    if (feed?.entry) {
      items = Array.isArray(feed.entry)
        ? (feed.entry as RssItem[])
        : [feed.entry as RssItem];
    }
  }

  // JSON Feed
  if (items.length === 0 && Array.isArray(root.items)) {
    const arr = root.items as Array<Record<string, unknown>>;
    return arr.slice(0, 5).map((it) => ({
      title: (it.title as string) || "(untitled)",
      url: ensureAbsolute((it.url as string) || "", base),
      publishedAt:
        (it.date_published as string) || (it.date_modified as string) || null,
      excerpt: stripHtml(
        (it.summary as string) || (it.content_text as string) || "",
      ).slice(0, 400),
    }));
  }

  return items.slice(0, 5).map((it) => {
    const title = asText(it.title) || "(untitled)";
    const link = asLink(it.link);
    const desc =
      it["content:encoded"] || it.content || it.description || it.summary || "";
    return {
      title: title.trim(),
      url: ensureAbsolute(link, base),
      publishedAt: it.pubDate || it.published || it.updated || null,
      excerpt: stripHtml(typeof desc === "string" ? desc : asText(desc)).slice(
        0,
        400,
      ),
    };
  });
}

// ---------- Step B: Jina markdown heuristic ----------

async function fetchMarkdownViaJina(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://r.jina.ai/${url}`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function parseBlogMarkdown(md: string, base: string): BlogPost[] {
  // Heuristic: blog index pages typically have a series of links whose anchor
  // text reads like a headline. We collect [text](url) pairs where text is
  // ≥ 6 chars and not obviously navigation.
  const linkRe = /\[([^\]\n]{6,140})\]\(([^)\s]+)\)/g;
  const seen = new Set<string>();
  const candidates: Array<{ title: string; url: string; idx: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(md)) !== null) {
    const title = m[1].trim();
    const href = m[2].trim();
    const lowerTitle = title.toLowerCase();
    if (
      ["home", "about", "contact", "careers", "pricing", "login", "sign in", "blog", "docs"].includes(
        lowerTitle,
      )
    ) {
      continue;
    }
    if (/^(image|img|icon|logo|menu|nav)/i.test(title)) continue;
    if (href.startsWith("#")) continue;
    const abs = ensureAbsolute(href, base);
    if (seen.has(abs)) continue;
    seen.add(abs);
    candidates.push({ title, url: abs, idx: m.index });
    if (candidates.length >= 30) break;
  }

  // Score: prefer URLs that share path with /blog/ or /posts/ or /journal/
  // and whose titles look like headlines (have a verb-y feel — heuristically,
  // 4+ words).
  const scored = candidates.map((c) => {
    let score = 0;
    if (/\/(blog|posts|journal|articles|writing|essays)\//i.test(c.url))
      score += 3;
    if (c.title.split(/\s+/).length >= 4) score += 2;
    if (/^[A-Z]/.test(c.title)) score += 1;
    return { ...c, score };
  });
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);

  const top = scored.slice(0, 5);
  return top.map((c) => {
    // grab ~400 chars of surrounding text after the link
    const after = md.slice(c.idx, c.idx + 800);
    const excerpt = stripMarkdown(after.replace(/^\[[^\]]+\]\([^)]+\)/, ""))
      .slice(0, 400)
      .trim();
    // best-effort date sniff in the surrounding window
    const dateM = after.match(
      /\b(20\d{2}-\d{2}-\d{2}|\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+20\d{2}|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+20\d{2})\b/i,
    );
    return {
      title: c.title,
      url: c.url,
      publishedAt: dateM ? dateM[0] : null,
      excerpt,
    };
  });
}

// ---------- public API ----------

export async function fetchCompanyBlog(args: {
  companyName: string;
  orgBlogUrl: string | null;
  orgWebsiteDomain: string | null;
}): Promise<BlogSignal | null> {
  const cacheKey = `${args.companyName.toLowerCase()}|${args.orgBlogUrl || ""}|${args.orgWebsiteDomain || ""}`;
  if (blogCache.has(cacheKey)) return blogCache.get(cacheKey) ?? null;

  const start = pickStartUrl(args);
  if (!start) {
    blogCache.set(cacheKey, null);
    return null;
  }

  // Step A: RSS discovery via Jina-as-HTML
  try {
    const html = await fetchHtmlViaJina(start);
    if (html) {
      const feedUrl = findFeedUrl(html, start);
      if (feedUrl) {
        const feedRes = await fetch(`https://r.jina.ai/${feedUrl}`, {
          headers: { "x-return-format": "html" },
        });
        if (feedRes.ok) {
          const xml = await feedRes.text();
          const posts = parseFeed(xml, feedUrl).filter(
            (p) => p.title && p.url,
          );
          if (posts.length >= 2) {
            const result: BlogSignal = {
              sourceUrl: feedUrl,
              method: "rss",
              posts: posts.slice(0, 5),
            };
            blogCache.set(cacheKey, result);
            return result;
          }
        }
      }
    }
  } catch {
    /* fall through */
  }

  // Step B: Jina markdown heuristic
  try {
    const md = await fetchMarkdownViaJina(start);
    if (md) {
      const posts = parseBlogMarkdown(md, start).filter(
        (p) => p.title && p.url,
      );
      if (posts.length >= 2) {
        const result: BlogSignal = {
          sourceUrl: start,
          method: "jina",
          posts: posts.slice(0, 5),
        };
        blogCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    /* nothing */
  }

  blogCache.set(cacheKey, null);
  return null;
}

// Helper exposed for the page: extract a domain from a URL string.
export function extractDomain(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return u.hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}
