"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DayFilter, DAYS, DAY_LABELS, getTodayKey } from "@/lib/types";
import { createClient } from "@/lib/supabase-browser";

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
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email ?? null);
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setIsAdmin(profile?.role === "admin");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setUserEmail(session.user.email ?? null);
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", session.user.id)
            .single();
          setIsAdmin(profile?.role === "admin");
        } else {
          setUserEmail(null);
          setIsAdmin(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserEmail(null);
    setIsAdmin(false);
    router.push("/");
    router.refresh();
  };

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
          <nav className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
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

          <div className="flex items-center gap-2 shrink-0">
            {/* Happening Now Toggle */}
            {isWeekday && (
              <button
                onClick={onHappeningNowToggle}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
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

            {userEmail ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 bg-white/15 border border-white/30 text-white hover:bg-white/25 hover:scale-105 backdrop-blur-sm"
                  >
                    <span className="hidden md:inline">Admin</span>
                    <span className="md:hidden">⚙️</span>
                  </Link>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white/15 border border-white/30 text-white backdrop-blur-sm">
                  <span className="text-base">&#x1f984;</span>
                  <span className="hidden md:inline max-w-[120px] truncate">{userEmail}</span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 bg-white/15 border border-white/30 text-white hover:bg-white/25 hover:scale-105 backdrop-blur-sm"
                >
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 bg-white/15 border border-white/30 text-white hover:bg-white/25 hover:scale-105 backdrop-blur-sm"
              >
                <span className="text-base">&#x1f984;</span>
                <span className="hidden md:inline">Members</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
