import calendar

from pathlib import Path
from typing import Any

import matplotlib.patches as patches
import matplotlib.pyplot as plt

from matplotlib.axes import Axes
from matplotlib.figure import Figure

from calendario.domain.models import Calendar, Day
from calendario.domain.types import DayType


THEME = {
    "background": "#FFFFFF",
    "default_text": "#111827",  # Gray 900
    "subtext": "#6B7280",  # Gray 500
    "types": {
        DayType.WORK: {
            "bg": "#1F2937",
            "text": "#FFFFFF",
        },  # White
        DayType.REST: {
            "bg": "#E5E7EB",
            "text": "#374151",
        },  # Gray 700 (Darker bg)
        DayType.ORDERING: {
            "bg": "#E0E7FF",
            "text": "#4338CA",
        },  # Indigo 700
        DayType.HOLIDAY: {
            "bg": "#FEE2E2",
            "text": "#B91C1C",
        },  # Red 700
        DayType.WORKING_HOLIDAY: {
            "bg": "#FEF3C7",
            "text": "#B45309",
        },  # Amber 700
    },
}

DISPLAY_NAMES = {
    DayType.WORK: "Laboral",
    DayType.REST: "Descanso",
    DayType.ORDERING: "Ordenamiento",
    DayType.HOLIDAY: "Feriado",
    DayType.WORKING_HOLIDAY: "Feriado (Laboral)",
}


def _setup_plot_style() -> None:
    """Configure global matplotlib settings for typography."""
    plt.rcParams["font.family"] = "sans-serif"
    plt.rcParams["font.sans-serif"] = [
        "Inter",
        "Segoe UI",
        "Roboto",
        "Helvetica Neue",
        "Arial",
        "sans-serif",
    ]


def _draw_header(fig: Figure, gs: Any, title: str) -> None:
    """Draw the calendar header."""
    ax_header = fig.add_subplot(gs[0, :])
    ax_header.text(
        0.0,
        0.4,
        title.upper(),
        fontsize=24,
        fontweight="bold",
        color=THEME["default_text"],
        ha="left",
        va="center",
    )
    ax_header.axis("off")


def _draw_legend(fig: Figure) -> None:
    """Draw the custom legend."""
    legend_elements = []
    types_to_show = [
        DayType.WORK,
        DayType.REST,
        DayType.ORDERING,
        DayType.HOLIDAY,
        DayType.WORKING_HOLIDAY,
    ]

    class CircleHandler:
        def legend_artist(self, legend, orig_handle, fontsize, handlebox):
            x0, y0 = handlebox.xdescent, handlebox.ydescent
            width, height = handlebox.width, handlebox.height
            patch = patches.Circle(
                (x0 + width / 2, y0 + height / 2),
                radius=fontsize * 0.4,
                facecolor=orig_handle.get_facecolor(),
                transform=handlebox.get_transform(),
            )
            handlebox.add_artist(patch)
            return patch

    for dt in types_to_show:
        legend_elements.append(
            patches.Patch(
                facecolor=THEME["types"][dt]["bg"],
                label=DISPLAY_NAMES[dt],
            )
        )

    leg = fig.legend(
        handles=legend_elements,
        loc="lower center",
        bbox_to_anchor=(0.5, 0.02),
        ncol=5,
        frameon=False,
        fontsize=10,
        handler_map={patches.Patch: CircleHandler()},
    )

    for text in leg.get_texts():
        text.set_color(THEME["subtext"])


def _draw_month(ax: Axes, month: int, cal: Calendar) -> None:
    """Draw a single month grid."""
    # Month Title
    ax.set_title(
        calendar.month_name[month].upper(),
        fontsize=10,
        fontweight="bold",
        color=THEME["subtext"],
        pad=15,
        loc="left",
    )

    month_days = cal.get_month_days(month)

    week_groups: dict[int, list[Day]] = {}
    for day in month_days:
        week_num = day.week_number
        if week_num not in week_groups:
            week_groups[week_num] = []
        week_groups[week_num].append(day)

    sorted_weeks = sorted(week_groups.keys())
    # Handle year boundary overlap
    if 52 in sorted_weeks and 1 in sorted_weeks:
        sorted_weeks = sorted(sorted_weeks, key=lambda x: x if x > 10 else x + 100)

    week_to_row = {week: idx for idx, week in enumerate(sorted_weeks)}

    # Draw cells
    for day in month_days:
        col = day.date.weekday()
        row = week_to_row[day.week_number]

        # Colors
        style = THEME["types"].get(
            day.day_type, {"bg": "#FFFFFF", "text": THEME["default_text"]}
        )

        rect = patches.FancyBboxPatch(
            (col + 0.08, row + 0.08),
            0.84,
            0.84,
            boxstyle="round,pad=0,rounding_size=0.04",
            facecolor=style["bg"],
            edgecolor="none",
            mutation_aspect=1,
            linewidth=0,
        )
        ax.add_patch(rect)

        # Draw Day Number
        ax.text(
            col + 0.5,
            row + 0.5,
            str(day.date.day),
            ha="center",
            va="center",
            fontsize=9,
            color=style["text"],
            fontweight="bold" if style["bg"] != "#FFFFFF" else "normal",
        )

    # Configure axes
    ax.set_xlim(0, 7)
    ax.set_ylim(0, 6)
    ax.invert_yaxis()

    # Weekday labels
    ax.set_xticks([x + 0.5 for x in range(7)])
    ax.set_xticklabels(
        ["L", "M", "M", "J", "V", "S", "D"],
        fontsize=7,
        color=THEME["subtext"],
        fontweight="normal",
    )
    ax.tick_params(axis="both", which="both", length=0)
    ax.set_yticks([])

    for spine in ax.spines.values():
        spine.set_visible(False)


def plot_calendar(
    cal: Calendar, output_path: Path | None = None, title: str | None = None
) -> None:
    _setup_plot_style()

    if title is None:
        title = f"Planificación {cal.year}"

    fig = plt.figure(figsize=(20, 14), facecolor=THEME["background"])

    gs = fig.add_gridspec(
        4,
        4,
        height_ratios=[0.15, 1, 1, 1],
        hspace=0.3,
        wspace=0.15,
        left=0.05,
        right=0.95,
    )

    _draw_header(fig, gs, title)

    # Draw all months
    grid_positions = [(r, c) for r in range(1, 4) for c in range(4)]
    for month_idx, (row_idx, col_idx) in enumerate(grid_positions):
        month = month_idx + 1
        ax = fig.add_subplot(gs[row_idx, col_idx])
        _draw_month(ax, month, cal)

    _draw_legend(fig)

    if output_path:
        output_path.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(
            output_path,
            dpi=300,
            bbox_inches="tight",
            facecolor=THEME["background"],
            pad_inches=0.5,
        )

    plt.show()
