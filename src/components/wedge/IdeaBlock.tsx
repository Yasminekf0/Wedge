import * as React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ArtifactIdea, Citation } from "@/server/claude.functions";

const SOURCE_PREFIX: Record<Citation["source"], string> = {
  job_post: "[job]",
  company_github: "[repo]",
  company_blog: "[blog]",
  hn: "[hn]",
  candidate_github: "[you]",
};

function CitationLine({ c }: { c: Citation }) {
  const prefix = SOURCE_PREFIX[c.source] || "[src]";

  let ref: React.ReactNode = null;
  switch (c.source) {
    case "job_post":
      ref = c.job_post_quote ? (
        <span className="italic text-foreground">"{c.job_post_quote}"</span>
      ) : null;
      break;
    case "company_github":
      ref = (
        <span className="mono text-foreground">
          {c.repo_name}
          {c.release_tag ? (
            <span className="text-muted-fg"> @ {c.release_tag}</span>
          ) : null}
        </span>
      );
      break;
    case "company_blog":
      ref = c.post_url ? (
        <a
          href={c.post_url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-accent hover:underline underline-offset-4"
        >
          {c.post_title || c.post_url}
        </a>
      ) : (
        <span className="text-foreground">{c.post_title}</span>
      );
      break;
    case "hn":
      ref = c.hn_thread_url ? (
        <a
          href={c.hn_thread_url}
          target="_blank"
          rel="noreferrer noopener"
          className="text-accent hover:underline underline-offset-4"
        >
          {c.hn_thread_title || c.hn_thread_url}
        </a>
      ) : (
        <span className="text-foreground">{c.hn_thread_title}</span>
      );
      break;
    case "candidate_github":
      ref = <span className="mono text-foreground">{c.candidate_repo}</span>;
      break;
  }

  return (
    <div className="flex items-baseline gap-3 text-[13px]">
      <span className="mono w-12 shrink-0 text-tertiary-fg">{prefix}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[13px]">{ref}</div>
        {c.relevance && (
          <div className="mt-1 text-[13px] leading-snug text-muted-fg">
            {c.relevance}
          </div>
        )}
      </div>
    </div>
  );
}

export function IdeaBlock({ index, idea }: { index: number; idea: ArtifactIdea }) {
  const [open, setOpen] = React.useState(false);
  const num = String(index).padStart(2, "0");
  const firstWords = idea.what_to_build.split(/\s+/).slice(0, 8).join(" ");
  const patternLabel = idea.pattern ? idea.pattern.replace(/_/g, " ") : "";
  const citations = idea.citations || [];
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="group block w-full cursor-pointer text-left">
        <div className="flex flex-wrap items-baseline gap-x-4">
          <span className="mono text-[12px] text-tertiary-fg">{num}</span>
          <span className="text-[20px] font-medium text-foreground">{idea.title}</span>
          {patternLabel && (
            <span className="mono text-[11px] uppercase tracking-wider text-tertiary-fg">
              {patternLabel}
            </span>
          )}
        </div>
        <p className="mt-2 pl-10 text-[15px] text-muted-fg">{idea.why_it_lands}</p>
        <p className="mt-2 pl-10 mono text-[12px] text-tertiary-fg">
          {idea.estimated_hours}h · {firstWords}
          {idea.what_to_build.split(/\s+/).length > 8 ? "..." : ""}
        </p>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-10">
        <p className="mt-4 text-[15px] leading-relaxed text-foreground">
          {idea.what_to_build}
        </p>
        {citations.length > 0 && (
          <div className="mt-6 border-t border-border pt-3">
            <div className="label-mono mb-3">Sources</div>
            <div className="space-y-2">
              {citations.map((c, i) => (
                <CitationLine key={i} c={c} />
              ))}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
