"use client";

import { useState, useRef, useCallback } from "react";
import {
  Camera,
  MapPin,
  Clock,
  Edit3,
  Check,
  RotateCcw,
  Star,
  MessageSquare,
  Plus,
  RefreshCw,
} from "lucide-react";
import type {
  DealUpdaterView,
  ExtractedDeal,
  ExistingDeal,
} from "@/lib/deal-types";

export default function DealUpdaterApp() {
  const [currentView, setCurrentView] = useState<DealUpdaterView>("welcome");
  const [viewHistory, setViewHistory] = useState<DealUpdaterView[]>(["welcome"]);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [extractedData, setExtractedData] = useState<ExtractedDeal | null>(null);
  const [matchedEntry, setMatchedEntry] = useState<ExistingDeal | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userNotes, setUserNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ExistingDeal[]>([]);
  const [textDescription, setTextDescription] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [existingEntries, setExistingEntries] = useState<ExistingDeal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing entries from Supabase/CSV
  const loadExistingEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/venues");
      if (res.ok) {
        const data = await res.json();
        setExistingEntries(data);
        return data;
      }
    } catch {
      // Fallback to empty
    }
    return existingEntries;
  }, [existingEntries]);

  // Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  // Call the server-side extract-deal API
  const processWithAPI = async () => {
    setError(null);
    setIsProcessing(true);

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
          textInput: textDescription,
          restaurantName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `API error: ${res.status}`);
      }

      const extracted: ExtractedDeal = await res.json();
      return extracted;
    } catch (err) {
      console.error("Extract deal error:", err);
      // Fallback with basic data if API fails
      setError(
        err instanceof Error ? err.message : "Failed to process. Using basic data."
      );
      return {
        restaurant_name: restaurantName || "Unknown Restaurant",
        deal_description: textDescription || "Happy hour deal",
        days: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        },
        confidence: 0.5,
        google_place: {
          name: restaurantName || "Unknown",
          neighborhood: "Atlanta",
          address: "",
          rating: null,
        },
      } as ExtractedDeal;
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle feedback submission
  const handleSubmitFeedback = async () => {
    if (!userNotes.trim() || !extractedData) return;

    setIsProcessing(true);
    try {
      const res = await fetch("/api/enhance-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extractedData,
          feedback: userNotes,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setExtractedData({
          ...updated,
          confidence: Math.min((extractedData.confidence || 0) + 0.1, 0.99),
        });
        setUserNotes("");
      } else {
        // Fallback
        setExtractedData((prev) =>
          prev
            ? {
                ...prev,
                confidence: Math.min((prev.confidence || 0) + 0.05, 0.99),
              }
            : prev
        );
        setUserNotes("");
      }
    } catch {
      setExtractedData((prev) =>
        prev
          ? {
              ...prev,
              confidence: Math.min((prev.confidence || 0) + 0.05, 0.99),
            }
          : prev
      );
      setUserNotes("");
    } finally {
      setIsProcessing(false);
    }
  };

  // Search existing entries
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    const entries = existingEntries.length > 0 ? existingEntries : [];
    if (query.trim()) {
      const q = query.toLowerCase();
      setSearchResults(
        entries.filter(
          (e) =>
            e.restaurant_name.toLowerCase().includes(q) ||
            e.neighborhood.toLowerCase().includes(q) ||
            e.deal_description.toLowerCase().includes(q)
        )
      );
    } else {
      setSearchResults(entries);
    }
  };

  // Main submit handler
  const handleSubmitInfo = async () => {
    if (!textDescription.trim() && capturedImages.length === 0) return;

    goToView("processing");
    const processed = await processWithAPI();
    setExtractedData(processed);

    // Load existing entries for matching
    const entries = await loadExistingEntries();

    goToView("matching");

    // Simple fuzzy match
    setTimeout(() => {
      const match = entries.find(
        (entry: ExistingDeal) =>
          entry.restaurant_name
            .toLowerCase()
            .includes(processed.restaurant_name.toLowerCase().split(" ")[0]) ||
          processed.restaurant_name
            .toLowerCase()
            .includes(entry.restaurant_name.toLowerCase().split(" ")[0])
      );

      if (match) {
        setMatchedEntry(match);
        goToView("comparison");
      } else {
        goToView("review");
      }
    }, 1500);
  };

  const handleImageCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    for (const file of files) {
      const imageUrl = URL.createObjectURL(file);
      setCapturedImages((prev) => [...prev, imageUrl]);
      setImageFiles((prev) => [...prev, file]);
    }
    event.target.value = "";
  };

  const removeImage = (idx: number) => {
    setCapturedImages((prev) => prev.filter((_, i) => i !== idx));
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDayToggle = (day: string) => {
    setExtractedData((prev) =>
      prev
        ? {
            ...prev,
            days: { ...prev.days, [day]: !prev.days[day as keyof typeof prev.days] },
          }
        : prev
    );
  };

  // Navigation
  const goToView = (view: DealUpdaterView) => {
    setCurrentView(view);
    setViewHistory((prev) => [...prev, view]);
  };

  const goBack = () => {
    if (viewHistory.length > 1) {
      const newHistory = viewHistory.slice(0, -1);
      setViewHistory(newHistory);
      setCurrentView(newHistory[newHistory.length - 1]);
    }
  };

  const resetApp = () => {
    setCurrentView("home");
    setViewHistory(["home"]);
    setCapturedImages([]);
    setImageFiles([]);
    setExtractedData(null);
    setMatchedEntry(null);
    setIsEditing(false);
    setUserNotes("");
    setIsProcessing(false);
    setSearchQuery("");
    setSearchResults([]);
    setTextDescription("");
    setRestaurantName("");
    setError(null);
  };

  const selectManualMatch = (entry: ExistingDeal) => {
    setMatchedEntry(entry);
    goToView("comparison");
  };

  const openManualSearch = () => {
    setSearchResults(existingEntries);
    setSearchQuery("");
    goToView("search");
  };

  const rejectMatch = () => {
    setMatchedEntry(null);
    setCurrentView("review");
  };

  const acceptUpdate = () => {
    goToView("success");
    setTimeout(() => resetApp(), 2500);
  };

  const handleSubmit = () => {
    goToView("success");
    setTimeout(() => resetApp(), 2500);
  };

  // Shared header
  const AppHeader = ({
    subtitle,
    showBack,
    showEdit,
  }: {
    subtitle?: string;
    showBack?: boolean;
    showEdit?: boolean;
  }) => (
    <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-xl px-4 py-3 border-b-4 border-pink-300">
      <div className="flex items-center justify-between">
        {showBack ? (
          <button
            onClick={goBack}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <RotateCcw size={20} className="text-white" />
          </button>
        ) : (
          <div className="w-10" />
        )}
        <div className="flex items-center space-x-2">
          <h1 className="font-semibold text-lg text-white drop-shadow-lg">
            Happy Hour Deal Updater
          </h1>
        </div>
        {showEdit ? (
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <Edit3 size={20} className="text-white" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>
      {subtitle && (
        <div className="text-center mt-2">
          <div className="text-sm text-pink-100 font-medium">{subtitle}</div>
        </div>
      )}
    </div>
  );

  const AppFooter = () => (
    <div className="bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 border-t-4 border-pink-300 px-4 py-3 text-center">
      <p className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
        Building Atlanta&apos;s happy hour community together!
      </p>
    </div>
  );

  // Hidden file input (shared)
  const HiddenFileInput = () => (
    <input
      type="file"
      ref={fileInputRef}
      onChange={handleImageCapture}
      accept="image/*"
      capture="environment"
      className="hidden"
      multiple
    />
  );

  // ========= VIEWS =========

  // Welcome View
  if (currentView === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-pink-300">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-pink-200 to-purple-200 rounded-full flex items-center justify-center">
            <span className="text-3xl">🍻</span>
          </div>

          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Happy Hour Deal Updater
          </h1>
          <p className="text-gray-600 text-sm mb-8 leading-relaxed">
            Help build Atlanta&apos;s most complete happy hour database! Add restaurant
            deals using text descriptions and menu photos.
          </p>

          <button
            onClick={() => goToView("home")}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg"
          >
            Get Started
          </button>

          <a
            href="/"
            className="inline-block mt-4 text-sm text-purple-600 hover:text-purple-800 transition-colors"
          >
            Back to Happy Hour Deals
          </a>
        </div>
      </div>
    );
  }

  // Home View (Input Form)
  if (currentView === "home") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <AppHeader subtitle="Add a new deal" />

        <div className="p-4 space-y-6">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-pink-200">
            <label className="block font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Restaurant Name
            </label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g., Joe's Tavern & Grill"
              className="w-full p-3 border-2 border-pink-300 rounded-xl focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all"
            />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-purple-200">
            <label className="block font-medium bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Happy Hour Deal Description
            </label>
            <textarea
              value={textDescription}
              onChange={(e) => setTextDescription(e.target.value)}
              placeholder="Describe the happy hour deal... e.g., Mon-Fri 4-6 PM: $5 draft beers, $7 cocktails"
              className="w-full p-3 border-2 border-purple-300 rounded-xl resize-none focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all"
              rows={4}
            />
            <p className="text-xs text-purple-600 mt-2">
              Include times, prices, days, and any conditions.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-blue-200">
            <label className="block font-medium bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Menu Photos (Optional)
            </label>

            {capturedImages.length > 0 && (
              <div className="mb-4">
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {capturedImages.map((img, idx) => (
                    <div key={idx} className="relative flex-shrink-0">
                      <img
                        src={img}
                        alt={`Menu ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-xl border-2 border-pink-300 shadow-md"
                      />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full text-xs flex items-center justify-center hover:from-pink-600 hover:to-purple-600 shadow-lg"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <HiddenFileInput />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 hover:border-pink-400 hover:text-pink-600 transition-all flex items-center justify-center space-x-2 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100"
            >
              <Camera size={20} />
              <span>Add Menu Photos</span>
            </button>

            <p className="text-xs text-blue-600 mt-2">
              Photos help AI extract deal info more accurately.
              {capturedImages.length > 0 &&
                ` (${capturedImages.length} photo${capturedImages.length > 1 ? "s" : ""} added)`}
            </p>
          </div>

          <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-2 border-pink-300 rounded-2xl p-4">
            <h3 className="font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
              How to add a deal:
            </h3>
            <div className="text-sm text-purple-700 space-y-1">
              <div>
                <strong>Text only:</strong> Fill in the deal description
              </div>
              <div>
                <strong>Photos only:</strong> Upload menu photos (AI will read
                them)
              </div>
              <div>
                <strong>Text + Photos:</strong> Best accuracy - describe AND add
                photos
              </div>
            </div>
          </div>

          <div className="pt-4 pb-20">
            <button
              onClick={handleSubmitInfo}
              disabled={
                (!textDescription.trim() && capturedImages.length === 0) ||
                isProcessing
              }
              className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-4 rounded-2xl font-semibold hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all disabled:from-gray-300 disabled:via-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg transform hover:scale-105"
            >
              <span>
                {isProcessing ? "Processing..." : "Process Deal Information"}
              </span>
              {!isProcessing && capturedImages.length > 0 && textDescription.trim() && (
                <span className="text-xs bg-pink-600 px-3 py-1 rounded-full">
                  Text + Photos
                </span>
              )}
              {!isProcessing && capturedImages.length > 0 && !textDescription.trim() && (
                <span className="text-xs bg-purple-600 px-3 py-1 rounded-full">
                  Photos Only
                </span>
              )}
              {!isProcessing && capturedImages.length === 0 && textDescription.trim() && (
                <span className="text-xs bg-blue-600 px-3 py-1 rounded-full">
                  Text Only
                </span>
              )}
            </button>
          </div>
        </div>

        <AppFooter />
      </div>
    );
  }

  // Processing View
  if (currentView === "processing") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <AppHeader subtitle="Analyzing your submission..." />

        <div className="flex-1 flex flex-col items-center justify-center p-6 mt-12">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-pink-300">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div
                className="w-20 h-20 border-4 border-pink-300 rounded-full animate-spin"
                style={{
                  background:
                    "conic-gradient(from 0deg, #ec4899, #a855f7, #3b82f6, #10b981, #f59e0b, #ec4899)",
                }}
              />
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl">🔍</span>
              </div>
            </div>

            {capturedImages[0] && (
              <img
                src={capturedImages[0]}
                alt="Captured menu"
                className="w-32 h-32 object-cover rounded-2xl mx-auto mb-4 border-4 border-purple-300 shadow-lg"
              />
            )}

            <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Analyzing with AI
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Claude is reading your deal information
              {capturedImages.length > 0 ? " and photos" : ""}...
            </p>

            <div className="text-left space-y-2 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-pink-500 rounded-full mr-3 animate-pulse" />
                <span>Reading restaurant details...</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3 animate-pulse" />
                <span>Extracting deal information...</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse" />
                <span>Looking up location data...</span>
              </div>
            </div>
          </div>
        </div>

        <AppFooter />
      </div>
    );
  }

  // Matching View
  if (currentView === "matching") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <AppHeader subtitle="Searching for matches..." />

        <div className="flex-1 flex flex-col items-center justify-center p-6 mt-12">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-purple-300">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div
                className="w-20 h-20 border-4 border-purple-300 rounded-full animate-spin"
                style={{
                  background:
                    "conic-gradient(from 0deg, #a855f7, #3b82f6, #10b981, #f59e0b, #ec4899, #a855f7)",
                }}
              />
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl">🔍</span>
              </div>
            </div>

            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Checking Database
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Searching for potential matches in existing entries...
            </p>

            <div className="text-left space-y-2 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3 animate-pulse" />
                <span>Searching existing entries...</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse" />
                <span>Analyzing similarity...</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-pink-400 rounded-full mr-3" />
                <span>Preparing comparison...</span>
              </div>
            </div>
          </div>
        </div>

        <AppFooter />
      </div>
    );
  }

  // Comparison View
  if (currentView === "comparison" && matchedEntry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <AppHeader subtitle="Match discovered!" showBack showEdit />

        <div className="p-4 space-y-4 pb-52">
          {/* Match Alert */}
          <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-4 border-pink-300 rounded-3xl p-4 flex items-start space-x-3 shadow-lg">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">🎯</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-1 text-lg">
                Potential match found!
              </h3>
              <p className="text-purple-700 text-sm">
                This might be the same restaurant. Compare the details below.
              </p>
            </div>
          </div>

          {/* Side-by-side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Existing Entry */}
            <div className="bg-white border-4 border-pink-300 rounded-2xl p-4 shadow-lg">
              <h3 className="font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center">
                <span className="w-4 h-4 bg-pink-400 rounded-full mr-2" />
                Current in Database
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-pink-700">Restaurant:</span>
                  <p className="text-gray-700 font-medium">
                    {matchedEntry.restaurant_name}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-pink-700">Deal:</span>
                  <p className="text-gray-700 bg-pink-50 p-3 rounded-xl text-xs border-2 border-pink-200">
                    {matchedEntry.deal_description}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-pink-700">Days:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(matchedEntry.days).map(([day, active]) => (
                      <span
                        key={day}
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          active
                            ? "bg-gradient-to-r from-pink-200 to-purple-200 text-pink-800 border-2 border-pink-300"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {day.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* New Entry */}
            <div className="bg-white border-4 border-purple-300 rounded-2xl p-4 shadow-lg">
              <h3 className="font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3 flex items-center">
                <span className="w-4 h-4 bg-purple-400 rounded-full mr-2" />
                Your New Info
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-purple-700">Restaurant:</span>
                  <p className="text-gray-700 font-medium">
                    {extractedData?.restaurant_name}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-purple-700">Deal:</span>
                  <p className="text-gray-700 bg-purple-50 p-3 rounded-xl text-xs border-2 border-purple-200">
                    {extractedData?.deal_description}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-purple-700">Days:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(extractedData?.days || {}).map(
                      ([day, active]) => (
                        <span
                          key={day}
                          className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            active
                              ? "bg-gradient-to-r from-purple-200 to-blue-200 text-purple-800 border-2 border-purple-300"
                              : "bg-gray-200 text-gray-500"
                          }`}
                        >
                          {day.slice(0, 3)}
                        </span>
                      )
                    )}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-purple-700">Confidence:</span>
                  <p className="text-gray-700 text-xs">
                    {Math.round((extractedData?.confidence || 0) * 100)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Photos */}
          {capturedImages.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-blue-300">
              <h4 className="font-medium mb-3 bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                Your Photos
              </h4>
              <div className="flex space-x-2 overflow-x-auto">
                {capturedImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Menu ${idx + 1}`}
                    className="w-24 h-24 object-cover rounded-xl flex-shrink-0 border-4 border-pink-300 shadow-md"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Feedback Section */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-pink-300">
            <h4 className="font-medium mb-3 flex items-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              <MessageSquare size={16} className="mr-2 text-pink-500" />
              Add Feedback or Corrections
            </h4>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              className="w-full p-3 border-4 border-pink-300 rounded-xl resize-none focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all"
              rows={3}
              placeholder="Describe any corrections or details we missed..."
            />

            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-pink-200 to-purple-200 text-pink-700 rounded-xl text-sm hover:from-pink-300 hover:to-purple-300 transition-all border-2 border-pink-300"
              >
                <Plus size={14} />
                <span>Add Photo</span>
              </button>

              {userNotes.trim() && (
                <button
                  onClick={handleSubmitFeedback}
                  disabled={isProcessing}
                  className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-sm hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all shadow-lg transform hover:scale-105 border-2 border-purple-400"
                >
                  <RefreshCw
                    size={14}
                    className={isProcessing ? "animate-spin" : ""}
                  />
                  <span>{isProcessing ? "Processing..." : "Submit Feedback"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-t-4 border-pink-300 p-4 space-y-3">
          <button
            onClick={acceptUpdate}
            className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-3 rounded-2xl font-semibold hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all flex items-center justify-center space-x-2 shadow-lg transform hover:scale-105"
          >
            <Check size={20} />
            <span>Yes, Update This Restaurant</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={rejectMatch}
              className="bg-gradient-to-r from-gray-400 to-gray-500 text-white py-2 rounded-xl font-medium hover:from-gray-500 hover:to-gray-600 transition-all text-sm shadow-md"
            >
              Different Place
            </button>
            <button
              onClick={resetApp}
              className="bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 py-2 rounded-xl font-medium hover:from-gray-400 hover:to-gray-500 transition-all flex items-center justify-center space-x-1 text-sm shadow-md"
            >
              <RotateCcw size={16} />
              <span>Start Over</span>
            </button>
          </div>
        </div>

        <HiddenFileInput />
      </div>
    );
  }

  // Search View
  if (currentView === "search") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <AppHeader subtitle="Search existing restaurants" showBack />

        <div className="p-4 space-y-4 pb-24">
          {/* Search Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-pink-300">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search restaurants, neighborhoods, or deals..."
                className="w-full p-3 pr-12 border-4 border-pink-300 rounded-xl focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all"
                autoFocus
              />
              <div className="absolute right-4 top-4 text-pink-400 text-xl">
                🔍
              </div>
            </div>
            <p className="text-sm text-purple-600 mt-2 font-medium">
              Found {searchResults.length} restaurants
            </p>
          </div>

          {/* Search Results */}
          <div className="space-y-3">
            {searchResults.map((entry, idx) => (
              <div
                key={entry.id}
                className={`bg-white rounded-2xl p-4 shadow-lg border-4 ${
                  idx % 3 === 0
                    ? "border-pink-300 hover:border-pink-400"
                    : idx % 3 === 1
                      ? "border-purple-300 hover:border-purple-400"
                      : "border-blue-300 hover:border-blue-400"
                } hover:shadow-xl transition-all`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      {entry.restaurant_name}
                    </h3>
                    <p className="text-purple-600 text-sm font-medium">
                      {entry.neighborhood}
                    </p>
                  </div>
                  <button
                    onClick={() => selectManualMatch(entry)}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg"
                  >
                    Select
                  </button>
                </div>

                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-3 mb-3 border-2 border-pink-200">
                  <p className="text-gray-700 text-sm">
                    {entry.deal_description}
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(entry.days).map(([day, active]) => (
                      <span
                        key={day}
                        className={`px-2 py-1 rounded-lg text-xs font-medium ${
                          active
                            ? "bg-gradient-to-r from-pink-200 to-purple-200 text-pink-800 border-2 border-pink-300"
                            : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {day.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-purple-600 font-medium">
                    Updated{" "}
                    {new Date(entry.last_updated).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {searchResults.length === 0 && searchQuery && (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center border-4 border-pink-300">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                No matches found
              </h3>
              <p className="text-sm text-purple-600 mb-4">
                Try a different search term or add this as a new entry.
              </p>
              <button
                onClick={() => goToView("review")}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg"
              >
                Add as New Restaurant
              </button>
            </div>
          )}

          {/* Add New Option */}
          <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-4 border-pink-300 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Not finding the right place?
                </h4>
                <p className="text-sm text-purple-600 mt-1">
                  Add &quot;{extractedData?.restaurant_name}&quot; as a new entry.
                </p>
              </div>
              <button
                onClick={() => goToView("review")}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg"
              >
                Add New
              </button>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0">
          <AppFooter />
        </div>
      </div>
    );
  }

  // Review View
  if (currentView === "review") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <AppHeader subtitle="Review your restaurant info" showBack showEdit />

        <div className="p-4 space-y-4 pb-52">
          {/* No Match Alert */}
          {!matchedEntry && (
            <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-4 border-pink-300 rounded-3xl p-4 flex items-start space-x-3 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🆕</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-1 text-lg">
                  Creating New Entry
                </h3>
                <p className="text-purple-700 text-sm">
                  No similar restaurant found. Review the details below before
                  adding.
                </p>
              </div>
            </div>
          )}

          {/* Photos */}
          {capturedImages.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-pink-300">
              <h4 className="font-medium mb-3 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Your Photos
              </h4>
              <div className="flex space-x-2 overflow-x-auto">
                {capturedImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Menu ${idx + 1}`}
                    className="w-32 h-32 object-cover rounded-2xl flex-shrink-0 border-4 border-purple-300 shadow-lg"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Restaurant Info */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-purple-300">
            <div className="flex items-start space-x-3">
              <MapPin className="text-purple-500 mt-1" size={20} />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {extractedData?.restaurant_name}
                  </h3>
                  {extractedData?.google_place?.rating && (
                    <div className="flex items-center space-x-1">
                      <Star
                        className="text-yellow-400 fill-current"
                        size={16}
                      />
                      <span className="text-sm text-gray-600">
                        {extractedData.google_place.rating}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-gray-600 text-sm">
                  {extractedData?.google_place?.address}
                </p>
                <p className="text-purple-600 text-sm font-medium">
                  {extractedData?.google_place?.neighborhood}
                </p>

                {isEditing && (
                  <input
                    type="text"
                    value={extractedData?.restaurant_name || ""}
                    onChange={(e) =>
                      setExtractedData((prev) =>
                        prev
                          ? { ...prev, restaurant_name: e.target.value }
                          : prev
                      )
                    }
                    className="mt-2 w-full p-2 border-4 border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all"
                    placeholder="Restaurant name"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Deal Description */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-blue-300">
            <div className="flex items-start space-x-3">
              <Clock className="text-blue-500 mt-1" size={20} />
              <div className="flex-1">
                <h4 className="font-medium mb-2 bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                  Happy Hour Deal
                </h4>
                {isEditing ? (
                  <textarea
                    value={extractedData?.deal_description || ""}
                    onChange={(e) =>
                      setExtractedData((prev) =>
                        prev
                          ? { ...prev, deal_description: e.target.value }
                          : prev
                      )
                    }
                    className="w-full p-3 border-4 border-blue-300 rounded-xl resize-none focus:ring-4 focus:ring-blue-300 focus:border-blue-400 transition-all"
                    rows={3}
                  />
                ) : (
                  <p className="text-gray-700 bg-gradient-to-r from-blue-50 to-pink-50 p-3 rounded-xl border-2 border-blue-200">
                    {extractedData?.deal_description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Days Available */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-pink-300">
            <h4 className="font-medium mb-3 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Available Days
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(extractedData?.days || {}).map(
                ([day, isActive]) => (
                  <button
                    key={day}
                    onClick={() => handleDayToggle(day)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg border-2 border-pink-400"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-300"
                    }`}
                  >
                    {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Feedback Section */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-purple-300">
            <h4 className="font-medium mb-3 flex items-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              <MessageSquare size={16} className="mr-2 text-purple-500" />
              Add Feedback or Corrections
            </h4>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              className="w-full p-3 border-4 border-purple-300 rounded-xl resize-none focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all"
              rows={3}
              placeholder="Tell us about any corrections or details we missed..."
            />

            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-purple-200 to-pink-200 text-purple-700 rounded-xl text-sm hover:from-purple-300 hover:to-pink-300 transition-all border-2 border-purple-300"
              >
                <Plus size={14} />
                <span>Add Photo</span>
              </button>

              {userNotes.trim() && (
                <button
                  onClick={handleSubmitFeedback}
                  disabled={isProcessing}
                  className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl text-sm hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all shadow-lg border-2 border-pink-400"
                >
                  <RefreshCw
                    size={14}
                    className={isProcessing ? "animate-spin" : ""}
                  />
                  <span>{isProcessing ? "Processing..." : "Submit Feedback"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Confidence Score */}
          <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 rounded-2xl p-4 border-4 border-pink-300 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Extraction Confidence
              </span>
              <span className="font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {Math.round((extractedData?.confidence || 0) * 100)}%
              </span>
            </div>
            <div className="mt-2 bg-gradient-to-r from-pink-200 to-purple-200 rounded-full h-3 shadow-inner">
              <div
                className="h-3 rounded-full transition-all duration-500 shadow-lg"
                style={{
                  width: `${(extractedData?.confidence || 0) * 100}%`,
                  background:
                    "linear-gradient(to right, #ec4899, #a855f7, #3b82f6)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Fixed Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-t-4 border-pink-300 p-4 space-y-3">
          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-3 rounded-2xl font-semibold hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all flex items-center justify-center space-x-2 shadow-lg transform hover:scale-105"
          >
            <Check size={20} />
            <span>Add This Restaurant</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={openManualSearch}
              className="bg-gradient-to-r from-gray-400 to-gray-500 text-white py-2 rounded-xl font-medium hover:from-gray-500 hover:to-gray-600 transition-all text-sm shadow-md"
            >
              Search Existing
            </button>
            <button
              onClick={resetApp}
              className="bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 py-2 rounded-xl font-medium hover:from-gray-400 hover:to-gray-500 transition-all flex items-center justify-center space-x-1 text-sm shadow-md"
            >
              <RotateCcw size={16} />
              <span>Start Over</span>
            </button>
          </div>
        </div>

        <HiddenFileInput />
      </div>
    );
  }

  // Success View
  if (currentView === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <AppHeader subtitle="Success!" />

        <div className="flex-1 flex flex-col items-center justify-center p-6 mt-12">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-pink-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-100/50 via-purple-100/50 to-blue-100/50 animate-pulse" />

            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full flex items-center justify-center shadow-lg">
                <Check className="text-white" size={40} />
              </div>

              <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
                Success!
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                {matchedEntry
                  ? "Updated existing entry"
                  : "Added new restaurant"}{" "}
                to Atlanta&apos;s happy hour database!
              </p>

              <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-4 border-pink-300 rounded-2xl p-4 mb-6 shadow-inner">
                <p className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  <strong>{extractedData?.restaurant_name}</strong>
                  {extractedData?.google_place?.neighborhood &&
                    ` in ${extractedData.google_place.neighborhood}`}{" "}
                  has been {matchedEntry ? "updated" : "added"}!
                </p>
              </div>

              <div className="text-sm text-purple-600 font-medium">
                Redirecting to home screen...
              </div>
            </div>
          </div>
        </div>

        <AppFooter />
      </div>
    );
  }

  return null;
}
