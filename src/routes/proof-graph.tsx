import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { exampleProfile } from "@/components/proof-graph/exampleProfile";
import { ProofGraph } from "@/components/proof-graph/ProofGraph";

export const Route = createFileRoute("/proof-graph")({
  component: ProofGraphPage,
  head: () => ({
    meta: [
      { title: "Proof Graph — Wedge" },
      {
        name: "description",
        content:
          "A visual replacement for a CV. Real work, grouped and interactive.",
      },
    ],
  }),
});

function ProofGraphPage() {
  const [jobLoaded, setJobLoaded] = React.useState(false);
  const profile = React.useMemo(
    () => ({ ...exampleProfile, jobLoaded }),
    [jobLoaded],
  );

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-6">
        <div className="mono text-[12px] uppercase tracking-wider text-tertiary-fg">
          wedge / proof graph
        </div>
        <button
          type="button"
          onClick={() => setJobLoaded((v) => !v)}
          className="mono rounded-md border border-border px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-fg transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          {jobLoaded ? "clear job" : "simulate job match"}
        </button>
      </div>
      <ProofGraph profile={profile} />
    </div>
  );
}
