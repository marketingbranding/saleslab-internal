# ADMIN_PANEL.md
# AI Roleplay Training Simulator Admin Panel Specification

## 1. Admin Panel Overview

The admin panel allows authorized users to manage the training simulator.

Admin workflows should prioritize speed, clarity, and data control. The admin panel may use the same visual identity as the main app, but it should be less decorative and more functional.

## 2. Admin Roles

### Super Admin

Can manage:

- All users
- All scenarios
- All personas
- All AI settings
- Prompt templates
- Knowledge base
- Reports
- Audit logs
- System settings

### Admin

Can manage:

- Assigned users
- Scenarios if permitted
- Personas if permitted
- Reports for assigned users
- Basic prompt and knowledge settings if permitted

### User

No admin panel access.

## 3. Admin Navigation

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

## 4. Admin Dashboard

### Purpose

Give admins a quick overview of training usage and issues.

### Required Metrics

- Total users
- Active users today
- Sessions today
- Sessions this week
- Average score
- Analysis failure count
- Most used scenario
- Weakest team skill
- New users this month
- Average session duration

### Suggested Layout

```text
+----------------------------------------------------------+
| Admin Dashboard                                          |
+------------------+------------------+--------------------+
| Active Users     | Sessions Today   | Average Score      |
+------------------+------------------+--------------------+
| Weakest Skill    | Failed Analysis  | Most Used Scenario |
+----------------------------------------------------------+
| Recent Sessions                                       |
| User | Scenario | Score | Status | Time                 |
+----------------------------------------------------------+
```

## 5. User Management

### User List

Columns:

- Name
- Email
- Role
- Status
- Last login
- Total sessions
- Average score
- Actions

Filters:

- Role
- Status
- Date joined
- Last active
- Average score range

Actions:

- View user
- Edit user
- Activate/deactivate
- Reset password
- View history
- Assign scenarios

### User Detail

Sections:

- Profile
- Progress
- Mission history
- Skill scores
- Achievements
- Assigned scenarios
- Admin notes

## 6. Scenario Management

## 6.1 Scenario List

Columns:

- Title
- Category
- Difficulty
- Persona
- Status
- Completion count
- Average score
- Updated at
- Actions

Filters:

- Category
- Difficulty
- Status
- Persona
- Created by

Actions:

- Create scenario
- Edit
- Duplicate
- Preview
- Archive
- Delete

## 6.2 Scenario Builder

The scenario builder should be divided into tabs or sections.

### Section 1: Basic Info

Fields:

- Scenario title
- Slug
- Category
- Description
- Briefing
- Difficulty
- Estimated duration
- Max duration
- Status

### Section 2: Persona

Fields:

- Select persona
- Preview persona
- Override persona behavior for this scenario

### Section 3: Mission Objective

Fields:

- Objective
- Success criteria
- Required user behaviors
- Failure conditions
- Hints shown to user

Example success criteria:

```text
- Ask at least three discovery questions.
- Confirm customer budget.
- Explain next step clearly.
```

### Section 4: AI Roleplay Configuration

Fields:

- Opening speaker: AI/User
- Opening message
- Scenario prompt instructions
- Hidden rules
- Forbidden topics
- Allowed knowledge
- Language
- AI temperature if supported
- Voice provider
- Voice model

### Section 5: Evaluation Rules

Fields:

- Skill labels
- Score weights
- Rubric per skill
- Required transcript evidence
- Grade threshold
- Auto-fail rules

Example rule:

```text
Skill: Discovery
Weight: 20%
High score condition:
User asks relevant questions about need, budget, timeline, and decision process.
```

### Section 6: Rewards

Fields:

- Base XP
- Unlock level
- Achievement trigger
- Repeat XP reduction
- Featured scenario toggle

### Section 7: Publish Settings

Fields:

- Draft/published/archived
- Available to all users
- Available to selected users
- Available from date
- Available until date

## 7. Persona Management

## 7.1 Persona List

Columns:

- Avatar
- Name
- Occupation
- Personality
- Status
- Used in scenarios
- Updated at
- Actions

Actions:

- Create persona
- Edit
- Duplicate
- Archive
- Delete

## 7.2 Persona Builder

### Section 1: Identity

Fields:

- Name
- Avatar
- Gender
- Age
- Occupation
- Family status
- Income range if relevant

### Section 2: Background

Fields:

- Background story
- Current situation
- Goals
- Pain points
- Motivations
- Constraints

### Section 3: Personality

Fields:

- Personality description
- Emotional level
- Aggression level
- Patience level
- Trust level
- Curiosity level

### Section 4: Speaking Style

Fields:

- Language
- Tone
- Formality
- Common phrases
- Speaking speed
- Voice selection

### Section 5: Objections

Fields:

- Common objections
- Trigger conditions
- Expected AI pushback
- Escalation behavior

### Section 6: Hidden Behavior Rules

Fields:

- Hidden instructions
- What persona knows
- What persona does not know
- When persona becomes interested
- When persona rejects offer

Important:

Hidden behavior rules must never be shown to normal users.

## 8. Prompt Template Management

### Prompt Types

- Roleplay system prompt
- Analysis prompt
- Summary prompt
- Transcript cleanup prompt
- Recommendation prompt

### Prompt Template Fields

- Key
- Name
- Type
- Content
- Variables
- Status
- Created by
- Updated at

### Required Features

- Preview variables
- Test prompt with sample scenario
- Version history if possible
- Revert to default

## 9. Knowledge Base

The knowledge base contains reusable information that can be attached to scenarios.

Examples:

- Product information
- Sales rules
- FAQ
- Pricing guide
- Policy guide
- Training guide

### Knowledge Base Fields

- Title
- Category
- Content
- Status
- Attached scenarios

### Required Actions

- Create
- Edit
- Archive
- Attach to scenario
- Detach from scenario

## 10. Reports

### Report Types

#### User Report

Shows:

- User profile
- Total sessions
- Average score
- Skill trend
- Mission history
- Recommended improvement

#### Scenario Report

Shows:

- Completion count
- Average score
- Failure rate
- Common weak skills
- Average duration
- Transcript sample links

#### Team Report

Shows:

- Total users
- Active users
- Average team score
- Weakest skill
- Training consistency
- Leaderboard if enabled

## 11. AI Settings

Only Super Admin should access this by default.

Settings:

- Voice provider
- Analysis provider
- API keys
- Default model
- Fallback model
- Max call duration
- Store audio yes/no
- Audio retention days
- Analysis retry count
- Cost limit per day if implemented

Sensitive values must be encrypted or stored in environment variables.

## 12. System Settings

Settings:

- App name
- Logo
- Default language
- Enable leaderboard
- Enable achievements
- Enable audio recording
- Enable live captions
- Default user role
- Registration mode
- Maintenance mode

## 13. Audit Logs

Track important actions:

- User created
- User role changed
- Scenario created
- Scenario published
- Persona changed
- AI setting changed
- Prompt template changed
- Report exported
- Login failed

Audit log columns:

- Actor
- Action
- Entity
- Timestamp
- IP address
- Old value
- New value

## 14. Admin Permissions

| Permission | Super Admin | Admin |
|---|---:|---:|
| View admin dashboard | Yes | Yes |
| Manage users | Yes | Limited |
| Manage scenarios | Yes | Optional |
| Manage personas | Yes | Optional |
| Manage prompt templates | Yes | Optional |
| Manage AI settings | Yes | No |
| View reports | Yes | Limited |
| View audit logs | Yes | No |
| System settings | Yes | No |

## 15. Admin UX Requirements

- All forms must validate clearly.
- Long forms should auto-save drafts if possible.
- Scenario preview should be available before publishing.
- Duplicate scenario/persona should be easy.
- Published scenarios should warn before major edits.
- Archived scenarios must not appear to users.
- Deleting should be soft delete where possible.

## 16. Admin MVP

MVP admin panel includes:

- Admin dashboard
- User list
- Scenario CRUD
- Persona CRUD
- Mission history report
- AI settings
- Basic prompt template editor
