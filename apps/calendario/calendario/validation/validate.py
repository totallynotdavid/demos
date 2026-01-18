from collections.abc import Callable

from calendario.domain.models import Calendar
from calendario.domain.types import ConstraintViolation, ValidationResult
from calendario.validation.constraints import ALL_CONSTRAINTS


def validate_calendar(
    calendar: Calendar,
    constraints: list[Callable[[Calendar], list[ConstraintViolation]]] | None = None,
) -> ValidationResult:
    """
    Validates calendar against all constraints.

    Args:
        calendar: Calendar to validate
        constraints: List of constraint functions (uses ALL_CONSTRAINTS if None)

    Returns:
        ValidationResult with all violations found
    """
    if constraints is None:
        constraints = ALL_CONSTRAINTS

    all_violations = []
    for constraint_fn in constraints:
        violations = constraint_fn(calendar)
        all_violations.extend(violations)

    return ValidationResult(valid=len(all_violations) == 0, violations=all_violations)


def validate_and_raise(calendar: Calendar) -> None:
    """
    Validates calendar and raises exception if invalid.

    Args:
        calendar: Calendar to validate

    Raises:
        ValidationError: If calendar violates any constraints
    """
    result = validate_calendar(calendar)

    if not result["valid"]:
        error_messages = [
            f"- {v['constraint_name']}: {v['message']}" for v in result["violations"]
        ]
        raise ValidationError(
            f"Calendar validation failed with {len(result['violations'])} violations:\n"
            + "\n".join(error_messages)
        )


class ValidationError(Exception):
    """Raised when calendar validation fails."""
