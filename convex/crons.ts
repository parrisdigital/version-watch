import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.cron("scheduled-ingestion", "0 */4 * * *", internal.ingest.runScheduledIngestion, {});
crons.cron("daily-deep-diff", "30 2 * * *", internal.ingest.runDeepDiff, {});
crons.interval("refresh-watchdog", { minutes: 30 }, internal.ingest.runRefreshWatchdog, {});

export default crons;
