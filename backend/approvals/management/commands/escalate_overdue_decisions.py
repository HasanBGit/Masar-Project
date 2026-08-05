from django.core.management.base import BaseCommand

from approvals.services import escalate_overdue_decisions


class Command(BaseCommand):
    """
    SLA sweep - intended to run on a schedule (cron / Celery beat) in
    production. The API also lazily escalates a single decision on read
    (see approvals.views.DecisionViewSet.get_object), so this command is
    the bulk catch-up path for decisions nobody has opened recently.
    """

    help = "Escalate any decision whose SLA deadline has passed to its fallback approver."

    def handle(self, *args, **options):
        count = escalate_overdue_decisions()
        self.stdout.write(self.style.SUCCESS(f"Escalated {count} overdue decision(s)."))
