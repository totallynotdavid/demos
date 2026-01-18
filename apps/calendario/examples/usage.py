from datetime import date
from pathlib import Path

import click

from calendario.io.exporters import export_to_csv, export_to_excel
from calendario.io.visualization import plot_calendar
from calendario.main import generate_calendar, generate_ecuador_2026
from calendario.validation.validate import validate_calendar


@click.group()
@click.version_option("1.0.0")
def cli() -> None:
    """Calendario package usage examples."""


@cli.command()
@click.option("--year", default=2026, help="Target year")
@click.option("--seed", type=int, help="Random seed for reproducibility")
def basic(year: int, seed: int | None) -> None:
    """Generate a basic calendar with custom holidays."""
    holidays = [
        date(year, 1, 1),  # New Year's Day
        date(year, 12, 25),  # Christmas
        date(year, 5, 1),  # Labor Day
    ]

    calendar = generate_calendar(
        year=year,
        holidays=holidays,
        seed=seed,
        min_work_block=3,
        max_work_block=7,
        max_weekends_per_month=1,
        validate=False,
    )

    click.echo(f"Generated calendar for {calendar.year}")
    click.echo(f"Total weeks: {len(calendar.weeks)}")
    click.echo(f"Total days: {len(calendar.all_days)}")

    first_week = calendar.weeks[0]
    click.echo(f"First week ({first_week.days[0].date} to {first_week.days[-1].date}):")
    for day in first_week.days:
        day_type_str = day.day_type.name if day.day_type else "UNKNOWN"
        click.echo(f"  {day.date}: {day_type_str}")


@cli.command()
@click.option("--seed", type=int, help="Random seed for reproducibility")
def ecuador(seed: int | None) -> None:
    """Generate calendar for Ecuador 2026 with official holidays."""
    calendar = generate_ecuador_2026(seed=seed, validate=False)

    work_days = sum(
        1 for day in calendar.all_days if day.day_type and day.day_type.name == "WORK"
    )
    weekend_days = sum(
        1
        for day in calendar.all_days
        if day.day_type and day.day_type.name == "WEEKEND"
    )
    holiday_days = sum(
        1
        for day in calendar.all_days
        if day.day_type and day.day_type.name == "HOLIDAY"
    )

    click.echo(f"Generated Ecuador calendar for {calendar.year}")
    click.echo(f"Weeks: {len(calendar.weeks)}")
    click.echo(f"Work days: {work_days}")
    click.echo(f"Weekend days: {weekend_days}")
    click.echo(f"Holiday days: {holiday_days}")


@cli.command()
@click.option("--year", default=2026, help="Target year")
@click.option("--seed", type=int, help="Random seed for reproducibility")
@click.option(
    "--output-dir",
    type=click.Path(),
    default=str(Path(__file__).parent / "output"),
    help="Output directory",
)
def export(year: int, seed: int | None, output_dir: str) -> None:
    """Generate and export calendar to multiple formats."""
    holidays = [date(year, 1, 1), date(year, 7, 4), date(year, 12, 25)]

    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    calendar = generate_calendar(
        year=year, holidays=holidays, seed=seed, validate=False
    )

    csv_path = output_path / f"calendario_{calendar.year}.csv"
    export_to_csv(calendar, csv_path)
    click.echo(f"Exported CSV to {csv_path}")

    excel_path = output_path / f"calendario_{calendar.year}.xlsx"
    export_to_excel(calendar, excel_path)
    click.echo(f"Exported Excel to {excel_path}")

    png_path = output_path / f"calendario_{calendar.year}.png"
    plot_calendar(calendar, output_path=png_path)
    click.echo(f"Exported visualization to {png_path}")


@cli.command()
@click.option("--year", default=2026, help="Target year")
@click.option("--seed", type=int, help="Random seed for reproducibility")
def validate(year: int, seed: int | None) -> None:
    """Demonstrate calendar validation."""
    holidays = [date(year, 1, 1)]
    calendar = generate_calendar(year, holidays, seed=seed, validate=False)

    result = validate_calendar(calendar)

    if result["valid"]:
        click.secho("Calendar is valid - all constraints satisfied!", fg="green")
    else:
        click.secho(f"Calendar has {len(result['violations'])} violations:", fg="red")
        for violation in result["violations"][:3]:
            click.echo(f"  - {violation['constraint_name']}: {violation['message']}")


if __name__ == "__main__":
    cli()
