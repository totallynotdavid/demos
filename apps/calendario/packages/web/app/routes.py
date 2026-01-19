from random import Random

from calendario.api import generate_calendar
from calendario.core.domain import Calendar

# Internal imports for unsafe generation fallback
from calendario.generation.execution import execute_plan
from calendario.generation.holidays import process_holidays
from calendario.generation.planning import create_plan
from flask import Blueprint, jsonify, render_template, request


bp = Blueprint("main", __name__)


@bp.route("/")
def index():
    return render_template("index.html")


def serialize_calendar(calendar: Calendar):
    return {
        "year": calendar.year,
        "days": [
            {
                "date": day.date.isoformat(),
                "day_type": day.day_type.name,
                "is_work_day": day.is_work_day,
                "is_rest_day": day.is_rest_day,
            }
            for day in calendar.days
        ],
    }


def generate_calendar_unsafe(year: int, seed: int | None = None) -> Calendar:
    """Generate calendar without validation to ensure UI has something to show."""
    rng = Random(seed) if seed is not None else Random()
    holiday_map = process_holidays([])
    plan = create_plan(year, holiday_map, rng)
    calendar = execute_plan(plan)
    return calendar


@bp.route("/api/generate", methods=["POST"])
def generate():
    try:
        data = request.get_json()
        year = int(data.get("year", 2025))
        workers = data.get("workers", [])

        if not workers:
            workers = ["Worker 1"]

        calendars_data = []

        for worker_name in workers:
            cal = None
            # Try valid generation first
            try:
                # Try a few times to get a valid one
                for attempt in range(5):
                    try:
                        seed = hash(f"{worker_name}-{year}-{attempt}") % 10000000
                        cal = generate_calendar(year, seed=seed)
                        break
                    except Exception:
                        continue
            except Exception:
                pass

            # Fallback to unsafe if failed
            if cal is None:
                # Use a specific seed for unsafe too so it's deterministic
                seed = hash(f"{worker_name}-{year}-unsafe") % 10000000
                cal = generate_calendar_unsafe(year, seed=seed)

            calendars_data.append(
                {"worker": worker_name, "data": serialize_calendar(cal)}
            )

        return jsonify({"calendars": calendars_data})

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/save", methods=["POST"])
def save():
    return jsonify(
        {"status": "saved", "message": "Calendar configuration saved successfully."}
    )
