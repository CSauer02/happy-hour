"use client";

import { useRef, useState, useCallback, useEffect } from "react";

type SnapPoint = "peek" | "half" | "full";

const SNAP_HEIGHTS: Record<SnapPoint, number> = {
  peek: 120,
  half: 0, // calculated from vh
  full: 0, // calculated from vh
};

interface BottomSheetProps {
  children: React.ReactNode;
  venueCount: number;
}

export default function BottomSheet({ children, venueCount }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [snap, setSnap] = useState<SnapPoint>("peek");
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  // Track touch state in refs to avoid stale closures
  const touchState = useRef({
    startY: 0,
    startHeight: 0,
    lastY: 0,
    lastTime: 0,
    velocity: 0,
  });

  const getSnapHeight = useCallback((point: SnapPoint) => {
    const vh = window.innerHeight;
    if (point === "peek") return SNAP_HEIGHTS.peek;
    if (point === "half") return vh * 0.5;
    return vh * 0.85;
  }, []);

  const currentHeight = dragging
    ? dragOffset
    : getSnapHeight(snap);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // Only drag from the handle area, not the scrollable content
      const target = e.target as HTMLElement;
      const isHandle = target.closest("[data-sheet-handle]");
      const isContentScrolled = contentRef.current && contentRef.current.scrollTop > 0;

      // If touching content area and it's scrolled, let native scroll handle it
      if (!isHandle && isContentScrolled && snap === "full") return;
      // If touching content and sheet is not full, allow drag
      if (!isHandle && snap === "full") return;

      const touch = e.touches[0];
      touchState.current = {
        startY: touch.clientY,
        startHeight: getSnapHeight(snap),
        lastY: touch.clientY,
        lastTime: Date.now(),
        velocity: 0,
      };
      setDragging(true);
    },
    [snap, getSnapHeight]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging) return;

      const touch = e.touches[0];
      const now = Date.now();
      const dt = now - touchState.current.lastTime;
      const dy = touchState.current.lastY - touch.clientY;

      if (dt > 0) {
        touchState.current.velocity = dy / dt; // px/ms, positive = dragging up
      }
      touchState.current.lastY = touch.clientY;
      touchState.current.lastTime = now;

      const delta = touchState.current.startY - touch.clientY;
      const newHeight = Math.max(80, Math.min(window.innerHeight * 0.9, touchState.current.startHeight + delta));
      setDragOffset(newHeight);
    },
    [dragging]
  );

  const handleTouchEnd = useCallback(() => {
    if (!dragging) return;
    setDragging(false);

    const v = touchState.current.velocity;
    const h = dragOffset;
    const vh = window.innerHeight;

    // Velocity-based snapping
    if (Math.abs(v) > 0.5) {
      // Fast swipe
      if (v > 0) {
        // Swiping up
        setSnap(h > vh * 0.4 ? "full" : "half");
      } else {
        // Swiping down
        setSnap(h < vh * 0.3 ? "peek" : "half");
      }
    } else {
      // Position-based snapping
      const peekH = getSnapHeight("peek");
      const halfH = getSnapHeight("half");
      const fullH = getSnapHeight("full");

      const dPeek = Math.abs(h - peekH);
      const dHalf = Math.abs(h - halfH);
      const dFull = Math.abs(h - fullH);

      if (dPeek <= dHalf && dPeek <= dFull) setSnap("peek");
      else if (dHalf <= dFull) setSnap("half");
      else setSnap("full");
    }
  }, [dragging, dragOffset, getSnapHeight]);

  // When a venue is selected, expand to half if peeking
  useEffect(() => {
    // This is handled by the parent passing props; we just need the sheet open
  }, []);

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        height: `${currentHeight}px`,
        transition: dragging ? "none" : "height 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="h-full bg-gray-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden">
        {/* Drag handle */}
        <div
          data-sheet-handle
          className="shrink-0 pt-2 pb-1 px-4 cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-1" />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-medium">
              {venueCount} venue{venueCount !== 1 ? "s" : ""}
            </p>
            <button
              onClick={() => setSnap(snap === "peek" ? "half" : "peek")}
              className="text-xs text-brand-purple font-medium min-h-[32px] px-2"
            >
              {snap === "peek" ? "Show list" : "Collapse"}
            </button>
          </div>
        </div>

        {/* Scrollable content */}
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
