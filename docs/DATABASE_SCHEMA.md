# DATABASE_SCHEMA.md
# AI Roleplay Training Simulator Database Schema

## 1. Database Overview

The database stores users, scenarios, personas, roleplay sessions, transcripts, analysis reports, progress, achievements, and admin settings.

The schema should support:

- Role-based access
- Scenario creation
- Persona reuse
- Voice session tracking
- AI analysis storage
- User progress
- Gamification
- Admin reporting

## 2. Entity Relationship Summary

```text
users
  ├── roleplay_sessions
  ├── user_progress
  ├── user_achievements
  └── user_skill_snapshots

scenarios
  ├── roleplay_sessions
  └── scenario_evaluation_rules

personas
  └── scenarios

roleplay_sessions
  ├── transcripts
  ├── analysis_reports
  └── session_events
```

## 3. Tables

## 3.1 users

Stores application users.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| name | string | user display name |
| email | string | unique |
| password | string | hashed |
| role | enum | super_admin, admin, user |
| status | enum | active, inactive, suspended |
| avatar_path | string nullable | profile image |
| last_login_at | timestamp nullable |  |
| created_at | timestamp |  |
| updated_at | timestamp |  |

Indexes:

- email
- role
- status

## 3.2 user_profiles

Stores additional user profile data.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| user_id | foreignId | references users |
| phone | string nullable |  |
| position | string nullable | job title |
| department | string nullable |  |
| timezone | string nullable | default Asia/Jakarta |
| preferences | json nullable | UI/audio preferences |
| created_at | timestamp |  |
| updated_at | timestamp |  |

## 3.3 personas

Stores reusable AI personas.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| name | string | persona name |
| avatar_path | string nullable | image |
| gender | string nullable |  |
| age | integer nullable |  |
| occupation | string nullable |  |
| background | text nullable | visible background |
| personality | text nullable | visible personality |
| speaking_style | text nullable | tone and style |
| pain_points | json nullable | list |
| goals | json nullable | list |
| objections | json nullable | list |
| emotional_level | tinyint | 1-10 |
| aggression_level | tinyint | 1-10 |
| patience_level | tinyint | 1-10 |
| trust_level | tinyint | 1-10 |
| hidden_instructions | longText nullable | never shown to users |
| voice_provider | string nullable | gemini, etc |
| voice_id | string nullable | provider voice |
| status | enum | active, inactive, archived |
| created_by | foreignId nullable | users |
| created_at | timestamp |  |
| updated_at | timestamp |  |

Indexes:

- status
- created_by

## 3.4 scenarios

Stores training scenario definitions.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| persona_id | foreignId | references personas |
| title | string | scenario title |
| slug | string | unique |
| category | string nullable | e.g. Sales, Support |
| description | text | visible description |
| briefing | text nullable | pre-call briefing |
| objective | text | mission objective |
| success_criteria | json | list of criteria |
| difficulty | enum | beginner, intermediate, advanced, expert |
| estimated_duration_minutes | integer |  |
| max_duration_minutes | integer nullable | auto-end |
| opening_speaker | enum | ai, user |
| opening_message | text nullable | AI opening line |
| prompt_instructions | longText | scenario-specific AI instructions |
| hidden_rules | longText nullable | not shown to users |
| xp_reward | integer | base XP |
| unlock_level | integer default 1 | level requirement |
| is_featured | boolean default false | recommended |
| status | enum | draft, published, archived |
| created_by | foreignId nullable | users |
| created_at | timestamp |  |
| updated_at | timestamp |  |

Indexes:

- slug
- category
- difficulty
- status
- persona_id

## 3.5 scenario_evaluation_rules

Stores configurable scoring rules.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| scenario_id | foreignId | references scenarios |
| skill_key | string | e.g. empathy |
| skill_label | string | e.g. Empathy |
| description | text nullable | scoring explanation |
| weight | decimal | scoring weight |
| max_score | integer default 100 |  |
| rubric | json nullable | scoring criteria |
| created_at | timestamp |  |
| updated_at | timestamp |  |

Common skill keys:

- confidence
- empathy
- discovery
- communication
- objection_handling
- closing
- professionalism
- listening

## 3.6 roleplay_sessions

Stores each user mission attempt.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| uuid | uuid | public identifier |
| user_id | foreignId | references users |
| scenario_id | foreignId | references scenarios |
| persona_id | foreignId | references personas |
| status | enum | pending, active, completed, failed, cancelled |
| analysis_status | enum | pending, processing, completed, failed |
| started_at | timestamp nullable |  |
| ended_at | timestamp nullable |  |
| duration_seconds | integer nullable |  |
| audio_path | string nullable | if stored |
| transcript_text | longText nullable | combined transcript |
| transcript_json | json nullable | structured transcript |
| ai_provider | string nullable | voice provider |
| analysis_provider | string nullable | analysis provider |
| failure_reason | text nullable | internal |
| metadata | json nullable | provider/session data |
| created_at | timestamp |  |
| updated_at | timestamp |  |

Indexes:

- uuid
- user_id
- scenario_id
- status
- analysis_status
- started_at

## 3.7 transcript_segments

Stores timestamped transcript lines.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| roleplay_session_id | foreignId | references roleplay_sessions |
| speaker | enum | user, ai, system |
| text | longText | utterance |
| start_ms | integer nullable |  |
| end_ms | integer nullable |  |
| confidence | decimal nullable | transcription confidence |
| metadata | json nullable |  |
| created_at | timestamp |  |
| updated_at | timestamp |  |

Indexes:

- roleplay_session_id
- speaker

## 3.8 analysis_reports

Stores generated post-call report.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| roleplay_session_id | foreignId | references roleplay_sessions |
| user_id | foreignId | references users |
| scenario_id | foreignId | references scenarios |
| overall_score | integer | 0-100 |
| grade | string | A, B, C, etc |
| summary | text | overall feedback |
| strengths | json | list |
| weaknesses | json | list |
| missed_opportunities | json nullable | list |
| suggested_responses | json nullable | list |
| action_plan | json nullable | list |
| next_recommended_scenario_id | foreignId nullable | references scenarios |
| raw_ai_response | json nullable | original structured response |
| created_at | timestamp |  |
| updated_at | timestamp |  |

Indexes:

- roleplay_session_id
- user_id
- scenario_id
- overall_score

## 3.9 analysis_skill_scores

Stores individual skill scores.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| analysis_report_id | foreignId | references analysis_reports |
| skill_key | string |  |
| skill_label | string |  |
| score | integer | 0-100 |
| feedback | text nullable |  |
| evidence | json nullable | transcript references |
| created_at | timestamp |  |
| updated_at | timestamp |  |

Indexes:

- analysis_report_id
- skill_key

## 3.10 session_events

Stores technical events during a roleplay.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| roleplay_session_id | foreignId | references roleplay_sessions |
| event_type | string | connected, disconnected, etc |
| payload | json nullable |  |
| occurred_at | timestamp |  |
| created_at | timestamp |  |
| updated_at | timestamp |  |

## 3.11 user_progress

Stores current user progression.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| user_id | foreignId | references users |
| level | integer default 1 |  |
| xp_total | integer default 0 |  |
| xp_current_level | integer default 0 |  |
| current_streak_days | integer default 0 |  |
| longest_streak_days | integer default 0 |  |
| total_sessions | integer default 0 |  |
| total_duration_seconds | integer default 0 |  |
| average_score | decimal nullable |  |
| best_score | integer nullable |  |
| last_session_at | timestamp nullable |  |
| created_at | timestamp |  |
| updated_at | timestamp |  |

Indexes:

- user_id

## 3.12 achievements

Stores available achievements.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| key | string | unique |
| name | string |  |
| description | text |  |
| icon | string nullable |  |
| xp_reward | integer default 0 |  |
| condition_type | string | sessions_count, score, streak |
| condition_value | integer | threshold |
| status | enum | active, inactive |
| created_at | timestamp |  |
| updated_at | timestamp |  |

## 3.13 user_achievements

Stores unlocked achievements.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| user_id | foreignId | references users |
| achievement_id | foreignId | references achievements |
| unlocked_at | timestamp |  |
| metadata | json nullable |  |
| created_at | timestamp |  |
| updated_at | timestamp |  |

Unique:

- user_id + achievement_id

## 3.14 ai_settings

Stores AI provider settings.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| key | string | unique |
| value | encrypted text/json | sensitive |
| description | text nullable |  |
| is_secret | boolean default false |  |
| created_at | timestamp |  |
| updated_at | timestamp |  |

## 3.15 prompt_templates

Stores reusable prompt templates.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| key | string | unique |
| name | string |  |
| type | enum | roleplay, analysis, summary |
| content | longText | prompt content |
| variables | json nullable | supported variables |
| status | enum | active, inactive |
| created_by | foreignId nullable | users |
| created_at | timestamp |  |
| updated_at | timestamp |  |

## 3.16 knowledge_base_items

Stores reusable knowledge content.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| title | string |  |
| category | string nullable |  |
| content | longText |  |
| status | enum | active, inactive, archived |
| created_by | foreignId nullable | users |
| created_at | timestamp |  |
| updated_at | timestamp |  |

## 3.17 scenario_knowledge_base

Pivot table between scenarios and knowledge base.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| scenario_id | foreignId | references scenarios |
| knowledge_base_item_id | foreignId | references knowledge_base_items |
| created_at | timestamp |  |
| updated_at | timestamp |  |

## 3.18 audit_logs

Stores important admin and system actions.

| Column | Type | Notes |
|---|---|---|
| id | bigint | primary key |
| user_id | foreignId nullable | actor |
| action | string | e.g. scenario.created |
| entity_type | string nullable |  |
| entity_id | bigint nullable |  |
| old_values | json nullable |  |
| new_values | json nullable |  |
| ip_address | string nullable |  |
| user_agent | text nullable |  |
| created_at | timestamp |  |
| updated_at | timestamp |  |

## 4. Suggested Enums

### users.role

- super_admin
- admin
- user

### users.status

- active
- inactive
- suspended

### scenarios.difficulty

- beginner
- intermediate
- advanced
- expert

### scenarios.status

- draft
- published
- archived

### roleplay_sessions.status

- pending
- active
- completed
- failed
- cancelled

### roleplay_sessions.analysis_status

- pending
- processing
- completed
- failed

## 5. Data Retention Rules

Recommended defaults:

| Data | Retention |
|---|---|
| Transcript | Keep unless deleted by admin |
| Analysis report | Keep unless deleted by admin |
| Audio file | Optional, default 30 days |
| Session event logs | 90 days |
| Audit logs | 1 year minimum |

## 6. Migration Order

Suggested migration order:

1. users
2. user_profiles
3. personas
4. scenarios
5. scenario_evaluation_rules
6. roleplay_sessions
7. transcript_segments
8. analysis_reports
9. analysis_skill_scores
10. session_events
11. user_progress
12. achievements
13. user_achievements
14. ai_settings
15. prompt_templates
16. knowledge_base_items
17. scenario_knowledge_base
18. audit_logs
