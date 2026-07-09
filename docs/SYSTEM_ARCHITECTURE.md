# SYSTEM_ARCHITECTURE.md
# AI Roleplay Training Simulator System Architecture

## 1. Architecture Overview

The system is a Laravel-based web application with a voice AI integration layer.

Main responsibilities:

- Authenticate users
- Manage scenarios and personas
- Run audio roleplay sessions
- Store transcripts and metadata
- Generate AI analysis
- Track progress and gamification
- Provide admin analytics

## 2. Recommended Stack

### Backend

- Laravel 11 or Laravel 12
- PHP 8.3+
- MySQL or PostgreSQL
- Redis for queues and cache
- Laravel Queue
- Laravel Reverb or Pusher-compatible WebSocket service
- Laravel Sanctum if API authentication is required

### Frontend

- Laravel Blade
- Tailwind CSS
- Alpine.js
- Vanilla JavaScript for audio controls
- Web Audio API for waveform and audio state
- Optional WaveSurfer.js for waveform visualization

### AI Layer

- Gemini Live API for real-time voice roleplay
- Gemini Flash or OpenRouter-compatible model for post-call analysis
- Provider abstraction layer to allow future provider switching

### Storage

- Local disk for development
- S3-compatible object storage for production
- Store audio files only if enabled
- Store transcripts and analysis in database

## 3. High-Level Components

```text
Browser
  ↓
Laravel Web App
  ↓
Authentication / Authorization
  ↓
Scenario & Persona Engine
  ↓
Voice Session Service
  ↓
AI Provider Adapter
  ↓
Transcript Service
  ↓
Analysis Queue
  ↓
Report Generator
  ↓
Progress & Gamification Engine
```

## 4. Main Application Modules

### 4.1 Auth Module

Responsibilities:

- Login
- Logout
- Password reset
- Session management
- Role-based route protection

### 4.2 User Module

Responsibilities:

- User profile
- User role
- User progress
- User settings
- User activity history

### 4.3 Scenario Module

Responsibilities:

- Scenario CRUD
- Scenario filtering
- Difficulty management
- Scenario status
- Scenario-user access

### 4.4 Persona Module

Responsibilities:

- Persona CRUD
- Persona behavior configuration
- Voice configuration
- Personality instructions

### 4.5 Voice Roleplay Module

Responsibilities:

- Start roleplay session
- Connect to AI provider
- Track call state
- Capture transcript
- End session
- Save call metadata

### 4.6 Analysis Module

Responsibilities:

- Queue analysis job
- Send transcript to analysis model
- Parse structured JSON result
- Save analysis report
- Retry failed analysis

### 4.7 Gamification Module

Responsibilities:

- Award XP
- Calculate level
- Update streak
- Unlock achievements
- Track mission completion

### 4.8 Admin Module

Responsibilities:

- Manage users
- Manage scenarios
- Manage personas
- Manage reports
- Manage AI settings
- View audit logs

## 5. Request Lifecycle: Start Roleplay

```text
User clicks Start Call
  ↓
Laravel validates scenario access
  ↓
System creates roleplay_sessions row
  ↓
System builds AI runtime prompt
  ↓
Browser requests microphone permission
  ↓
Browser opens voice connection
  ↓
AI provider session starts
  ↓
Roleplay state becomes active
```

## 6. Request Lifecycle: End Roleplay

```text
User clicks End Call
  ↓
Browser closes voice session
  ↓
Final transcript is saved
  ↓
Session status becomes completed
  ↓
Analysis job is queued
  ↓
User sees "Generating Mission Report"
  ↓
Analysis worker processes transcript
  ↓
Analysis is saved
  ↓
User sees Mission Report
  ↓
Progress and XP are updated
```

## 7. AI Provider Abstraction

The application should not hardcode Gemini calls directly inside controllers.

Use service interfaces:

```php
interface VoiceRoleplayProvider
{
    public function createSession(RoleplaySession $session): VoiceSessionPayload;
    public function closeSession(RoleplaySession $session): void;
}

interface AnalysisProvider
{
    public function analyze(RoleplaySession $session): AnalysisResult;
}
```

Recommended classes:

```text
app/
  Services/
    AI/
      Contracts/
        VoiceRoleplayProvider.php
        AnalysisProvider.php
      Providers/
        GeminiLiveVoiceProvider.php
        GeminiFlashAnalysisProvider.php
        OpenRouterAnalysisProvider.php
      PromptBuilder/
        RoleplayPromptBuilder.php
        AnalysisPromptBuilder.php
```

## 8. WebSocket / Realtime Events

Realtime state changes should be emitted to the browser.

Events:

- RoleplayConnecting
- RoleplayConnected
- RoleplayListening
- RoleplayThinking
- RoleplaySpeaking
- RoleplayTranscriptUpdated
- RoleplayEnded
- AnalysisStarted
- AnalysisCompleted
- AnalysisFailed

## 9. Queues

Use queues for slow or failure-prone tasks.

Queue jobs:

- AnalyzeRoleplaySession
- GenerateTranscriptSummary
- AwardMissionRewards
- UpdateUserSkillProfile
- SendWeeklyReport
- CleanupOldAudioFiles

## 10. File Storage

### Audio Files

Audio storage should be optional.

Settings:

- Store audio: true/false
- Retention days
- Max file size
- Storage disk

### Avatars

Store persona avatars and user profile pictures.

### Reports

Reports should be generated dynamically from database records. PDF export can be added later.

## 11. Security Architecture

### Required Security Rules

- Validate all admin input.
- Never expose hidden persona instructions to users.
- Never expose raw AI provider keys to frontend.
- Store API keys in environment variables or encrypted settings.
- Use signed URLs for private audio files.
- Apply role middleware to admin routes.
- Log important admin actions.
- Sanitize transcript display.
- Rate limit roleplay starts.

## 12. Data Privacy

Stored data may include sensitive conversation content.

Requirements:

- Inform users if calls are recorded.
- Allow admins to disable audio storage.
- Store transcript securely.
- Restrict transcript access by role.
- Add deletion policy for old sessions.
- Avoid sending unnecessary personal data to AI providers.

## 13. Deployment Architecture

### Simple Deployment

Suitable for early version:

```text
Hostinger VPS / Shared Laravel Hosting
  - Laravel app
  - MySQL
  - Queue worker if supported
  - Cron scheduler
```

### Recommended Production Deployment

```text
Web Server
  ↓
Laravel App
  ↓
MySQL/PostgreSQL
  ↓
Redis
  ↓
Queue Workers
  ↓
Object Storage
  ↓
AI Providers
```

## 14. Environment Variables

Suggested environment variables:

```env
APP_NAME="AI Roleplay Simulator"
APP_ENV=production

DB_CONNECTION=mysql

QUEUE_CONNECTION=redis
CACHE_STORE=redis
SESSION_DRIVER=redis

AI_VOICE_PROVIDER=gemini_live
AI_ANALYSIS_PROVIDER=gemini_flash

GEMINI_API_KEY=
OPENROUTER_API_KEY=

ROLEPLAY_STORE_AUDIO=false
ROLEPLAY_AUDIO_RETENTION_DAYS=30
```

## 15. Failure Handling

### AI Voice Failure

- Show user-friendly message.
- Mark session as failed.
- Allow retry.

### Analysis Failure

- Save session as completed.
- Mark analysis_status as failed.
- Provide retry analysis button.
- Store error message for admins only.

### Transcript Failure

- Save partial transcript.
- Generate limited analysis if possible.
- Warn user that analysis may be incomplete.

## 16. Observability

Log:

- Roleplay session started
- Roleplay session ended
- AI provider errors
- Analysis failures
- Admin changes
- Login failures
- Queue job failures

Metrics:

- Total sessions
- Failed sessions
- Average analysis time
- AI cost per session
- Average duration
- Active users
