import type { ProofProfile } from "./types";

export const exampleProfile: ProofProfile = {
  header: {
    name: "Maya Okonkwo",
    location: "Lisbon, PT",
    bio: "Backend engineer. Distributed systems, developer tools.",
    github: "https://github.com/example",
    linkedin: "https://linkedin.com/in/example",
  },
  jobLoaded: false,
  groups: [
    {
      id: "projects",
      label: "Projects",
      items: [
        {
          id: "p1",
          type: "project",
          title: "litequeue",
          description:
            "Embeddable durable job queue in 800 LOC of Rust. Single-file SQLite backend.",
          meta: {
            language: "Rust",
            languageColor: "#e8a87c",
            url: "https://github.com/example/litequeue",
            topic: "queues",
          },
          relevant: true,
          detail:
            "litequeue is an at-least-once job queue that fits in a single file.\n\nWhy: most queue libraries assume Redis or Postgres. litequeue assumes nothing — it's a library, not a service.\n\nDesign notes\n· WAL-backed visibility timeouts\n· crash-safe ack/nack\n· no background goroutines, all driven by callers\n\nUsed in two production deployments serving ~40k jobs/day.",
        },
        {
          id: "p2",
          type: "project",
          title: "tinytrace",
          description:
            "Span-based tracer that emits OTLP without an SDK. Zero allocations on the hot path.",
          meta: {
            language: "Go",
            languageColor: "#5cbdb9",
            url: "https://github.com/example/tinytrace",
          },
          relevant: true,
        },
        {
          id: "p3",
          type: "project",
          title: "kettle",
          description:
            "tiny key/value store with leases. ~1200 LOC. Raft-free, single-writer.",
          meta: {
            language: "Zig",
            languageColor: "#c9a84c",
          },
          relevant: false,
        },
        {
          id: "p4",
          type: "project",
          title: "rgrep",
          description:
            "Weekend rewrite of grep using Aho-Corasick + memory mapping. Faster than ripgrep on small files.",
          meta: { language: "Rust", languageColor: "#e8a87c" },
          relevant: false,
        },
      ],
    },
    {
      id: "work",
      label: "Work",
      items: [
        {
          id: "w1",
          type: "work",
          title: "Fly.io",
          description:
            "Took the multi-region Postgres image from research project to GA in 7 months.",
          meta: { company: "Fly.io", role: "Senior Backend Engineer" },
          relevant: true,
          detail:
            "Owned the storage layer for fly-postgres.\n\nShipped:\n· consensus-based failover\n· per-volume snapshot pipeline\n· customer-facing restore tooling\n\nAlso wrote most of the public docs for the storage subsystem.",
        },
        {
          id: "w2",
          type: "work",
          title: "Stripe",
          description:
            "Built the rate limiter that fronts the public API. Sees ~3M req/s at peak.",
          meta: { company: "Stripe", role: "Infrastructure Engineer" },
          relevant: true,
        },
        {
          id: "w3",
          type: "work",
          title: "Pivotal",
          description:
            "Maintained the buildpack toolchain. Shipped Ruby 3 and JDK 17 support.",
          meta: { company: "Pivotal", role: "Software Engineer" },
          relevant: false,
        },
      ],
    },
    {
      id: "education",
      label: "Education",
      items: [
        {
          id: "e1",
          type: "education",
          title: "University of Edinburgh",
          description: "MSc Computer Science — Distributed Systems track.",
          meta: {
            institution: "University of Edinburgh",
            program: "MSc Computer Science",
            years: "2017 — 2018",
          },
          relevant: false,
        },
      ],
    },
  ],
};
