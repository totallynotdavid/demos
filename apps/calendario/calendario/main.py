from datetime import date
from pathlib import Path
from random import Random

from calendario.builders.calendar import build_calendar
from calendario.config.settings import ecuador_2026_config, validate_config
from calendario.domain.models import Calendar
from calendario.domain.types import CalendarConfig
from calendario.io.exporters import export_to_csv, export_to_excel
from calendario.io.visualization import plot_calendar
from calendario.validation.validate import validate_and_raise, validate_calendar


def generate_calendar(
    year: int,
    holidays: list[date],
    seed: int | None = None,
    min_work_block: int = 3,
    max_work_block: int = 7,
    max_weekends_per_month: int = 1,
    *,
    validate: bool = True,
) -> Calendar:
    """
    Generates a calendar for the given year with specified constraints.

    Args:
        year: Target year
        holidays: List of holiday dates
        seed: Random seed for reproducibility (None for random)
        min_work_block: Minimum consecutive work days
        max_work_block: Maximum consecutive work days
        max_weekends_per_month: Maximum free weekends per month
        validate: If True, validates constraints and raises on failure

    Returns:
        Calendar object

    Raises:
        ValueError: If configuration is invalid
        ValidationError: If validate=True and calendar violates constraints

    Example:
        >>> from datetime import date
        >>> holidays = [date(2026, 1, 1), date(2026, 12, 25)]
        >>> cal = generate_calendar(2026, holidays, seed=42)
    """
    config = CalendarConfig(
        year=year,
        holidays=tuple(sorted(holidays)),
        min_work_block_length=min_work_block,
        max_work_block_length=max_work_block,
        max_weekends_per_month=max_weekends_per_month,
    )

    validate_config(config)

    rng = Random(seed) if seed is not None else None
    calendar = build_calendar(config, rng)

    if validate:
        validate_and_raise(calendar)

    return calendar


def generate_ecuador_2026(
    seed: int | None = None, *, validate: bool = True
) -> Calendar:
    """
    Generates calendar for Ecuador 2026 with official holidays.

    Args:
        seed: Random seed for reproducibility
        validate: If True, validates constraints and raises on failure

    Returns:
        Calendar object for Ecuador 2026

    Example:
        >>> cal = generate_ecuador_2026(seed=42)
        >>> print(f"Calendar has {len(cal.weeks)} weeks")
    """
    config = ecuador_2026_config()
    validate_config(config)

    rng = Random(seed) if seed is not None else None
    calendar = build_calendar(config, rng)

    if validate:
        validate_and_raise(calendar)

    return calendar


def generate_and_export(
    year: int,
    holidays: list[date],
    output_dir: Path | str,
    seed: int | None = None,
    formats: list[str] | None = None,
) -> Calendar:
    """
    Generates calendar and exports to multiple formats.

    Args:
        year: Target year
        holidays: List of holiday dates
        output_dir: Directory for output files
        seed: Random seed for reproducibility
        formats: List of formats ['csv', 'excel', 'png'] (all if None)

    Returns:
        Generated Calendar object

    Example:
        >>> from datetime import date
        >>> from pathlib import Path
        >>> holidays = [date(2026, 1, 1)]
        >>> cal = generate_and_export(
        ...     2026,
        ...     holidays,
        ...     Path("output"),
        ...     formats=['csv', 'png']
        ... )
    """
    if formats is None:
        formats = ["csv", "excel", "png"]

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    calendar = generate_calendar(year, holidays, seed=seed)

    if "csv" in formats:
        csv_path = output_path / f"calendario_{year}.csv"
        export_to_csv(calendar, csv_path)
        print(f"Exported CSV to {csv_path}")

    if "excel" in formats:
        excel_path = output_path / f"calendario_{year}.xlsx"
        export_to_excel(calendar, excel_path)
        print(f"Exported Excel to {excel_path}")

    if "png" in formats:
        png_path = output_path / f"calendario_{year}.png"
        plot_calendar(calendar, output_path=png_path)
        print(f"Exported visualization to {png_path}")

    return calendar


if __name__ == "__main__":
    # Example usage
    print("Generating Ecuador 2026 calendar...")
    calendar = generate_ecuador_2026(seed=42)

    print("Calendar generated successfully")
    print(f"  - Year: {calendar.year}")
    print(f"  - Weeks: {len(calendar.weeks)}")
    print(f"  - Days: {len(calendar.all_days)}")

    # Validate
    result = validate_calendar(calendar)
    if result["valid"]:
        print("All constraints satisfied")
    else:
        print(f"Found {len(result['violations'])} violations")
        for v in result["violations"][:5]:  # Show first 5
            print(f"  - {v['constraint_name']}: {v['message']}")

    # Export
    output_dir = Path("output")
    print(f"\nExporting to {output_dir}...")
    generate_and_export(
        calendar.year, list(ecuador_2026_config()["holidays"]), output_dir, seed=42
    )
    print("Done!")
