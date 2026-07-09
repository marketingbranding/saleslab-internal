# API_SPEC.md
# AI Roleplay Training Simulator API Specification

## 1. API Overview

The app can be built primarily with Laravel Blade routes. However, several features benefit from JSON endpoints:

- Starting roleplay sessions
- Updating call state
- Saving transcript segments
- Ending sessions
- Checking analysis status
- Fetching dashboard metrics
- Admin CRUD actions if using dynamic UI

This document defines suggested API endpoints.

## 2. Authentication

For Blade-based Laravel:

- Use session authentication.
- Protect routes with `auth` middleware.
- Protect admin routes with role middleware.

For API endpoints:

- Use CSRF protection for web routes.
- Use Sanctum if a separate frontend or mobile app is introduced.

## 3. Response Format

Success response:

```json
{
  "success": true,
  "message": "Operation completed.",
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": {}
}
```

## 4. User Routes

## 4.1 Dashboard

### GET /dashboard

Returns user dashboard page.

Blade route.

### GET /api/dashboard/summary

Returns dashboard summary.

Response:

```json
{
  "success": true,
  "data": {
    "level": 5,
    "xp_total": 1250,
    "xp_current_level": 300,
    "xp_next_level": 500,
    "current_streak_days": 3,
    "total_sessions": 18,
    "average_score": 82,
    "recommended_scenario": {}
  }
}
```

## 5. Scenario Routes

## 5.1 Scenario Library

### GET /scenarios

Returns scenario library page.

Query params:

- search
- category
- difficulty
- status

### GET /api/scenarios

Returns scenario list.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "First Home Buyer",
      "category": "Sales",
      "difficulty": "beginner",
      "estimated_duration_minutes": 8,
      "xp_reward": 50,
      "is_locked": false,
      "completion_count": 2
    }
  ]
}
```

## 5.2 Scenario Detail

### GET /scenarios/{scenario}

Returns scenario briefing page.

### GET /api/scenarios/{scenario}

Returns scenario detail.

Response:

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "First Home Buyer",
    "description": "Practice handling a first-time home buyer.",
    "objective": "Discover needs and offer next step.",
    "success_criteria": [],
    "persona": {
      "name": "Mrs. Siti",
      "background": "A cautious first-time buyer."
    }
  }
}
```

## 6. Roleplay Session Routes

## 6.1 Start Session

### POST /api/roleplay-sessions

Creates a new roleplay session.

Request:

```json
{
  "scenario_id": 1
}
```

Response:

```json
{
  "success": true,
  "data": {
    "session_uuid": "d9f2d2f8-9a1a-4d61-89f7-4f2e5e9d8f2a",
    "status": "pending",
    "voice_session_payload": {
      "provider": "gemini_live",
      "client_token": "optional-provider-token",
      "session_config": {}
    }
  }
}
```

Validation:

- scenario_id is required
- scenario must be published
- user must have access
- user must not exceed daily limit if limit is enabled

## 6.2 Show Call Screen

### GET /roleplay-sessions/{uuid}/call

Returns phone call interface.

## 6.3 Update Session State

### PATCH /api/roleplay-sessions/{uuid}/state

Request:

```json
{
  "status": "active",
  "event_type": "connected",
  "payload": {}
}
```

Allowed statuses:

- pending
- active
- completed
- failed
- cancelled

## 6.4 Save Transcript Segment

### POST /api/roleplay-sessions/{uuid}/transcript-segments

Request:

```json
{
  "speaker": "user",
  "text": "Can I ask what kind of house you are looking for?",
  "start_ms": 1200,
  "end_ms": 5800,
  "confidence": 0.94
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": 52
  }
}
```

## 6.5 End Session

### POST /api/roleplay-sessions/{uuid}/end

Request:

```json
{
  "reason": "user_ended",
  "duration_seconds": 512
}
```

Response:

```json
{
  "success": true,
  "data": {
    "session_uuid": "d9f2d2f8-9a1a-4d61-89f7-4f2e5e9d8f2a",
    "status": "completed",
    "analysis_status": "pending"
  }
}
```

Behavior:

- Mark session as completed.
- Close provider session.
- Merge transcript.
- Queue analysis job.
- Redirect user to analysis loading page.

## 6.6 Analysis Loading Page

### GET /roleplay-sessions/{uuid}/analysis

Returns loading or report page.

## 6.7 Analysis Status

### GET /api/roleplay-sessions/{uuid}/analysis-status

Response while processing:

```json
{
  "success": true,
  "data": {
    "analysis_status": "processing",
    "message": "Generating mission report..."
  }
}
```

Response when completed:

```json
{
  "success": true,
  "data": {
    "analysis_status": "completed",
    "report_url": "/roleplay-sessions/d9f2/report"
  }
}
```

## 6.8 Retry Analysis

### POST /api/roleplay-sessions/{uuid}/retry-analysis

Response:

```json
{
  "success": true,
  "message": "Analysis retry queued."
}
```

Authorization:

- Session owner
- Admin
- Super Admin

## 7. Report Routes

## 7.1 Mission Report

### GET /roleplay-sessions/{uuid}/report

Returns mission report page.

## 7.2 Report JSON

### GET /api/roleplay-sessions/{uuid}/report

Response:

```json
{
  "success": true,
  "data": {
    "overall_score": 84,
    "grade": "A-",
    "summary": "Good call with clear rapport.",
    "skill_scores": [],
    "strengths": [],
    "weaknesses": [],
    "missed_opportunities": [],
    "suggested_responses": [],
    "action_plan": []
  }
}
```

## 8. History Routes

### GET /history

Returns user mission history page.

### GET /api/history

Query params:

- date_from
- date_to
- scenario_id
- grade
- min_score
- max_score

Response:

```json
{
  "success": true,
  "data": [
    {
      "session_uuid": "uuid",
      "scenario_title": "First Home Buyer",
      "duration_seconds": 512,
      "overall_score": 84,
      "grade": "A-",
      "created_at": "2026-07-02T10:00:00+07:00"
    }
  ]
}
```

## 9. Admin Routes

All admin routes require admin middleware.

Prefix:

```text
/admin
```

## 9.1 Admin Dashboard

### GET /admin

Returns admin dashboard page.

### GET /api/admin/dashboard

Returns admin summary metrics.

## 9.2 Users

### GET /admin/users

User list page.

### GET /api/admin/users

User list JSON.

### POST /api/admin/users

Create user.

Request:

```json
{
  "name": "User Name",
  "email": "user@example.com",
  "password": "secret",
  "role": "user",
  "status": "active"
}
```

### PATCH /api/admin/users/{user}

Update user.

### DELETE /api/admin/users/{user}

Soft delete or deactivate user.

## 9.3 Scenarios

### GET /admin/scenarios

Scenario list page.

### POST /api/admin/scenarios

Create scenario.

Request:

```json
{
  "persona_id": 1,
  "title": "First Home Buyer",
  "category": "Sales",
  "description": "Practice first contact.",
  "objective": "Discover needs.",
  "difficulty": "beginner",
  "estimated_duration_minutes": 8,
  "max_duration_minutes": 12,
  "opening_speaker": "ai",
  "opening_message": "Halo, saya mau tanya soal rumah subsidi.",
  "prompt_instructions": "Act as a cautious buyer.",
  "success_criteria": [
    "Ask discovery questions",
    "Confirm budget",
    "Offer next step"
  ],
  "xp_reward": 50,
  "status": "draft"
}
```

### PATCH /api/admin/scenarios/{scenario}

Update scenario.

### POST /api/admin/scenarios/{scenario}/duplicate

Duplicate scenario.

### PATCH /api/admin/scenarios/{scenario}/publish

Publish scenario.

### PATCH /api/admin/scenarios/{scenario}/archive

Archive scenario.

### DELETE /api/admin/scenarios/{scenario}

Delete scenario.

## 9.4 Personas

### GET /admin/personas

Persona list page.

### POST /api/admin/personas

Create persona.

Request:

```json
{
  "name": "Mrs. Siti",
  "gender": "female",
  "age": 34,
  "occupation": "Employee",
  "background": "First-time home buyer.",
  "personality": "Cautious and detail-oriented.",
  "speaking_style": "Polite but skeptical.",
  "aggression_level": 3,
  "patience_level": 7,
  "trust_level": 4,
  "hidden_instructions": "Do not agree too quickly."
}
```

### PATCH /api/admin/personas/{persona}

Update persona.

### POST /api/admin/personas/{persona}/duplicate

Duplicate persona.

### PATCH /api/admin/personas/{persona}/archive

Archive persona.

### DELETE /api/admin/personas/{persona}

Delete persona.

## 9.5 Prompt Templates

### GET /admin/prompt-templates

Prompt list page.

### POST /api/admin/prompt-templates

Create prompt template.

### PATCH /api/admin/prompt-templates/{template}

Update prompt template.

## 9.6 Reports

### GET /admin/reports/users

User report page.

### GET /admin/reports/scenarios

Scenario report page.

### GET /api/admin/reports/users/{user}

User report JSON.

### GET /api/admin/reports/scenarios/{scenario}

Scenario report JSON.

## 10. WebSocket Events

Suggested channel:

```text
private-roleplay-session.{session_uuid}
```

Events:

### roleplay.state.changed

```json
{
  "session_uuid": "uuid",
  "state": "speaking",
  "timestamp": "2026-07-02T10:00:00+07:00"
}
```

### roleplay.transcript.updated

```json
{
  "speaker": "user",
  "text": "I understand your concern.",
  "start_ms": 1000,
  "end_ms": 3000
}
```

### analysis.completed

```json
{
  "session_uuid": "uuid",
  "report_url": "/roleplay-sessions/uuid/report"
}
```

## 11. Rate Limits

Suggested limits:

| Endpoint | Limit |
|---|---|
| Login | 5 attempts/minute |
| Start session | 10/hour/user |
| Save transcript segment | 120/minute/session |
| Retry analysis | 3/session |
| Admin create scenario | 60/hour |

## 12. Validation Rules

### Scenario

- title required, max 255
- persona_id required
- objective required
- difficulty required
- xp_reward integer min 0
- status in draft, published, archived

### Persona

- name required
- aggression_level integer 1-10
- patience_level integer 1-10
- trust_level integer 1-10
- status valid

### Transcript Segment

- speaker required in user, ai, system
- text required
- start_ms nullable integer
- end_ms nullable integer greater than start_ms

## 13. Error Codes

| Code | Meaning |
|---|---|
| SCENARIO_NOT_AVAILABLE | Scenario is not published or accessible |
| MICROPHONE_REQUIRED | User must allow microphone |
| AI_PROVIDER_ERROR | Voice provider failed |
| SESSION_ALREADY_ENDED | Cannot modify ended session |
| ANALYSIS_FAILED | Analysis model failed |
| PERMISSION_DENIED | User lacks access |
