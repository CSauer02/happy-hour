"use client";

import { DayFilter, DAYS, DAY_LABELS, getTodayKey } from "@/lib/types";

interface HeaderProps {
  activeDay: DayFilter;
  happeningNow: boolean;
  onDayChange: (day: DayFilter) => void;
  onHappeningNowToggle: () => void;
}

export default function Header({
  activeDay,
  happeningNow,
  onDayChange,
  onHappeningNowToggle,
}: HeaderProps) {
  const todayKey = getTodayKey();
  const isWeekday = todayKey !== null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="rainbow-bar" />
      <div className="bg-brand-gradient px-4 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
          {/* Logo / Title */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl md:text-2xl font-bold text-white tracking-tight">
              ATL Happy Hour
            </span>
          </div>

          {/* Day Filters */}
          <nav className="flex items-center gap-1.5 flex-wrap justify-center">
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => onDayChange(day)}
                className={`btn-day ${activeDay === day ? "btn-day-active" : ""}`}
                aria-pressed={activeDay === day}
              >
                <span className="hidden sm:inline">{DAY_LABELS[day].full}</span>
                <span className="sm:hidden">{DAY_LABELS[day].short}</span>
              </button>
            ))}
          </nav>

          {/* Happening Now Toggle */}
          {isWeekday && (
            <button
              onClick={onHappeningNowToggle}
              className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                happeningNow
                  ? "bg-brand-yellow text-brand-purple shadow-md"
                  : "border border-white/30 text-white/80 hover:bg-white/20"
              }`}
              aria-pressed={happeningNow}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  happeningNow ? "bg-brand-purple animate-pulse" : "bg-white/60"
                }`}
              />
              <span className="hidden md:inline">Happening Now</span>
              <span className="md:hidden">Now</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
