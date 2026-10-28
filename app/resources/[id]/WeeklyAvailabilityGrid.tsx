import React from "react";
import { format, addDays, startOfWeek, isWithinInterval, setHours, setMinutes } from "date-fns";

interface BookingItem {
  id: string;
  status: string;
  start: Date | string;
  end: Date | string;
}

interface AvailabilityWindow {
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ... 6 = Sat
  start: string;     // "08:00"
  end: string;       // "21:00"
}

interface WeeklyAvailabilityGridProps {
  availabilityWindows: AvailabilityWindow[];
  bookings: BookingItem[];
}

export function WeeklyAvailabilityGrid({
  availabilityWindows,
  bookings,
}: WeeklyAvailabilityGridProps) {
  // Start week on Monday
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  // 7 days: Mon to Sun
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // 2-hour blocks from 8:00 to 20:00 (8am - 8pm)
  const timeBlocks = [
    { startHour: 8, label: "08:00 - 10:00" },
    { startHour: 10, label: "10:00 - 12:00" },
    { startHour: 12, label: "12:00 - 14:00" },
    { startHour: 14, label: "14:00 - 16:00" },
    { startHour: 16, label: "16:00 - 18:00" },
    { startHour: 18, label: "18:00 - 20:00" },
  ];

  // Helper to determine status of a specific day + block
  const getCellStatus = (day: Date, blockStartHour: number) => {
    const dayOfWeek = day.getDay(); // 0 = Sun, 1 = Mon, ...
    const blockStart = setMinutes(setHours(day, blockStartHour), 0);
    const blockEnd = setMinutes(setHours(day, blockStartHour + 2), 0);

    // 1. Check if within availability windows
    // If no availability windows configured, default to standard Mon-Fri 8-21
    const matchingWindow = availabilityWindows.find((w) => w.dayOfWeek === dayOfWeek);
    let isWindowOpen = false;

    if (availabilityWindows.length === 0) {
      // Default: Mon-Sat open 8am - 8pm
      isWindowOpen = dayOfWeek >= 1 && dayOfWeek <= 6;
    } else if (matchingWindow) {
      const [winStartH, winStartM] = matchingWindow.start.split(":").map(Number);
      const [winEndH, winEndM] = matchingWindow.end.split(":").map(Number);
      const winStart = setMinutes(setHours(day, winStartH), winStartM || 0);
      const winEnd = setMinutes(setHours(day, winEndH), winEndM || 0);

      // Block must fall inside window
      isWindowOpen = blockStart >= winStart && blockEnd <= winEnd;
    }

    if (!isWindowOpen) {
      return "OUTSIDE"; // gray
    }

    // 2. Check bookings overlapping with this block
    // An overlap occurs if booking.start < blockEnd AND booking.end > blockStart
    let hasApprovedOrActive = false;
    let hasPendingOrWaitlisted = false;

    for (const b of bookings) {
      const bStart = new Date(b.start);
      const bEnd = new Date(b.end);

      if (bStart < blockEnd && bEnd > blockStart) {
        if (b.status === "APPROVED" || b.status === "CHECKED_IN" || b.status === "OVERDUE") {
          hasApprovedOrActive = true;
          break;
        } else if (b.status === "PENDING" || b.status === "WAITLISTED") {
          hasPendingOrWaitlisted = true;
        }
      }
    }

    if (hasApprovedOrActive) return "BOOKED"; // red
    if (hasPendingOrWaitlisted) return "PENDING"; // yellow
    return "AVAILABLE"; // green
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">
            Weekly Availability Calendar
          </h3>
          <p className="text-[11px] text-slate-500">
            Week of {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </p>
        </div>
        <span className="text-[10px] font-mono text-slate-400">8:00 AM – 8:00 PM</span>
      </div>

      {/* Grid: 7 Columns (Mon-Sun) */}
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          {/* Day Headers */}
          <div className="grid grid-cols-8 gap-1 mb-1.5 text-center text-[11px] font-bold">
            <div className="text-slate-400 text-left pl-1">Time</div>
            {days.map((day, idx) => (
              <div
                key={idx}
                className={`py-1 rounded-lg ${
                  day.toDateString() === now.toDateString()
                    ? "bg-primary text-secondary font-extrabold border border-[#DDD0A9]"
                    : "text-slate-700 bg-slate-50"
                }`}
              >
                <div>{format(day, "EEE")}</div>
                <div className="text-[10px] text-slate-400 font-normal">{format(day, "d")}</div>
              </div>
            ))}
          </div>

          {/* Time Block Rows */}
          <div className="space-y-1">
            {timeBlocks.map((block) => (
              <div key={block.startHour} className="grid grid-cols-8 gap-1 items-center">
                <div className="text-[10px] text-slate-400 font-mono text-left pl-1">
                  {block.startHour}:00
                </div>

                {days.map((day, dIdx) => {
                  const status = getCellStatus(day, block.startHour);

                  let cellStyle = "bg-slate-100 border-slate-200 text-slate-400";
                  let cellTitle = "Outside Operating Hours";

                  if (status === "AVAILABLE") {
                    cellStyle = "bg-emerald-500 hover:bg-emerald-600 border-emerald-600 shadow-2xs cursor-pointer";
                    cellTitle = "Available for reservation";
                  } else if (status === "BOOKED") {
                    cellStyle = "bg-rose-500 hover:bg-rose-600 border-rose-600 shadow-2xs";
                    cellTitle = "Booked (Approved / Active)";
                  } else if (status === "PENDING") {
                    cellStyle = "bg-amber-400 hover:bg-amber-500 border-amber-500 shadow-2xs";
                    cellTitle = "Pending Review or Contested Slot";
                  }

                  return (
                    <div
                      key={dIdx}
                      title={`${format(day, "EEE MMM d")}, ${block.label}: ${cellTitle}`}
                      className={`h-7 rounded-lg border transition-all ${cellStyle}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend below */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-600 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block shrink-0" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-rose-500 inline-block shrink-0" />
          <span>Booked (Approved)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-amber-400 inline-block shrink-0" />
          <span>Pending / Contested</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-slate-200 inline-block shrink-0" />
          <span>Outside Window</span>
        </div>
      </div>
    </div>
  );
}
