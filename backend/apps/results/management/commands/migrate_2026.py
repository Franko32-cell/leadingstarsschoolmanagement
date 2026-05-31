from django.core.management.base import BaseCommand
from apps.results.models import Result

class Command(BaseCommand):
    help = 'Migrates scores from 3rd Term 2025 to 3rd Term 2026'

    def handle(self, *args, **options):
        # 1. Fetch 2025 data
        old_results = Result.objects.filter(year=2025, term="term3")
        
        if not old_results.exists():
            self.stdout.write(self.style.WARNING("No records found for 3rd Term 2025."))
            return

        self.stdout.write(f"Found {old_results.count()} records. Starting migration...")

        created_count = 0
        skipped_count = 0

        for res in old_results:
            # 2. Check if the record already exists for 2026 to prevent duplicates
            exists = Result.objects.filter(
                student=res.student,
                subject=res.subject,
                term="term3",
                year=2026,
            ).exists()

            if not exists:
                # 3. Clone the record
                # Copy numeric score fields; `score` is computed in `save()` so
                # we provide `reopen`, `ca`, and `exams` and let the model set `score`.
                Result.objects.create(
                    student=res.student,
                    subject=res.subject,
                    school_class=res.school_class, # Assumes class stays same; adjust if promoted
                    term="term3",
                    year=2026,
                    reopen=res.reopen,
                    ca=res.ca,
                    exams=res.exams,
                )
                created_count += 1
            else:
                skipped_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Successfully migrated {created_count} records! (Skipped {skipped_count} existing records)"
        ))