import { createServerFn } from "@tanstack/react-start";

export interface GhProxyResponse {
  status: number;
  ok: boolean;
  body: string;
  rateLimitRemaining: string | null;
}

export const githubProxy = createServerFn({ method: "POST" })
  .inputValidator((input: { path: string }) => {
    if (!input || typeof input.path !== "string") {
      throw new Error("path required");
    }
    if (!input.path.startsWith("/")) {
      throw new Error("path must start with /");
    }
    if (input.path.length > 1000) {
      throw new Error("path too long");
    }
    return input;
  })
  .handler(async ({ data }): Promise<GhProxyResponse> => {
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "User-Agent": "wedge-app",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`https://api.github.com${data.path}`, { headers });
    const body = await res.text();
    return {
      status: res.status,
      ok: res.ok,
      body,
      rateLimitRemaining: res.headers.get("x-ratelimit-remaining"),
    };
  });
