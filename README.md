# Wedge

Cold outreach that references something you actually built for them, backed by verifiable proof of everything else you've done.

Most AI outreach tools make spam cheaper. Wedge does the opposite: it forces you to produce a real artifact first, then writes the email around it. The pitch isn't "here's my resume" — it's "I read your last release and built this in response. Here's the rest of my work, every claim linked to the code that proves it."

## How it works

1. **Build your proof graph.** Connect your GitHub. Wedge pulls your top repos, languages, stars, and activity into a clean public page. Every skill claim links back to a real artifact. No bullet points, no self-written summaries.

2. **Paste a job post URL.** Wedge reads the post via Jina Reader, extracts the company name, and resolves its GitHub org automatically.

3. **Name the person (optional).** If you know the hiring manager or engineer you want to reach, add their name.

4. **See the research.** Wedge surfaces what it found about the company on one page:
   - **Company GitHub** — recent repos, releases, languages, topics
   - **Recent writing** — engineering blog posts discovered via RSS or page scraping
   - **Community discussion** — Hacker News threads about the company, pre-filtered for signal
   - **Your proof graph** — tailored to highlight the work most relevant to this role

5. **Pick an artifact to build.** Claude proposes 3 ideas (2–8 hours of work each), each grounded in a specific source: a blog post, a GitHub release, an HN thread, a line from the job post, or something from your own repos. Every idea comes with citations you can click through to verify. Ideas without real sources get dropped before you see them.

6. **Get the email.** Click the artifact you want to build. Wedge drafts a cold outreach email that opens with the role, references the artifact you're building, cites the specific thing that inspired it, introduces your proof graph in plain language, and ends with an explicit ask for a call. No "thrilled," no "passionate," no em-dashes, no corporate filler.

7. **Dial the voice.** Hit `blunter` to collapse it to a tight one-paragraph version. Hit `warmer` to add one specific sentence of genuine appreciation for the company's work. Copy it, paste it into your own inbox, send it.

Wedge never sends anything. You stay in control.

## Why it works

Every other AI outreach tool fabricates specificity. Wedge proves it.

- The artifact ideas are validated against real sources. If Claude invents a blog post title that doesn't exist, the idea gets dropped before it reaches you.
- The proof graph pulls from GitHub's public API and links every claim back to the repo that backs it.
- The outreach email runs through a slop filter that rejects banned vocabulary, missing asks, AI-tell phrasing, and (especially) em-dashes before the draft reaches you.

## Stack

- Next.js 14, Tailwind, shadcn/ui
- Claude API (`claude-sonnet-4-5`) for ideation, drafting, and validation
- GitHub REST API for org research and proof graph data
- Jina Reader for job post and blog scraping
- Hacker News Algolia API for community signal
- Deployed on Vercel

No database, no auth, no user accounts. Everything lives in React state. Refresh resets the session.

## Running locally

```bash
git clone https://github.com/your-handle/wedge
cd wedge
npm install
cp .env.example .env.local
npm run dev
```

Set your Anthropic key in `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

GitHub, Jina, and HN Algolia don't need keys at demo volume.

## Scope

This is a demo, not a product. Things it deliberately doesn't do:

- Store sessions. Refresh wipes everything.
- Send emails. You copy the draft and send from your own client.
- Track opens or replies.
- Authenticate users.
- Pull from every possible source. The full vision includes personal blogs, conference talks, podcast transcripts, Twitter, and Kaggle — this repo ships the GitHub + blog + HN slice that covers most cases cleanly.

## License

MIT.
