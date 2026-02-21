# Happy Hour Deal Updater - Software Specification

## 1. Project Overview

### 1.1 Purpose
The Happy Hour Deal Updater is a mobile-first web application designed to crowdsource and maintain accurate happy hour information for restaurants in Atlanta. The app leverages AI-powered text and image analysis to extract deal information and maintain a centralized database.

### 1.2 Scope
- **Primary Function**: Allow users to submit restaurant happy hour deals via text descriptions and/or menu photos
- **AI Integration**: Claude API for intelligent text/image extraction and data processing
- **Data Management**: Integration with Google Sheets as a backend database
- **Target Audience**: Atlanta residents, restaurant enthusiasts, happy hour seekers
- **Platform**: Progressive Web App (PWA) optimized for mobile devices

### 1.3 Key Features
- Multi-modal input (text + images)
- AI-powered information extraction
- Duplicate detection and matching
- Collaborative feedback system
- Real-time data validation
- Location-based restaurant matching

## 2. Functional Requirements

### 2.1 Core User Stories

#### 2.1.1 Information Submission
- **As a user**, I want to submit restaurant happy hour information by typing deal descriptions
- **As a user**, I want to upload menu photos for AI analysis
- **As a user**, I want to combine both text and photos for maximum accuracy
- **As a user**, I want to specify the restaurant name and receive location suggestions

#### 2.1.2 Data Processing
- **As a system**, I need to extract structured data from unstructured text and images
- **As a system**, I need to identify potential duplicate entries in the database
- **As a system**, I need to suggest matches for user confirmation
- **As a system**, I need to validate extracted information for completeness and accuracy

#### 2.1.3 User Feedback
- **As a user**, I want to review extracted information before submission
- **As a user**, I want to edit or correct AI-extracted data
- **As a user**, I want to provide feedback to improve future extractions
- **As a user**, I want to search existing entries to avoid duplicates

#### 2.1.4 Data Management
- **As an admin**, I want all submissions to be stored in a centralized Google Sheet
- **As an admin**, I want to track confidence scores for data quality
- **As an admin**, I want to maintain audit trails for all changes

### 2.2 Feature Specifications

#### 2.2.1 Input Methods
1. **Text Input**
   - Restaurant name field (optional)
   - Deal description textarea (rich text support)
   - Character limit: 500 characters
   - Real-time validation

2. **Image Upload**
   - Multiple image support (up to 5 images)
   - Camera capture integration
   - Supported formats: JPEG, PNG, WebP
   - Maximum file size: 5MB per image
   - Image compression for optimal processing

3. **Hybrid Input**
   - Combination of text and images
   - Enhanced accuracy through multi-modal analysis
   - Priority weighting system

#### 2.2.2 AI Processing Pipeline
1. **Image Analysis**
   - OCR (Optical Character Recognition)
   - Menu item detection
   - Price extraction
   - Time/schedule recognition

2. **Text Processing**
   - Natural language understanding
   - Entity extraction (restaurants, times, prices)
   - Sentiment analysis for deal quality
   - Location inference

3. **Data Structuring**
   - Restaurant name normalization
   - Deal description standardization
   - Schedule parsing (days/times)
   - Price formatting
   - Confidence scoring (0-1 scale)

#### 2.2.3 Matching System
1. **Fuzzy Matching**
   - Restaurant name similarity (Levenshtein distance)
   - Location proximity matching
   - Deal content similarity analysis
   - Confidence threshold: 0.7

2. **Manual Search**
   - Full-text search across existing entries
   - Filter by neighborhood, restaurant type
   - Sort by relevance, date updated
   - Result pagination (10 items per page)

3. **Duplicate Resolution**
   - Side-by-side comparison interface
   - User-driven decision making
   - Merge or create new entry options
   - Change tracking for updates

## 3. Technical Requirements

### 3.1 Frontend Architecture

#### 3.1.1 Technology Stack
- **Framework**: React 18+ with Hooks
- **Styling**: Tailwind CSS (utility-first)
- **State Management**: React Context + useState/useReducer
- **Routing**: React Router v6
- **Build Tool**: Vite or Create React App
- **PWA**: Service Worker for offline capabilities

#### 3.1.2 Component Structure
```
src/
├── components/
│   ├── views/
│   │   ├── WelcomeView.jsx
│   │   ├── HomeView.jsx
│   │   ├── ProcessingView.jsx
│   │   ├── MatchingView.jsx
│   │   ├── ComparisonView.jsx
│   │   ├── ReviewView.jsx
│   │   ├── SearchView.jsx
│   │   └── SuccessView.jsx
│   ├── shared/
│   │   ├── Header.jsx
│   │   ├── Footer.jsx
│   │   ├── LoadingSpinner.jsx
│   │   └── ConfidenceBar.jsx
│   └── forms/
│       ├── RestaurantForm.jsx
│       ├── DealForm.jsx
│       ├── ImageUpload.jsx
│       └── FeedbackForm.jsx
├── hooks/
│   ├── useImageProcessing.js
│   ├── useClaudeAPI.js
│   └── useLocalStorage.js
├── services/
│   ├── claudeAPI.js
│   ├── googleSheets.js
│   └── imageCompression.js
├── utils/
│   ├── dataValidation.js
│   ├── fuzzyMatching.js
│   └── formatters.js
└── types/
    ├── restaurant.ts
    ├── deal.ts
    └── api.ts
```

#### 3.1.3 State Management
```javascript
// Global Application State
const AppState = {
  currentView: 'welcome' | 'home' | 'processing' | 'matching' | 'comparison' | 'review' | 'search' | 'success',
  viewHistory: string[],
  capturedImages: Blob[],
  extractedData: ExtractedDeal | null,
  matchedEntry: ExistingDeal | null,
  isEditing: boolean,
  userNotes: string,
  isProcessing: boolean,
  searchQuery: string,
  searchResults: ExistingDeal[],
  textDescription: string,
  restaurantName: string,
  errorState: ErrorState | null
}
```

### 3.2 Backend Integration

#### 3.2.1 Claude API Integration
```javascript
// API Configuration
const CLAUDE_CONFIG = {
  model: "claude-sonnet-4-20250514",
  maxTokens: 1000,
  endpoint: "https://api.anthropic.com/v1/messages"
}

// API Methods
- processWithClaude(images: File[], text: string, restaurantName: string): Promise<ExtractedDeal>
- enhanceWithFeedback(data: ExtractedDeal, feedback: string): Promise<ExtractedDeal>
- performSimilarityMatch(newDeal: ExtractedDeal, existingDeals: ExistingDeal[]): Promise<MatchResult[]>
```

#### 3.2.2 Google Sheets Integration
```javascript
// Sheets Configuration
const SHEETS_CONFIG = {
  spreadsheetId: process.env.REACT_APP_SHEETS_ID,
  range: "HappyHourDeals!A:Z",
  apiKey: process.env.REACT_APP_SHEETS_API_KEY
}

// CRUD Operations
- createEntry(deal: ExtractedDeal): Promise<string>
- updateEntry(id: string, deal: ExtractedDeal): Promise<boolean>
- searchEntries(query: string): Promise<ExistingDeal[]>
- getAllEntries(): Promise<ExistingDeal[]>
```

### 3.3 Data Models

#### 3.3.1 Core Data Types
```typescript
interface Restaurant {
  id: string;
  name: string;
  address: string;
  neighborhood: string;
  googlePlaceId?: string;
  rating?: number;
  mapUrl?: string;
}

interface Deal {
  id: string;
  restaurantId: string;
  description: string;
  schedule: DaySchedule;
  prices: PriceInfo[];
  restrictions?: string[];
  isActive: boolean;
  lastUpdated: Date;
  confidence: number;
}

interface DaySchedule {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

interface PriceInfo {
  item: string;
  price: number;
  originalPrice?: number;
  category: 'drink' | 'food' | 'combo';
}

interface ExtractedDeal {
  restaurant_name: string;
  deal_description: string;
  days: DaySchedule;
  confidence: number;
  google_place: Restaurant;
  extracted_prices?: PriceInfo[];
  schedule_details?: TimeRange[];
}

interface SubmissionData {
  textInput: string;
  restaurantName: string;
  images: File[];
  userFeedback?: string;
  timestamp: Date;
  sessionId: string;
}
```

#### 3.3.2 API Response Formats
```typescript
interface ClaudeResponse {
  restaurant_name: string;
  deal_description: string;
  days: DaySchedule;
  confidence: number;
  google_place: {
    name: string;
    neighborhood: string;
    address: string;
    rating: number;
  };
}

interface MatchResult {
  existingEntry: ExistingDeal;
  similarityScore: number;
  matchReasons: string[];
  confidence: number;
}
```

## 4. User Interface Specifications

### 4.1 Design System

#### 4.1.1 Color Palette
```css
:root {
  --primary-pink: #ec4899;
  --primary-purple: #a855f7;
  --primary-blue: #3b82f6;
  --secondary-pink: #f8d7da;
  --secondary-purple: #e8d5ff;
  --secondary-blue: #dbeafe;
  --text-primary: #374151;
  --text-secondary: #6b7280;
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --border-color: #e5e7eb;
  --success-green: #10b981;
  --warning-yellow: #f59e0b;
  --error-red: #ef4444;
}
```

#### 4.1.2 Typography
- **Primary Font**: Inter (web-safe fallback: system-ui)
- **Heading Sizes**: text-xs to text-4xl (Tailwind scale)
- **Font Weights**: normal (400), medium (500), semibold (600), bold (700)
- **Line Heights**: tight (1.25), normal (1.5), relaxed (1.625)

#### 4.1.3 Spacing System
- **Base Unit**: 0.25rem (4px)
- **Scale**: 1, 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64
- **Container Padding**: p-4 (16px) on mobile, p-6 (24px) on desktop
- **Component Spacing**: space-y-4 (16px vertical) standard

#### 4.1.4 Component Library
```css
/* Button Styles */
.btn-primary {
  @apply bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 text-white py-3 px-6 rounded-2xl font-semibold hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all shadow-lg transform hover:scale-105;
}

.btn-secondary {
  @apply bg-gradient-to-r from-gray-400 to-gray-500 text-white py-2 px-4 rounded-xl font-medium hover:from-gray-500 hover:to-gray-600 transition-all shadow-md;
}

/* Card Styles */
.card-primary {
  @apply bg-white rounded-2xl p-4 shadow-lg border-4 border-pink-300;
}

.card-secondary {
  @apply bg-white rounded-2xl p-4 shadow-lg border-4 border-purple-300;
}

/* Input Styles */
.input-primary {
  @apply w-full p-3 border-4 border-pink-300 rounded-xl focus:ring-4 focus:ring-pink-300 focus:border-pink-400 transition-all;
}
```

### 4.2 Responsive Design

#### 4.2.1 Breakpoints
- **Mobile**: 0-640px (sm)
- **Tablet**: 641-768px (md)
- **Desktop**: 769px+ (lg)

#### 4.2.2 Layout Specifications
- **Mobile-First**: Base styles for mobile, progressive enhancement
- **Grid System**: CSS Grid and Flexbox for layouts
- **Touch Targets**: Minimum 44px x 44px for all interactive elements
- **Safe Areas**: Account for notches and home indicators

#### 4.2.3 Performance Targets
- **First Contentful Paint**: < 2 seconds
- **Largest Contentful Paint**: < 3 seconds
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

## 5. API Specifications

### 5.1 Claude API Integration

#### 5.1.1 Authentication
- **Method**: Server-side API key management
- **Security**: Keys stored in environment variables
- **Rate Limiting**: Respect Claude API limits (100 requests/hour)

#### 5.1.2 Request Formats
```javascript
// Text + Image Processing
const requestPayload = {
  model: "claude-sonnet-4-20250514",
  max_tokens: 1000,
  messages: [{
    role: "user",
    content: [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: "image/jpeg",
          data: base64ImageData
        }
      },
      {
        type: "text",
        text: "Extract happy hour information in JSON format..."
      }
    ]
  }]
}
```

#### 5.1.3 Error Handling
```javascript
// API Error Types
class APIError extends Error {
  constructor(message, statusCode, retryable = false) {
    super(message);
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

// Retry Logic
const retryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
}
```

### 5.2 Google Sheets API

#### 5.2.1 Data Schema
```javascript
// Sheet Column Mapping
const COLUMN_MAPPING = {
  A: 'id',
  B: 'restaurant_name',
  C: 'deal_description',
  D: 'monday',
  E: 'tuesday',
  F: 'wednesday',
  G: 'thursday',
  H: 'friday',
  I: 'saturday',
  J: 'sunday',
  K: 'neighborhood',
  L: 'address',
  M: 'confidence_score',
  N: 'last_updated',
  O: 'submission_type',
  P: 'user_feedback',
  Q: 'google_place_id',
  R: 'rating',
  S: 'price_range',
  T: 'created_date'
}
```

## 6. Security Considerations

### 6.1 Data Protection
- **API Keys**: Stored in environment variables, never in client code
- **Input Validation**: Sanitize all user inputs before processing
- **Image Security**: Validate file types, scan for malicious content
- **Rate Limiting**: Implement client-side and server-side rate limiting

### 6.2 Privacy
- **Data Anonymization**: No personal data collection
- **Session Management**: Client-side only, no persistent user tracking
- **Image Handling**: Process and discard, no permanent storage
- **GDPR Compliance**: Data minimization, user consent

### 6.3 Content Security
- **XSS Prevention**: Sanitize all rendered content
- **CSP Headers**: Implement Content Security Policy
- **HTTPS Only**: Enforce secure connections
- **Input Filtering**: Prevent SQL injection and code injection

## 7. Performance Requirements

### 7.1 Response Times
- **Page Load**: < 2 seconds on 3G connection
- **Image Upload**: < 5 seconds for compression
- **AI Processing**: < 10 seconds for text+image analysis
- **Search Results**: < 1 second for local filtering

### 7.2 Scalability
- **Concurrent Users**: Support 100+ simultaneous users
- **Data Growth**: Handle 10,000+ restaurant entries
- **Image Processing**: Queue system for high-volume periods
- **Caching**: Implement service worker caching

### 7.3 Reliability
- **Uptime**: 99.5% availability target
- **Error Recovery**: Graceful degradation on API failures
- **Offline Support**: Basic functionality without network
- **Data Integrity**: Validation at multiple layers

## 8. Testing Strategy

### 8.1 Unit Testing
- **Coverage Target**: 80% code coverage
- **Test Framework**: Jest + React Testing Library
- **Key Areas**: Data processing, validation, matching algorithms
- **Mock Strategy**: API calls, file uploads, external services

### 8.2 Integration Testing
- **API Integration**: Test Claude API responses
- **Google Sheets**: Validate CRUD operations
- **Image Processing**: Test file upload and compression
- **End-to-End**: User journey validation

### 8.3 User Acceptance Testing
- **Device Testing**: iOS/Android, various screen sizes
- **Browser Testing**: Chrome, Safari, Firefox, Edge
- **Network Testing**: 3G, WiFi, offline scenarios
- **Accessibility**: Screen readers, keyboard navigation

## 9. Deployment and DevOps

### 9.1 Build Process
```yaml
# GitHub Actions Workflow
name: Deploy to Production
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build application
        run: npm run build
      - name: Deploy to Vercel
        uses: vercel/deploy@v1
```

### 9.2 Environment Configuration
```bash
# Production Environment Variables
REACT_APP_CLAUDE_API_URL=https://api.anthropic.com/v1/messages
REACT_APP_SHEETS_ID=your_google_sheets_id
REACT_APP_SHEETS_API_KEY=your_sheets_api_key
REACT_APP_ENVIRONMENT=production
REACT_APP_SENTRY_DSN=your_sentry_dsn
```

### 9.3 Monitoring and Analytics
- **Error Tracking**: Sentry for crash reporting
- **Performance**: Web Vitals monitoring
- **Usage Analytics**: Privacy-focused analytics (PostHog)
- **Uptime Monitoring**: Automated health checks

## 10. Future Enhancements

### 10.1 Phase 2 Features
- **User Accounts**: Personal favorites and submission history
- **Admin Dashboard**: Content moderation and analytics
- **API Endpoints**: Public API for restaurant data
- **Mobile App**: Native iOS/Android applications

### 10.2 Advanced AI Features
- **Sentiment Analysis**: Deal quality scoring
- **Image Recognition**: Logo and brand detection
- **Predictive Text**: Auto-complete for restaurant names
- **Recommendation Engine**: Personalized deal suggestions

### 10.3 Integration Opportunities
- **Google Maps**: Location verification and reviews
- **Social Media**: Share deals on platforms
- **Calendar Integration**: Add events for favorite deals
- **Payment Processing**: Direct booking integration

## 11. Maintenance and Support

### 11.1 Regular Maintenance
- **Data Cleanup**: Remove outdated entries monthly
- **API Updates**: Monitor Claude API changes
- **Performance Optimization**: Regular performance audits
- **Security Updates**: Keep dependencies current

### 11.2 Support Structure
- **Documentation**: User guides and API documentation
- **Feedback Channel**: In-app feedback collection
- **Issue Tracking**: GitHub Issues for bug reports
- **Community**: User forum for discussions

### 11.3 Backup and Recovery
- **Data Backup**: Daily Google Sheets exports
- **Version Control**: Git-based code versioning
- **Rollback Strategy**: Blue-green deployment model
- **Disaster Recovery**: Multi-region deployment capability

---

## Appendices

### Appendix A: Technical Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.0",
    "lucide-react": "^0.263.1",
    "date-fns": "^2.29.3",
    "fuse.js": "^6.6.2",
    "react-dropzone": "^14.2.3"
  },
  "devDependencies": {
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "tailwindcss": "^3.2.7",
    "vite": "^4.1.0",
    "typescript": "^4.9.5"
  }
}
```

### Appendix B: Database Schema (Google Sheets)
| Column | Type | Description | Required |
|--------|------|-------------|----------|
| id | String | Unique identifier | Yes |
| restaurant_name | String | Restaurant name | Yes |
| deal_description | Text | Full deal description | Yes |
| monday | Boolean | Available on Monday | Yes |
| tuesday | Boolean | Available on Tuesday | Yes |
| wednesday | Boolean | Available on Wednesday | Yes |
| thursday | Boolean | Available on Thursday | Yes |
| friday | Boolean | Available on Friday | Yes |
| saturday | Boolean | Available on Saturday | Yes |
| sunday | Boolean | Available on Sunday | Yes |
| neighborhood | String | Atlanta neighborhood | No |
| address | String | Full address | No |
| confidence_score | Number | AI confidence (0-1) | Yes |
| last_updated | DateTime | Last modification | Yes |
| submission_type | String | text/image/hybrid | Yes |
| user_feedback | Text | User corrections | No |
| google_place_id | String | Google Places ID | No |
| rating | Number | Restaurant rating | No |
| price_range | String | $ to $$$$ scale | No |
| created_date | DateTime | Initial creation | Yes |

### Appendix C: API Rate Limits
- **Claude API**: 100 requests/hour per API key
- **Google Sheets API**: 600 requests/100 seconds per user
- **Client Rate Limiting**: 10 submissions per session
- **Image Processing**: 5 images per submission

This specification serves as the complete technical blueprint for developing the Happy Hour Deal Updater application.