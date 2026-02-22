"use client";

import { useState, useEffect } from "react";
import DealUpdaterApp from "@/components/deal-updater/DealUpdaterApp";

export default function DealUpdaterPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Check if already authed via httpOnly cookie by hitting the venues API
  useEffect(() => {
    fetch("/api/venues")
      .then((res) => {
        // The venues endpoint doesn't require auth, but we can check
        // if the auth cookie exists by looking at document.cookie.
        // httpOnly cookies aren't visible to JS, so just show the gate.
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/deal-updater", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setAuthed(true);
      } else {
        const data = await res.json();
        setError(data.error || "Invalid password");
      }
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (authed) {
    return <DealUpdaterApp />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Floating unicorn sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[10%] left-[15%] text-4xl animate-bounce opacity-30" style={{ animationDelay: "0s", animationDuration: "3s" }}>&#x2728;</div>
        <div className="absolute top-[20%] right-[20%] text-3xl animate-bounce opacity-25" style={{ animationDelay: "1s", animationDuration: "4s" }}>&#x1f984;</div>
        <div className="absolute bottom-[25%] left-[10%] text-3xl animate-bounce opacity-20" style={{ animationDelay: "0.5s", animationDuration: "3.5s" }}>&#x2728;</div>
        <div className="absolute bottom-[15%] right-[15%] text-4xl animate-bounce opacity-25" style={{ animationDelay: "2s", animationDuration: "4.5s" }}>&#x1f984;</div>
        <div className="absolute top-[50%] left-[5%] text-2xl animate-bounce opacity-15" style={{ animationDelay: "1.5s", animationDuration: "5s" }}>&#x1f31f;</div>
        <div className="absolute top-[40%] right-[8%] text-2xl animate-bounce opacity-20" style={{ animationDelay: "0.8s", animationDuration: "3.8s" }}>&#x1f31f;</div>
      </div>

      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-pink-300 relative z-10">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 rounded-full flex items-center justify-center shadow-lg">
          <span className="text-5xl">&#x1f984;</span>
        </div>

        <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
          Members Only
        </h1>
        <p className="text-gray-600 text-sm mb-6">
          Enter the magic password to add and update happy hour deals. &#x2728;
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="&#x1f512; Enter member password"
            className="w-full p-3 border-2 border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all text-center"
            autoFocus
          />

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={!password.trim() || submitting}
            className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-3 rounded-2xl font-semibold hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:transform-none"
          >
            {submitting ? "Checking..." : "&#x1f984; Enter the Magic"}
          </button>
        </form>

        <a
          href="/"
          className="inline-block mt-4 text-sm text-purple-600 hover:text-purple-800 transition-colors"
        >
          &#x2190; Back to Happy Hour Deals
        </a>
      </div>
    </div>
  );
}
