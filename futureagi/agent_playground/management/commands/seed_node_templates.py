from django.core.management.base import BaseCommand

from agent_playground.models.node_template import NodeTemplate
from agent_playground.templates import get_all_templates

# Fields that can be safely updated without breaking existing Node records
SAFE_UPDATE_FIELDS = {"display_name", "description", "icon", "categories"}

# Structural fields that can only be set on creation - changing these would break
# existing Node records that reference the template
PROTECTED_FIELDS = {
    "input_definition",
    "output_definition",
    "input_mode",
    "output_mode",
    "config_schema",
}


class Command(BaseCommand):
    help = "Seed system-defined NodeTemplate records (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would happen without writing to the database.",
        )
        parser.add_argument(
            "--template",
            type=str,
            help="Seed only the specified template by name.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        template_filter = options.get("template")

        templates = get_all_templates()

        if template_filter:
            if template_filter not in templates:
                self.stderr.write(
                    self.style.ERROR(f"Unknown template: '{template_filter}'")
                )
                return
            templates = {template_filter: templates[template_filter]}

        for name, definition in templates.items():
            defaults = {k: v for k, v in definition.items() if k != "name"}

            if dry_run:
                self.stdout.write(
                    self.style.WARNING(f"[DRY RUN] Would upsert template: '{name}'")
                )
                for field, value in defaults.items():
                    self.stdout.write(f"  {field}: {value}")
                continue

            existing = NodeTemplate.no_workspace_objects.filter(name=name).first()

            if existing:
                # Only update safe metadata fields
                safe_defaults = {
                    k: v for k, v in defaults.items() if k in SAFE_UPDATE_FIELDS
                }

                # Warn if protected fields differ from the definition
                for field in PROTECTED_FIELDS:
                    existing_value = getattr(existing, field)
                    new_value = defaults.get(field)
                    if existing_value != new_value:
                        self.stderr.write(
                            self.style.WARNING(
                                f"Template '{name}': Cannot update protected field "
                                f"'{field}'. Create a new template for structural changes."
                            )
                        )

                for field, value in safe_defaults.items():
                    setattr(existing, field, value)
                existing.save()
                self.stdout.write(
                    self.style.SUCCESS(f"Updated template: '{name}' (metadata only)")
                )
            else:
                # Create new template with all fields
                NodeTemplate.no_workspace_objects.create(name=name, **defaults)
                self.stdout.write(self.style.SUCCESS(f"Created template: '{name}'"))
