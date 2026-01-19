from enum import Enum


class DayType(Enum):
    WORK = "work"
    REST = "rest"
    ORDERING = "ordering"
    HOLIDAY = "holiday"
    WORKING_HOLIDAY = "working_holiday"
