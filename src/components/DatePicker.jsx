import { memo, useCallback, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarFold,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleOff,
  Sun,
} from "lucide-react";
import { Popover } from "radix-ui";
import Tooltip from "./Tooltip";
import { flattenTasks, useTaskStore } from "@/stores/useTaskStore";

const DatePicker = memo(function DatePicker({
  taskId,
  dueDate: dueDateProp,
  onChange,
  withinTaskDetails = false,
}) {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const [open, setOpen] = useState(false);

  const storedDueDate = useTaskStore(
    (state) =>
      flattenTasks(state.tasks).find(
        (task) => Number(task.id) === Number(taskId),
      )?.due_date ?? null,
  );
  const dueDate = dueDateProp !== undefined ? dueDateProp : storedDueDate;

  const selectedDate = dueDate ? new Date(`${dueDate}T00:00:00`) : null;

  const [pastDateTooltip, setPastDateTooltip] = useState({
    dateKey: null,
    id: 0,
  });
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const calendarDays = useMemo(
    () => getCalendarDays(visibleMonth),
    [visibleMonth],
  );
  const label = getDateLabel(selectedDate, today, tomorrow);
  const isTodaySelected = isSameDay(selectedDate, today);
  const isTomorrowSelected = isSameDay(selectedDate, tomorrow);
  const selectedLabelColor = isTodaySelected
    ? "text-green-600"
    : isTomorrowSelected
      ? "text-yellow-600"
      : "text-foreground";
  const selectedIconColor =
    isTodaySelected || isTomorrowSelected ? selectedLabelColor : "text-red-500";

  const closePastDateTooltip = useCallback(() => {
    setPastDateTooltip((currentTooltip) => ({
      ...currentTooltip,
      dateKey: null,
    }));
  }, []);

  async function selectDate(date) {
    const clickedDate = startOfDay(date);

    if (clickedDate < today) {
      setPastDateTooltip((currentTooltip) => ({
        dateKey: getDateKey(clickedDate),
        id: currentTooltip.id + 1,
      }));
      return;
    }

    await onChange(taskId, formatDate(clickedDate));
    closePastDateTooltip();
    setVisibleMonth(
      new Date(clickedDate.getFullYear(), clickedDate.getMonth(), 1),
    );
    setOpen(false);
  }

  async function clearDate() {
    await onChange(taskId, null);
    setOpen(false);
  }

  function changeMonth(amount) {
    setVisibleMonth(
      (currentMonth) =>
        new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + amount,
          1,
        ),
    );
  }

  function showCurrentMonth() {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            title="Set due date"
            aria-label={`Set due date. Current: ${label}`}
            onPointerDown={(event) => event.stopPropagation()}
            className="inline-flex h-7 items-center gap-1.5 rounded px-1.5 text-xs transition-colors hover:bg-muted"
          >
            <CalendarFold
              size={15}
              strokeWidth={1.75}
              className={selectedIconColor}
            />
            <span className={selectedLabelColor}>{label}</span>
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            data-task-details-popup={withinTaskDetails || undefined}
            align="start"
            sideOffset={5}
            onPointerDown={(event) => event.stopPropagation()}
            className="z-50 w-64 rounded-lg bg-popover p-1.5 text-popover-foreground shadow-lg ring-1 ring-border"
          >
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => selectDate(today)}
                className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted ${
                  isTodaySelected ? "bg-green-50 text-green-700" : ""
                }`}
              >
                <CalendarFold
                  size={18}
                  strokeWidth={1.75}
                  className="text-green-600"
                />
                <span>Today</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {today.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
              </button>

              <button
                type="button"
                onClick={() => selectDate(tomorrow)}
                className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted ${
                  isTomorrowSelected ? "bg-yellow-50 text-yellow-700" : ""
                }`}
              >
                <Sun size={18} strokeWidth={1.75} className="text-yellow-500" />
                <span>Tomorrow</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {tomorrow.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
              </button>
            </div>

            <div className="my-1 h-px bg-border" />

            {/* No Date */}
            <button
              type="button"
              onClick={clearDate}
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
            >
              <CircleOff
                size={18}
                strokeWidth={1.5}
                className="text-muted-foreground"
              />
              <span>No Date</span>
            </button>

            <div className="my-1 h-px bg-border" />

            {/* Calendar :) */}
            <div className="px-1 pb-1">
              {/* Calendar Heading */}
              <div className="flex items-center py-1.5">
                <span className="text-sm font-semibold">
                  {visibleMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <div className="ml-auto flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => changeMonth(-1)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Show current month"
                    onClick={showCurrentMonth}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Circle size={8} />
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => changeMonth(1)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>

              {/* Days/Weeks */}
              <div className="grid grid-cols-7">
                {weekDays.map((day, index) => (
                  <span
                    key={`${day}-${index}`}
                    className="flex h-7 items-center justify-center text-[11px] text-muted-foreground"
                  >
                    {day}
                  </span>
                ))}

                {calendarDays.map((date) => {
                  const dateKey = getDateKey(date);
                  const isCurrentMonth =
                    date.getMonth() === visibleMonth.getMonth();
                  const isSelected = isSameDay(date, selectedDate);
                  const isToday = isSameDay(date, today);
                  const isTomorrow = isSameDay(date, tomorrow);
                  const isPast = startOfDay(date) < today;
                  const selectedDateColor = isToday
                    ? "bg-green-500 font-semibold text-white hover:bg-green-600"
                    : isTomorrow
                      ? "bg-yellow-400 font-semibold text-black hover:bg-yellow-500"
                      : "bg-red-500 font-semibold text-white hover:bg-red-600";

                  const dateButton = (
                    <button
                      key={dateKey}
                      type="button"
                      aria-label={date.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                      aria-pressed={isSelected}
                      aria-disabled={isPast}
                      title={
                        isPast ? "Past dates cannot be selected" : undefined
                      }
                      onClick={() => selectDate(date)}
                      className={`flex size-8 items-center justify-center justify-self-center rounded-full text-xs transition-colors ${
                        isPast
                          ? "cursor-not-allowed text-muted-foreground/50 hover:bg-destructive/10"
                          : isSelected
                            ? selectedDateColor
                            : isCurrentMonth
                              ? "text-foreground hover:bg-muted"
                              : "text-muted-foreground/50 hover:bg-muted"
                      } ${isToday && !isSelected ? "font-bold text-foreground" : ""}`}
                    >
                      {date.getDate()}
                    </button>
                  );

                  if (!isPast) {
                    return dateButton;
                  }

                  return (
                    <Tooltip
                      key={`${dateKey}-${pastDateTooltip.id}`}
                      message="Past dates cannot be selected."
                      open={pastDateTooltip.dateKey === dateKey}
                      onClose={closePastDateTooltip}
                    >
                      {dateButton}
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
});

export default DatePicker;

// Helper functions
const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date, amount) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return startOfDay(nextDate);
}

function isSameDay(firstDate, secondDate) {
  return (
    firstDate?.getFullYear() === secondDate?.getFullYear() &&
    firstDate?.getMonth() === secondDate?.getMonth() &&
    firstDate?.getDate() === secondDate?.getDate()
  );
}

function getDateLabel(selectedDate, today, tomorrow) {
  if (!selectedDate) return "No Date";
  if (isSameDay(selectedDate, today)) return "Today";
  if (isSameDay(selectedDate, tomorrow)) return "Tomorrow";

  return selectedDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
}

function getCalendarDays(visibleMonth) {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const mondayBasedOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((mondayBasedOffset + daysInMonth) / 7) * 7;

  return Array.from({ length: cellCount }, (_, index) => {
    return new Date(year, month, index - mondayBasedOffset + 1);
  });
}

function getDateKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}
