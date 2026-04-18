import { AnimatePresence, motion } from "framer-motion";
import { Github, Linkedin, MapPin, X } from "lucide-react";
import * as React from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type {
  EducationMeta,
  ProjectMeta,
  ProofCard,
  ProofGroup,
  ProofProfile,
  WorkMeta,
} from "./types";

// ---------- generated visuals ----------

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickColor(seed: string, fallback?: string): string {
  if (fallback) return fallback;
  const palette = [
    "#4c6ef5",
    "#e8a87c",
    "#73ffb8",
    "#c44569",
    "#c9a84c",
    "#5cbdb9",
    "#9b72cf",
    "#a0c49d",
  ];
  return palette[hashString(seed) % palette.length];
}

function AbstractVisual({
  seed,
  color,
  variant = "blob",
}: {
  seed: string;
  color: string;
  variant?: "blob" | "grid" | "wave";
}) {
  const h = hashString(seed);
  const dx = (h % 40) - 20;
  const dy = ((h >> 3) % 30) - 15;
  return (
    <svg
      viewBox="0 0 200 100"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id={`g-${seed}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <rect width="200" height="100" fill={`url(#g-${seed})`} />
      {variant === "blob" && (
        <circle
          cx={120 + dx}
          cy={50 + dy}
          r={48}
          fill={color}
          fillOpacity="0.18"
        />
      )}
      {variant === "grid" && (
        <g stroke={color} strokeOpacity="0.25" strokeWidth="0.6">
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 20} y1={0} x2={i * 20} y2={100} />
          ))}
          {Array.from({ length: 5 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 20} x2={200} y2={i * 20} />
          ))}
        </g>
      )}
      {variant === "wave" && (
        <path
          d={`M0 ${60 + dy} Q 50 ${30 + dy} 100 ${60 + dy} T 200 ${60 + dy} V100 H0 Z`}
          fill={color}
          fillOpacity="0.22"
        />
      )}
    </svg>
  );
}

// ---------- card renderers ----------

function LanguageDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    />
  );
}

function CardShell({
  children,
  onClick,
  highlight,
  dim,
}: {
  children: React.ReactNode;
  onClick: () => void;
  highlight: boolean;
  dim: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      layout
      animate={{
        opacity: dim ? 0.2 : 1,
        scale: dim ? 0.95 : highlight ? 1.04 : 1,
        filter: dim ? "saturate(0.2)" : "saturate(1)",
      }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: dim ? 0.97 : 1.05, filter: "saturate(1)" }}
      className={cn(
        "group relative w-[260px] overflow-hidden rounded-lg border text-left",
        "bg-background/40 backdrop-blur-sm",
        "shadow-[0_1px_0_rgba(255,255,255,0.02)_inset,0_8px_24px_-12px_rgba(0,0,0,0.5)]",
        "hover:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_16px_32px_-12px_rgba(0,0,0,0.7)]",
        "transition-shadow",
      )}
      style={{ borderColor: "var(--border)" }}
    >
      {children}
    </motion.button>
  );
}

function ProjectCard({
  card,
  onClick,
  highlight,
  dim,
}: {
  card: ProofCard;
  onClick: () => void;
  highlight: boolean;
  dim: boolean;
}) {
  const meta = card.meta as ProjectMeta;
  const color = pickColor(card.title, meta.languageColor);
  return (
    <CardShell onClick={onClick} highlight={highlight} dim={dim}>
      <div className="h-20 w-full">
        {card.visual ? (
          <img
            src={card.visual}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <AbstractVisual seed={card.title} color={color} variant="blob" />
        )}
      </div>
      <div className="space-y-1.5 px-3.5 py-3">
        <div className="text-[15px] font-medium text-foreground">
          {card.title}
        </div>
        <div className="text-[13px] leading-snug text-muted-fg">
          {card.description}
        </div>
        {meta.language && (
          <div className="mono flex items-center gap-1.5 pt-1 text-[11px] text-tertiary-fg">
            <LanguageDot color={color} />
            {meta.language}
          </div>
        )}
      </div>
    </CardShell>
  );
}

function EducationCard({
  card,
  onClick,
  highlight,
  dim,
}: {
  card: ProofCard;
  onClick: () => void;
  highlight: boolean;
  dim: boolean;
}) {
  const meta = card.meta as EducationMeta;
  const color = pickColor(meta.institution, meta.crestColor);
  const initials = meta.institution
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <CardShell onClick={onClick} highlight={highlight} dim={dim}>
      <div className="flex items-start gap-3 px-3.5 py-3.5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-medium"
          style={{
            backgroundColor: `${color}22`,
            color,
            border: `1px solid ${color}55`,
          }}
        >
          {initials}
        </div>
        <div className="min-w-0 space-y-1">
          <div className="text-[15px] font-medium text-foreground">
            {meta.institution}
          </div>
          <div className="text-[13px] leading-snug text-muted-fg">
            {meta.program}
          </div>
          {meta.years && (
            <div className="mono pt-0.5 text-[11px] text-tertiary-fg">
              {meta.years}
            </div>
          )}
        </div>
      </div>
    </CardShell>
  );
}

function WorkCard({
  card,
  onClick,
  highlight,
  dim,
}: {
  card: ProofCard;
  onClick: () => void;
  highlight: boolean;
  dim: boolean;
}) {
  const meta = card.meta as WorkMeta;
  const color = pickColor(meta.company, meta.accentColor);
  return (
    <CardShell onClick={onClick} highlight={highlight} dim={dim}>
      <div className="h-16 w-full">
        <AbstractVisual seed={meta.company} color={color} variant="wave" />
      </div>
      <div className="flex items-start gap-3 px-3.5 py-3">
        {meta.logoUrl ? (
          <img
            src={meta.logoUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[12px] font-semibold"
            style={{
              backgroundColor: `${color}22`,
              color,
              border: `1px solid ${color}55`,
            }}
          >
            {meta.company[0]}
          </div>
        )}
        <div className="min-w-0 space-y-1">
          <div className="text-[15px] font-medium text-foreground">
            {meta.role}{" "}
            <span className="text-muted-fg">· {meta.company}</span>
          </div>
          <div className="text-[13px] leading-snug text-muted-fg">
            {card.description}
          </div>
        </div>
      </div>
    </CardShell>
  );
}

function CardRouter(props: {
  card: ProofCard;
  onClick: () => void;
  highlight: boolean;
  dim: boolean;
}) {
  if (props.card.type === "project") return <ProjectCard {...props} />;
  if (props.card.type === "education") return <EducationCard {...props} />;
  return <WorkCard {...props} />;
}

// ---------- group region ----------

function Group({
  group,
  onCardClick,
  jobLoaded,
  index,
}: {
  group: ProofGroup;
  onCardClick: (c: ProofCard) => void;
  jobLoaded: boolean;
  index: number;
}) {
  if (group.items.length === 0) return null;
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 + index * 0.06 }}
      className="rounded-2xl bg-foreground/[0.02] p-5 sm:p-6"
    >
      <div className="label-mono mb-4">{group.label}</div>
      <div className="flex flex-wrap gap-4">
        {group.items.map((card, i) => {
          const dim = jobLoaded && card.relevant === false;
          const highlight = jobLoaded && card.relevant === true;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: 0.1 + index * 0.06 + i * 0.04,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <CardRouter
                card={card}
                onClick={() => onCardClick(card)}
                highlight={highlight}
                dim={dim}
              />
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

// ---------- pannable canvas ----------

function PannableCanvas({ children }: { children: React.ReactNode }) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{
    startX: number;
    startY: number;
    scrollX: number;
    scrollY: number;
    active: boolean;
  }>({ startX: 0, startY: 0, scrollX: 0, scrollY: 0, active: false });

  const onPointerDown = (e: React.PointerEvent) => {
    // Only pan when grabbing the background, not a card.
    if ((e.target as HTMLElement).closest("button, a")) return;
    const el = wrapperRef.current;
    if (!el) return;
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollX: el.scrollLeft,
      scrollY: el.scrollTop,
      active: true,
    };
    el.setPointerCapture(e.pointerId);
    el.style.cursor = "grabbing";
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return;
    const el = wrapperRef.current;
    if (!el) return;
    el.scrollLeft = drag.current.scrollX - (e.clientX - drag.current.startX);
    el.scrollTop = drag.current.scrollY - (e.clientY - drag.current.startY);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    drag.current.active = false;
    const el = wrapperRef.current;
    if (el) {
      el.releasePointerCapture(e.pointerId);
      el.style.cursor = "grab";
    }
  };

  return (
    <div
      ref={wrapperRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="relative overflow-auto"
      style={{ cursor: "grab", maxHeight: "calc(100vh - 220px)" }}
    >
      <div ref={innerRef} className="min-w-full">
        {children}
      </div>
    </div>
  );
}

// ---------- detail panel ----------

function DetailPanel({
  card,
  onClose,
}: {
  card: ProofCard | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={!!card} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-lg"
      >
        {card && (
          <div className="space-y-6 p-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="label-mono">{card.type}</div>
                <h2 className="mt-1 text-[22px] font-medium text-foreground">
                  {card.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-muted-fg hover:bg-foreground/5 hover:text-foreground"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-[15px] leading-relaxed text-muted-fg">
              {card.description}
            </p>
            {card.detail && (
              <div className="whitespace-pre-wrap rounded-lg bg-foreground/[0.03] p-4 text-[14px] leading-relaxed text-foreground/90">
                {card.detail}
              </div>
            )}
            {card.type === "project" &&
              (card.meta as ProjectMeta).url && (
                <a
                  href={(card.meta as ProjectMeta).url}
                  target="_blank"
                  rel="noreferrer"
                  className="mono inline-block text-[12px] text-foreground underline underline-offset-4 hover:opacity-70"
                >
                  Open repo ↗
                </a>
              )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ---------- header ----------

function ProfileHeader({ header }: { header: ProofProfile["header"] }) {
  const initials = header.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <header className="flex items-center gap-4 pb-8">
      {header.avatar ? (
        <img
          src={header.avatar}
          alt={header.name}
          className="h-14 w-14 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5 text-[14px] font-medium text-foreground">
          {initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-[20px] font-medium leading-tight text-foreground">
          {header.name}
        </h1>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-fg">
          {header.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} />
              {header.location}
            </span>
          )}
          {header.bio && <span className="text-muted-fg">· {header.bio}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {header.github && (
          <a
            href={header.github}
            target="_blank"
            rel="noreferrer"
            className="rounded-md p-2 text-muted-fg hover:bg-foreground/5 hover:text-foreground"
            aria-label="GitHub"
          >
            <Github size={16} />
          </a>
        )}
        {header.linkedin && (
          <a
            href={header.linkedin}
            target="_blank"
            rel="noreferrer"
            className="rounded-md p-2 text-muted-fg hover:bg-foreground/5 hover:text-foreground"
            aria-label="LinkedIn"
          >
            <Linkedin size={16} />
          </a>
        )}
      </div>
    </header>
  );
}

// ---------- sparse fallback list ----------

function SparseList({
  groups,
  onCardClick,
  jobLoaded,
}: {
  groups: ProofGroup[];
  onCardClick: (c: ProofCard) => void;
  jobLoaded: boolean;
}) {
  return (
    <div className="space-y-8">
      {groups.map((g) =>
        g.items.length === 0 ? null : (
          <section key={g.id}>
            <div className="label-mono mb-3">{g.label}</div>
            <div className="flex flex-col gap-3">
              {g.items.map((card) => {
                const dim = jobLoaded && card.relevant === false;
                const highlight = jobLoaded && card.relevant === true;
                return (
                  <CardRouter
                    key={card.id}
                    card={card}
                    onClick={() => onCardClick(card)}
                    highlight={highlight}
                    dim={dim}
                  />
                );
              })}
            </div>
          </section>
        ),
      )}
    </div>
  );
}

// ---------- main ----------

export function ProofGraph({ profile }: { profile: ProofProfile }) {
  const [active, setActive] = React.useState<ProofCard | null>(null);
  const total = profile.groups.reduce((acc, g) => acc + g.items.length, 0);
  const jobLoaded = !!profile.jobLoaded;
  const sparse = total < 6;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <ProfileHeader header={profile.header} />

      {sparse ? (
        <SparseList
          groups={profile.groups}
          onCardClick={setActive}
          jobLoaded={jobLoaded}
        />
      ) : (
        <PannableCanvas>
          <div className="flex flex-col gap-6 pb-6">
            {profile.groups.map((g, i) => (
              <Group
                key={g.id}
                group={g}
                index={i}
                onCardClick={setActive}
                jobLoaded={jobLoaded}
              />
            ))}
          </div>
        </PannableCanvas>
      )}

      <AnimatePresence>
        <DetailPanel card={active} onClose={() => setActive(null)} />
      </AnimatePresence>
    </div>
  );
}
