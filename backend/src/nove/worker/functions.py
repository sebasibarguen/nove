# ABOUTME: Inngest function definitions for background jobs.
# ABOUTME: Registered automatically when the worker module is imported.

import inngest

from nove.worker import client


@client.create_function(
    fn_id="daily-ads-report",
    trigger=inngest.TriggerCron(cron="17 9 * * *"),
)
async def daily_ads_report(ctx: inngest.Context, step: inngest.Step) -> str:
    """Placeholder for daily ads report job. Currently handled by Vercel cron."""
    return "ok"
