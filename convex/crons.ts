import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron("scheduled-ingestion", "0 0,8,12,16,20 * * *", internal.ingest.runScheduledIngestion, {});
crons.cron("daily-deep-diff", "0 4 * * *", internal.ingest.runDeepDiff, {});

export default crons;
