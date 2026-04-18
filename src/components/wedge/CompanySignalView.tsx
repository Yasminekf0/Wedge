import * as React from "react";
import type { CompanySignal } from "@/lib/github";
import { relativeTime } from "@/lib/relativeTime";

export function CompanySignalView({
  signal,
  rateLow,
}: {
  signal: CompanySignal;
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
    </div>
  );
}
