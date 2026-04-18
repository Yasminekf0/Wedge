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
      details: {
        timeline: "Mar 2024 — present",
        status: "Live",
        story:
          "A weekend project that got out of hand. /spice <your take> returns a savage but accurate rating, with optional sources. Originally built to settle arguments in a single Discord server, then a friend posted it on Reddit and Cloudflare bills became a problem.",
        metrics: [
          { label: "Servers", value: "2,418" },
          { label: "Takes rated", value: "180k+" },
          { label: "Avg latency", value: "740 ms" },
          { label: "Monthly cost", value: "$11" },
        ],
        highlights: [
          "Per-guild rate limit + abuse heuristics — solved a small troll war in week two.",
          "Weekly leaderboard auto-posts to a #spiciest-takes channel.",
          "Slash command UX with autocomplete, no /help-style walls of text.",
        ],
        stack: ["TypeScript", "discord.js", "GPT-4o", "Fly.io", "Upstash Redis"],
        quote: {
          text: "The only bot in this server that has ever made me laugh out loud.",
          attribution: "Random user, top.gg review",
        },
      },
      evidence: [
        {
          type: "deploy",
          title: "spicebot.gg",
          description: "Add to your server in two clicks. Free tier: 100 takes/day.",
          url: "https://discord.com",
          logo: favicon("discord.com"),
        },
        {
          type: "repo",
          title: "spicebot",
          description: "Source on GitHub. MIT-licensed, bring your own OpenAI key.",
          url: "https://github.com/discordjs/discord.js",
          language: "TypeScript",
          logo: ghAvatar("discordjs"),
        },
        {
          type: "link",
          title: "top.gg listing",
          meta: "4.7 ★ — 312 reviews",
          url: "https://top.gg",
          logo: favicon("top.gg"),
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
      details: {
        timeline: "Oct 2023 — present",
        status: "Live",
        story:
          "Roll20 felt heavy and Owlbear Rodeo was missing dice. So I built the smallest thing my Tuesday group needed: a shared canvas, fog of war, dice, and zero accounts. The first version synced over a single WebSocket and broke whenever the DM's WiFi flickered. Rebuilt on Yjs and now it survives reconnects mid-combat.",
        metrics: [
          { label: "Weekly players", value: "~600" },
          { label: "Sessions/week", value: "180" },
          { label: "P99 sync delay", value: "85 ms" },
          { label: "Uptime", value: "99.94%" },
        ],
        highlights: [
          "Drag-and-drop tokens with grid snapping; works on iPad with Apple Pencil.",
          "Dice roller logs to a side channel so the DM can audit suspicious nat 20s.",
          "Sessions persist offline-first — late players catch up on join.",
        ],
        stack: ["React", "Yjs", "WebRTC", "Cloudflare Durable Objects"],
      },
      evidence: [
        {
          type: "deploy",
          title: "tavernboard.app",
          description: "No signup. Share a link, start a session.",
          url: "https://tavernboard.app",
          logo: favicon("tavernboard.app"),
        },
        {
          type: "repo",
          title: "yjs (CRDT layer)",
          description: "The library that makes the multiplayer feel solid.",
          url: "https://github.com/yjs/yjs",
          language: "TypeScript",
          logo: ghAvatar("yjs"),
        },
        {
          type: "link",
          title: "r/DnD launch thread",
          meta: "1.2k upvotes",
          url: "https://reddit.com/r/DnD",
          logo: favicon("reddit.com"),
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
      details: {
        timeline: "Spring 2024",
        status: "Shipped",
        story:
          "Bought a feeder, got curious, took 11,000 photos over six weeks, then realised Merlin couldn't tell a great tit from a blue tit when the lighting was bad. Fine-tuned a small vision model on my own dataset, shipped it as an iOS app for fellow Nordic birders. The app runs entirely on-device — no upload, no account, no analytics.",
        metrics: [
          { label: "Species covered", value: "62" },
          { label: "Top-1 accuracy", value: "94%" },
          { label: "Model size", value: "8.4 MB" },
          { label: "Downloads", value: "3.1k" },
        ],
        highlights: [
          "Hand-labelled a 11k-photo dataset (yes, really, every bird).",
          "Apple Featured in 'New Apps We Love' — Sweden, week of May 12.",
          "Includes a fun-fact card per species, written by a friend who's an actual ornithologist.",
        ],
        stack: ["Swift", "Core ML", "Create ML", "PyTorch"],
        quote: {
          text: "Finally, an app that knows the difference between a chaffinch and a brambling.",
          attribution: "App Store review (5★)",
        },
      },
      evidence: [
        {
          type: "deploy",
          title: "App Store — FjäderID",
          description: "Free, no account. Sweden + Nordic birds covered, EU expansion in beta.",
          url: "https://apps.apple.com",
          logo: favicon("apple.com"),
        },
        {
          type: "link",
          title: "Write-up on the dataset",
          description: "How I labelled 11k photos without losing my mind.",
          url: "https://example.com",
          logo: favicon("example.com"),
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
      details: {
        timeline: "Jan — Apr 2024",
        status: "Stable (educational)",
        story:
          "Read the Raft paper three times, still didn't feel like I understood it. So I implemented it from scratch in Rust over a long winter. The README walks through every decision — leader election, log replication, snapshotting — with the bug I hit and how I fixed it. It's slower than etcd by a wide margin, but it's mine and it works.",
        metrics: [
          { label: "GitHub stars", value: "847" },
          { label: "Lines of Rust", value: "~3,100" },
          { label: "Tests", value: "94" },
          { label: "Jepsen runs survived", value: "12/12" },
        ],
        highlights: [
          "Tested under random partitions and clock skew with a custom Jepsen-style harness.",
          "Linked from a Hacker News front-page thread on 'learning distributed systems'.",
          "Several universities reportedly use the README as supplementary course material.",
        ],
        stack: ["Rust", "Tokio", "Serde", "RocksDB"],
      },
      evidence: [
        {
          type: "repo",
          title: "kvraft",
          description: "Single-binary Raft implementation. Walks through every decision in the README.",
          url: "https://github.com/tikv/raft-rs",
          language: "Rust",
          logo: ghAvatar("tikv"),
        },
        {
          type: "link",
          title: "HN discussion",
          meta: "412 points",
          url: "https://news.ycombinator.com",
          logo: favicon("news.ycombinator.com"),
        },
      ],
    },
    {
      id: "a1",
      section: "achievements",
      text: "Won the Rust Foundation Community Grant for OSS work.",
      tags: ["awards", "rust", "open-source"],
      size: "md",
      details: {
        timeline: "Awarded Sep 2023",
        status: "Completed",
        story:
          "The grant funded six months of part-time work on async runtime tooling — specifically, better stack traces when futures hang. The output landed as a crate (async-backtrace-ext) used by a couple of well-known Rust projects to debug production deadlocks.",
        metrics: [
          { label: "Grant size", value: "$15,000" },
          { label: "Recipients", value: "12 of 200+" },
          { label: "Output crate stars", value: "2.1k" },
        ],
        highlights: [
          "Output is now a default debug aid in the Tokio Console.",
          "Wrote two long-form blog posts on what I learned about async cancellation.",
        ],
      },
      evidence: [
        {
          type: "link",
          title: "Rust Foundation — 2023 grantees",
          description: "One of 12 recipients selected from 200+ applications.",
          url: "https://foundation.rust-lang.org",
          logo: ghAvatar("rust-lang"),
        },
        {
          type: "repo",
          title: "async-backtrace-ext",
          url: "https://github.com/tokio-rs/console",
          language: "Rust",
          logo: ghAvatar("tokio-rs"),
        },
      ],
    },
    {
      id: "a2",
      section: "achievements",
      text: "Top 50 finisher in the AWS DeepRacer global championship.",
      tags: ["awards"],
      size: "sm",
      details: {
        timeline: "Nov 2022",
        status: "Final ranking: #38",
        story:
          "Trained an RL model to drive a 1/18-scale car around a virtual track. Spent a confusing amount of time tuning a reward function that didn't reward 'win the race' — it rewarded 'don't be slow on corners' — and that turned out to be the trick.",
        metrics: [
          { label: "Final rank", value: "#38" },
          { label: "Total entrants", value: "12,400+" },
          { label: "Best lap", value: "8.21 s" },
        ],
        highlights: [
          "Hit the leaderboard cutoff in the last 18 minutes of the qualifier — extremely stressful.",
          "Wrote up the reward-function story as a thread, picked up by an AWS Hero retweet.",
        ],
      },
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
      details: {
        timeline: "Sep 2023, Albuquerque NM",
        status: "Recording online",
        story:
          "Gave a 25-minute talk titled 'Inside Tokio's Scheduler: a tour with hand-drawn diagrams'. Aimed at engineers who use async/await every day but have never opened the runtime source. Audience seemed to enjoy the part where I drew the work-stealing queue live with a marker.",
        metrics: [
          { label: "Live audience", value: "~340" },
          { label: "YouTube views", value: "12.8k" },
          { label: "Talk rating", value: "4.8 / 5" },
        ],
        highlights: [
          "Slides shared via the conference repo, ~600 stars.",
          "Invited to give a follow-up version at EuroRust 2024.",
        ],
        quote: {
          text: "Best talk of the conference for me — finally understood work stealing.",
          attribution: "Conference feedback form",
        },
      },
      evidence: [
        {
          type: "link",
          title: "RustConf 2023 — talk recording",
          description: "“Inside Tokio's scheduler” — 12.8k views.",
          url: "https://rustconf.com",
          logo: favicon("rustconf.com"),
        },
        {
          type: "repo",
          title: "Slides + diagrams",
          url: "https://github.com/rust-lang/rustconf",
          logo: ghAvatar("rust-lang"),
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
      details: {
        timeline: "Aug 2022 — Jan 2024",
        status: "Shipped, still in production",
        story:
          "Joined the payments platform team to lead a rewrite of the authorization pipeline from a Node.js monolith to a Rust service. The hard part wasn't the rewrite — it was running both in parallel for four months while we shadowed traffic, compared outputs, and hunted edge cases that only showed up at 3 AM on payday Friday.",
        metrics: [
          { label: "P99 latency", value: "−60%" },
          { label: "Cost / 1k auths", value: "−42%" },
          { label: "Queues removed", value: "3" },
          { label: "Team size", value: "5 eng" },
        ],
        highlights: [
          "Designed a shadow-traffic harness that caught 14 silent behaviour diffs before cutover.",
          "Mentored two engineers through their first Rust ship.",
          "Wrote the internal Rust style guide that's still in use.",
        ],
        stack: ["Rust", "Tokio", "Postgres", "Kafka", "gRPC"],
      },
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
        {
          type: "link",
          title: "Engineering blog post (lead author)",
          description: "How we migrated payment auth without dropping a transaction.",
          url: "https://engineering.klarna.com",
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
      details: {
        timeline: "Jun 2020 — Jul 2022",
        status: "Team still operating",
        story:
          "Joined as the first data hire on the growth org. Set up streaming ingestion on Kafka, picked the warehouse (Snowflake — defended that choice in three architecture reviews), and hired the next three people. The team I built now owns ~40% of the company's experimentation pipeline.",
        metrics: [
          { label: "Engineers hired", value: "3" },
          { label: "Daily events", value: "8.2B" },
          { label: "Warehouse spend", value: "−28% YoY" },
        ],
        highlights: [
          "Wrote the data contracts spec that the rest of the company adopted in 2022.",
          "Owned on-call for the ingestion path for 18 months — zero data-loss incidents.",
        ],
        stack: ["Go", "Kafka", "Snowflake", "dbt", "Airflow"],
      },
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
      details: {
        timeline: "Jun — Sep 2019",
        status: "Returned offer (declined)",
        story:
          "Twelve weeks on the Issuing team. Shipped a webhook event for real-time card authorization decisions — turned out to be a thing customers had been asking for for months, so the launch got bumped up the comms calendar. Got to watch the merchant-success folks demo my code at a customer dinner, which was surreal.",
        metrics: [
          { label: "Adoption (3 mo)", value: "400+ merchants" },
          { label: "Code review cycles", value: "11" },
          { label: "Production incidents", value: "0" },
        ],
        highlights: [
          "PR description is still cited internally as a 'how to write a good PR' example (I'm told).",
          "Built friendships with two engineers I now collaborate with on OSS.",
        ],
        stack: ["Ruby", "Sorbet", "Postgres"],
      },
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
      details: {
        timeline: "2017 — 2020",
        status: "Graduated with distinction",
        story:
          "Thesis: 'Consensus latency under asymmetric network partitions'. Built a small testbed with tc + netem to simulate one-way packet loss and measured how Raft and EPaxos degraded. Findings: EPaxos was faster on the happy path but Raft recovered cleaner from weird partitions. Advisor still cites the methodology in the course.",
        metrics: [
          { label: "Thesis grade", value: "A" },
          { label: "GPA", value: "4.7 / 5" },
          { label: "Citations", value: "9" },
        ],
        highlights: [
          "TA'd the distributed systems course in my final year.",
          "Co-authored a workshop paper at EuroSys.",
        ],
      },
      evidence: [
        {
          type: "education",
          title: "KTH Royal Institute of Technology",
          description: "Thesis on consensus latency under network partitions.",
          meta: "2017 — 2020",
          url: "https://kth.se",
          logo: favicon("kth.se"),
        },
        {
          type: "link",
          title: "Thesis PDF",
          url: "https://kth.diva-portal.org",
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
      details: {
        timeline: "Dec 2021 — present",
        status: "Three years running",
        story:
          "Did all 25 days in Rust in 2021, leaderboard-ranked the next two years. Less about the puzzles, more about forcing myself to try a new pattern (lifetimes, async, const generics) on every other day. Solutions are public and over-commented for anyone learning.",
        metrics: [
          { label: "Stars (3 years)", value: "75 / 75" },
          { label: "Solutions repo ★", value: "412" },
          { label: "Best daily rank", value: "#214 global" },
        ],
        highlights: [
          "Wrote a 'lessons from AoC in Rust' blog post that gets reposted every December.",
        ],
      },
      evidence: [
        {
          type: "link",
          title: "Advent of Code",
          url: "https://adventofcode.com",
          logo: favicon("adventofcode.com"),
        },
        {
          type: "repo",
          title: "aoc-rust",
          description: "All solutions, with comments aimed at Rust beginners.",
          url: "https://github.com/rust-lang/rust",
          language: "Rust",
          logo: ghAvatar("rust-lang"),
        },
      ],
    },
  ],
};
