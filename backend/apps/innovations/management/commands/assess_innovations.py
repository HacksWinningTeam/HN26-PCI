"""Bounded backfill from stored real source material, never fixtures or public GETs."""

from concurrent.futures import ThreadPoolExecutor

from django.core.management.base import BaseCommand, CommandError
from django.db import close_old_connections, connections

from apps.ingestion.locking import IngestionBusyError, ingestion_lock
from apps.innovations.assessment import RUBRICS, assess_innovation
from apps.innovations.models import Innovation


class Command(BaseCommand):
    help = "Backfill preliminary assessments from stored real sources (no source HTTP fetch)."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, required=True, help="Maximum records, 1–100.")
        parser.add_argument("--slug", action="append", default=[])
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--retry-unknown", action="store_true")
        parser.add_argument("--workers", type=int, default=1, help="Concurrent AI calls, 1–4.")

    def handle(self, *args, **options):
        if not 1 <= options["limit"] <= 100 or not 1 <= options["workers"] <= 4:
            raise CommandError("Limit musi wynosić 1–100, workers 1–4.")
        queryset = Innovation.objects.filter(is_synthetic_demo=False, is_merged=False)
        if options["slug"]:
            queryset = queryset.filter(slug__in=options["slug"])
        ids = list(queryset.order_by("pk").values_list("pk", flat=True)[:options["limit"]])
        if options["dry_run"]:
            self.stdout.write(f"Dry-run: {len(ids)} real records; no writes or AI requests.")
            return

        def process(pk):
            if options["workers"] > 1:
                close_old_connections()
            try:
                innovation = Innovation.objects.get(pk=pk)
                changed = assess_innovation(
                    innovation, request_ai=True, retry_unknown=options["retry_unknown"],
                )
                complete = all(innovation.assessment.get("dimensions", {}).get(key, {}).get(
                    "status") == "assessed" for key in RUBRICS)
                return changed, complete
            finally:
                # Keep the main connection holding the advisory lock open in serial mode.
                if options["workers"] > 1:
                    connections.close_all()

        try:
            with ingestion_lock():
                if options["workers"] == 1:
                    results = [process(pk) for pk in ids]
                else:
                    with ThreadPoolExecutor(max_workers=options["workers"]) as pool:
                        results = list(pool.map(process, ids))
        except IngestionBusyError as exc:
            raise CommandError(str(exc)) from exc
        self.stdout.write(
            f"Records: {len(results)}; recalculated: {sum(r[0] for r in results)}; "
            f"complete AI dimensions: {sum(r[1] for r in results)}; "
            f"unknown AI dimensions: {sum(not r[1] for r in results)}."
        )
