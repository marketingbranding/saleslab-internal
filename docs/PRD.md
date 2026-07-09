# PRD.md
# AI Roleplay Training Simulator

## 1. Product Summary

The AI Roleplay Training Simulator is a voice-first web application for practicing real-world communication scenarios through AI-powered phone-call simulations.

The product is designed for training teams such as sales, marketing, customer service, recruitment, and call centers. Users select a scenario, speak with an AI persona through an audio-call interface, complete the mission, and receive an AI-generated performance analysis.

The app should feel like a retro-modern training simulator, not a normal SaaS dashboard or chatbot.

## 2. Product Positioning

This product is not positioned as:

- A chatbot
- A CRM
- A generic LMS
- A plain analytics dashboard

It is positioned as:

> A mission-based AI communication simulator with voice roleplay, skill scoring, and progression mechanics.

## 3. Core Value Proposition

Users can practice difficult conversations repeatedly without needing a human trainer every time.

Admins can create new scenarios and personas without writing code.

Organizations can track user progress, identify weak skills, and improve training consistency.

## 4. Target Users

### 4.1 End User

End users perform roleplay sessions.

Common profiles:

- Sales staff
- Marketing staff
- Customer service agents
- Call center agents
- Recruiters
- Trainers in training
- Students practicing interviews or presentation skills

### 4.2 Admin

Admins configure and monitor the platform.

Responsibilities:

- Create scenarios
- Create personas
- Manage users
- Review performance reports
- Update AI prompts
- Manage scenario difficulty
- Review roleplay history

### 4.3 Super Admin

Super Admin has full control of the application.

Responsibilities:

- Manage all organizations or branches
- Configure global settings
- Manage AI provider settings
- Manage admin users
- View all analytics
- Access audit logs

## 5. Main Product Goals

### Goal 1: Voice-first roleplay

The core experience must happen through an audio-call interface. The roleplay should feel like a phone call, not a text chat.

### Goal 2: Configurable scenarios

Admins must be able to add new scenarios, edit existing scenarios, define goals, attach personas, configure difficulty, and set scoring rules.

### Goal 3: Post-call analysis

Every completed roleplay should generate a structured evaluation containing scores, strengths, weaknesses, missed opportunities, and suggested improvements.

### Goal 4: Progress tracking

Users and admins should be able to track skill development over time.

### Goal 5: Game-like engagement

The app should use missions, XP, badges, levels, streaks, and achievements to make users want to repeat practice sessions.

## 6. Success Metrics

| Metric | Target |
|---|---:|
| Scenario completion rate | ≥ 85% |
| AI analysis success rate | ≥ 98% |
| Average user sessions per week | ≥ 3 |
| Average roleplay duration | 5–15 minutes |
| 30-day retention | ≥ 50% |
| Average skill improvement after 10 sessions | ≥ 15% |
| Admin scenario creation success without developer help | ≥ 90% |
| User satisfaction score | ≥ 4.3 / 5 |

## 7. Core User Flow

```text
Login
  ↓
Dashboard
  ↓
Scenario Library
  ↓
Scenario Detail
  ↓
Start Call
  ↓
Audio Roleplay
  ↓
End Call
  ↓
AI Analysis
  ↓
Mission Report
  ↓
History / Progress Update
```

## 8. Core Screens

### 8.1 Login Screen

Purpose:

Allow users to access the simulator.

Required elements:

- App logo
- Username or email field
- Password field
- Login button
- Forgot password link
- Optional retro boot animation

UX direction:

The login page should feel like entering an old training terminal.

### 8.2 Dashboard

Purpose:

Show user progress and quick access to training.

Required elements:

- Current level
- XP progress
- Training streak
- Daily target
- Recommended mission
- Recent sessions
- Skill summary
- Start training button

### 8.3 Scenario Library

Purpose:

Let users browse and select training missions.

Required elements:

- Scenario cards
- Search
- Filters
- Difficulty tag
- Category tag
- Estimated duration
- XP reward
- Completion status

### 8.4 Scenario Detail

Purpose:

Prepare the user before starting a simulation.

Required elements:

- Scenario title
- Scenario description
- Persona summary
- Objective
- Success criteria
- Difficulty
- Duration
- Start call button

### 8.5 Phone Call Interface

Purpose:

Run the live voice roleplay.

Required elements:

- Caller avatar
- Caller name
- Call timer
- Connection status
- Listening / Thinking / Speaking status
- Waveform
- Mute button
- End call button
- Optional speaker/device selector

Important rule:

Do not use chat bubbles as the primary interface.

### 8.6 Analysis Screen

Purpose:

Show the mission report after the roleplay.

Required elements:

- Overall score
- Grade
- Skill breakdown
- Strengths
- Weaknesses
- Missed opportunities
- Suggested better responses
- Transcript
- Timeline review
- Replay option if audio is stored

## 9. Main Features

## 9.1 Authentication

### Requirements

- Users must log in before accessing the app.
- Users have roles: Super Admin, Admin, User.
- Passwords must be hashed.
- Sessions should expire after inactivity.
- Admin routes must be protected by role middleware.

## 9.2 Scenario Management

### Requirements

Admins can create, edit, archive, and delete scenarios.

Scenario fields:

- Name
- Description
- Category
- Difficulty
- Estimated duration
- Persona
- Objective
- Success criteria
- Opening speaker
- Prompt instructions
- Evaluation rules
- XP reward
- Active/inactive status

## 9.3 Persona Management

### Requirements

Admins can create reusable AI personas.

Persona fields:

- Name
- Avatar
- Gender
- Age
- Occupation
- Background
- Personality
- Speaking style
- Emotional tendency
- Patience level
- Aggressiveness level
- Common objections
- Hidden instructions

## 9.4 Audio Call Roleplay

### Requirements

- User grants microphone permission.
- App starts a real-time voice session with the AI.
- AI uses scenario and persona instructions.
- User can interrupt the AI naturally if the selected AI provider supports interruption.
- App tracks call duration.
- App captures transcript.
- User can end call manually.
- System can auto-end call when max duration is reached.

## 9.5 Transcript Generation

### Requirements

- Each roleplay session must save a transcript.
- Transcript must identify speakers.
- Transcript must include timestamps where possible.
- Transcript must be used for analysis.

## 9.6 AI Analysis

### Requirements

After the call ends, the system sends transcript and scoring rules to an analysis model.

The analysis result must include:

- Overall score
- Grade
- Skill scores
- Summary
- Strengths
- Weaknesses
- Missed opportunities
- Suggested improved responses
- Recommended next scenario
- Action plan

## 9.7 User Progress

### Requirements

The system tracks:

- Total sessions
- Total duration
- Average score
- Best score
- Weakest skill
- Strongest skill
- XP
- Level
- Achievements
- Streak

## 9.8 Admin Analytics

### Requirements

Admins can view:

- User performance
- Scenario completion
- Average scores
- Weakest skills across users
- Most used scenarios
- Least completed scenarios
- User activity trends

## 10. User Roles and Permissions

| Feature | Super Admin | Admin | User |
|---|---:|---:|---:|
| Login | Yes | Yes | Yes |
| Dashboard | Yes | Yes | Yes |
| Start roleplay | Yes | Yes | Yes |
| View own history | Yes | Yes | Yes |
| View all users | Yes | Yes | No |
| Manage users | Yes | Yes, limited | No |
| Manage scenarios | Yes | Yes | No |
| Manage personas | Yes | Yes | No |
| Manage AI settings | Yes | No | No |
| View analytics | Yes | Yes | Own only |
| View audit logs | Yes | No | No |

## 11. MVP Scope

The MVP must include:

- Login
- User dashboard
- Scenario library
- Scenario detail
- Audio-call interface
- AI roleplay session
- Transcript capture
- Post-call analysis
- User history
- Admin scenario CRUD
- Admin persona CRUD
- Basic analytics
- XP and levels

## 12. Non-MVP / Future Scope

Future features:

- Organization hierarchy
- Branch-based reporting
- Multiplayer roleplay
- Human trainer review
- Video roleplay
- AI-generated scenarios
- Scenario marketplace
- Certifications
- Team challenges
- Mobile app
- Advanced speech analytics
- Emotion detection

## 13. Product Constraints

- The product must be usable on desktop first.
- Voice roleplay requires stable internet and microphone permission.
- The UI must remain lightweight.
- Admin workflows must prioritize speed over heavy visual effects.
- The AI provider should be replaceable through service abstraction.
- Analysis must be stored so reports can be viewed without rerunning AI.

## 14. Product Principles

1. Voice-first, not chat-first.
2. Mission-based, not menu-based.
3. Training-focused, not entertainment-only.
4. Retro-modern, not childish pixel art.
5. Configurable by admin, not hardcoded.
6. Measurable improvement, not vague feedback.
7. Fast enough for daily use.
