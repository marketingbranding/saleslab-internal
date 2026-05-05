# SalesLab Internal

Platform internal untuk melatih skill sales dan negosiasi tim dengan simulasi AI.

![SalesLab](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?style=for-the-badge&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06b6d4?style=for-the-badge&logo=tailwindcss)
![Firebase](https://img.shields.io/badge/Firebase-12-ffca28?style=for-the-badge&logo=firebase)
![Gemini](https://img.shields.io/badge/Gemini-3.1-8e75b2?style=for-the-badge)

## Features

- **AI-Powered Roleplay** — Simulasi negosiasi dengan persona konsumen realistis
- **Audio Call Mode** — Panggilan suara real-time menggunakan Gemini Live API
- **Multi-Scenario** — Berbagai skenario penjualan rumah subsidi (KPR)
- **Performance Analysis** — Evaluasi otomatis dengan skor, strengths, weaknesses, dan actionable tips
- **Dashboard** — Tracking session, leaderboard, dan statistik tim
- **Admin Panel** — Kelola scenario dan settings
- **Firebase Integration** — Auth, Firestore real-time sync, dan data persistence

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **UI** | React 19 + Tailwind CSS v4 + Motion |
| **AI** | Google Gemini 2.0 Flash + Gemini 3.1 Flash Live Preview |
| **Backend** | Firebase (Auth, Firestore) |
| **Language** | TypeScript 5.9 |
| **Deployment** | Vercel / Netlify |

## Built-in Scenarios

| Scenario | Difficulty | Description |
|---|---|---|
| **BI Checking Bermasalah** | Medium | Konsumen takut nggak lolos BI Checking karena cicilan motor macet |
| **DP Keberatan** | Hard | Konsumen ngerasa DP 10-20 juta terlalu berat |
| **Lokasi Kejauhan** | Medium | Konsumen komplain lokasi perumahan kejauhan dari tempat kerja |
| **Kualitas Bangunan** | Hard | Konsumen kritis soal spek bangunan subsidi |

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- A [Gemini API Key](https://aistudio.google.com/apikey) (free tier available)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/saleslab-internal.git
cd saleslab-internal
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables

Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

4. Run the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run clean` | Clean Next.js cache |

## Deployment

### Deploy to Vercel (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Connect your GitHub repository
3. Add environment variable:
   - **Key**: `NEXT_PUBLIC_GEMINI_API_KEY`
   - **Value**: Your Gemini API key
4. Click **Deploy**

### Deploy to Netlify

1. Go to [netlify.com](https://netlify.com) and connect your repo
2. Add environment variable in **Site Settings** → **Environment Variables**:
   - **Key**: `NEXT_PUBLIC_GEMINI_API_KEY`
   - **Value**: Your Gemini API key
3. Deploy

> **Note**: If you can't access Netlify environment variables (free plan limitation), you can create a `.env.production` file. But be aware this exposes your API key in the repository.

## Project Structure

```
saleslab-internal/
├── app/
│   ├── layout.tsx          # Root layout with AuthProvider
│   ├── page.tsx            # Main application entry
│   └── globals.css         # Global styles
├── components/
│   ├── CallInterface.tsx   # Audio call UI (Gemini Live API)
│   ├── ChatInterface.tsx   # Text chat UI
│   ├── Dashboard.tsx       # Team performance dashboard
│   ├── FeedbackView.tsx    # Analysis results view
│   ├── ScenarioCard.tsx    # Scenario selection card
│   ├── CreateScenarioModal.tsx
│   ├── AllScenariosModal.tsx
│   ├── AdminSettingsModal.tsx
│   ├── CompleteProfileModal.tsx
│   └── SyncIndicator.tsx
├── lib/
│   ├── gemini.ts           # Gemini AI integration
│   ├── firebase.ts         # Firebase configuration
│   ├── AuthContext.tsx     # Authentication context
│   ├── ollama.ts           # Ollama API wrapper
│   ├── audio-utils.ts      # Audio encoding utilities
│   └── utils.ts            # Utility functions
├── hooks/
│   └── use-mobile.ts       # Mobile detection hook
└── types/
    └── css.d.ts            # CSS type declarations
```

## AI Models Used

| Feature | Model | Purpose |
|---|---|---|
| Audio Call (Live) | `gemini-3.1-flash-live-preview` | Real-time voice conversation |
| Performance Analysis | `gemini-2.0-flash` | Session evaluation and feedback |
| Text Chat (fallback) | Ollama (local) | Local text-based roleplay |

## Firebase Setup

This project uses Firebase for:
- **Authentication** — Google Sign-In
- **Firestore** — Store scenarios, sessions, user profiles, and settings
- **Real-time Sync** — Live data updates across users

To set up your own Firebase project:
1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Google Sign-In** in Authentication
3. Create a **Firestore Database**
4. Configure **Security Rules** (see `firestore.rules`)
5. Update `firebase-applet-config.json` with your project credentials

## Rate Limits

Gemini API free tier limits:
- **gemini-2.0-flash**: 15 requests/minute
- **gemini-3.1-flash-live-preview**: Varies by region

Each conversation turn = 1 API call. The app includes automatic retry with exponential backoff for rate limit errors.

## License

Private — Internal use only.

---

Built with ❤️ for the SalesLab team
