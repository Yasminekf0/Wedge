import * as React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ArtifactIdea } from "@/server/claude.functions";

export function IdeaBlock({ index, idea }: { index: number; idea: ArtifactIdea }) {
  const [open, setOpen] = React.useState(false);
  const num = String(index).padStart(2, "0");
  const firstWords = idea.what_to_build.split(/\s+/).slice(0, 8).join(" ");
  const patternLabel = idea.pattern ? idea.pattern.replace(/_/g, " ") : "";
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
      </CollapsibleContent>
    </Collapsible>
  );
}
