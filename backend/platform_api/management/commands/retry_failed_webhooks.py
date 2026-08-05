from django.core.management.base import BaseCommand

from platform_api.services import retry_failed_deliveries


class Command(BaseCommand):
    help = "Re-attempt any webhook delivery in FAILED status (production: run on a schedule, e.g. every 5 minutes)."

    def handle(self, *args, **options):
        count = retry_failed_deliveries()
        self.stdout.write(self.style.SUCCESS(f"Retried {count} webhook delivery attempt(s)."))
