from datetime import date

from calendario.domain.types import CalendarConfig


ECUADOR_2026_HOLIDAYS = (
    date(2026, 1, 1),  # Año Nuevo
    date(2026, 1, 2),  # Año Nuevo (observed)
    date(2026, 2, 16),  # Carnaval
    date(2026, 2, 17),  # Carnaval
    date(2026, 4, 3),  # Viernes Santo
    date(2026, 5, 1),  # Día del Trabajo
    date(2026, 5, 25),  # Batalla de Pichincha
    date(2026, 8, 10),  # Primer Grito de Independencia
    date(2026, 10, 9),  # Independencia de Guayaquil
    date(2026, 11, 2),  # Día de los Difuntos
    date(2026, 11, 3),  # Independencia de Cuenca
    date(2026, 12, 25),  # Navidad
)


def ecuador_2026_config() -> CalendarConfig:
    """Returns configuration for Ecuador 2026 calendar."""
    return CalendarConfig(
        year=2026,
        holidays=ECUADOR_2026_HOLIDAYS,
        min_work_block_length=3,
        max_work_block_length=7,
        max_weekends_per_month=1,
    )


def validate_config(config: CalendarConfig) -> None:
    """
    Validates calendar configuration.

    Raises:
        ValueError: If configuration is invalid
    """
    if config["year"] < 1:
        msg = f"Invalid year: {config['year']}"
        raise ValueError(msg)

    if not all(h.year == config["year"] for h in config["holidays"]):
        msg = "All holidays must be in target year"
        raise ValueError(msg)

    if len(config["holidays"]) != len(set(config["holidays"])):
        msg = "Duplicate holidays found"
        raise ValueError(msg)

    if config["min_work_block_length"] < 1:
        msg = "min_work_block_length must be >= 1"
        raise ValueError(msg)

    if config["max_work_block_length"] < config["min_work_block_length"]:
        msg = "max_work_block_length must be >= min_work_block_length"
        raise ValueError(msg)

    if config["max_weekends_per_month"] < 0:
        msg = "max_weekends_per_month must be >= 0"
        raise ValueError(msg)
