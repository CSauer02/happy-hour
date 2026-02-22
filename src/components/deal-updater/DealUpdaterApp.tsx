"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  Check,
  RotateCcw,
  Edit3,
  ChevronDown,
  ChevronUp,
  X,
  ImagePlus,
} from "lucide-react";
import type { ExtractedDeal, ExistingDeal } from "@/lib/deal-types";

type AppView = "capture" | "processing" | "result" | "success";

// Magic processing messages that rotate during AI analysis
const MAGIC_MESSAGES = [
  "Reading the menu...",
  "Spotting the deals...",
  "Decoding happy hour times...",
  "Checking prices...",
  "Finding the restaurant...",
  "Locating the neighborhood...",
  "Almost there...",
  "Sprinkling unicorn dust...",
];

export default function DealUpdaterApp() {
  // Core state
  const [view, setView] = useState<AppView>("capture");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);

  // AI result state
  const [extractedData, setExtractedData] = useState<ExtractedDeal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Matching state
  const [existingEntries, setExistingEntries] = useState<ExistingDeal[]>([]);
  const [matchedEntry, setMatchedEntry] = useState<ExistingDeal | null>(null);

  // Processing animation
  const [magicMsgIdx, setMagicMsgIdx] = useState(0);
  const [processingDots, setProcessingDots] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Rotate magic messages during processing
  useEffect(() => {
    if (view !== "processing") return;
    const msgInterval = setInterval(() => {
      setMagicMsgIdx((prev) => (prev + 1) % MAGIC_MESSAGES.length);
    }, 2000);
    const dotInterval = setInterval(() => {
      setProcessingDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => {
      clearInterval(msgInterval);
      clearInterval(dotInterval);
    };
  }, [view]);

  // Load existing entries on mount
  useEffect(() => {
    fetch("/api/venues")
      .then((res) => res.ok ? res.json() : [])
      .then(setExistingEntries)
      .catch(() => {});
  }, []);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  // Handle image selection (camera or gallery)
  const handleImageCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      setCapturedImages((prev) => [...prev, URL.createObjectURL(file)]);
      setImageFiles((prev) => [...prev, file]);
    }
    event.target.value = "";
  };

  const removeImage = (idx: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== idx));
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // THE MAGIC: send photos to AI and let it do everything
  const runMagic = useCallback(async () => {
    if (imageFiles.length === 0 && !pasteText.trim()) return;

    setView("processing");
    setError(null);
    setMagicMsgIdx(0);

    try {
      const images = [];
      for (const file of imageFiles) {
        const base64 = await fileToBase64(file);
        images.push({ base64, mediaType: file.type || "image/jpeg" });
      }

      const res = await fetch("/api/extract-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images,
          textInput: pasteText,
          restaurantName: "", // AI figures it out
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `API error: ${res.status}`);
      }

      const extracted: ExtractedDeal = await res.json();
      setExtractedData(extracted);

      // Auto-match against existing entries
      const match = existingEntries.find((entry) => {
        const extractedWords = extracted.restaurant_name.toLowerCase().split(/\s+/);
        const entryWords = entry.restaurant_name.toLowerCase().split(/\s+/);
        return extractedWords.some((w) => w.length > 2 && entryWords.some((ew) => ew.includes(w) || w.includes(ew)));
      });
      setMatchedEntry(match || null);

      setView("result");
    } catch (err) {
      console.error("AI extraction error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setView("capture");
    }
  }, [imageFiles, pasteText, existingEntries]);

  // Submit correction feedback to AI
  const submitCorrection = useCallback(async (feedback: string) => {
    if (!extractedData || !feedback.trim()) return;

    try {
      const res = await fetch("/api/enhance-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extractedData, feedback }),
      });

      if (res.ok) {
        const updated = await res.json();
        setExtractedData({
          ...updated,
          confidence: Math.min((extractedData.confidence || 0) + 0.1, 0.99),
        });
      }
    } catch {
      // Keep current data on error
    }
  }, [extractedData]);

  // Final submit
  const handleSubmit = () => {
    setView("success");
    setTimeout(resetApp, 3000);
  };

  const resetApp = () => {
    setView("capture");
    setCapturedImages([]);
    setImageFiles([]);
    setPasteText("");
    setShowTextInput(false);
    setExtractedData(null);
    setMatchedEntry(null);
    setIsEditing(false);
    setError(null);
  };

  // Day toggle in result view
  const toggleDay = (day: string) => {
    setExtractedData((prev) =>
      prev ? { ...prev, days: { ...prev.days, [day]: !prev.days[day as keyof typeof prev.days] } } : prev
    );
  };

  // ============================
  // VIEW: CAPTURE (photo-first)
  // ============================
  if (view === "capture") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 px-4 py-3 shadow-xl">
          <div className="flex items-center justify-between">
            <a href="/" className="p-2 hover:bg-white/20 rounded-xl transition-colors text-white text-sm">&#x2190; Back</a>
            <h1 className="font-semibold text-lg text-white">&#x1f984; Deal Updater</h1>
            <div className="w-16" />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-red-700 text-sm w-full max-w-md flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="ml-2"><X size={16} /></button>
            </div>
          )}

          {/* Photo preview strip */}
          {capturedImages.length > 0 && (
            <div className="flex gap-3 overflow-x-auto pb-2 w-full max-w-md">
              {capturedImages.map((img, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                  <img
                    src={img}
                    alt={`Photo ${idx + 1}`}
                    className="w-24 h-24 object-cover rounded-2xl border-4 border-purple-300 shadow-lg"
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full flex items-center justify-center shadow-lg text-sm font-bold"
                  >
                    &#x00d7;
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Main capture area */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border-4 border-purple-200">
            {capturedImages.length === 0 ? (
              <>
                <div className="w-28 h-28 mx-auto mb-6 bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-6xl">&#x1f4f8;</span>
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  Snap the Deal
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  Take a photo of the happy hour menu, sign, or deal board. The AI unicorn will do the rest &#x2728;
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  {capturedImages.length} photo{capturedImages.length > 1 ? "s" : ""} ready &#x2728;
                </h2>
                <p className="text-gray-500 text-sm mb-6">
                  Add more photos or let the AI work its magic
                </p>
              </>
            )}

            {/* Camera + Gallery buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-pink-300 rounded-2xl hover:bg-pink-50 transition-all group"
              >
                <Camera size={28} className="text-pink-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-pink-600">Camera</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-purple-300 rounded-2xl hover:bg-purple-50 transition-all group"
              >
                <ImagePlus size={28} className="text-purple-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium text-purple-600">Gallery</span>
              </button>
            </div>

            {/* Optional text input toggle */}
            <button
              onClick={() => setShowTextInput(!showTextInput)}
              className="text-sm text-purple-500 hover:text-purple-700 transition-colors flex items-center gap-1 mx-auto mb-3"
            >
              {showTextInput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showTextInput ? "Hide text input" : "Or paste deal text instead"}
            </button>

            {showTextInput && (
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste or type the deal info here..."
                className="w-full p-3 border-2 border-purple-200 rounded-xl resize-none focus:ring-4 focus:ring-purple-200 focus:border-purple-400 transition-all text-sm mb-4"
                rows={3}
              />
            )}

            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageCapture}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageCapture}
              className="hidden"
            />
          </div>

          {/* GO button — only shows when we have input */}
          {(capturedImages.length > 0 || pasteText.trim()) && (
            <button
              onClick={runMagic}
              className="w-full max-w-md bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-4 rounded-2xl font-bold text-lg hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all transform hover:scale-105 shadow-xl flex items-center justify-center gap-3"
            >
              <span className="text-2xl">&#x1f984;</span>
              <span>Let the AI Work Its Magic</span>
              <span className="text-2xl">&#x2728;</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================
  // VIEW: PROCESSING (AI magic)
  // ============================
  if (view === "processing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Floating sparkles */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] left-[15%] text-4xl animate-bounce opacity-30" style={{ animationDuration: "3s" }}>&#x2728;</div>
          <div className="absolute top-[20%] right-[20%] text-3xl animate-bounce opacity-25" style={{ animationDelay: "1s", animationDuration: "4s" }}>&#x1f31f;</div>
          <div className="absolute bottom-[25%] left-[10%] text-3xl animate-bounce opacity-20" style={{ animationDelay: "0.5s", animationDuration: "3.5s" }}>&#x1f984;</div>
          <div className="absolute bottom-[15%] right-[15%] text-4xl animate-bounce opacity-25" style={{ animationDelay: "2s", animationDuration: "4.5s" }}>&#x2728;</div>
          <div className="absolute top-[45%] left-[5%] text-5xl animate-bounce opacity-15" style={{ animationDelay: "1.5s", animationDuration: "5s" }}>&#x1f984;</div>
          <div className="absolute top-[60%] right-[8%] text-2xl animate-bounce opacity-20" style={{ animationDelay: "0.8s", animationDuration: "3.8s" }}>&#x1f31f;</div>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-purple-300 relative z-10">
          {/* Spinning unicorn */}
          <div className="w-32 h-32 mx-auto mb-6 relative">
            <div
              className="w-32 h-32 rounded-full animate-spin"
              style={{
                animationDuration: "3s",
                background: "conic-gradient(from 0deg, #ec4899, #a855f7, #3b82f6, #10b981, #f59e0b, #ec4899)",
              }}
            />
            <div className="absolute inset-3 bg-white rounded-full flex items-center justify-center">
              <span className="text-5xl">&#x1f984;</span>
            </div>
          </div>

          {/* Photo being analyzed */}
          {capturedImages[0] && (
            <img
              src={capturedImages[0]}
              alt="Analyzing..."
              className="w-28 h-28 object-cover rounded-2xl mx-auto mb-4 border-4 border-purple-300 shadow-lg opacity-80"
            />
          )}

          <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            AI Magic in Progress{processingDots}
          </h2>
          <p className="text-purple-600 text-sm font-medium mb-4 h-5">
            {MAGIC_MESSAGES[magicMsgIdx]}
          </p>

          <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full animate-pulse" style={{
              width: "100%",
              background: "linear-gradient(90deg, #ec4899, #a855f7, #3b82f6, #ec4899)",
              backgroundSize: "200% 100%",
              animation: "shimmer 2s linear infinite",
            }} />
          </div>
        </div>

        <style jsx>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  // ============================
  // VIEW: RESULT (AI output + human correction)
  // ============================
  if (view === "result" && extractedData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 px-4 py-3 shadow-xl">
          <div className="flex items-center justify-between">
            <button onClick={resetApp} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <RotateCcw size={20} className="text-white" />
            </button>
            <h1 className="font-semibold text-lg text-white">&#x1f984; AI Found This</h1>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`p-2 rounded-xl transition-colors ${isEditing ? "bg-white/30" : "hover:bg-white/20"}`}
            >
              <Edit3 size={20} className="text-white" />
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 space-y-4 pb-36">
          {/* Confidence indicator */}
          <div className="flex items-center gap-3 bg-white/80 rounded-2xl p-3 border-2 border-purple-200">
            <span className="text-2xl">&#x1f984;</span>
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-medium text-purple-700">AI Confidence</span>
                <span className="font-bold text-purple-700">{Math.round((extractedData.confidence || 0) * 100)}%</span>
              </div>
              <div className="h-2 bg-purple-100 rounded-full">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${(extractedData.confidence || 0) * 100}%`,
                    background: "linear-gradient(to right, #ec4899, #a855f7, #3b82f6)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Match alert */}
          {matchedEntry && (
            <div className="bg-gradient-to-r from-pink-100 to-purple-100 border-2 border-pink-300 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">&#x1f3af;</span>
                <div className="flex-1">
                  <p className="font-bold text-purple-700 text-sm">Existing match found!</p>
                  <p className="text-purple-600 text-xs">{matchedEntry.restaurant_name} &mdash; {matchedEntry.neighborhood}</p>
                </div>
              </div>
            </div>
          )}

          {/* Photos */}
          {capturedImages.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {capturedImages.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt={`Photo ${idx + 1}`}
                  className="w-20 h-20 object-cover rounded-xl border-2 border-purple-200 flex-shrink-0"
                />
              ))}
            </div>
          )}

          {/* Restaurant Name */}
          <div className="bg-white rounded-2xl p-4 shadow-md border-2 border-pink-200">
            <label className="text-xs font-semibold text-pink-600 uppercase tracking-wide">Restaurant</label>
            {isEditing ? (
              <input
                type="text"
                value={extractedData.restaurant_name}
                onChange={(e) => setExtractedData({ ...extractedData, restaurant_name: e.target.value })}
                className="w-full mt-1 p-2 border-2 border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-300 text-lg font-semibold"
              />
            ) : (
              <p className="text-lg font-semibold text-gray-900 mt-1">{extractedData.restaurant_name}</p>
            )}
            {extractedData.google_place?.neighborhood && (
              <p className="text-sm text-purple-600 mt-1">&#x1f4cd; {extractedData.google_place.neighborhood}</p>
            )}
          </div>

          {/* Deal Description */}
          <div className="bg-white rounded-2xl p-4 shadow-md border-2 border-purple-200">
            <label className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Happy Hour Deal</label>
            {isEditing ? (
              <textarea
                value={extractedData.deal_description}
                onChange={(e) => setExtractedData({ ...extractedData, deal_description: e.target.value })}
                className="w-full mt-1 p-2 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-300 text-sm"
                rows={3}
              />
            ) : (
              <p className="text-sm text-gray-700 mt-1 leading-relaxed">{extractedData.deal_description}</p>
            )}
          </div>

          {/* Days */}
          <div className="bg-white rounded-2xl p-4 shadow-md border-2 border-blue-200">
            <label className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2 block">Days Available</label>
            <div className="grid grid-cols-7 gap-1">
              {(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
                    extractedData.days[day]
                      ? "bg-gradient-to-b from-pink-500 to-purple-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                  }`}
                >
                  {day.slice(0, 3).toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Quick correction */}
          <CorrectionBox onSubmit={submitCorrection} />
        </div>

        {/* Fixed bottom submit */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t-2 border-purple-200 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-3.5 rounded-2xl font-bold text-lg hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all shadow-xl flex items-center justify-center gap-2"
          >
            <Check size={22} />
            <span>{matchedEntry ? "Update This Deal" : "Add New Deal"}</span>
            <span>&#x1f984;</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setIsEditing(!isEditing); }}
              className="py-2 rounded-xl text-sm font-medium bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all"
            >
              {isEditing ? "Done Editing" : "&#x270f;&#xfe0f; Edit Fields"}
            </button>
            <button
              onClick={resetApp}
              className="py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all flex items-center justify-center gap-1"
            >
              <RotateCcw size={14} />
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================
  // VIEW: SUCCESS
  // ============================
  if (view === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Celebration sparkles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-bounce opacity-30"
              style={{
                top: `${10 + Math.random() * 80}%`,
                left: `${5 + Math.random() * 90}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2.5 + Math.random() * 2}s`,
              }}
            >
              {i % 3 === 0 ? "\u2728" : i % 3 === 1 ? "\u{1f984}" : "\u{1f31f}"}
            </div>
          ))}
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-purple-300 relative z-10">
          <div className="w-28 h-28 mx-auto mb-6 bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300 rounded-full flex items-center justify-center shadow-lg animate-bounce" style={{ animationDuration: "2s" }}>
            <span className="text-6xl">&#x1f984;</span>
          </div>

          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
            Magical! &#x2728;
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            {matchedEntry ? "Updated" : "Added"} <strong>{extractedData?.restaurant_name}</strong>
            {extractedData?.google_place?.neighborhood && ` in ${extractedData.google_place.neighborhood}`}!
          </p>

          <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-blue-50 rounded-2xl p-4 border-2 border-purple-200">
            <p className="text-xs text-purple-600">Thanks for helping build Atlanta&#x27;s best happy hour guide!</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Quick correction component
function CorrectionBox({ onSubmit }: { onSubmit: (feedback: string) => Promise<void> }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    await onSubmit(text);
    setText("");
    setSubmitting(false);
  };

  return (
    <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 border-2 border-pink-200">
      <label className="text-xs font-semibold text-pink-600 uppercase tracking-wide mb-2 block">
        &#x1f984; Something wrong? Tell the AI
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="e.g. It's actually on Peachtree St..."
          className="flex-1 p-2.5 border-2 border-pink-200 rounded-xl text-sm focus:ring-2 focus:ring-pink-300"
        />
        {text.trim() && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all"
          >
            {submitting ? "..." : "Fix"}
          </button>
        )}
      </div>
    </div>
  );
}
