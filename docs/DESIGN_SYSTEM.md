# DESIGN_SYSTEM.md
# AI Roleplay Training Simulator Design System

## 1. Design System Overview

The design system defines the visual language for the AI Roleplay Training Simulator.

The style is retro-modern:

- Inspired by old operating systems and training terminals
- Clean enough for modern productivity use
- Game-like without becoming childish
- Sharp, readable, and lightweight

## 2. Visual Keywords

Use these keywords when designing screens:

- Retro terminal
- Training simulator
- Mission control
- Phone call interface
- Old desktop software
- Tactile buttons
- Sharp panels
- Simple shadows
- Minimal motion

Avoid:

- Cyberpunk neon overload
- Pixel art
- Heavy gradients
- Glassmorphism
- Neumorphism
- Overly playful cartoon UI

## 3. Color Palette

### Core Colors

| Token | Color | Usage |
|---|---|---|
| `--color-bg` | #F6F0E7 | Main background |
| `--color-surface` | #FFFDF8 | Panels/cards |
| `--color-primary` | #E6915D | Primary action |
| `--color-dark` | #222222 | Text/borders |
| `--color-navy` | #243447 | Header/sidebar |
| `--color-success` | #5B8C5A | Success |
| `--color-warning` | #C9972F | Warning |
| `--color-danger` | #B34A48 | Danger |
| `--color-muted` | #8A8178 | Secondary text |

### CSS Variables

```css
:root {
  --color-bg: #F6F0E7;
  --color-surface: #FFFDF8;
  --color-primary: #E6915D;
  --color-dark: #222222;
  --color-navy: #243447;
  --color-success: #5B8C5A;
  --color-warning: #C9972F;
  --color-danger: #B34A48;
  --color-muted: #8A8178;
}
```

## 4. Typography

### Font Roles

| Role | Font |
|---|---|
| Headings | Times New Roman or Georgia |
| Body | Inter, Arial, sans-serif |
| Numbers / Code | IBM Plex Mono, Courier New, monospace |

### Heading Style

- Use serif font.
- Use strong contrast.
- Keep line height tight.
- Avoid overly decorative display fonts.

Example:

```css
.heading-terminal {
  font-family: "Times New Roman", Georgia, serif;
  font-weight: 700;
  letter-spacing: -0.02em;
}
```

### Body Style

```css
.body-text {
  font-family: Inter, Arial, sans-serif;
  line-height: 1.5;
}
```

### Numeric Style

```css
.numeric {
  font-family: "IBM Plex Mono", "Courier New", monospace;
  font-variant-numeric: tabular-nums;
}
```

## 5. Borders and Shadows

### Borders

Use 1px or 2px solid dark borders.

```css
.retro-border {
  border: 2px solid var(--color-dark);
}
```

### Shadows

Use hard shadows, not blurry modern shadows.

```css
.retro-shadow {
  box-shadow: 4px 4px 0 var(--color-dark);
}
```

Hover state:

```css
.retro-shadow-hover:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 var(--color-dark);
}
```

Pressed state:

```css
.retro-pressed:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--color-dark);
}
```

## 6. Spacing

Use consistent spacing scale.

| Token | Value |
|---|---:|
| xs | 4px |
| sm | 8px |
| md | 16px |
| lg | 24px |
| xl | 32px |
| 2xl | 48px |

## 7. Components

## 7.1 Button

### Primary Button

Usage:

- Start Mission
- Start Call
- Save
- Publish

Style:

```css
.btn-primary {
  background: var(--color-primary);
  color: var(--color-dark);
  border: 2px solid var(--color-dark);
  box-shadow: 3px 3px 0 var(--color-dark);
  font-weight: 700;
  padding: 0.75rem 1rem;
}
```

### Secondary Button

Usage:

- Cancel
- Back
- View Detail

```css
.btn-secondary {
  background: var(--color-surface);
  color: var(--color-dark);
  border: 2px solid var(--color-dark);
  box-shadow: 3px 3px 0 var(--color-dark);
}
```

### Danger Button

Usage:

- End Call
- Delete
- Archive

```css
.btn-danger {
  background: var(--color-danger);
  color: white;
  border: 2px solid var(--color-dark);
  box-shadow: 3px 3px 0 var(--color-dark);
}
```

## 7.2 Panel

Usage:

- Dashboard widgets
- Mission briefing
- Report sections
- Admin forms

```css
.panel {
  background: var(--color-surface);
  border: 2px solid var(--color-dark);
  box-shadow: 4px 4px 0 var(--color-dark);
  padding: 1rem;
}
```

## 7.3 Input

```css
.input {
  background: white;
  border: 2px solid var(--color-dark);
  padding: 0.75rem;
  outline: none;
}

.input:focus {
  box-shadow: 0 0 0 3px rgba(230, 145, 93, 0.35);
}
```

## 7.4 Badge

Badge types:

- Difficulty
- Grade
- Status
- Achievement
- Category

```css
.badge {
  border: 1px solid var(--color-dark);
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
}
```

## 7.5 XP Bar

```text
Level 5
[████████████░░░░] 70%
```

Rules:

- Use mono font for numbers.
- Show current XP and next level XP if space allows.
- Use strong border.

## 7.6 Scenario Card

Content:

- Title
- Category
- Difficulty
- Persona
- Duration
- XP
- Status
- CTA

Layout:

```text
+----------------------------+
| Sales / Beginner           |
| First Home Buyer           |
| Persona: Mrs. Siti         |
| Duration: 8 min            |
| Reward: 50 XP              |
| [ Start Mission ]          |
+----------------------------+
```

## 7.7 Mission Report Card

Content:

- Score
- Grade
- Summary
- Skill scores
- Feedback

Score should be large and numeric.

```text
84
A-
```

## 8. Icons

Use simple line icons.

Recommended style:

- 1.5px or 2px stroke
- No filled glossy icons
- Consistent size

Icon suggestions:

| Concept | Icon |
|---|---|
| Dashboard | grid |
| Training | target |
| Scenario | file |
| Phone | phone |
| History | clock |
| Report | chart |
| Achievement | medal |
| Settings | gear |

## 9. Motion Design

Motion should be subtle.

Allowed:

- CRT flicker on login
- Button press movement
- Call waveform
- Loading cursor
- Achievement popup
- Mission complete transition

Avoid:

- Excessive bouncing
- Long intro animations
- Motion during critical reading
- Animations blocking input

## 10. Sound Design

Optional UI sounds:

- Login boot beep
- Call ringing
- Call connected
- Call ended
- Achievement unlock
- Button click

Rules:

- Sound must be muted by default or easily disabled.
- Never play long sounds.
- Never play sound repeatedly in a way that annoys the user.

## 11. Layout System

### Desktop

Use:

- Left sidebar
- Top header
- Main content area
- Cards and panels

### Tablet

Use:

- Collapsible sidebar
- 2-column cards
- Stacked report sections

### Mobile

Use:

- Bottom navigation or collapsed menu
- Single-column cards
- Review-focused layout

## 12. Accessibility

Required:

- Minimum contrast ratio 4.5:1 for text
- Visible focus states
- Keyboard navigable controls
- Labels for inputs
- Alt text for avatars
- Captions option for call
- Reduced motion support

CSS example:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

## 13. Page Templates

## 13.1 User App Layout

```text
+----------------------------------------------------------+
| Header: App Name | User Level | Profile                  |
+------------------+---------------------------------------+
| Sidebar          | Main Content                          |
|                  |                                       |
+------------------+---------------------------------------+
```

## 13.2 Admin Layout

```text
+----------------------------------------------------------+
| Admin Header                                             |
+------------------+---------------------------------------+
| Admin Sidebar    | Table / Form / Report                  |
+------------------+---------------------------------------+
```

## 13.3 Call Layout

```text
+----------------------------------------------------------+
| Call Status                                       Timer   |
+----------------------------------------------------------+
|                                                          |
|                  Caller Avatar                           |
|                  Voice State                             |
|                  Waveform                                |
|                                                          |
+----------------------------------------------------------+
| Mute                End Call                 Settings     |
+----------------------------------------------------------+
```

## 14. Copywriting Style

Use direct labels.

Preferred:

- Start Mission
- Start Call
- End Call
- Mission Complete
- Mission Report
- Skill Breakdown
- Retry Analysis

Avoid:

- Let's chat
- Talk with bot
- AI friend
- Random playful copy
