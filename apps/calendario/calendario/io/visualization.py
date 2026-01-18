import calendar

from pathlib import Path

import matplotlib.patches as patches
import matplotlib.pyplot as plt

from calendario.domain.models import Calendar, Day
from calendario.domain.types import DAY_TYPE_METADATA, DayType


def plot_calendar(
    cal: Calendar, output_path: Path | None = None, title: str | None = None
) -> None:
    """
    Generates annual calendar visualization with color-coded day types.

    Args:
        cal: Calendar object
        output_path: If provided, saves to this path
        title: Custom title (defaults to year-based title)
    """
    if title is None:
        title = f"Planificación {cal.year}"

    fig, axes = plt.subplots(3, 4, figsize=(20, 15))
    axes = axes.flatten()

    for month in range(1, 13):
        ax = axes[month - 1]
        ax.set_title(calendar.month_name[month], fontsize=12, fontweight="bold")

        month_days = cal.get_month_days(month)

        # Group days by ISO week for row positioning
        week_groups: dict[int, list[Day]] = {}
        for day in month_days:
            week_num = day.week_number
            if week_num not in week_groups:
                week_groups[week_num] = []
            week_groups[week_num].append(day)

        # Sort weeks
        sorted_weeks = sorted(week_groups.keys())

        # Handle year boundary (week 52/53 before week 1)
        if 52 in sorted_weeks and 1 in sorted_weeks:
            sorted_weeks = sorted(sorted_weeks, key=lambda x: x if x > 10 else x + 100)

        week_to_row = {week: idx for idx, week in enumerate(sorted_weeks)}

        # Draw each day
        for day in month_days:
            col = day.date.weekday()
            row = week_to_row[day.week_number]

            if day.day_type is None:
                color = "#ffffff"
            else:
                color = DAY_TYPE_METADATA[day.day_type]["color"]

            # Draw rectangle
            rect = patches.Rectangle(
                (col, row), 1, 1, facecolor=color, edgecolor="gray", linewidth=0.5
            )
            ax.add_patch(rect)

            # Add day number
            ax.text(
                col + 0.5,
                row + 0.5,
                str(day.date.day),
                ha="center",
                va="center",
                fontsize=8,
                color="white",
                fontweight="bold",
            )

        # Configure axes
        ax.set_xlim(0, 7)
        ax.set_ylim(0, len(sorted_weeks))
        ax.set_xticks(range(7))
        ax.set_xticklabels(["L", "M", "M", "J", "V", "S", "D"], fontsize=8)
        ax.set_yticks([])
        ax.invert_yaxis()
        ax.set_aspect("equal")

        for spine in ax.spines.values():
            spine.set_visible(False)

    # Create legend with proper DayType enum values
    legend_patches = [
        patches.Patch(color=DAY_TYPE_METADATA[DayType.WORK]["color"], label="Laboral"),
        patches.Patch(color=DAY_TYPE_METADATA[DayType.REST]["color"], label="Descanso"),
        patches.Patch(
            color=DAY_TYPE_METADATA[DayType.ORDERING]["color"], label="Ordenamiento"
        ),
        patches.Patch(
            color=DAY_TYPE_METADATA[DayType.HOLIDAY]["color"], label="Feriado"
        ),
        patches.Patch(
            color=DAY_TYPE_METADATA[DayType.WORKING_HOLIDAY]["color"],
            label="Feriado (laboral)",
        ),
    ]

    fig.legend(handles=legend_patches, loc="lower center", ncol=5, fontsize=12)
    fig.suptitle(title, fontsize=16, fontweight="bold")
    plt.tight_layout(rect=(0, 0.05, 1, 0.95))

    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(output_path, dpi=300, bbox_inches="tight")

    plt.show()
