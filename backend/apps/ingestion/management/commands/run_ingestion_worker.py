"""Periodic real harvesting, isolated from Gunicorn request workers."""

import logging
import os
import signal
from threading import Event

from django.core.management.base import BaseCommand, CommandError
from django.db import close_old_connections

from apps.ingestion.locking import IngestionBusyError
from apps.ingestion.pipeline import run_ingestion_pipeline

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Fetch real public feeds periodically; never load demo fixtures."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true", help="Run one scheduled batch and exit.")
        parser.add_argument(
            "--interval", type=int, default=None, help="Seconds between batches (>=60)."
        )

    def handle(self, *args, **options):
        try:
            configured = options["interval"]
            if configured is None:
                configured = os.getenv("INGESTION_INTERVAL_SECONDS", "3600")
            interval = int(configured)
        except (TypeError, ValueError) as exc:
            raise CommandError("INGESTION_INTERVAL_SECONDS musi być liczbą sekund >= 60.") from exc
        if interval < 60:
            raise CommandError("Odstęp pobierania musi wynosić co najmniej 60 sekund.")
        stop = Event()
        previous = {}

        def request_stop(signum, frame):
            stop.set()

        try:
            if not options["once"]:
                for sig in (signal.SIGTERM, signal.SIGINT):
                    previous[sig] = signal.signal(sig, request_stop)
            while not stop.is_set():
                close_old_connections()
                try:
                    run = run_ingestion_pipeline(actor="scheduled_harvester")
                    self.stdout.write(f"IngestionRun #{run.id} [{run.status}]: {run.summary}")
                except IngestionBusyError as exc:
                    self.stdout.write(str(exc))
                except Exception as exc:
                    logger.exception("Scheduled harvesting failed; progress will be retried")
                    if options["once"]:
                        raise CommandError(str(exc)) from exc
                finally:
                    close_old_connections()
                if options["once"]:
                    break
                stop.wait(interval)
        finally:
            for sig, handler in previous.items():
                signal.signal(sig, handler)
