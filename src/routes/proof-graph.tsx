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
          "A CV replacement. Every item is a claim, paired with the evidence that backs it up.",
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
    <div className="relative">
      <ProofGraph profile={profile} />
      {/* Demo-only toggle, top-right corner */}
      <button
        type="button"
        onClick={() => setJobLoaded((v) => !v)}
        className="mono fixed bottom-4 right-4 z-50 rounded-md border border-border bg-background/90 px-3 py-1.5 text-[11px] uppercase tracking-wider text-muted-fg backdrop-blur transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        {jobLoaded ? "clear job" : "simulate job match"}
      </button>
    </div>
  );
}
