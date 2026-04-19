import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("scheduled-ingestion", { hours: 4 }, internal.ingest.runScheduledIngestion, {});
crons.cron("daily-deep-diff", "0 4 * * *", internal.ingest.runScheduledIngestion, {});

export default crons;
