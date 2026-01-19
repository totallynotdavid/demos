from calendario.core.domain import Calendar
from calendario.validation.rules import ALL_RULES


class ValidationError(Exception):
    pass


def validate_calendar(calendar: Calendar) -> None:
    all_errors = []

    for rule in ALL_RULES:
        errors = rule(calendar)
        all_errors.extend(errors)

    if all_errors:
        error_message = "Calendar validation failed:\n" + "\n".join(
            f"  - {e}" for e in all_errors
        )
        raise ValidationError(error_message)
