"use client";

import { useRef } from "react";
import { DayFilter, DAYS, DAY_LABELS, getTodayKey } from "@/lib/types";

interface BottomSheetProps {
  children: React.ReactNode;
  venueCount: number;
  activeDay: DayFilter;
  happeningNow: boolean;
  onDayChange: (day: DayFilter) => void;
  onHappeningNowToggle: () => void;
  selectedVenueId: number | null;
  isLocated?: boolean;
}

export default function BottomSheet({
  children,
  venueCount,
  activeDay,
  happeningNow,
  onDayChange,
  onHappeningNowToggle,
  isLocated,
}: BottomSheetProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const todayKey = getTodayKey();
  const isWeekday = todayKey !== null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{ height: "50dvh" }}
    >
      <div className="h-full bg-gray-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        {/* Day filter strip */}
        <div className="shrink-0 px-2 pt-2 pb-1.5 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1 w-max">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => onDayChange(day)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap min-h-[32px] ${
                  activeDay === day
                    ? "bg-brand-purple text-white shadow-sm"
                    : "bg-gray-200/80 text-gray-600 hover:bg-gray-300/80"
                }`}
              >
                {DAY_LABELS[day].short}
              </button>
            ))}
            {isWeekday && (
              <button
                onClick={onHappeningNowToggle}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all whitespace-nowrap min-h-[32px] flex items-center gap-1 ${
                  happeningNow
                    ? "bg-brand-yellow text-brand-purple font-bold shadow-sm"
                    : "bg-gray-200/80 text-gray-600 hover:bg-gray-300/80"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${happeningNow ? "bg-brand-purple animate-pulse" : "bg-gray-400"}`} />
                Now
              </button>
            )}
            <span className="text-[10px] text-gray-400 pl-1 whitespace-nowrap">
              {venueCount} {isLocated ? `deal${venueCount !== 1 ? "s" : ""} near you` : `spot${venueCount !== 1 ? "s" : ""}`}
            </span>
          </div>
        </div>

        {/* Scrollable venue list */}
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto sidebar-scroll"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
