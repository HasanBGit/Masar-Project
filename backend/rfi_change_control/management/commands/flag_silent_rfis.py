from django.core.management.base import BaseCommand

from rfi_change_control.services import flag_silent_rfis


class Command(BaseCommand):
    help = "Flag any RFI overdue on its respond-by deadline as a contractor-silence event (Module 5 integration)."

    def handle(self, *args, **options):
        count = flag_silent_rfis()
        self.stdout.write(self.style.SUCCESS(f"Flagged {count} silent RFI(s)."))
