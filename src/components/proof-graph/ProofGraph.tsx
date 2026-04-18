import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Github,
  Linkedin,
  MapPin,
  RotateCcw,
  ExternalLink,
  Building2,
  GraduationCap,
  Globe,
  Link2,
  Box,
  X,
} from "lucide-react";
import type {
  Claim,
  ClaimSection,
  Evidence,
  EvidenceType,
  ProofProfile,
} from "./types";

// ---------------------------------------------------------------------------
// Constants — board layout
// ---------------------------------------------------------------------------

// Compact, structured grid. Three sections stacked vertically, each laid out
// on a shared 4-column track. Cards span 1 or 2 columns based on size.
const COLS = 4;
const COL_W = 260;
const COL_GAP = 20;
const ROW_GAP = 16;
const PAD_X = 120; // leaves room for section labels on the left
const PAD_TOP = 24;
const SECTION_GAP = 56;
const SECTION_HEADER_H = 36;

const BOARD_W = PAD_X + COLS * COL_W + (COLS - 1) * COL_GAP + 60;

const SIZE_TO_SPAN: Record<NonNullable<Claim["size"]>, number> = {
  sm: 1,
  md: 1,
  lg: 2,
};

const SIZE_TO_HEIGHT: Record<NonNullable<Claim["size"]>, number> = {
  sm: 124,
  md: 144,
  lg: 144,
};

function spanWidth(span: number): number {
  return span * COL_W + (span - 1) * COL_GAP;
}

const SECTION_ORDER: ClaimSection[] = ["projects", "achievements", "work", "education"];
const SECTION_LABEL: Record<ClaimSection, string> = {
  projects: "Projects",
  achievements: "Achievements",
  work: "Work",
  education: "Education",
};

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const LANGUAGE_COLORS: Record<string, string> = {
  Rust: "#dea584",
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Go: "#00add8",
  Python: "#3572a5",
  C: "#aaaaaa",
  "C++": "#f34b7d",
  Ruby: "#701516",
  Java: "#b07219",
  Swift: "#f05138",
  Kotlin: "#a97bff",
};

function LanguageDot({ lang }: { lang?: string }) {
  if (!lang) return null;
  const color = LANGUAGE_COLORS[lang] || "#888";
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

// Map an evidence type to an icon + a tint color (used for the glyph ring).
const EVIDENCE_ICON: Record<EvidenceType, React.ComponentType<{ className?: string }>> = {
  repo: Github,
  deploy: Globe,
  work: Building2,
  education: GraduationCap,
  link: Link2,
};

const SECTION_TINT: Record<ClaimSection, string> = {
  projects: "#7c5cff",     // violet
  achievements: "#22c1a3", // teal
  work: "#4cb2ff",         // blue
  education: "#f0a23a",    // amber
};

// Glyph rendered at the top-left of every claim card.
// Prefers a real logo from the primary evidence; falls back to a typed icon
// tinted by the language color (or section tint).
function ClaimGlyph({ claim }: { claim: Claim }) {
  const primary = claim.evidence[0];
  const Icon = primary ? EVIDENCE_ICON[primary.type] ?? Box : Box;
  const langColor = primary?.language
    ? LANGUAGE_COLORS[primary.language]
    : undefined;
  const tint = langColor || SECTION_TINT[claim.section];
  const logo = primary?.logo;
  const [logoFailed, setLogoFailed] = React.useState(false);
  const showLogo = !!logo && !logoFailed;

  return (
    <div
      className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-background"
      style={{
        borderColor: `color-mix(in oklab, ${tint} 55%, transparent)`,
        boxShadow: `0 0 0 1px color-mix(in oklab, ${tint} 18%, transparent), 0 6px 18px -10px ${tint}`,
      }}
      aria-hidden
    >
      {showLogo ? (
        <img
          src={logo}
          alt=""
          loading="lazy"
          onError={() => setLogoFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          style={{
            background: `color-mix(in oklab, ${tint} 14%, transparent)`,
          }}
        >
          <Icon className="h-4 w-4" />
        </div>
      )}
      {/* Language pip — only when we have a language signal */}
      {langColor && (
        <span
          className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-background"
          style={{ backgroundColor: langColor }}
        />
      )}
    </div>
  );
}

// Pack claims into a tidy grid per section. Each section gets a header row,
// then claims flow left-to-right across COLS columns, wrapping as needed.
interface LayoutResult {
  claims: Claim[];
  sections: Array<{ section: ClaimSection; y: number }>;
  height: number;
}

function autoLayout(rawClaims: Claim[]): LayoutResult {
  const buckets: Record<ClaimSection, Claim[]> = {
    projects: [],
    achievements: [],
    work: [],
    education: [],
  };
  for (const c of rawClaims) buckets[c.section].push(c);

  const positioned = new Map<string, Claim>();
  const sections: Array<{ section: ClaimSection; y: number }> = [];
  let cursorY = PAD_TOP;

  for (const section of SECTION_ORDER) {
    const items = buckets[section];
    if (items.length === 0) continue;

    sections.push({ section, y: cursorY });
    let rowY = cursorY + SECTION_HEADER_H;
    let col = 0;
    let rowMaxH = 0;

    for (const c of items) {
      const span = 1; // uniform width for all cards
      if (col + span > COLS) {
        rowY += rowMaxH + ROW_GAP;
        col = 0;
        rowMaxH = 0;
      }
      const x = PAD_X + col * (COL_W + COL_GAP);
      const h = SIZE_TO_HEIGHT.md;
      positioned.set(c.id, { ...c, position: { x, y: rowY } });
      col += span;
      rowMaxH = Math.max(rowMaxH, h);
    }

    cursorY = rowY + rowMaxH + SECTION_GAP;
  }

  return {
    claims: rawClaims.map((c) => positioned.get(c.id) || c),
    sections,
    height: Math.max(cursorY, 600),
  };
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function ProofHeaderBar({ profile }: { profile: ProofProfile }) {
  const { header } = profile;
  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-6 py-4">
        <img
          src={header.avatar}
          alt=""
          className="h-12 w-12 rounded-md border border-border object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="text-[18px] font-medium tracking-tight text-foreground">
              {header.name}
            </h1>
            <span className="mono inline-flex items-center gap-1 text-[12px] text-tertiary-fg">
              <MapPin className="h-3 w-3" aria-hidden />
              {header.location}
            </span>
          </div>
          <p className="mt-0.5 text-[14px] text-muted-fg">{header.bio}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {header.linkedin && (
            <a
              href={header.linkedin}
              target="_blank"
              rel="noreferrer"
              aria-label="View LinkedIn profile"
              className="inline-flex items-center gap-2 rounded-md border border-[#0A66C2]/40 bg-[#0A66C2] px-3 py-1.5 text-[13px] font-medium text-white shadow-[0_4px_14px_-6px_rgba(10,102,194,0.6)] transition-all hover:bg-[#0958a8] hover:shadow-[0_6px_18px_-6px_rgba(10,102,194,0.8)]"
            >
              <Linkedin className="h-4 w-4" />
              LinkedIn
            </a>
          )}
          {header.github && (
            <a
              href={header.github}
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="rounded-md p-1.5 text-muted-fg transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <Github className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

function FilterBar({
  profile,
  active,
  onToggle,
  onClear,
}: {
  profile: ProofProfile;
  active: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-2 px-6 py-3">
        <span className="label-mono mr-1">Filter</span>
        {profile.filters.map((f) => {
          const isActive = active.has(f.id);
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onToggle(f.id)}
              aria-pressed={isActive}
              className={[
                "mono rounded-full border px-3 py-1 text-[11px] uppercase tracking-wider transition-colors",
                isActive
                  ? "border-accent bg-accent text-accent-fg"
                  : "border-border text-muted-fg hover:border-muted-fg hover:text-foreground",
              ].join(" ")}
            >
              {f.label}
            </button>
          );
        })}
        {active.size > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="mono ml-2 text-[11px] uppercase tracking-wider text-tertiary-fg underline-offset-4 hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section labels (floating on the board)
// ---------------------------------------------------------------------------

function SectionLabels({
  sections,
}: {
  sections: Array<{ section: ClaimSection; y: number }>;
}) {
  return (
    <>
      {sections.map(({ section, y }) => (
        <div
          key={section}
          className="pointer-events-none absolute select-none"
          style={{ left: 32, top: y, width: PAD_X - 48 }}
        >
          <div className="mono text-[11px] font-medium uppercase tracking-[0.18em] text-tertiary-fg">
            {SECTION_LABEL[section]}
          </div>
          <div className="mt-2 h-px w-8 bg-border" />
        </div>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Evidence row
// ---------------------------------------------------------------------------

function EvidenceRow({ ev }: { ev: Evidence }) {
  const inner = (
    <div className="group/ev flex items-start gap-3 rounded-md border border-border/60 px-3 py-2.5 transition-colors hover:border-muted-fg">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <LanguageDot lang={ev.language} />
          <span className="text-[14px] font-medium text-foreground">
            {ev.title}
          </span>
          {ev.meta && (
            <span className="mono text-[11px] text-tertiary-fg">{ev.meta}</span>
          )}
        </div>
        {ev.description && (
          <p className="mt-1 text-[13px] leading-snug text-muted-fg">
            {ev.description}
          </p>
        )}
      </div>
      {ev.url && (
        <ExternalLink
          className="mt-1 h-3.5 w-3.5 shrink-0 text-tertiary-fg transition-colors group-hover/ev:text-foreground"
          aria-hidden
        />
      )}
    </div>
  );
  if (!ev.url) return inner;
  return (
    <a
      href={ev.url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="block"
    >
      {inner}
    </a>
  );
}

// ---------------------------------------------------------------------------
// Claim card
// ---------------------------------------------------------------------------

interface CardProps {
  claim: Claim;
  selected: boolean;
  dim: boolean;
  highlight: boolean;
  jobMatch: boolean;
  onSelect: (id: string) => void;
  index: number;
  filterLabelById: Map<string, string>;
}

function ClaimCard({
  claim,
  selected,
  dim,
  highlight,
  jobMatch,
  onSelect,
  index,
  filterLabelById,
}: CardProps) {
  const width = spanWidth(1);
  const x = claim.position?.x ?? 0;
  const y = claim.position?.y ?? 0;

  const tagEls: React.ReactNode[] = [];
  claim.tags.slice(0, 5).forEach((t, i) => {
    if (i > 0) {
      tagEls.push(
        <span key={`sep-${i}`} className="mono text-[10px] text-tertiary-fg/60">
          ·
        </span>,
      );
    }
    tagEls.push(
      <span
        key={t}
        className="mono text-[10px] uppercase tracking-wider text-tertiary-fg"
      >
        {filterLabelById.get(t) || t}
      </span>,
    );
  });

  return (
    <motion.button
      type="button"
      layout
      onClick={(e) => {
        e.stopPropagation();
        onSelect(claim.id);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(claim.id);
        }
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{
        opacity: dim ? 0.25 : 1,
        y: jobMatch ? -3 : 0,
        scale: dim ? 0.97 : jobMatch ? 1.03 : 1,
        filter: dim ? "saturate(0.3)" : "saturate(1)",
      }}
      transition={{
        opacity: { duration: 0.3, delay: index * 0.04, ease: "easeOut" },
        y: { duration: 0.45, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] },
        scale: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
        filter: { duration: 0.3, ease: "easeOut" },
        layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
      }}
      whileHover={dim ? undefined : { scale: jobMatch ? 1.05 : 1.02 }}
      className={[
        "absolute text-left",
        "rounded-lg border bg-background transition-shadow",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        selected
          ? "border-accent shadow-[0_0_0_2px_hsl(var(--accent)/0.55),0_18px_50px_-14px_hsl(var(--accent)/0.6)] z-30"
          : jobMatch
            ? "border-accent shadow-[0_0_0_1px_hsl(var(--accent)/0.45),0_16px_48px_-12px_hsl(var(--accent)/0.6)] z-20 hover:shadow-[0_16px_40px_-12px_hsl(var(--accent)/0.7)]"
            : highlight
              ? "border-accent/60 shadow-[0_0_0_1px_rgba(76,110,245,0.25),0_4px_24px_-12px_rgba(76,110,245,0.4)] z-10"
              : "border-border z-10 shadow-[0_2px_10px_-6px_rgba(0,0,0,0.6)] hover:shadow-[0_8px_24px_-10px_rgba(0,0,0,0.7)]",
      ].join(" ")}
      style={{ left: x, top: y, width, cursor: "pointer" }}
      aria-pressed={selected}
    >
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <ClaimGlyph claim={claim} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium leading-snug text-foreground">
            {claim.text}
          </p>
          {claim.subtext && (
            <p className="mt-1 text-[13px] leading-snug text-muted-fg">
              {claim.subtext}
            </p>
          )}
        </div>
      </div>

      {tagEls.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 border-t border-border/50 px-4 py-2">
          {tagEls}
        </div>
      )}
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// Detail side panel
// ---------------------------------------------------------------------------

function ClaimDetailPanel({
  claim,
  filterLabelById,
  onClose,
}: {
  claim: Claim | null;
  filterLabelById: Map<string, string>;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {claim && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          />
          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[480px] flex-col border-l border-border bg-background shadow-[-24px_0_60px_-20px_rgba(0,0,0,0.6)]"
            role="dialog"
            aria-label={claim.text}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div className="flex items-start gap-3">
                <ClaimGlyph claim={claim} />
                <div>
                  <div className="mono text-[10px] uppercase tracking-[0.18em] text-tertiary-fg">
                    {SECTION_LABEL[claim.section]}
                  </div>
                  <h2 className="mt-1 text-[17px] font-medium leading-snug text-foreground">
                    {claim.text}
                  </h2>
                  {claim.subtext && (
                    <p className="mt-1 text-[14px] leading-snug text-muted-fg">
                      {claim.subtext}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1.5 text-muted-fg transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-5">
              <div className="label-mono mb-3">Evidence</div>
              <div className="space-y-2">
                {claim.evidence.map((ev, i) => (
                  <EvidenceRow key={i} ev={ev} />
                ))}
              </div>

              {claim.tags.length > 0 && (
                <>
                  <div className="label-mono mb-3 mt-8">Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {claim.tags.map((t) => (
                      <span
                        key={t}
                        className="mono rounded-full border border-border px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-fg"
                      >
                        {filterLabelById.get(t) || t}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Pannable board
// ---------------------------------------------------------------------------

interface BoardProps {
  claims: Claim[];
  sections: Array<{ section: ClaimSection; y: number }>;
  boardHeight: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  activeFilters: Set<string>;
  filterLabelById: Map<string, string>;
  jobMatchedIds: Set<string>;
}

function PannableBoard({
  claims,
  sections,
  boardHeight,
  expandedIds,
  onToggle,
  activeFilters,
  filterLabelById,
  jobMatchedIds,
}: BoardProps) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const [tx, setTx] = React.useState(0);
  const [ty, setTy] = React.useState(0);
  const [isDragging, setDragging] = React.useState(false);
  const dragState = React.useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  const clamp = React.useCallback((nx: number, ny: number) => {
    const vp = viewportRef.current;
    if (!vp) return { x: nx, y: ny };
    const w = vp.clientWidth;
    const h = vp.clientHeight;
    // Allow generous bottom slack so expanded cards never strand content.
    const effectiveH = boardHeight + 240;
    const minX = Math.min(0, w - BOARD_W);
    const minY = Math.min(0, h - effectiveH);
    return {
      x: Math.min(0, Math.max(minX, nx)),
      y: Math.min(0, Math.max(minY, ny)),
    };
  }, [boardHeight]);

  const recenter = React.useCallback(() => {
    // Default view: top-left aligned (densest zone visible).
    const { x, y } = clamp(0, 0);
    setTx(x);
    setTy(y);
  }, [clamp]);

  React.useEffect(() => {
    recenter();
    // Re-clamp on viewport resize.
    function onResize() {
      setTx((v) => clamp(v, ty).x);
      setTy((v) => clamp(tx, v).y);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pointer-based drag panning on background.
  React.useEffect(() => {
    function onMove(e: PointerEvent) {
      const s = dragState.current;
      if (!s) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      const { x, y } = clamp(s.baseX + dx, s.baseY + dy);
      setTx(x);
      setTy(y);
    }
    function onUp() {
      setDragging(false);
      dragState.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    function onDown(e: PointerEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-card]")) return;
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        baseX: tx,
        baseY: ty,
      };
      setDragging(true);
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }
    const vp = viewportRef.current;
    vp?.addEventListener("pointerdown", onDown);
    return () => {
      vp?.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [tx, ty, clamp]);

  // Wheel / trackpad pan.
  React.useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const { x, y } = clamp(tx - e.deltaX, ty - e.deltaY);
      setTx(x);
      setTy(y);
    }
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [tx, ty, clamp]);

  // Arrow key panning.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const step = 60;
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = step;
      else if (e.key === "ArrowRight") dx = -step;
      else if (e.key === "ArrowUp") dy = step;
      else if (e.key === "ArrowDown") dy = -step;
      else return;
      e.preventDefault();
      const { x, y } = clamp(tx + dx, ty + dy);
      setTx(x);
      setTy(y);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tx, ty, clamp]);

  const visibleHighlight = activeFilters.size > 0;
  const matches = (c: Claim) =>
    !visibleHighlight || c.tags.some((t) => activeFilters.has(t));
  const allDimmed =
    visibleHighlight && claims.every((c) => !matches(c));

  return (
    <div
      ref={viewportRef}
      className="relative flex-1 select-none overflow-hidden"
      style={{ cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
    >
      <div
        className="relative origin-top-left"
        style={{
          width: BOARD_W,
          height: boardHeight,
          transform: `translate3d(${tx}px, ${ty}px, 0)`,
          transition: isDragging
            ? "none"
            : "transform 250ms cubic-bezier(0.22, 1, 0.36, 1)",
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      >
        <SectionLabels sections={sections} />

        {claims.map((claim, i) => {
          const isMatch = matches(claim);
          const dim = visibleHighlight && !isMatch;
          const highlight = visibleHighlight && isMatch;
          return (
            <div key={claim.id} data-card>
              <ClaimCard
                claim={claim}
                expanded={expandedIds.has(claim.id)}
                dim={dim}
                highlight={highlight}
                jobMatch={jobMatchedIds.has(claim.id)}
                onToggle={onToggle}
                index={i}
                filterLabelById={filterLabelById}
              />
            </div>
          );
        })}
      </div>

      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-12 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-12 bg-gradient-to-l from-background to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-10 bg-gradient-to-b from-background to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-10 bg-gradient-to-t from-background to-transparent" />

      {allDimmed && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-30 mx-auto w-fit -translate-y-1/2 rounded-md border border-border bg-background/90 px-4 py-2 backdrop-blur">
          <p className="mono text-[12px] uppercase tracking-wider text-muted-fg">
            No claims match these filters.
          </p>
        </div>
      )}

    </div>
  );
}

// ---------------------------------------------------------------------------
// Sparse fallback (vertical list)
// ---------------------------------------------------------------------------

function SparseList({
  claims,
  expandedIds,
  onToggle,
  activeFilters,
  filterLabelById,
}: {
  claims: Claim[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  activeFilters: Set<string>;
  filterLabelById: Map<string, string>;
}) {
  const visibleHighlight = activeFilters.size > 0;
  return (
    <div className="mx-auto w-full max-w-[640px] flex-1 space-y-4 overflow-auto px-6 py-10">
      {claims.map((c) => {
        const isMatch =
          !visibleHighlight || c.tags.some((t) => activeFilters.has(t));
        const dim = visibleHighlight && !isMatch;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle(c.id)}
            className={[
              "block w-full rounded-lg border border-border bg-background p-4 text-left transition-all",
              dim ? "opacity-25 saturate-50" : "opacity-100",
            ].join(" ")}
          >
            <p className="text-[15px] font-medium text-foreground">{c.text}</p>
            {expandedIds.has(c.id) && (
              <div className="mt-3 space-y-2">
                {c.evidence.map((ev, i) => (
                  <EvidenceRow key={i} ev={ev} />
                ))}
              </div>
            )}
            {c.tags.length > 0 && (
              <p className="mono mt-3 text-[10px] uppercase tracking-wider text-tertiary-fg">
                {c.tags.map((t) => filterLabelById.get(t) || t).join(" · ")}
              </p>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function ProofGraph({ profile }: { profile: ProofProfile }) {
  const filterLabelById = React.useMemo(
    () => new Map(profile.filters.map((f) => [f.id, f.label])),
    [profile.filters],
  );

  const jobFilterIds = React.useMemo(
    () => new Set(profile.jobActiveFilterIds ?? []),
    [profile.jobActiveFilterIds],
  );

  // Permissive job match: a claim matches if it shares ANY tag with the job's
  // required filters. The list of job filters is intentionally short so the
  // rearrangement still feels selective.
  const isJobMatch = React.useCallback(
    (c: Claim) => {
      if (!profile.jobLoaded || jobFilterIds.size === 0) return false;
      return c.tags.some((t) => jobFilterIds.has(t));
    },
    [profile.jobLoaded, jobFilterIds],
  );

  // When a job is loaded, keep all cards the same size but reorder so matched
  // claims flow first inside their section (taking the prominent top-left
  // slots). Highlighting + auto-expand do the visual work.
  const arrangedClaims = React.useMemo(() => {
    if (!profile.jobLoaded) return profile.claims;
    const matched: Claim[] = [];
    const rest: Claim[] = [];
    for (const c of profile.claims) {
      if (isJobMatch(c)) matched.push(c);
      else rest.push(c);
    }
    return [...matched, ...rest];
  }, [profile.claims, profile.jobLoaded, isJobMatch]);

  const jobMatchedIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (profile.jobLoaded) {
      for (const c of profile.claims) if (isJobMatch(c)) ids.add(c.id);
    }
    return ids;
  }, [profile.claims, profile.jobLoaded, isJobMatch]);

  // Expansion state. When a job loads, all matched claims auto-expand; the
  // user can still manually open/close any card on top of that.
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => new Set(jobMatchedIds),
  );

  React.useEffect(() => {
    setExpandedIds(new Set(jobMatchedIds));
  }, [jobMatchedIds]);

  const { claims, sections, height: boardHeight } = React.useMemo(
    () => autoLayout(arrangedClaims, expandedIds),
    [arrangedClaims, expandedIds],
  );

  // Filters: when a job is loaded, the rearrangement IS the signal — don't
  // also dim. Filter chips remain interactive for manual refinement.
  const [activeFilters, setActiveFilters] = React.useState<Set<string>>(
    new Set(),
  );

  React.useEffect(() => {
    // Reset manual filters whenever job context flips.
    setActiveFilters(new Set());
  }, [profile.jobLoaded]);

  const toggleFilter = React.useCallback((id: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearFilters = React.useCallback(() => {
    setActiveFilters(new Set());
  }, []);

  const toggleClaim = React.useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setExpandedIds(new Set());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const sparse = claims.length < 5;

  return (
    <div className="flex h-screen flex-col">
      <ProofHeaderBar profile={profile} />
      <FilterBar
        profile={profile}
        active={activeFilters}
        onToggle={toggleFilter}
        onClear={clearFilters}
      />
      {sparse ? (
        <SparseList
          claims={claims}
          expandedIds={expandedIds}
          onToggle={toggleClaim}
          activeFilters={activeFilters}
          filterLabelById={filterLabelById}
        />
      ) : (
        <PannableBoard
          claims={claims}
          sections={sections}
          boardHeight={boardHeight}
          expandedIds={expandedIds}
          onToggle={toggleClaim}
          activeFilters={activeFilters}
          filterLabelById={filterLabelById}
          jobMatchedIds={jobMatchedIds}
        />
      )}
    </div>
  );
}
