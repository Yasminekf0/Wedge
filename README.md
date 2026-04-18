# Wedge

Cold outreach that references something you actually built for them.

Wedge takes a job post URL and a GitHub username and returns three things on the same page: a verified profile pulled from GitHub, three artifact ideas you could build in a weekend that would resonate with the target, and a drafted email that references the artifact and links to your profile.

Built as an 8-hour hackathon project. Single page, no auth, no database.

## How it works

1. Paste a job post URL, your GitHub handle, and optionally the name of the person you're targeting.
2. Wedge scrapes the job post via Jina Reader and pulls your public GitHub data.
3. Claude reads the job post and proposes three artifacts — small things (2–8 hours each) you could build or write in response to something specific the company just shipped.
4. Claude drafts an email that references the artifact you pick, cites something specific from the job post, and links back to your GitHub-backed profile.
5. You review, edit, and send from your own inbox. Wedge never sends anything.

## Why

Most AI outreach tools generate generic cold emails at scale. Wedge flips that: it makes you produce a real artifact first, then writes the email around it. The pitch isn't "here's my resume" — it's "I read your last release and built this in response, here's the rest of my work."

The profile half of the page exists so the target has somewhere to land that isn't a CV. Every number on it comes from `api.github.com` and links back to a real repo.

## Stack

- Next.js 14, Tailwind, shadcn/ui
- Claude API (`claude-sonnet-4-5`) for ideation and drafting
- GitHub REST API for profile data — public endpoints, no token
- Jina Reader (`r.jina.ai`) for job post scraping
- Deployed on Vercel

No database. Everything lives in React state. Refresh resets the session.

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

GitHub and Jina don't need keys at this volume (GitHub allows 60 unauthenticated requests per hour, which is more than enough for a demo).

## Scope

This is a demo, not a product. Things it deliberately doesn't do:

- Store sessions. Refresh wipes everything.
- Send emails. You copy the draft and send from your own client.
- Track opens or replies.
- Authenticate users.
- Pull from anything besides GitHub. The full vision includes Stack Overflow, published writing, conference talks, and Kaggle — this repo ships only the GitHub slice.

## License

MIT.
