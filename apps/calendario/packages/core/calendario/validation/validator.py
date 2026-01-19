from calendario.domain import Calendar
from calendario.validation.rules import (
    validate_holiday_pairing,
    validate_monthly_weekends,
    validate_no_sunday_monday_rest,
    validate_ordering_placement,
    validate_rest_blocks,
    validate_weekly_rest,
    validate_work_block_lengths,
)


class ValidationError(Exception):
    """Raised when calendar validation fails"""


def validate_calendar(calendar: Calendar) -> None:
    """
    Validate calendar against all requirements.

    Runs all 7 validation rules and raises ValidationError if any fail.

    Args:
        calendar: Calendar to validate

    Raises:
        ValidationError: If any validation rule fails
    """
    errors = []

    errors.extend(validate_holiday_pairing(calendar))
    errors.extend(validate_rest_blocks(calendar))
    errors.extend(validate_ordering_placement(calendar))
    errors.extend(validate_work_block_lengths(calendar))
    errors.extend(validate_monthly_weekends(calendar))
    errors.extend(validate_weekly_rest(calendar))
    errors.extend(validate_no_sunday_monday_rest(calendar))

    if errors:
        error_message = "Calendar validation failed:\n" + "\n".join(
            f"  - {e}" for e in errors
        )
        raise ValidationError(error_message)
