import type { ProofProfile } from "./types";

// Realistic example. Claims span varied real-world companies and OSS projects
// so every card has its own recognizable logo.

// Helper: GitHub org/user avatar (always 200, served from githubusercontent CDN).
const ghAvatar = (org: string) => `https://github.com/${org}.png?size=80`;
// Helper: Google S2 favicon — works for any public domain, no API key.
const favicon = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

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
    { id: "writing", label: "Writing" },
    { id: "speaking", label: "Speaking" },
  ],
  jobActiveFilterIds: ["rust", "distributed", "production"],
  claims: [
    {
      id: "c1",
      section: "projects",
      text: "Contributed async I/O improvements to Tokio.",
      tags: ["rust", "distributed", "open-source", "production"],
      size: "lg",
      evidence: [
        {
          type: "repo",
          title: "tokio-rs/tokio",
          description: "Merged a patch reducing wakeup latency on the multi-thread scheduler.",
          url: "https://github.com/tokio-rs/tokio",
          language: "Rust",
          logo: ghAvatar("tokio-rs"),
        },
        {
          type: "link",
          title: "Pull request #6123",
          url: "https://github.com/tokio-rs/tokio/pull/6123",
          logo: ghAvatar("tokio-rs"),
        },
      ],
    },
    {
      id: "c2",
      section: "projects",
      text: "Built a real-time collab canvas on top of Yjs.",
      tags: ["frontend", "production", "distributed"],
      size: "md",
      evidence: [
        {
          type: "repo",
          title: "weave-canvas",
          description: "Multiplayer whiteboard with CRDT-based sync over WebRTC.",
          url: "https://github.com/yjs/yjs",
          language: "TypeScript",
          logo: ghAvatar("yjs"),
        },
      ],
    },
    {
      id: "c3",
      section: "projects",
      text: "Spoke at Strange Loop on consensus latency.",
      tags: ["speaking", "distributed"],
      size: "md",
      evidence: [
        {
          type: "link",
          title: "Strange Loop 2023 — talk recording",
          description: "45-minute talk, ~1.8k views on the conference channel.",
          url: "https://www.youtube.com/results?search_query=strange+loop+consensus",
          logo: favicon("youtube.com"),
        },
        {
          type: "link",
          title: "Slides on Speaker Deck",
          url: "https://speakerdeck.com",
          logo: favicon("speakerdeck.com"),
        },
      ],
    },
    {
      id: "c4",
      section: "projects",
      text: "Wrote an essay on SWIM gossip that hit HN front page.",
      tags: ["writing", "distributed"],
      size: "md",
      evidence: [
        {
          type: "link",
          title: "Essay on Substack",
          description: "“Why your cluster keeps splitting” — 38k reads, ranked #2 on HN.",
          url: "https://substack.com",
          logo: favicon("substack.com"),
        },
        {
          type: "link",
          title: "Hacker News discussion",
          url: "https://news.ycombinator.com",
          logo: favicon("news.ycombinator.com"),
        },
      ],
    },
    {
      id: "c5",
      section: "projects",
      text: "Published an interactive notebook on Postgres index internals.",
      tags: ["writing", "infra", "teaching"],
      size: "md",
      evidence: [
        {
          type: "link",
          title: "Observable notebook",
          description: "Interactive B-tree visualizer, forked 240+ times.",
          url: "https://observablehq.com",
          logo: favicon("observablehq.com"),
        },
      ],
    },
    {
      id: "c11",
      section: "projects",
      text: "Guest on the Changelog podcast on async Rust.",
      tags: ["speaking", "rust"],
      size: "sm",
      evidence: [
        {
          type: "link",
          title: "The Changelog #547",
          description: "1-hour interview on real-world Tokio at scale.",
          url: "https://changelog.com/podcast",
          logo: favicon("changelog.com"),
        },
      ],
    },
    {
      id: "c6",
      section: "work",
      text: "Led the payments infra rewrite at Klarna, cut p99 by 60%.",
      tags: ["distributed", "infra", "production", "rust"],
      size: "lg",
      evidence: [
        {
          type: "work",
          title: "Klarna",
          description:
            "Migrated payments pipeline from Node to Rust + Tokio, removed three queues.",
          meta: "Senior Backend Engineer · 2022 — 2024",
          url: "https://klarna.com",
          logo: favicon("klarna.com"),
        },
      ],
    },
    {
      id: "c7",
      section: "work",
      text: "Founded the data platform team at Spotify's growth org.",
      tags: ["infra", "production", "go"],
      size: "md",
      evidence: [
        {
          type: "work",
          title: "Spotify",
          description:
            "Hired 3, set up streaming ingestion on Kafka, owned warehouse spend.",
          meta: "Founding Data Engineer · 2020 — 2022",
          url: "https://spotify.com",
          logo: favicon("spotify.com"),
        },
      ],
    },
    {
      id: "c8",
      section: "work",
      text: "Engineering intern on the Stripe Issuing team.",
      tags: ["production", "infra"],
      size: "sm",
      evidence: [
        {
          type: "work",
          title: "Stripe",
          description: "Shipped a card authorization webhook used by 400+ merchants.",
          meta: "SWE Intern · Summer 2019",
          url: "https://stripe.com",
          logo: favicon("stripe.com"),
        },
      ],
    },
    {
      id: "c9",
      section: "education",
      text: "MSc Computer Science at KTH, focused on distributed systems.",
      tags: ["distributed"],
      size: "md",
      evidence: [
        {
          type: "education",
          title: "KTH Royal Institute of Technology",
          description: "Thesis on consensus latency under network partitions.",
          meta: "2017 — 2020",
          url: "https://kth.se",
          logo: favicon("kth.se"),
        },
      ],
    },
    {
      id: "c10",
      section: "education",
      text: "Self-taught Rust through Advent of Code.",
      tags: ["rust", "teaching"],
      size: "sm",
      evidence: [
        {
          type: "link",
          title: "Advent of Code",
          url: "https://adventofcode.com",
          logo: favicon("adventofcode.com"),
        },
      ],
    },
  ],
};
