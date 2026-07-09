# UI_UX_SPEC.md
# AI Roleplay Training Simulator UI/UX Specification

## 1. UX Direction

The application should feel like a retro training simulator inside a modern web app.

The experience should be:

- Focused
- Game-like
- Mission-based
- Voice-first
- Minimal during active calls
- Analytical after calls

The user should feel like they are entering a controlled communication simulation.

## 2. UX Metaphor

Primary metaphor:

> A retro communication terminal for training missions.

Supporting metaphors:

- Mission control dashboard
- Old operating system
- Phone-call command center
- Simulation report
- Game progress menu

## 3. General UX Rules

1. Use the word "Mission" for roleplay sessions.
2. Use the word "Scenario" for reusable training templates.
3. Use the word "Persona" for AI characters.
4. Use "Mission Report" for analysis.
5. Avoid "chat" unless referring to internal technical implementation.
6. Active roleplay screen must avoid visual clutter.
7. Analysis screen can be information-dense.
8. Admin screens should be practical and faster than the user-facing screens.
9. Every primary action must be obvious.
10. Every destructive action needs confirmation.

## 4. Navigation Structure

### User Navigation

```text
Dashboard
Training
Scenario Library
Mission History
Performance
Achievements
Profile
Settings
```

### Admin Navigation

```text
Admin Dashboard
Users
Scenarios
Personas
Prompt Templates
Knowledge Base
Reports
AI Settings
System Settings
Audit Logs
```

## 5. User Flow: First Login

```text
User opens app
  ↓
Retro boot animation appears
  ↓
Login form appears
  ↓
User logs in
  ↓
Dashboard shows onboarding card
  ↓
User clicks "Start First Mission"
  ↓
Scenario Library opens
  ↓
User selects beginner scenario
  ↓
Scenario briefing appears
  ↓
User starts call
```

## 6. User Flow: Returning User

```text
User logs in
  ↓
Dashboard shows current level, streak, and recommended mission
  ↓
User clicks "Continue Training"
  ↓
Recommended scenario detail appears
  ↓
User starts call
  ↓
Analysis updates progress
```

## 7. Screen Specification

## 7.1 Login Screen

### Purpose

Authenticate users and establish the retro terminal mood.

### Layout

```text
+--------------------------------------------------+
|                                                  |
|             ROLEPLAY SIMULATOR v1.0              |
|                                                  |
|       +----------------------------------+       |
|       | USER ID                          |       |
|       +----------------------------------+       |
|       | PASSWORD                         |       |
|       +----------------------------------+       |
|                                                  |
|       [ LOGIN ]                                  |
|                                                  |
|       Forgot password?                           |
|                                                  |
+--------------------------------------------------+
```

### UI Behavior

- Boot animation may play before login form.
- Cursor blink effect on title.
- Form must be accessible and fast.
- Animation must not block slow devices.

## 7.2 Dashboard

### Purpose

Give users a clear next action and summarize progress.

### Layout

```text
+----------------------------------------------------------+
| Header: Agent Name | Level | XP | Streak                 |
+----------------------+-----------------------------------+
| Sidebar              | Today's Mission                   |
|                      | [ Start Training ]                |
| Dashboard            |                                   |
| Training             | Skill Snapshot                    |
| History              | Confidence: 78                    |
| Performance          | Empathy: 84                       |
| Achievements         | Closing: 69                       |
|                      |                                   |
|                      | Recent Missions                   |
+----------------------+-----------------------------------+
```

### Required Widgets

- Current level
- XP bar
- Daily mission
- Recommended scenario
- Skill snapshot
- Recent mission history
- Achievement progress

### Empty State

For new users:

```text
No missions completed yet.
Start your first simulation to generate your performance profile.
```

## 7.3 Scenario Library

### Purpose

Help users select a mission quickly.

### Layout

```text
+----------------------------------------------------------+
| Scenario Library                                         |
| Search [________________] Difficulty [All] Category [All]|
+----------------------------------------------------------+
| [ Scenario Card ] [ Scenario Card ] [ Scenario Card ]     |
| [ Scenario Card ] [ Scenario Card ] [ Scenario Card ]     |
+----------------------------------------------------------+
```

### Scenario Card Content

- Scenario title
- Category
- Difficulty
- Estimated duration
- XP reward
- Persona name
- Completion status
- Start button

### Card States

- Available
- Completed
- Recommended
- Locked
- Disabled
- New

## 7.4 Scenario Detail / Briefing

### Purpose

Prepare user before roleplay.

### Layout

```text
+----------------------------------------------------------+
| Mission Briefing: First Home Buyer                       |
+----------------------------------------------------------+
| Objective                                                |
| Discover customer needs and explain financing options.   |
|                                                          |
| Persona                                                  |
| Name: Mrs. Siti                                          |
| Mood: Curious but cautious                               |
|                                                          |
| Success Criteria                                         |
| - Ask at least 3 discovery questions                     |
| - Handle price objection                                 |
| - Offer next step clearly                                |
|                                                          |
| [ Start Call ]                                           |
+----------------------------------------------------------+
```

### UX Rules

- Do not reveal hidden persona instructions.
- Show enough context to prepare the user.
- Start Call must be visually dominant.

## 7.5 Phone Call Interface

### Purpose

Provide focused audio roleplay.

### Layout

```text
+----------------------------------------------------------+
| CALL CONNECTED                              00:04:12      |
| Persona: Mrs. Siti                         LIVE          |
+----------------------------------------------------------+
|                                                          |
|                  [ Caller Avatar ]                       |
|                                                          |
|                    Speaking...                           |
|                ~ ~ ~ waveform ~ ~ ~                      |
|                                                          |
+----------------------------------------------------------+
|        [ Mute ]        [ End Call ]        [ Settings ]   |
+----------------------------------------------------------+
```

### Required States

- Connecting
- Connected
- Listening
- Thinking
- Speaking
- Reconnecting
- Disconnected
- Call ended

### UX Rules

- No full transcript during active call by default.
- Optional live captions can be enabled in accessibility settings.
- End Call must have confirmation if accidentally clicked.
- Mute state must be obvious.
- Microphone permission error must be clear.

## 7.6 Mission Complete Transition

### Purpose

Create satisfying closure before analysis.

### Layout

```text
MISSION COMPLETE

Processing transcript...
Analyzing communication...
Generating mission report...
```

### UX Rules

- Show clear loading state.
- Do not leave the user on a blank screen.
- If AI analysis fails, show fallback state with retry button.

## 7.7 Analysis / Mission Report

### Purpose

Give actionable feedback.

### Layout

```text
+----------------------------------------------------------+
| Mission Report                                           |
| Overall Score: 84       Grade: A-                        |
+----------------------------------------------------------+
| Skill Breakdown                                          |
| Confidence: 78                                           |
| Empathy: 91                                               |
| Discovery: 74                                             |
| Closing: 80                                               |
+----------------------------------------------------------+
| Strengths                                                |
| - You built trust early.                                 |
| - You asked clear follow-up questions.                   |
+----------------------------------------------------------+
| Improvements                                             |
| - You missed an opportunity to confirm budget.           |
| - Closing could be more specific.                        |
+----------------------------------------------------------+
| Suggested Better Response                                |
| "Based on your budget, I recommend..."                  |
+----------------------------------------------------------+
```

### Tabs

- Summary
- Skill Scores
- Transcript
- Timeline
- Suggestions
- Replay

## 7.8 Mission History

### Purpose

Let users review previous sessions.

### Layout

```text
| Date | Scenario | Duration | Score | Grade | Action |
|---|---|---:|---:|---|---|
| 2026-07-02 | First Home Buyer | 08:32 | 84 | A- | Review |
```

### Filters

- Date range
- Scenario
- Score range
- Grade
- Skill weakness

## 7.9 Performance Screen

### Purpose

Show progress over time.

### Required charts

- Average score over time
- Skill radar chart
- Sessions per week
- Weakest skills
- Strongest skills
- Scenario completion

## 7.10 Achievements Screen

### Purpose

Encourage repeated use.

Achievement card content:

- Badge icon
- Achievement name
- Description
- Progress
- Reward XP
- Locked/unlocked state

## 8. Admin UX

Admin screens are allowed to be less game-like and more efficient.

### Admin Dashboard

Must show:

- Total users
- Active users
- Sessions today
- Average score
- Most used scenarios
- Weakest skill across team
- Recent failed analysis jobs

### Scenario Builder UX

Use sections:

1. Basic Info
2. Persona
3. Mission Objective
4. Prompt Configuration
5. Evaluation Rules
6. Reward and Unlocking
7. Publish Settings

### Persona Builder UX

Use sections:

1. Identity
2. Background
3. Personality
4. Speech Style
5. Objections
6. Hidden Behavior Rules
7. Voice Settings

## 9. Empty States

### No scenarios

```text
No scenarios available.
Ask an admin to create a training mission.
```

### No history

```text
No mission history yet.
Complete your first call to generate a report.
```

### Analysis failed

```text
The roleplay was completed, but analysis could not be generated.
You can retry analysis or view the transcript.
```

## 10. Error States

### Microphone Permission Denied

Message:

```text
Microphone access is required to start a voice mission.
Please allow microphone access in your browser settings.
```

### AI Provider Offline

Message:

```text
The AI voice service is currently unavailable.
Try again later or contact your administrator.
```

### Transcript Missing

Message:

```text
The call ended, but the transcript was incomplete.
Analysis may be limited.
```

## 11. Responsive Behavior

### Desktop

Primary supported experience.

- Full call interface
- Full analysis
- Admin panels

### Tablet

Supported.

- Adjust card grid
- Maintain call controls
- Stack analysis sections

### Mobile

Supported for review.

- Dashboard
- History
- Reports
- Profile

Voice training on mobile can be supported, but desktop must be prioritized.

## 12. Accessibility

Requirements:

- Keyboard navigation
- Focus states
- Sufficient color contrast
- Screen reader labels
- Captions option
- Audio device selector
- Reduced motion setting
- Clear microphone permission guidance

## 13. UX Copy Style

Use clear and direct labels.

Preferred terms:

- Start Mission
- Mission Briefing
- Start Call
- End Call
- Mission Complete
- Mission Report
- Skill Breakdown
- Try Again
- Review Transcript

Avoid:

- Start chat
- Talk to bot
- Chat history
- AI friend
