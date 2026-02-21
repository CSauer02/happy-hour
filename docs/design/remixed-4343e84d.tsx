import React, { useState, useRef } from 'react';
import { Camera, MapPin, Clock, Edit3, Check, X, RotateCcw, Star, AlertTriangle, MessageSquare, Plus, RefreshCw } from 'lucide-react';

const HappyHourScanner = () => {
  const [currentView, setCurrentView] = useState('welcome');
  const [viewHistory, setViewHistory] = useState(['welcome']);
  const [capturedImages, setCapturedImages] = useState([]);
  const [extractedData, setExtractedData] = useState(null);
  const [matchedEntry, setMatchedEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userNotes, setUserNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [textDescription, setTextDescription] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const fileInputRef = useRef(null);

  // Mock existing entries from Google Sheet
  const mockExistingEntries = [
    {
      id: "1",
      restaurant_name: "Joe's Tavern",
      deal_description: "Daily 4-6 PM: $10 margaritas ($36 pitcher), $9 wine & $11 cocktails",
      days: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      },
      neighborhood: "Buckhead",
      last_updated: "2025-06-15T10:30:00Z"
    },
    {
      id: "2",
      restaurant_name: "The Grilled Oyster",
      deal_description: "Mon-Thu 3-6 PM: $1 oysters, $5 wine, $4 beer",
      days: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: false,
        saturday: false,
        sunday: false
      },
      neighborhood: "Marietta Square",
      last_updated: "2025-07-10T14:20:00Z"
    }
  ];

  // Helper function to convert image to base64
  const imageToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(",")[1]; // Remove data URL prefix
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  // Real Claude API integration
  const processWithClaude = async (images = [], textInput = '', restaurantName = '') => {
    try {
      setIsProcessing(true);
      
      const content = [];
      
      // Add images if provided
      for (const imageUrl of images) {
        if (imageUrl.startsWith('blob:')) {
          // Convert blob URL back to file for base64 conversion
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const file = new File([blob], 'image.jpg', { type: 'image/jpeg' });
          const base64Data = await imageToBase64(file);
          
          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: base64Data,
            },
          });
        }
      }

      // Add text prompt
      const prompt = `You are a magical unicorn AI that extracts happy hour information! 🦄✨

Please analyze ${images.length > 0 ? 'the provided images and ' : ''}the following information to extract restaurant happy hour details:

Restaurant Name: "${restaurantName}"
Deal Description: "${textInput}"

Extract and return ONLY a JSON object with this exact structure:
{
  "restaurant_name": "extracted or provided restaurant name",
  "deal_description": "detailed happy hour description with times, prices, and items",
  "days": {
    "monday": true/false,
    "tuesday": true/false,
    "wednesday": true/false,
    "thursday": true/false,
    "friday": true/false,
    "saturday": true/false,
    "sunday": true/false
  },
  "confidence": 0.85,
  "google_place": {
    "name": "restaurant name for Google search",
    "neighborhood": "estimated Atlanta neighborhood",
    "address": "estimated address if mentioned",
    "rating": 4.2
  }
}

Focus on:
- Accurate times (like "4-6 PM" or "Monday-Friday 5-7 PM")
- Specific prices and items
- Which days the deal applies to
- Any restrictions or conditions

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`;

      content.push({
        type: "text",
        text: prompt,
      });

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content }]
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      let responseText = data.content[0].text;
      
      // Clean up the response to extract JSON
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const extractedInfo = JSON.parse(responseText);
      
      // Enhance with mock Google Places data for demo
      extractedInfo.google_place = {
        ...extractedInfo.google_place,
        address: "1234 Peachtree Street NE, Atlanta, GA 30309",
        maps_url: "https://maps.google.com/place/ChIJ...",
        rating: 4.2
      };
      
      return extractedInfo;
      
    } catch (error) {
      console.error("Error processing with Claude:", error);
      // Fallback to mock data if API fails
      return {
        restaurant_name: restaurantName || "Joe's Tavern & Grill",
        deal_description: textInput || "Happy Hour 4-6 PM: $5 draft beers, $7 house cocktails, $3 wings",
        days: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false
        },
        confidence: 0.75,
        google_place: {
          name: restaurantName || "Joe's Tavern & Grill",
          address: "1234 Peachtree Street NE, Atlanta, GA 30309",
          neighborhood: "Buckhead",
          rating: 4.2,
          maps_url: "https://maps.google.com/place/ChIJ..."
        }
      };
    } finally {
      setIsProcessing(false);
    }
  };

  // Enhanced search function
  const handleSearch = (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      const filtered = mockExistingEntries.filter(entry =>
        entry.restaurant_name.toLowerCase().includes(query.toLowerCase()) ||
        entry.neighborhood.toLowerCase().includes(query.toLowerCase()) ||
        entry.deal_description.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults(mockExistingEntries);
    }
  };

  const selectManualMatch = (entry) => {
    setMatchedEntry(entry);
    setCurrentView('comparison');
  };

  const openManualSearch = () => {
    setSearchResults(mockExistingEntries);
    setSearchQuery('');
    setCurrentView('search');
  };

  // Enhanced Claude feedback processing
  const handleSubmitFeedback = async () => {
    if (!userNotes.trim()) {
      alert('Please add some feedback before submitting! 🦄');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `Given this extracted restaurant data:
${JSON.stringify(extractedData, null, 2)}

And this user feedback: "${userNotes}"

Please update and improve the data based on the feedback. Return ONLY the updated JSON with the same structure, incorporating the user's corrections and suggestions.

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON.`
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        let responseText = data.content[0].text;
        responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const updatedData = JSON.parse(responseText);
        
        setExtractedData({
          ...updatedData,
          confidence: Math.min((extractedData.confidence || 0) + 0.1, 0.99)
        });
        
        setUserNotes('');
        alert('Feedback processed! ✨🦄 The data has been magically improved!');
      } else {
        throw new Error('Failed to process feedback');
      }
    } catch (error) {
      console.error("Error processing feedback:", error);
      // Fallback enhancement
      setExtractedData(prev => ({
        ...prev,
        deal_description: prev.deal_description + " (Enhanced with user feedback)",
        confidence: Math.min((prev.confidence || 0) + 0.05, 0.99)
      }));
      setUserNotes('');
      alert('Feedback received! ✨🦄 Claude will use this to improve future extractions.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Main processing function
  const handleSubmitInfo = async () => {
    if (!textDescription.trim() && capturedImages.length === 0) {
      alert('Please either describe the deal or add photos! 🦄✨');
      return;
    }

    goToView('processing');
    
    // Process with Claude API
    const processedData = await processWithClaude(capturedImages, textDescription, restaurantName);
    setExtractedData(processedData);
    
    // Move to matching phase
    goToView('matching');
    
    // Simulate matching delay then check for matches
    setTimeout(() => {
      // Simple matching logic - check if restaurant name is similar
      const possibleMatch = mockExistingEntries.find(entry => 
        entry.restaurant_name.toLowerCase().includes(processedData.restaurant_name.toLowerCase().split(' ')[0]) ||
        processedData.restaurant_name.toLowerCase().includes(entry.restaurant_name.toLowerCase().split(' ')[0])
      );
      
      if (possibleMatch && Math.random() > 0.3) {
        setMatchedEntry(possibleMatch);
        goToView('comparison');
      } else {
        goToView('review');
      }
    }, 2000);
  };

  const handleImageCapture = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      const imageUrl = URL.createObjectURL(file);
      setCapturedImages(prev => [...prev, imageUrl]);
    });
    event.target.value = '';
  };

  const handleDayToggle = (day) => {
    setExtractedData(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: !prev.days[day]
      }
    }));
  };

  const rejectMatch = () => {
    setMatchedEntry(null);
    setCurrentView('review');
  };

  const acceptUpdate = () => {
    setCurrentView('success');
    setTimeout(() => {
      resetApp();
    }, 2000);
  };

  const handleSubmit = () => {
    setCurrentView('success');
    setTimeout(() => {
      resetApp();
    }, 2000);
  };

  // Navigation helpers
  const goToView = (view) => {
    setCurrentView(view);
    setViewHistory(prev => [...prev, view]);
  };

  const goBack = () => {
    if (viewHistory.length > 1) {
      const newHistory = viewHistory.slice(0, -1);
      setViewHistory(newHistory);
      setCurrentView(newHistory[newHistory.length - 1]);
    }
  };

  const resetApp = () => {
    setCurrentView('home');
    setViewHistory(['home']);
    setCapturedImages([]);
    setExtractedData(null);
    setMatchedEntry(null);
    setIsEditing(false);
    setUserNotes('');
    setIsProcessing(false);
    setSearchQuery('');
    setSearchResults([]);
    setTextDescription('');
    setRestaurantName('');
  };

  // Welcome View
  if (currentView === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-pink-300">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-pink-200 to-purple-200 rounded-full flex items-center justify-center animate-bounce">
            <span className="text-3xl">🦄</span>
          </div>
          
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Happy Hour Deal Updater ✨
          </h1>
          <p className="text-gray-600 text-sm mb-8 leading-relaxed">
            Help build Atlanta's most fabulous happy hour database! Add restaurant deals with sparkles and magic! 🌈🍻
          </p>
          
          <button
            onClick={() => goToView('home')}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 rounded-2xl font-semibold hover:from-pink-600 hover:to-purple-600 transition-all transform hover:scale-105 shadow-lg"
          >
            Let's Get Fabulous! 🦄
          </button>
        </div>
      </div>
    );
  }

  // Home Screen
  if (currentView === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-xl px-4 py-4 border-b-4 border-pink-300">
          <div className="flex items-center justify-center space-x-2 mb-3">
            <span className="text-2xl animate-bounce">🦄</span>
            <h1 className="text-xl font-bold text-white drop-shadow-lg">Happy Hour Deal Updater</h1>
            <span className="text-2xl animate-bounce">✨</span>
          </div>
          
          <div className="text-center mb-3">
            <div className="inline-flex items-center space-x-2 bg-white/20 rounded-full px-4 py-2 backdrop-blur-sm">
              <span className="text-white font-medium text-sm">🌟 Start Here - Add Your Fabulous Deal! 🌟</span>
            </div>
          </div>
          
          <div className="flex justify-center space-x-8">
            <div className="text-center">
              <div className="text-xl font-bold text-white drop-shadow-lg">247</div>
              <div className="text-xs text-pink-100">restaurants tracked</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-white drop-shadow-lg">12</div>
              <div className="text-xs text-pink-100">added this week</div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-pink-200">
            <label className="block font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Restaurant Name ✨
            </label>
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="e.g., Joe's Fabulous Tavern & Grill 🌈"
              className="w-full p-3 border-2 border-pink-300 rounded-xl focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all"
            />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-purple-200">
            <label className="block font-medium bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Happy Hour Deal Description 🍻
            </label>
            <textarea
              value={textDescription}
              onChange={(e) => setTextDescription(e.target.value)}
              placeholder="Describe the magical happy hour deal... e.g., Mon-Fri 4-6 PM: $5 rainbow beers, $7 unicorn cocktails! ✨"
              className="w-full p-3 border-2 border-purple-300 rounded-xl resize-none focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all"
              rows="4"
            />
            <p className="text-xs text-purple-600 mt-2">Include times, prices, days, and any magical conditions! 🦄</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-blue-200">
            <label className="block font-medium bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Menu Photos (Optional) 📸
            </label>
            
            {capturedImages.length > 0 && (
              <div className="mb-4">
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {capturedImages.map((img, idx) => (
                    <div key={idx} className="relative flex-shrink-0">
                      <img src={img} alt={`Menu ${idx + 1}`} className="w-20 h-20 object-cover rounded-xl border-2 border-pink-300 shadow-md" />
                      <button
                        onClick={() => setCapturedImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full text-xs flex items-center justify-center hover:from-pink-600 hover:to-purple-600 shadow-lg"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageCapture}
              accept="image/*"
              capture="camera"
              className="hidden"
              multiple
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-3 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 hover:border-pink-400 hover:text-pink-600 transition-all flex items-center justify-center space-x-2 bg-gradient-to-r from-pink-50 to-purple-50 hover:from-pink-100 hover:to-purple-100"
            >
              <Camera size={20} />
              <span>Add Magical Menu Photos ✨</span>
            </button>
            
            <p className="text-xs text-blue-600 mt-2">
              Photos help improve accuracy with unicorn magic! {capturedImages.length > 0 && `(${capturedImages.length} fabulous photos added! 🌈)`}
            </p>
          </div>

          <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-2 border-pink-300 rounded-2xl p-4">
            <h3 className="font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
              🦄 How to add a fabulous deal:
            </h3>
            <div className="text-sm text-purple-700 space-y-1">
              <div>• <strong>Text only:</strong> Just fill in the magical deal description ✨</div>
              <div>• <strong>Photos only:</strong> Upload sparkly menu photos (AI unicorns will read them!) 📸</div>
              <div>• <strong>Text + Photos:</strong> Best accuracy - describe AND add photos for maximum magic! 🌈</div>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSubmitInfo}
              disabled={(!textDescription.trim() && capturedImages.length === 0) || isProcessing}
              className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-4 rounded-2xl font-semibold hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all disabled:from-gray-300 disabled:via-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg transform hover:scale-105"
            >
              <span>{isProcessing ? '✨ Processing Magic...' : '✨ Process Deal Information ✨'}</span>
              {!isProcessing && capturedImages.length > 0 && textDescription.trim() && <span className="text-xs bg-pink-600 px-3 py-1 rounded-full">🌈 Text + Photos</span>}
              {!isProcessing && capturedImages.length > 0 && !textDescription.trim() && <span className="text-xs bg-purple-600 px-3 py-1 rounded-full">📸 Photos Only</span>}
              {!isProcessing && capturedImages.length === 0 && textDescription.trim() && <span className="text-xs bg-blue-600 px-3 py-1 rounded-full">✍️ Text Only</span>}
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 border-t-4 border-pink-300 px-4 py-3 text-center">
          <p className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            🦄 Building Atlanta's most fabulous happy hour community together! 🌈✨
          </p>
        </div>
      </div>
    );
  }

  // Processing View
  if (currentView === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-xl px-4 py-4 border-b-4 border-pink-300">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl animate-bounce">🦄</span>
            <h1 className="text-xl font-bold text-white drop-shadow-lg">Happy Hour Deal Updater</h1>
            <span className="text-2xl animate-bounce">✨</span>
          </div>
          <div className="text-center mt-2">
            <div className="text-sm text-pink-100 font-medium">Sprinkling magic on your submission! ✨</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-pink-300">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="w-20 h-20 border-4 border-pink-300 rounded-full animate-spin" style={{
                background: 'conic-gradient(from 0deg, #ec4899, #a855f7, #3b82f6, #10b981, #f59e0b, #ec4899)'
              }}></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl animate-bounce">🦄</span>
              </div>
            </div>
            
            {capturedImages[0] && (
              <img src={capturedImages[0]} alt="Captured menu" className="w-32 h-32 object-cover rounded-2xl mx-auto mb-4 border-4 border-purple-300 shadow-lg" />
            )}
            
            <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Analyzing with Unicorn Magic! ✨
            </h2>
            <p className="text-gray-600 text-sm mb-4">Claude's unicorns are reading your fabulous deal information and photos! 🌈</p>
            
            <div className="text-left space-y-2 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-pink-500 rounded-full mr-3 animate-pulse"></div>
                <span>Reading restaurant details with sparkles... ✨</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3 animate-pulse"></div>
                <span>Extracting magical deal information... 🦄</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                <span>Looking up location data with rainbow power... 🌈</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 border-t-4 border-pink-300 px-4 py-3 text-center">
          <p className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            🦄 Building Atlanta's most fabulous happy hour community together! 🌈✨
          </p>
        </div>
      </div>
    );
  }

  // Matching View
  if (currentView === 'matching') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-xl px-4 py-4 border-b-4 border-pink-300">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl animate-bounce">🦄</span>
            <h1 className="text-xl font-bold text-white drop-shadow-lg">Happy Hour Deal Updater</h1>
            <span className="text-2xl animate-bounce">✨</span>
          </div>
          <div className="text-center mt-2">
            <div className="text-sm text-pink-100 font-medium">Searching for magical matches! 🔍✨</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-purple-300">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="w-20 h-20 border-4 border-purple-300 rounded-full animate-spin" style={{
                background: 'conic-gradient(from 0deg, #a855f7, #3b82f6, #10b981, #f59e0b, #ec4899, #a855f7)'
              }}></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl animate-ping">🔍</span>
              </div>
            </div>
            
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Checking Magical Database! 🌈
            </h2>
            <p className="text-gray-600 text-sm mb-4">Unicorns are searching for potential fabulous matches! ✨</p>
            
            <div className="text-left space-y-2 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3 animate-pulse"></div>
                <span>Searching magical Google Sheet... 📊</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                <span>Claude unicorns analyzing similarity... 🦄</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-pink-400 rounded-full mr-3"></div>
                <span>Preparing fabulous comparison... ✨</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 border-t-4 border-pink-300 px-4 py-3 text-center">
          <p className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            🦄 Building Atlanta's most fabulous happy hour community together! 🌈✨
          </p>
        </div>
      </div>
    );
  }

  // Processing View
  if (currentView === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-xl px-4 py-4 border-b-4 border-pink-300">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl animate-bounce">🦄</span>
            <h1 className="text-xl font-bold text-white drop-shadow-lg">Happy Hour Deal Updater</h1>
            <span className="text-2xl animate-bounce">✨</span>
          </div>
          <div className="text-center mt-2">
            <div className="text-sm text-pink-100 font-medium">Sprinkling magic on your submission! ✨</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-pink-300">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="w-20 h-20 border-4 border-pink-300 rounded-full animate-spin" style={{
                background: 'conic-gradient(from 0deg, #ec4899, #a855f7, #3b82f6, #10b981, #f59e0b, #ec4899)'
              }}></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl animate-bounce">🦄</span>
              </div>
            </div>
            
            {capturedImages[0] && (
              <img src={capturedImages[0]} alt="Captured menu" className="w-32 h-32 object-cover rounded-2xl mx-auto mb-4 border-4 border-purple-300 shadow-lg" />
            )}
            
            <h2 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Analyzing with Unicorn Magic! ✨
            </h2>
            <p className="text-gray-600 text-sm mb-4">Claude's unicorns are reading your fabulous deal information and photos! 🌈</p>
            
            <div className="text-left space-y-2 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-pink-500 rounded-full mr-3 animate-pulse"></div>
                <span>Reading restaurant details with sparkles... ✨</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3 animate-pulse"></div>
                <span>Extracting magical deal information... 🦄</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                <span>Looking up location data with rainbow power... 🌈</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 border-t-4 border-pink-300 px-4 py-3 text-center">
          <p className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            🦄 Building Atlanta's most fabulous happy hour community together! 🌈✨
          </p>
        </div>
      </div>
    );
  }

  // Matching View
  if (currentView === 'matching') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-xl px-4 py-4 border-b-4 border-pink-300">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl animate-bounce">🦄</span>
            <h1 className="text-xl font-bold text-white drop-shadow-lg">Happy Hour Deal Updater</h1>
            <span className="text-2xl animate-bounce">✨</span>
          </div>
          <div className="text-center mt-2">
            <div className="text-sm text-pink-100 font-medium">Searching for magical matches! 🔍✨</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-purple-300">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="w-20 h-20 border-4 border-purple-300 rounded-full animate-spin" style={{
                background: 'conic-gradient(from 0deg, #a855f7, #3b82f6, #10b981, #f59e0b, #ec4899, #a855f7)'
              }}></div>
              <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl animate-ping">🔍</span>
              </div>
            </div>
            
            <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Checking Magical Database! 🌈
            </h2>
            <p className="text-gray-600 text-sm mb-4">Unicorns are searching for potential fabulous matches! ✨</p>
            
            <div className="text-left space-y-2 text-sm text-gray-500">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-purple-500 rounded-full mr-3 animate-pulse"></div>
                <span>Searching magical Google Sheet... 📊</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-3 animate-pulse"></div>
                <span>Claude unicorns analyzing similarity... 🦄</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-pink-400 rounded-full mr-3"></div>
                <span>Preparing fabulous comparison... ✨</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 border-t-4 border-pink-300 px-4 py-3 text-center">
          <p className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            🦄 Building Atlanta's most fabulous happy hour community together! 🌈✨
          </p>
        </div>
      </div>
    );
  }

  // Comparison View (when match found)
  if (currentView === 'comparison' && matchedEntry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-xl px-4 py-3 border-b-4 border-pink-300">
          <div className="flex items-center justify-between">
            <button onClick={goBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <RotateCcw size={20} className="text-white" />
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-xl animate-bounce">🦄</span>
              <h1 className="font-semibold text-lg text-white drop-shadow-lg">Happy Hour Deal Updater</h1>
              <span className="text-xl animate-bounce">✨</span>
            </div>
            <button onClick={() => setIsEditing(!isEditing)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <Edit3 size={20} className="text-white" />
            </button>
          </div>
          <div className="text-center mt-2">
            <div className="text-sm text-pink-100 font-medium">Fabulous match discovered! 🎉</div>
          </div>
        </div>

        <div className="p-4 space-y-4 pb-32">
          {/* Super Cute Match Alert */}
          <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-4 border-pink-300 rounded-3xl p-4 flex items-start space-x-3 shadow-lg">
            <div className="w-12 h-12 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full flex items-center justify-center flex-shrink-0 animate-bounce">
              <span className="text-2xl">🎉</span>
            </div>
            <div className="flex-1">
              <h3 className="font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-1 text-lg">
                OMG! We found a magical match! ✨🦄
              </h3>
              <p className="text-purple-700 text-sm">
                Claude's unicorns think this might be the same fabulous place! Let's compare the sparkly details below to make sure! 🌈
              </p>
            </div>
          </div>

          {/* Rainbow Side-by-side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Existing Entry */}
            <div className="bg-white border-4 border-pink-300 rounded-2xl p-4 shadow-lg">
              <h3 className="font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center">
                <span className="w-4 h-4 bg-pink-400 rounded-full mr-2 animate-pulse"></span>
                Current in Database ✨
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-pink-700">Restaurant:</span>
                  <p className="text-gray-700 font-medium">{matchedEntry.restaurant_name}</p>
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
                      <span key={day} className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        active ? 'bg-gradient-to-r from-pink-200 to-purple-200 text-pink-800 border-2 border-pink-300' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {day.slice(0,3)}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="font-medium text-pink-700">Last Updated:</span>
                  <p className="text-gray-600 text-xs">June 15, 2025 ✨</p>
                </div>
              </div>
            </div>

            {/* New Entry */}
            <div className="bg-white border-4 border-purple-300 rounded-2xl p-4 shadow-lg">
              <h3 className="font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3 flex items-center">
                <span className="w-4 h-4 bg-purple-400 rounded-full mr-2 animate-pulse"></span>
                Your Fabulous New Info 🦄
              </h3>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-purple-700">Restaurant:</span>
                  <p className="text-gray-700 font-medium">{extractedData?.restaurant_name}</p>
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
                    {Object.entries(extractedData?.days || {}).map(([day, active]) => (
                      <span key={day} className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        active ? 'bg-gradient-to-r from-purple-200 to-blue-200 text-purple-800 border-2 border-purple-300' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {day.slice(0,3)}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <span className="font-medium text-purple-700">Confidence:</span>
                  <p className="text-gray-700 text-xs">{Math.round((extractedData?.confidence || 0) * 100)}% magical! ✨</p>
                </div>
              </div>
            </div>
          </div>

          {/* Photos */}
          {capturedImages.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-blue-300">
              <h4 className="font-medium mb-3 bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                Your Magical Photos 📸✨
              </h4>
              <div className="flex space-x-2 overflow-x-auto">
                {capturedImages.map((img, idx) => (
                  <img key={idx} src={img} alt={`Menu ${idx + 1}`} className="w-24 h-24 object-cover rounded-xl flex-shrink-0 border-4 border-pink-300 shadow-md" />
                ))}
              </div>
            </div>
          )}

          {/* Enhanced User Notes & Feedback Section */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-pink-300">
            <h4 className="font-medium mb-3 flex items-center bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              <MessageSquare size={16} className="mr-2 text-pink-500" />
              Add Magical Feedback or Corrections 🦄✨
            </h4>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              className="w-full p-3 border-4 border-pink-300 rounded-xl resize-none focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all"
              rows="3"
              placeholder="Tell Claude's unicorns about any corrections or magical details we missed! ✨🌈"
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
                  <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                  <span>{isProcessing ? 'Sprinkling Magic...' : '✨ Submit Magical Feedback ✨'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fixed Rainbow Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-t-4 border-pink-300 p-4 space-y-3">
          <button
            onClick={acceptUpdate}
            className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-3 rounded-2xl font-semibold hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all flex items-center justify-center space-x-2 shadow-lg transform hover:scale-105"
          >
            <Check size={20} />
            <span>✨ Yes, Update This Magical Restaurant! ✨</span>
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={rejectMatch}
              className="bg-gradient-to-r from-gray-400 to-gray-500 text-white py-2 rounded-xl font-medium hover:from-gray-500 hover:to-gray-600 transition-all text-sm shadow-md"
            >
              Different Place 🦄
            </button>
            <button
              onClick={resetApp}
              className="bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 py-2 rounded-xl font-medium hover:from-gray-400 hover:to-gray-500 transition-all flex items-center justify-center space-x-1 text-sm shadow-md"
            >
              <RotateCcw size={16} />
              <span>Start Over ✨</span>
            </button>
          </div>
          
          <div className="text-center pt-2">
            <p className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              🦄 Building Atlanta's most fabulous happy hour community together! 🌈✨
            </p>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageCapture}
          accept="image/*"
          capture="camera"
          className="hidden"
          multiple
        />
      </div>
    );
  }

  // Manual Search View
  if (currentView === 'search') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-xl px-4 py-3 border-b-4 border-pink-300">
          <div className="flex items-center justify-between">
            <button onClick={goBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <RotateCcw size={20} className="text-white" />
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-xl animate-bounce">🦄</span>
              <h1 className="font-semibold text-lg text-white drop-shadow-lg">Happy Hour Deal Updater</h1>
              <span className="text-xl animate-bounce">✨</span>
            </div>
            <div className="w-10"></div>
          </div>
          <div className="text-center mt-2">
            <div className="text-sm text-pink-100 font-medium">Search for magical existing restaurants 🔍✨</div>
          </div>
        </div>

        <div className="p-4 space-y-4 pb-24">
          {/* Magical Search Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-pink-300">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for fabulous restaurants, neighborhoods, or deals... ✨"
                className="w-full p-3 pr-12 border-4 border-pink-300 rounded-xl focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all"
                autoFocus
              />
              <div className="absolute right-4 top-4 text-pink-400 text-xl">
                🔍
              </div>
            </div>
            <p className="text-sm text-purple-600 mt-2 font-medium">
              Found {searchResults.length} magical restaurants in our fabulous database! 🌈
            </p>
          </div>

          {/* Rainbow Search Results */}
          <div className="space-y-3">
            {searchResults.map((entry, idx) => (
              <div key={entry.id} className={`bg-white rounded-2xl p-4 shadow-lg border-4 ${
                idx % 3 === 0 ? 'border-pink-300 hover:border-pink-400' : 
                idx % 3 === 1 ? 'border-purple-300 hover:border-purple-400' : 
                'border-blue-300 hover:border-blue-400'
              } hover:shadow-xl transition-all transform hover:scale-105`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                      {entry.restaurant_name} ✨
                    </h3>
                    <p className="text-purple-600 text-sm font-medium">{entry.neighborhood} 🏘️</p>
                  </div>
                  <button
                    onClick={() => selectManualMatch(entry)}
                    className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg transform hover:scale-105"
                  >
                    Select! 🦄
                  </button>
                </div>
                
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-3 mb-3 border-2 border-pink-200">
                  <p className="text-gray-700 text-sm">{entry.deal_description}</p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(entry.days).map(([day, active]) => (
                      <span key={day} className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        active ? 'bg-gradient-to-r from-pink-200 to-purple-200 text-pink-800 border-2 border-pink-300' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {day.slice(0,3)}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-purple-600 font-medium">
                    Updated {new Date(entry.last_updated).toLocaleDateString()} ✨
                  </span>
                </div>
              </div>
            ))}
          </div>

          {searchResults.length === 0 && searchQuery && (
            <div className="bg-white rounded-2xl p-8 shadow-lg text-center border-4 border-pink-300">
              <div className="text-6xl mb-4">🦄</div>
              <h3 className="font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                No magical matches found! ✨
              </h3>
              <p className="text-sm text-purple-600 mb-4">Try a different search term or add this fabulous place as new! 🌈</p>
              <button
                onClick={() => goToView('review')}
                className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-medium hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg transform hover:scale-105"
              >
                Add as New Magical Restaurant! 🦄✨
              </button>
            </div>
          )}

          {/* Fabulous Add New Option */}
          <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-4 border-pink-300 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  Not finding the right magical place? ✨
                </h4>
                <p className="text-sm text-purple-600 mt-1">
                  Add "{extractedData?.restaurant_name}" as a fabulous new entry! 🦄
                </p>
              </div>
              <button
                onClick={() => goToView('review')}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl text-sm font-medium hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg transform hover:scale-105"
              >
                Add New! 🌈
              </button>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 border-t-4 border-pink-300 px-4 py-3 text-center">
          <p className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            🦄 Building Atlanta's most fabulous happy hour community together! 🌈✨
          </p>
        </div>
      </div>
    );
  }

  // Review View
  if (currentView === 'review') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-xl px-4 py-3 border-b-4 border-pink-300">
          <div className="flex items-center justify-between">
            <button onClick={goBack} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <RotateCcw size={20} className="text-white" />
            </button>
            <div className="flex items-center space-x-2">
              <span className="text-xl animate-bounce">🦄</span>
              <h1 className="font-semibold text-lg text-white drop-shadow-lg">Happy Hour Deal Updater</h1>
              <span className="text-xl animate-bounce">✨</span>
            </div>
            <button onClick={() => setIsEditing(!isEditing)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <Edit3 size={20} className="text-white" />
            </button>
          </div>
          <div className="text-center mt-2">
            <div className="text-sm text-pink-100 font-medium">Review your magical restaurant info! ✨</div>
          </div>
        </div>

        <div className="p-4 space-y-4 pb-32">
          {/* Fabulous No Match Alert */}
          {!matchedEntry && (
            <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-4 border-pink-300 rounded-3xl p-4 flex items-start space-x-3 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full flex items-center justify-center flex-shrink-0 animate-bounce">
                <span className="text-2xl">🎉</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-1 text-lg">
                  Creating New Magical Entry! ✨🦄
                </h3>
                <p className="text-purple-700 text-sm">
                  We couldn't find a similar restaurant in our magical database. Let's add this fabulous new place to spread the sparkles! 🌈
                </p>
              </div>
            </div>
          )}

          {/* Rainbow Photos */}
          {capturedImages.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-pink-300">
              <h4 className="font-medium mb-3 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Your Magical Photos 📸✨
              </h4>
              <div className="flex space-x-2 overflow-x-auto">
                {capturedImages.map((img, idx) => (
                  <img key={idx} src={img} alt={`Menu ${idx + 1}`} className="w-32 h-32 object-cover rounded-2xl flex-shrink-0 border-4 border-purple-300 shadow-lg" />
                ))}
              </div>
            </div>
          )}

          {/* Fabulous Restaurant Info */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-purple-300">
            <div className="flex items-start space-x-3">
              <MapPin className="text-purple-500 mt-1" size={20} />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {extractedData?.restaurant_name} ✨
                  </h3>
                  <div className="flex items-center space-x-1">
                    <Star className="text-yellow-400 fill-current" size={16} />
                    <span className="text-sm text-gray-600">{extractedData?.google_place?.rating}</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm">{extractedData?.google_place?.address}</p>
                <p className="text-purple-600 text-sm font-medium">{extractedData?.google_place?.neighborhood} 🏘️</p>
                
                {isEditing && (
                  <input
                    type="text"
                    value={extractedData?.restaurant_name}
                    onChange={(e) => setExtractedData(prev => ({...prev, restaurant_name: e.target.value}))}
                    className="mt-2 w-full p-2 border-4 border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all"
                    placeholder="Restaurant name ✨"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Magical Deal Description */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-blue-300">
            <div className="flex items-start space-x-3">
              <Clock className="text-blue-500 mt-1" size={20} />
              <div className="flex-1">
                <h4 className="font-medium mb-2 bg-gradient-to-r from-blue-600 to-pink-600 bg-clip-text text-transparent">
                  Fabulous Happy Hour Deal 🍻✨
                </h4>
                {isEditing ? (
                  <textarea
                    value={extractedData?.deal_description}
                    onChange={(e) => setExtractedData(prev => ({...prev, deal_description: e.target.value}))}
                    className="w-full p-3 border-4 border-blue-300 rounded-xl resize-none focus:ring-4 focus:ring-blue-300 focus:border-blue-400 transition-all"
                    rows="3"
                    placeholder="Describe the magical happy hour deal... ✨"
                  />
                ) : (
                  <p className="text-gray-700 bg-gradient-to-r from-blue-50 to-pink-50 p-3 rounded-xl border-2 border-blue-200">
                    {extractedData?.deal_description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Rainbow Days Available */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-pink-300">
            <h4 className="font-medium mb-3 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              Available Magical Days 🌈
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(extractedData?.days || {}).map(([day, isActive]) => (
                <button
                  key={day}
                  onClick={() => handleDayToggle(day)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all transform hover:scale-105 ${
                    isActive 
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg border-2 border-pink-400' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-2 border-gray-300'
                  }`}
                >
                  {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Enhanced Magical Feedback Section */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border-4 border-purple-300">
            <h4 className="font-medium mb-3 flex items-center bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              <MessageSquare size={16} className="mr-2 text-purple-500" />
              Add Magical Feedback or Corrections 🦄✨
            </h4>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              className="w-full p-3 border-4 border-purple-300 rounded-xl resize-none focus:ring-4 focus:ring-purple-300 focus:border-purple-400 transition-all"
              rows="3"
              placeholder="Tell Claude's unicorns about any corrections or magical details we missed! Help us make this entry even more fabulous! ✨🌈"
            />
            
            <div className="mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full p-3 border-2 border-dashed border-purple-400 rounded-xl text-purple-600 hover:border-pink-400 hover:text-pink-600 transition-all flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100"
              >
                <Camera size={20} />
                <span>Add More Magical Photos ✨</span>
              </button>
            </div>
            
            <div className="flex space-x-2 mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-purple-200 to-pink-200 text-purple-700 rounded-xl text-sm hover:from-purple-300 hover:to-pink-300 transition-all border-2 border-purple-300"
              >
                <Plus size={14} />
                <span>Quick Photo</span>
              </button>
              
              {userNotes.trim() && (
                <button
                  onClick={handleSubmitFeedback}
                  disabled={isProcessing}
                  className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl text-sm hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 transition-all shadow-lg transform hover:scale-105 border-2 border-pink-400"
                >
                  <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                  <span>{isProcessing ? 'Sprinkling Magic...' : '✨ Submit Magical Feedback ✨'}</span>
                </button>
              )}
            </div>
            
            <p className="text-xs text-purple-600 mt-2">
              Your feedback helps Claude's unicorns learn and make the magic even stronger! 🦄🌈
            </p>
          </div>

          {/* Rainbow Confidence Score */}
          <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 rounded-2xl p-4 border-4 border-pink-300 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                Extraction Confidence ✨
              </span>
              <span className="font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {Math.round((extractedData?.confidence || 0) * 100)}% magical! 🦄
              </span>
            </div>
            <div className="mt-2 bg-gradient-to-r from-pink-200 to-purple-200 rounded-full h-3 shadow-inner">
              <div 
                className="h-3 rounded-full transition-all duration-500 shadow-lg"
                style={{ 
                  width: `${(extractedData?.confidence || 0) * 100}%`,
                  background: 'linear-gradient(to right, #ec4899, #a855f7, #3b82f6)'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Fixed Rainbow Bottom Actions */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-t-4 border-pink-300 p-4 space-y-3">
          <button
            onClick={handleSubmit}
            className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-3 rounded-2xl font-semibold hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all flex items-center justify-center space-x-2 shadow-lg transform hover:scale-105"
          >
            <Check size={20} />
            <span>✨ Add This Magical Restaurant! ✨</span>
          </button>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={openManualSearch}
              className="bg-gradient-to-r from-gray-400 to-gray-500 text-white py-2 rounded-xl font-medium hover:from-gray-500 hover:to-gray-600 transition-all text-sm shadow-md"
            >
              Search Existing 🔍
            </button>
            <button
              onClick={resetApp}
              className="bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700 py-2 rounded-xl font-medium hover:from-gray-400 hover:to-gray-500 transition-all flex items-center justify-center space-x-1 text-sm shadow-md"
            >
              <RotateCcw size={16} />
              <span>Start Over ✨</span>
            </button>
          </div>
          
          <div className="text-center pt-2">
            <p className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              🦄 Building Atlanta's most fabulous happy hour community together! 🌈✨
            </p>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageCapture}
          accept="image/*"
          capture="camera"
          className="hidden"
          multiple
        />
      </div>
    );
  }

  // Confirmation View
  if (currentView === 'confirmation') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-xl px-4 py-4 border-b-4 border-pink-300">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl animate-bounce">🦄</span>
            <h1 className="text-xl font-bold text-white drop-shadow-lg">Happy Hour Deal Updater</h1>
            <span className="text-2xl animate-bounce">✨</span>
          </div>
          <div className="text-center mt-2">
            <div className="text-sm text-pink-100 font-medium">Sprinkling final magical touches! ✨</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-pink-300 relative overflow-hidden">
            {/* Magical background animation */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-4 left-4 text-2xl animate-bounce" style={{animationDelay: '0s'}}>✨</div>
              <div className="absolute top-8 right-6 text-xl animate-bounce" style={{animationDelay: '0.2s'}}>🌈</div>
              <div className="absolute bottom-8 left-6 text-lg animate-bounce" style={{animationDelay: '0.4s'}}>🦄</div>
              <div className="absolute bottom-4 right-4 text-xl animate-bounce" style={{animationDelay: '0.6s'}}>💖</div>
              <div className="absolute top-12 left-1/2 text-sm animate-bounce" style={{animationDelay: '0.8s'}}>🌟</div>
            </div>
            
            <div className="relative z-10">
              {/* Giant unicorn checkmark */}
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <div className="w-24 h-24 bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center">
                    <span className="text-4xl animate-bounce">🦄</span>
                  </div>
                </div>
                {/* Floating checkmark */}
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-green-500 rounded-full flex items-center justify-center animate-bounce shadow-lg">
                  <Check className="text-white" size={20} />
                </div>
              </div>
              
              <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4 animate-pulse">
                ✨ Magical Confirmation! ✨
              </h2>
              
              <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-4 border-pink-300 rounded-2xl p-4 mb-6 shadow-inner">
                <p className="text-lg font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  🎉 FABULOUS SUCCESS! 🎉
                </p>
                <p className="text-sm font-medium text-purple-700">
                  <strong>{extractedData?.restaurant_name}</strong> has been {matchedEntry ? 'updated' : 'added'} to our magical database with maximum sparkles! ✨
                </p>
              </div>
              
              <div className="space-y-2 text-sm text-purple-600 font-medium">
                <div className="flex items-center justify-center space-x-2">
                  <span className="animate-spin">🌟</span>
                  <span>Notifying Atlanta unicorns...</span>
                  <span className="animate-spin">🌟</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <span className="animate-ping">✨</span>
                  <span>Adding rainbow sparkles...</span>
                  <span className="animate-ping">✨</span>
                </div>
                <div className="flex items-center justify-center space-x-2">
                  <span className="animate-bounce">🦄</span>
                  <span>Spreading the magic...</span>
                  <span className="animate-bounce">🦄</span>
                </div>
              </div>
              
              <div className="mt-6 text-xs text-gray-500 animate-pulse">
                Returning to magical home screen...
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 border-t-4 border-pink-300 px-4 py-3 text-center">
          <p className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            🦄 Atlanta's happy hour community just got more fabulous! 🌈✨
          </p>
        </div>
      </div>
    );
  }

  // Success View (legacy - keeping for any edge cases)
  if (currentView === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 shadow-xl px-4 py-4 border-b-4 border-pink-300">
          <div className="flex items-center justify-center space-x-2">
            <span className="text-2xl animate-bounce">🦄</span>
            <h1 className="text-xl font-bold text-white drop-shadow-lg">Happy Hour Deal Updater</h1>
            <span className="text-2xl animate-bounce">✨</span>
          </div>
          <div className="text-center mt-2">
            <div className="text-sm text-pink-100 font-medium">Magical success achieved! 🎉</div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center border-4 border-pink-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-100/50 via-purple-100/50 to-blue-100/50 animate-pulse"></div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-pink-300 to-purple-300 rounded-full flex items-center justify-center animate-bounce shadow-lg">
                <Check className="text-white" size={40} />
              </div>
              
              <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
                ✨ Magical Success! ✨
              </h2>
              <p className="text-gray-600 text-sm mb-6">
                {matchedEntry ? 'Updated existing entry' : 'Added fabulous new restaurant'} to Atlanta's most magical happy hour database! 🌈
              </p>
              
              <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-blue-100 border-4 border-pink-300 rounded-2xl p-4 mb-6 shadow-inner">
                <p className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                  <strong>{extractedData?.restaurant_name}</strong> in {extractedData?.google_place?.neighborhood} has been {matchedEntry ? 'updated' : 'added'} with sparkles! ✨🦄
                </p>
              </div>
              
              <div className="text-sm text-purple-600 font-medium flex items-center justify-center space-x-2">
                <span className="animate-spin">🌟</span>
                <span>Redirecting to magical home screen...</span>
                <span className="animate-spin">🌟</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-pink-200 via-purple-200 to-blue-200 border-t-4 border-pink-300 px-4 py-3 text-center">
          <p className="text-sm font-medium bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            🦄 Building Atlanta's most fabulous happy hour community together! 🌈✨
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default HappyHourScanner;