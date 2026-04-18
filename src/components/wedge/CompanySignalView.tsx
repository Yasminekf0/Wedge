import * as React from "react";
import type { CompanySignal } from "@/lib/github";
import type { BlogSignal } from "@/lib/blog";
import type { HNSignal } from "@/lib/hn";
import { relativeTime } from "@/lib/relativeTime";

export function CompanySignalView({
  signal,
  blog,
  hn,
  rateLow,
}: {
  signal: CompanySignal;
  blog?: BlogSignal | null;
  hn?: HNSignal | null;
  rateLow: boolean;
}) {
  const { org, activeRepos, aggregateLanguages } = signal;
  return (
    <div className="space-y-8">
      {rateLow && (
        <p className="mono text-[12px] text-muted-fg">
          GitHub rate limit low. Results may be partial.
        </p>
      )}

      <div>
        <p className="text-[16px] text-foreground">{org.description || "—"}</p>
        <p className="mono mt-2 text-[12px] text-tertiary-fg">
          {org.repoCount} public repos
          {aggregateLanguages.length > 0 && (
            <> · active in {aggregateLanguages.slice(0, 3).join(" · ")}</>
          )}
        </p>
      </div>

      <div>
        <h3 className="label-mono">Recently Active</h3>
        <ul className="mt-4 space-y-4">
          {activeRepos.length === 0 && (
            <li className="mono text-[13px] text-tertiary-fg">—</li>
          )}
          {activeRepos.map((r) => {
            const latest = r.recentReleases[0];
            return (
              <li key={r.name}>
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="text-[16px] font-medium text-foreground">
                    {r.name}
                  </span>
                  {r.description && (
                    <span className="text-[15px] text-muted-fg">{r.description}</span>
                  )}
                </div>
                <p className="mono mt-1 text-[12px] text-tertiary-fg">
                  {r.stars}★
                  {r.primaryLanguages.length > 0 && (
                    <> · {r.primaryLanguages.join(" · ")}</>
                  )}{" "}
                  · pushed {relativeTime(r.lastPushed)}
                </p>
                {latest && (
                  <p className="mt-1 text-[14px] text-muted-fg">
                    Latest: {latest.tagName}
                    {latest.notes && (
                      <>
                        {" — "}
                        {latest.notes.slice(0, 80)}
                        {latest.notes.length > 80 ? "..." : ""}
                      </>
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {blog && blog.posts.length > 0 && (
        <div>
          <h3 className="label-mono">Recent Writing</h3>
          <ul className="mt-4 space-y-3">
            {blog.posts.slice(0, 5).map((p, i) => (
              <li key={i}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[15px] font-medium text-accent hover:underline underline-offset-4"
                >
                  {p.title}
                </a>
                <p className="mt-1 text-[13px] text-tertiary-fg">
                  {p.publishedAt && (
                    <>
                      <span>{prettyDate(p.publishedAt)}</span>
                      {p.excerpt && <> · </>}
                    </>
                  )}
                  {p.excerpt && (
                    <span>
                      {p.excerpt.slice(0, 90)}
                      {p.excerpt.length > 90 ? "..." : ""}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
          <p className="mono mt-3 text-[11px] uppercase tracking-wider text-tertiary-fg">
            via {blog.method === "rss" ? "rss feed" : "page scrape"}
          </p>
        </div>
      )}

      {hn && hn.threads.length > 0 && (
        <div>
          <h3 className="label-mono">Community Discussion</h3>
          <ul className="mt-4 space-y-4">
            {hn.threads.slice(0, 3).map((t, i) => {
              const c = t.topComments[0];
              const cText = c
                ? c.text.length > 140
                  ? c.text.slice(0, 140) + "…"
                  : c.text
                : null;
              return (
                <li key={i}>
                  <a
                    href={t.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[15px] font-medium text-accent hover:underline underline-offset-4"
                  >
                    {t.title}
                  </a>
                  <p className="mt-1 text-[13px] text-tertiary-fg">
                    {t.points} points · {t.commentCount} comments ·{" "}
                    {relativeTime(t.createdAt)}
                  </p>
                  {cText && (
                    <p className="mt-2 text-[14px] text-muted-fg">
                      <span className="mono mr-1">"</span>
                      {cText}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function prettyDate(s: string): string {
  const t = new Date(s).getTime();
  if (Number.isNaN(t)) return s;
  return relativeTime(new Date(t).toISOString());
}
