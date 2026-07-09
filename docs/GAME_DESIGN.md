# GAME_DESIGN.md
# AI Roleplay Training Simulator Game Design

## 1. Game Design Purpose

The product uses game mechanics to increase training repetition, not to distract from learning.

The game layer should make users want to practice more often by giving visible progress, small rewards, achievements, and mission structure.

## 2. Core Game Loop

```text
Choose Mission
  ↓
Complete Voice Roleplay
  ↓
Receive Mission Report
  ↓
Earn XP and Rewards
  ↓
Unlock Progress
  ↓
Choose Next Mission
```

## 3. Design Principle

The game layer must support training outcomes.

Avoid:

- Random rewards unrelated to learning
- Overly childish visuals
- Complex currencies
- Distracting animations during calls
- Competitive pressure that discourages weak users

Prefer:

- Skill improvement
- Clear milestones
- Repeat practice
- Achievement recognition
- Personal progress

## 4. Player Identity

Users are framed as "Agents" or "Trainees."

Possible rank names:

| Level Range | Rank |
|---|---|
| 1–4 | Rookie Agent |
| 5–9 | Field Trainee |
| 10–14 | Communication Agent |
| 15–24 | Senior Agent |
| 25–39 | Negotiation Specialist |
| 40–59 | Master Communicator |
| 60+ | Simulation Elite |

## 5. XP System

Users earn XP from completed missions.

Base XP formula:

```text
XP Earned = Scenario Base XP + Performance Bonus + Streak Bonus
```

Example:

| Source | XP |
|---|---:|
| Beginner mission | 50 |
| Intermediate mission | 80 |
| Advanced mission | 120 |
| Expert mission | 180 |
| Score above 80 | +20 |
| Score above 90 | +40 |
| Daily streak bonus | +10 |

## 6. Leveling Formula

Simple formula:

```text
XP needed for next level = 100 + (current_level * 50)
```

Example:

| Level | XP Needed |
|---:|---:|
| 1 → 2 | 150 |
| 2 → 3 | 200 |
| 3 → 4 | 250 |
| 4 → 5 | 300 |

## 7. Mission Types

### 7.1 Standard Mission

Normal roleplay scenario.

### 7.2 Daily Mission

A recommended scenario for the day.

Example:

```text
Complete 1 objection-handling mission today.
Reward: +50 XP
```

### 7.3 Weekly Challenge

A larger training objective.

Example:

```text
Complete 5 missions this week with average score above 75.
Reward: Achievement + 250 XP
```

### 7.4 Skill Mission

Focused on one skill.

Examples:

- Empathy Drill
- Closing Drill
- Discovery Drill
- Objection Handling Drill

## 8. Scenario Unlocking

Scenarios can be unlocked by:

- User level
- Previous scenario completion
- Score requirement
- Admin assignment

Example:

| Scenario | Unlock Requirement |
|---|---|
| Beginner Sales Call | Level 1 |
| Price Objection | Level 3 |
| Angry Customer | Level 5 |
| Expert Negotiation | Level 10 and average score ≥ 80 |

## 9. Difficulty Levels

| Difficulty | Description | Base XP |
|---|---|---:|
| Beginner | Cooperative persona | 50 |
| Intermediate | Mild objections | 80 |
| Advanced | Strong objections | 120 |
| Expert | Complex, skeptical persona | 180 |

## 10. Achievement System

Achievements reward important behaviors.

## 10.1 Starter Achievements

| Key | Name | Condition | XP |
|---|---|---|---:|
| first_mission | First Mission | Complete 1 mission | 50 |
| first_a_grade | First A Grade | Receive grade A- or higher | 100 |
| three_day_streak | 3-Day Streak | Train 3 days in a row | 100 |
| ten_sessions | Simulation Regular | Complete 10 missions | 150 |
| perfect_empathy | Perfect Empathy | Score 100 in empathy | 150 |

## 10.2 Skill Achievements

| Key | Name | Condition | XP |
|---|---|---|---:|
| closer_i | Closer I | Closing score ≥ 80 in 5 sessions | 150 |
| closer_ii | Closer II | Closing score ≥ 90 in 10 sessions | 300 |
| objection_master | Objection Master | Objection handling ≥ 85 in 10 sessions | 300 |
| discovery_agent | Discovery Agent | Discovery ≥ 85 in 10 sessions | 300 |

## 10.3 Consistency Achievements

| Key | Name | Condition | XP |
|---|---|---|---:|
| weekly_training | Weekly Training | Complete 5 missions in one week | 200 |
| monthly_operator | Monthly Operator | Complete 20 missions in one month | 500 |
| streak_7 | 7-Day Streak | Train 7 days in a row | 300 |
| streak_30 | 30-Day Streak | Train 30 days in a row | 1000 |

## 11. Badges

Badge visual style:

- Retro metal badge
- Simple icon
- 1px dark border
- Limited color
- Slight shadow
- Locked badges are grayscale

Badge states:

- Locked
- In progress
- Unlocked
- Newly unlocked

## 12. Streak System

A streak increases when user completes at least one mission in a calendar day.

Rules:

- One mission per day counts.
- Multiple missions in one day do not add multiple streak days.
- Streak resets if a full day is missed.
- Admin can optionally enable grace day.

## 13. Daily Target

Default daily target:

```text
Complete 1 mission per day.
```

Custom targets can be set by admin:

- Missions per day
- Minutes trained per day
- Minimum score
- Skill-specific target

## 14. Skill Progression

Each user has skill scores over time.

Tracked skills:

- Confidence
- Empathy
- Discovery
- Listening
- Communication
- Objection Handling
- Closing
- Professionalism

Skill progression should use rolling average of recent sessions.

Suggested calculation:

```text
Skill Current Score = Average of last 5 scored sessions for that skill
```

## 15. Mission Results

After a mission, show:

```text
Mission Complete
Score: 84
Grade: A-
XP Earned: +120
Level Progress: 70%
Achievement Unlocked: First A Grade
Recommended Next Mission: Price Objection
```

## 16. Leaderboard

Leaderboard should be optional.

Leaderboard metrics:

- Weekly XP
- Missions completed
- Average score
- Most improved user

Important:

Do not show leaderboard by default if it may discourage new or weak users.

Admin setting:

```text
ENABLE_LEADERBOARD=true/false
```

## 17. Progress Dashboard

User progress dashboard should show:

- Level
- XP bar
- Current rank
- Total missions
- Total training time
- Average score
- Best score
- Current streak
- Strongest skill
- Weakest skill
- Recent achievements

## 18. Reward Balance

Do not reward only high scores.

Also reward:

- Consistency
- Improvement
- Completing difficult scenarios
- Practicing weak skills
- Trying again after failure

## 19. Anti-Gaming Rules

To avoid users farming XP:

- Cancelled calls do not give XP.
- Very short sessions do not give full XP.
- Repeating same scenario too often gives reduced XP.
- Analysis must complete before score-based bonuses are awarded.
- Admin can reset suspicious progress.

## 20. Future Game Features

- Seasonal challenges
- Team missions
- Certification exams
- Boss scenarios
- Branch leaderboard
- Scenario mastery
- Skill tree
- Unlockable UI themes
