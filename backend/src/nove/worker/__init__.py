# ABOUTME: Inngest client and function registry.
# ABOUTME: Defines the Inngest app and registers all background functions.

import inngest
import inngest.fast_api

from nove.config import settings

client = inngest.Inngest(
    app_id="nove",
    event_key=settings.inngest_event_key or None,
    signing_key=settings.inngest_signing_key or None,
)

# Import functions so they register with the client
from nove.worker import functions  # noqa: F401, E402
