import React from "react";
import { format, addDays, startOfWeek, setHours, setMinutes } from "date-fns";

interface BookingItem {
  id: string;
  status: string;
  start: Date | string;
  end: Date | string;
}

interface AvailabilityWindow {
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ... 6 = Sat
  start: string; // "08:00"
  end: string; // "21:00"
}

interface WeeklyAvailabilityGridProps {
  availabilityWindows: AvailabilityWindow[];
  bookings: BookingItem[];
}

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function hourLabel(h: number): string {
  const suffix = h >= 12 ? "PM" : "AM";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve} ${suffix}`;
}

/** "Mon–Fri 08:00–21:00 · Sat 10:00–18:00" */
function summarizeWindows(windows: AvailabilityWindow[]): string {
  if (windows.length === 0) return "Open every day";
  const sorted = [...windows].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const groups: { days: number[]; range: string }[] = [];
  for (const w of sorted) {
    const range = `${w.start}–${w.end}`;
    const last = groups[groups.length - 1];
    if (last && last.range === range && last.days[last.days.length - 1] === w.dayOfWeek - 1) {
      last.days.push(w.dayOfWeek);
    } else {
      groups.push({ days: [w.dayOfWeek], range });
    }
  }
  return groups
    .map((g) =>
      g.days.length === 1
        ? `${DAY_SHORT[g.days[0]]} ${g.range}`
        : `${DAY_SHORT[g.days[0]]}–${DAY_SHORT[g.days[g.days.length - 1]]} ${g.range}`
    )
    .join(" · ");
}

export function WeeklyAvailabilityGrid({
  availabilityWindows,
  bookings,
}: WeeklyAvailabilityGridProps) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Rows span exactly the hours this resource is open (default 8–20 if unrestricted)
  const firstHour =
    availabilityWindows.length > 0
      ? Math.floor(Math.min(...availabilityWindows.map((w) => toMinutes(w.start))) / 60)
      : 8;
  const lastHour =
    availabilityWindows.length > 0
      ? Math.ceil(Math.max(...availabilityWindows.map((w) => toMinutes(w.end))) / 60)
      : 20;
  const hours = Array.from({ length: Math.max(1, lastHour - firstHour) }, (_, i) => firstHour + i);

  const getCellStatus = (day: Date, hour: number) => {
    const dayOfWeek = day.getDay();
    const blockStart = setMinutes(setHours(day, hour), 0);
    const blockEnd = setMinutes(setHours(day, hour + 1), 0);

    let isWindowOpen = false;
    if (availabilityWindows.length === 0) {
      isWindowOpen = dayOfWeek >= 1 && dayOfWeek <= 6;
    } else {
      isWindowOpen = availabilityWindows.some((w) => {
        if (w.dayOfWeek !== dayOfWeek) return false;
        const winStart = setMinutes(setHours(day, 0), toMinutes(w.start));
        const winEnd = setMinutes(setHours(day, 0), toMinutes(w.end));
        return blockStart >= winStart && blockEnd <= winEnd;
      });
    }

    if (!isWindowOpen) return "OUTSIDE";

    let booked = false;
    let contested = false;
    for (const b of bookings) {
      const bStart = new Date(b.start);
      const bEnd = new Date(b.end);
      if (bStart < blockEnd && bEnd > blockStart) {
        if (b.status === "APPROVED" || b.status === "CHECKED_IN" || b.status === "OVERDUE") {
          booked = true;
          break;
        } else if (b.status === "PENDING" || b.status === "WAITLISTED") {
          contested = true;
        }
      }
    }

    if (booked) return "BOOKED";
    if (contested) return "PENDING";
    return "AVAILABLE";
  };

  const cellStyles: Record<string, { cls: string; title: string }> = {
    AVAILABLE: { cls: "bg-emerald-100/80 hover:bg-emerald-200/80", title: "Available" },
    BOOKED: { cls: "bg-rose-200/80", title: "Booked" },
    PENDING: { cls: "bg-amber-200/70", title: "Pending review or contested" },
    OUTSIDE: { cls: "bg-slate-200/30", title: "Closed" },
  };

  const isToday = (d: Date) => d.toDateString() === now.toDateString();

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/70 p-6 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-slate-800 text-sm">This week&apos;s availability</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </p>
        </div>
        <span className="text-[11px] text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200/60">
          {summarizeWindows(availabilityWindows)}
        </span>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <div className="min-w-[440px]">
          <div className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] gap-1 mb-1.5 text-center">
            <div />
            {days.map((day) => (
              <div
                key={day.toISOString()}
                className={`py-1 rounded-lg text-[11px] leading-tight ${
                  isToday(day) ? "bg-indigo-600 text-white" : "text-slate-500"
                }`}
              >
                <div className="font-medium">{format(day, "EEE")}</div>
                <div className={isToday(day) ? "text-indigo-100" : "text-slate-400"}>
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {hours.map((hour) => (
              <div
                key={hour}
                className="grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))] gap-1 items-center"
              >
                <div className="text-[10px] text-slate-400 text-right pr-1.5">{hourLabel(hour)}</div>
                {days.map((day) => {
                  const status = getCellStatus(day, hour);
                  const style = cellStyles[status];
                  return (
                    <div
                      key={day.toISOString()}
                      title={`${format(day, "EEE MMM d")}, ${hour}:00 – ${hour + 1}:00 · ${style.title}`}
                      className={`h-5 rounded-md transition-colors duration-200 ${style.cls}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200/50 flex items-center gap-x-5 gap-y-1.5 flex-wrap text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-200" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-200" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-200" /> Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-200/70" /> Closed
        </span>
      </div>
    </div>
  );
}
