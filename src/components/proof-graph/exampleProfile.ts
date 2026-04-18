import type { ProofProfile } from "./types";

// Realistic example. ~10 claims spread across sections, varied tag coverage,
// varied evidence counts, hand-arranged positions for an organic feel.

export const exampleProfile: ProofProfile = {
  header: {
    name: "Sasha Lindqvist",
    avatar:
      "https://api.dicebear.com/7.x/notionists/svg?seed=sasha&backgroundColor=1f1f22",
    location: "Stockholm, Sweden",
    bio: "Backend engineer. Distributed systems, Rust, infrastructure.",
    linkedin: "https://linkedin.com/in/example",
    github: "https://github.com/example",
  },
  filters: [
    { id: "rust", label: "Rust" },
    { id: "distributed", label: "Distributed systems" },
    { id: "frontend", label: "Frontend" },
    { id: "open-source", label: "Open source" },
    { id: "production", label: "Shipped to production" },
    { id: "teaching", label: "Teaching" },
    { id: "infra", label: "Infrastructure" },
    { id: "go", label: "Go" },
  ],
  jobActiveFilterIds: ["rust", "distributed", "production"],
  claims: [
    {
      id: "c1",
      section: "projects",
      text: "Ships production Rust services handling 40k req/s.",
      tags: ["rust", "distributed", "production", "infra"],
      size: "lg",
      position: { x: 60, y: 60 },
      evidence: [
        {
          type: "repo",
          title: "edgeproxy",
          description: "Async TCP/HTTP edge proxy with pluggable middleware.",
          url: "https://github.com/example/edgeproxy",
          language: "Rust",
        },
        {
          type: "deploy",
          title: "edgeproxy.dev",
          description: "Live status page and benchmarks.",
          url: "https://example.com",
        },
      ],
    },
    {
      id: "c2",
      section: "projects",
      text: "Built a real-time collab tool used by 200+ teams.",
      tags: ["frontend", "production", "distributed"],
      size: "md",
      position: { x: 470, y: 110 },
      evidence: [
        {
          type: "repo",
          title: "weave",
          description: "Multiplayer canvas with CRDT-based sync.",
          url: "https://github.com/example/weave",
          language: "TypeScript",
        },
      ],
    },
    {
      id: "c3",
      section: "projects",
      text: "Maintainer of a Rust crate with 1.2k stars.",
      tags: ["rust", "open-source"],
      size: "sm",
      position: { x: 820, y: 60 },
      evidence: [
        {
          type: "repo",
          title: "tinyvec-ext",
          description: "Extensions and adapters for tinyvec.",
          url: "https://github.com/example/tinyvec-ext",
          language: "Rust",
        },
      ],
    },
    {
      id: "c4",
      section: "projects",
      text: "Wrote a load balancer from scratch to learn consistent hashing.",
      tags: ["distributed", "go"],
      size: "md",
      position: { x: 100, y: 330 },
      evidence: [
        {
          type: "repo",
          title: "ringlb",
          description: "Tiny consistent-hash L4 LB with weighted nodes.",
          url: "https://github.com/example/ringlb",
          language: "Go",
        },
        {
          type: "link",
          title: "Write-up: Why consistent hashing isn't enough",
          url: "https://example.com/post",
        },
      ],
    },
    {
      id: "c5",
      section: "projects",
      text: "Open-sourced a Postgres extension for time-series compaction.",
      tags: ["open-source", "infra", "production"],
      size: "md",
      position: { x: 510, y: 360 },
      evidence: [
        {
          type: "repo",
          title: "pg_compactseries",
          description: "Background compaction for append-only tables.",
          url: "https://github.com/example/pg_compactseries",
          language: "C",
        },
      ],
    },
    {
      id: "c6",
      section: "work",
      text: "Led infra rewrite at a Series B fintech, cut p99 by 60%.",
      tags: ["distributed", "infra", "production", "rust"],
      size: "lg",
      position: { x: 60, y: 640 },
      evidence: [
        {
          type: "work",
          title: "Klarpay",
          description:
            "Migrated payments pipeline from Node to Rust + Tokio, removed three queues.",
          meta: "Senior Backend Engineer · 2022 — 2024",
        },
      ],
    },
    {
      id: "c7",
      section: "work",
      text: "Built the data platform team at a 30-person startup.",
      tags: ["infra", "production", "go"],
      size: "md",
      position: { x: 510, y: 680 },
      evidence: [
        {
          type: "work",
          title: "Northgrid",
          description:
            "Hired 3, set up streaming ingestion, owned warehouse spend.",
          meta: "Founding Data Engineer · 2020 — 2022",
        },
      ],
    },
    {
      id: "c8",
      section: "work",
      text: "TA'd the distributed systems course at university.",
      tags: ["teaching", "distributed"],
      size: "sm",
      position: { x: 900, y: 660 },
      evidence: [
        {
          type: "work",
          title: "KTH",
          description:
            "Wrote new lab on Raft, graded 90 students for two semesters.",
          meta: "Teaching Assistant · 2019 — 2020",
        },
      ],
    },
    {
      id: "c9",
      section: "education",
      text: "Studied CS at KTH, focused on distributed systems.",
      tags: ["distributed"],
      size: "md",
      position: { x: 80, y: 940 },
      evidence: [
        {
          type: "education",
          title: "KTH Royal Institute of Technology",
          description: "MSc Computer Science. Thesis on consensus latency.",
          meta: "2017 — 2020",
        },
      ],
    },
    {
      id: "c10",
      section: "education",
      text: "Self-taught Rust through Advent of Code and rewriting old projects.",
      tags: ["rust", "teaching"],
      size: "sm",
      position: { x: 510, y: 960 },
      evidence: [
        {
          type: "link",
          title: "Advent of Code 2022 solutions",
          url: "https://github.com/example/aoc-2022",
        },
      ],
    },
  ],
};
