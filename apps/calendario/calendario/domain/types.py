from datetime import date
from enum import Enum
from typing import Any, TypedDict


class DayType(Enum):
    """Types of days in the calendar."""

    WORK = "work"
    REST = "rest"
    ORDERING = "ordering"
    HOLIDAY = "holiday"
    WORKING_HOLIDAY = "working_holiday"


class DayTypeMetadata(TypedDict):
    """Metadata for each day type (display, color, export)."""

    display_name: str
    color: str
    export_action: str


DAY_TYPE_METADATA: dict[DayType, DayTypeMetadata] = {
    DayType.WORK: DayTypeMetadata(
        display_name="Laboral", color="#c00d07", export_action="Inventariar"
    ),
    DayType.REST: DayTypeMetadata(
        display_name="Descanso", color="#5a7bd8", export_action="Descanso"
    ),
    DayType.ORDERING: DayTypeMetadata(
        display_name="Ordenamiento", color="#8e1a92", export_action="Conteo"
    ),
    DayType.HOLIDAY: DayTypeMetadata(
        display_name="Feriado", color="#a8a0a8a2", export_action="Feriado"
    ),
    DayType.WORKING_HOLIDAY: DayTypeMetadata(
        display_name="Feriado laborable", color="#ddb917a7", export_action="Inventariar"
    ),
}


class CalendarConfig(TypedDict):
    """Configuration for calendar generation."""

    year: int
    holidays: tuple[date, ...]
    min_work_block_length: int
    max_work_block_length: int
    max_weekends_per_month: int


class ConstraintViolation(TypedDict):
    """Represents a constraint violation."""

    constraint_name: str
    message: str
    context: dict[str, Any]


class ValidationResult(TypedDict):
    """Result of calendar validation."""

    valid: bool
    violations: list[ConstraintViolation]
