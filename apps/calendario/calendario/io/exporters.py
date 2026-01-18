from pathlib import Path

import pandas as pd

from calendario.domain.models import Calendar
from calendario.domain.types import DAY_TYPE_METADATA, DayType


WEEKDAY_NAMES = {
    0: "Lunes",
    1: "Martes",
    2: "Miércoles",
    3: "Jueves",
    4: "Viernes",
    5: "Sábado",
    6: "Domingo",
}

MONTH_NAMES = {
    1: "Enero",
    2: "Febrero",
    3: "Marzo",
    4: "Abril",
    5: "Mayo",
    6: "Junio",
    7: "Julio",
    8: "Agosto",
    9: "Septiembre",
    10: "Octubre",
    11: "Noviembre",
    12: "Diciembre",
}


def calendar_to_dataframe(calendar: Calendar) -> pd.DataFrame:
    """
    Converts Calendar to pandas DataFrame.

    Columns:
    - fecha: Date
    - accion: Action to take (Inventariar, Descanso, etc.)
    - dia_semana: Day of week name
    - mes: Month number
    - año: Year
    - seleccion: Boolean flag (True for work days)
    - mes_anio: Month name

    Args:
        calendar: Calendar object

    Returns:
        pandas DataFrame
    """
    rows = []

    for day in calendar.all_days:
        if day.day_type is None:
            msg = f"Day {day.date} has no type assigned"
            raise ValueError(msg)

        metadata = DAY_TYPE_METADATA[day.day_type]

        row = {
            "fecha": day.date,
            "accion": metadata["export_action"],
            "dia_semana": WEEKDAY_NAMES[day.date.weekday()],
            "mes": day.date.month,
            "año": day.date.year,
            "seleccion": day.day_type in (DayType.WORK, DayType.WORKING_HOLIDAY),
            "mes_anio": MONTH_NAMES[day.date.month],
        }
        rows.append(row)

    return pd.DataFrame(rows)


def export_to_csv(calendar: Calendar, path: Path) -> None:
    """
    Exports calendar to CSV file.

    Args:
        calendar: Calendar object
        path: Output file path
    """
    df = calendar_to_dataframe(calendar)

    # Create parent directory if needed
    path.parent.mkdir(parents=True, exist_ok=True)

    # Export with UTF-8-sig encoding and semicolon separator
    df.to_csv(path, index=False, encoding="utf-8-sig", sep=";")


def export_to_excel(calendar: Calendar, path: Path) -> None:
    """
    Exports calendar to Excel file.

    Args:
        calendar: Calendar object
        path: Output file path
    """
    df = calendar_to_dataframe(calendar)

    # Create parent directory if needed
    path.parent.mkdir(parents=True, exist_ok=True)

    # Export to Excel
    df.to_excel(path, index=False, engine="openpyxl")
