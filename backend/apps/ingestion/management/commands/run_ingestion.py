from django.core.management.base import BaseCommand

from apps.ingestion.pipeline import run_ingestion_pipeline


class Command(BaseCommand):
    help = "Run public source ingestion, normalization, deduplication, and stale sweep."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--live",
            action="store_true",
            help="Fetch remote feed URLs over HTTP instead of configured offline snapshots.",
        )
        parser.add_argument(
            "--feed-id",
            type=int,
            action="append",
            dest="feed_ids",
            help="Restrict run to specific SourceFeed ID(s).",
        )

    def handle(self, *args, **options) -> None:
        run = run_ingestion_pipeline(
            feed_ids=options.get("feed_ids"),
            live_fetch=True,
            actor="cli_run_ingestion",
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"IngestionRun #{run.id} [{run.status}]: {run.summary}"
            )
        )
