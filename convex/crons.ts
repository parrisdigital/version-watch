import { cronJobs } from "convex/server";

import { api } from "./_generated/api";

const crons = cronJobs();

crons.interval("scheduled-ingestion", { hours: 4 }, api.ingest.runManualIngestion, { force: false });
crons.cron("daily-deep-diff", "0 4 * * *", api.ingest.runManualIngestion, { force: true });

export default crons;
