import type { CandidateProof } from "@/lib/github";

export function ProofGraphView({ graph }: { graph: CandidateProof }) {
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
