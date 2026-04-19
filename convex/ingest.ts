"use node";

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";

export const fetchSource = action({
  args: { url: v.string() },
  returns: v.object({ ok: v.boolean(), body: v.string() }),
  handler: async (_ctx, args) => {
    const response = await fetch(args.url, {
      headers: {
        "User-Agent": process.env.INGESTION_USER_AGENT ?? "VersionWatchBot/0.1",
      },
    });

    return {
      ok: response.ok,
      body: await response.text(),
    };
  },
});

export const runScheduledIngestion = internalAction({
  args: {},
  returns: v.null(),
  handler: async () => {
    return null;
  },
});
