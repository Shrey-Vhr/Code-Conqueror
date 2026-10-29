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

    const matchingWindow = availabilityWindows.find((w) => w.dayOfWeek === dayOfWeek);
    let isWindowOpen = false;

    if (availabilityWindows.length === 0) {
      isWindowOpen = dayOfWeek >= 1 && dayOfWeek <= 6;
    } else if (matchingWindow) {
      const [winStartH, winStartM] = matchingWindow.start.split(":").map(Number);
      const [winEndH, winEndM] = matchingWindow.end.split(":").map(Number);
      const winStart = setMinutes(setHours(day, winStartH), winStartM || 0);
      const winEnd = setMinutes(setHours(day, winEndH), winEndM || 0);

      isWindowOpen = blockStart >= winStart && blockEnd <= winEnd;
    }

    if (!isWindowOpen) {
      return "OUTSIDE";
    }

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

    if (hasApprovedOrActive) return "BOOKED";
    if (hasPendingOrWaitlisted) return "PENDING";
    return "AVAILABLE";
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">
            Weekly Availability Calendar
          </h3>
          <p className="text-[11px] text-slate-400">
            Week of {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </p>
        </div>
        <span className="text-[10px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200/70">
          8:00 AM – 8:00 PM
        </span>
      </div>

      {/* Grid: 7 Columns (Mon-Sun) */}
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          {/* Day Headers */}
          <div className="grid grid-cols-8 gap-1.5 mb-2 text-center text-[11px] font-bold">
            <div className="text-slate-400 text-left pl-1">Time</div>
            {days.map((day, idx) => (
              <div
                key={idx}
                className={`py-1.5 rounded-xl transition-all ${
                  day.toDateString() === now.toDateString()
                    ? "bg-indigo-600 text-white font-black shadow-xs shadow-indigo-300"
                    : "text-slate-700 bg-slate-50/80"
                }`}
              >
                <div>{format(day, "EEE")}</div>
                <div className={`text-[10px] ${day.toDateString() === now.toDateString() ? "text-indigo-100" : "text-slate-400"} font-normal`}>
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Time Block Rows */}
          <div className="space-y-1.5">
            {timeBlocks.map((block) => (
              <div key={block.startHour} className="grid grid-cols-8 gap-1.5 items-center">
                <div className="text-[10px] text-slate-400 font-mono text-left pl-1">
                  {block.startHour}:00
                </div>

                {days.map((day, dIdx) => {
                  const status = getCellStatus(day, block.startHour);

                  let cellStyle = "bg-slate-100/70 border-slate-200/60 text-slate-400";
                  let cellTitle = "Outside Operating Hours";

                  if (status === "AVAILABLE") {
                    cellStyle = "bg-emerald-400 hover:bg-emerald-500 border-emerald-500/80 shadow-2xs cursor-pointer";
                    cellTitle = "Available for reservation";
                  } else if (status === "BOOKED") {
                    cellStyle = "bg-rose-400 hover:bg-rose-500 border-rose-500/80 shadow-2xs";
                    cellTitle = "Booked (Approved / Active)";
                  } else if (status === "PENDING") {
                    cellStyle = "bg-amber-300 hover:bg-amber-400 border-amber-400 shadow-2xs";
                    cellTitle = "Pending Review or Contested Slot";
                  }

                  return (
                    <div
                      key={dIdx}
                      title={`${format(day, "EEE MMM d")}, ${block.label}: ${cellTitle}`}
                      className={`h-7 rounded-xl border transition-all ${cellStyle}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend below */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-[11px] text-slate-600 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block shrink-0 shadow-2xs" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block shrink-0 shadow-2xs" />
          <span>Booked (Approved)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block shrink-0 shadow-2xs" />
          <span>Pending / Contested</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200 inline-block shrink-0" />
          <span>Outside Window</span>
        </div>
      </div>
    </div>
  );
}
