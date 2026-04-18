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
    { id: "awards", label: "Awards" },
  ],
  jobActiveFilterIds: ["rust", "distributed"],
  claims: [
    {
      id: "c1",
      section: "projects",
      text: "Built a Discord bot that rates your hot takes.",
      subtext: "2.4k servers, 180k roasts served. People keep using it unironically.",
      tags: ["frontend", "open-source", "production"],
      size: "md",
      evidence: [
        {
          type: "deploy",
          title: "spicebot.gg",
          description: "Slash command, GPT-4o behind it, leaderboard for the spiciest takes of the week.",
          url: "https://discord.com",
          logo: favicon("discord.com"),
        },
        {
          type: "repo",
          title: "spicebot",
          description: "TypeScript + discord.js, deployed on Fly.io.",
          url: "https://github.com/discordjs/discord.js",
          language: "TypeScript",
          logo: ghAvatar("discordjs"),
        },
      ],
    },
    {
      id: "c2",
      section: "projects",
      text: "A real-time multiplayer whiteboard for D&D nights.",
      subtext: "Started as a hack for my friends, now used by ~600 weekly players.",
      tags: ["frontend", "production", "distributed"],
      size: "md",
      evidence: [
        {
          type: "deploy",
          title: "tavernboard.app",
          description: "Multiplayer canvas with fog-of-war, dice rolls, and CRDT-based sync.",
          url: "https://tavernboard.app",
          logo: favicon("tavernboard.app"),
        },
        {
          type: "repo",
          title: "yjs (under the hood)",
          url: "https://github.com/yjs/yjs",
          language: "TypeScript",
          logo: ghAvatar("yjs"),
        },
      ],
    },
    {
      id: "c4",
      section: "projects",
      text: "A bird identifier app trained on my balcony feeder.",
      subtext: "iOS app, runs the model on-device. 94% accuracy on Nordic species.",
      tags: ["frontend", "production"],
      size: "md",
      evidence: [
        {
          type: "deploy",
          title: "App Store — FjäderID",
          description: "Snap a photo, get the species + a fact. Free, no account.",
          url: "https://apps.apple.com",
          logo: favicon("apple.com"),
        },
      ],
    },
    {
      id: "c11",
      section: "projects",
      text: "A distributed key-value store I wrote to learn Raft.",
      subtext: "Don't use this in production. But it survives kill -9 and partitions.",
      tags: ["rust", "distributed", "open-source"],
      size: "md",
      evidence: [
        {
          type: "repo",
          title: "kvraft",
          description: "Single-binary Raft implementation, ~3k lines of Rust, walks through every decision in the README.",
          url: "https://github.com/tikv/raft-rs",
          language: "Rust",
          logo: ghAvatar("tikv"),
        },
      ],
    },
    {
      id: "a1",
      section: "achievements",
      text: "Won the Rust Foundation Community Grant for OSS work.",
      tags: ["awards", "rust", "open-source"],
      size: "md",
      evidence: [
        {
          type: "link",
          title: "Rust Foundation — 2023 grantees",
          description: "One of 12 recipients selected from 200+ applications.",
          url: "https://foundation.rust-lang.org",
          logo: favicon("foundation.rust-lang.org"),
        },
      ],
    },
    {
      id: "a2",
      section: "achievements",
      text: "Top 50 finisher in the AWS DeepRacer global championship.",
      tags: ["awards"],
      size: "sm",
      evidence: [
        {
          type: "link",
          title: "AWS DeepRacer League leaderboard",
          url: "https://aws.amazon.com/deepracer",
          logo: favicon("aws.amazon.com"),
        },
      ],
    },
    {
      id: "a3",
      section: "achievements",
      text: "Speaker at RustConf 2023 on async runtimes.",
      tags: ["teaching", "rust"],
      size: "md",
      evidence: [
        {
          type: "link",
          title: "RustConf 2023 — talk recording",
          description: "“Inside Tokio's scheduler” — 2.4k views on the conference channel.",
          url: "https://rustconf.com",
          logo: favicon("rustconf.com"),
        },
      ],
    },
    {
      id: "c6",
      section: "work",
      text: "Senior Backend Engineer, Klarna",
      subtext: "Led the payments infra rewrite — cut p99 latency by 60%.",
      tags: ["distributed", "infra", "production", "rust"],
      size: "lg",
      evidence: [
        {
          type: "work",
          title: "Klarna",
          description:
            "Migrated payments pipeline from Node to Rust + Tokio, removed three queues.",
          meta: "2022 — 2024",
          url: "https://klarna.com",
          logo: favicon("klarna.com"),
        },
      ],
    },
    {
      id: "c7",
      section: "work",
      text: "Founding Data Engineer, Spotify",
      subtext: "Built the data platform team in the growth org from scratch.",
      tags: ["infra", "production", "go"],
      size: "md",
      evidence: [
        {
          type: "work",
          title: "Spotify",
          description:
            "Hired 3, set up streaming ingestion on Kafka, owned warehouse spend.",
          meta: "2020 — 2022",
          url: "https://spotify.com",
          logo: favicon("spotify.com"),
        },
      ],
    },
    {
      id: "c8",
      section: "work",
      text: "SWE Intern, Stripe",
      subtext: "Shipped a card authorization webhook on the Issuing team.",
      tags: ["production", "infra"],
      size: "sm",
      evidence: [
        {
          type: "work",
          title: "Stripe",
          description: "Used by 400+ merchants within 3 months of launch.",
          meta: "Summer 2019",
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
