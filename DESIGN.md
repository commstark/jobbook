# DESIGN.md — Jobbook

**This file defines how Jobbook looks.** For what it does — screens, flows, data model, API routes — see `PROJECT_INSTRUCTIONS.md` in the same directory. Both files are required for the build.

## Brand Identity

**Name:** Jobbook
**Tagline:** Your jobs. Your book.
**Voice:** Direct, practical, zero fluff. Speaks like a foreman, not a founder.

## Visual Theme

Worn-in notebook meets native iOS. The aesthetic is utilitarian — like a well-organized clipboard that happens to be on a phone. Nothing decorative. Nothing that screams "tech startup." Every pixel earns its place.

The app should feel like a tool, not a product. Think: the UI equivalent of a Carhartt jacket.

## Color Palette

```
--bg-primary: #F5F4F0          /* Off-white, warm paper tone */
--bg-secondary: #EDECEA         /* Slightly darker surface for cards */
--bg-elevated: #FFFFFF           /* Pure white, used sparingly for active/focused elements */

--text-primary: #1A1A1A          /* Near-black, main text */
--text-secondary: #6B6B6B        /* Medium gray, supporting text */
--text-muted: #9E9E9E            /* Light gray, timestamps, labels */

--accent-action: #1A1A1A         /* Black — the primary action color. Buttons are black. */
--accent-blue: #2563EB           /* Blue — links, scheduling, informational states */
--accent-green: #16A34A          /* Green — paid, completed, money, success */
--accent-orange: #D97706         /* Amber/orange — owing, warnings, flags */
--accent-red: #DC2626            /* Red — urgent, overdue, destructive actions */

--border: #E0DFDB                /* Warm gray border, not cold */
--border-light: #EEEDEA          /* Very subtle divider */

--thumbs-up: #16A34A             /* Good customer indicator */
--thumbs-down: #DC2626           /* Problem customer indicator */
```

### Color Usage Rules
- Primary actions (Send, Schedule, Create Job) are **always black buttons with white text**
- Secondary actions (Edit, Cancel, Back) are **outline buttons with border**
- Status colors appear only as small badges or left-border accents, never as backgrounds for large areas
- The app is predominantly warm off-white and black. Color is an accent, not a theme
- No gradients anywhere. No shadows deeper than 1px. No glows.

## Typography

```
Font family: -apple-system, 'SF Pro Text', 'SF Pro Display', system-ui, sans-serif
```

We use the system font because it's what the phone uses. It feels native, loads instantly, and a plumber doesn't care about font choices.

```
--text-page-title: 26px / 700 weight / -0.8px letter-spacing
--text-section-header: 11px / 600 weight / 0.8px letter-spacing / uppercase / --text-muted color
--text-card-title: 15px / 600 weight / -0.2px letter-spacing
--text-body: 14px / 400 weight / 1.5 line-height
--text-small: 12px / 500 weight
--text-caption: 11px / 500 weight
--text-amount-large: 20px / 700 weight
--text-amount-inline: 14px / 600 weight
```

### Typography Rules
- Page titles are large and heavy — you know where you are instantly
- Section headers are always UPPERCASE, small, muted, and letterspaced — they organize, they don't shout
- Never use more than 3 font sizes on one screen
- No italic text anywhere in the app
- Numbers (prices, times, counts) are always 600+ weight

## Spacing System

```
--space-xs: 4px
--space-sm: 8px
--space-md: 12px
--space-lg: 16px
--space-xl: 20px
--space-2xl: 24px
--space-3xl: 32px
--space-4xl: 48px
```

### Spacing Rules
- Page padding: 20px horizontal
- Cards/list items: 16px internal padding
- Between cards: 4-6px gap (tight, not airy)
- Between sections: 24px
- Generous top padding on page titles: 24px from status bar
- The app should feel **dense but not cramped** — every item is close to the next, but text has room to breathe

## Components

### Buttons

**Primary (Black)**
```
background: var(--accent-action)
color: #FFFFFF
border: none
border-radius: 8px
padding: 13px 0 (full width) or 13px 20px (inline)
font-size: 14px
font-weight: 600
```

**Secondary (Outline)**
```
background: transparent
color: var(--text-primary)
border: 1px solid var(--border)
border-radius: 8px
padding: 13px 20px
font-size: 14px
font-weight: 600
```

**Small Action (Inline)**
```
background: var(--accent-action)
color: #FFFFFF
border-radius: 6px
padding: 5px 12px
font-size: 11px
font-weight: 600
```

### Button Rules
- No rounded pill buttons (border-radius max 8px)
- No colored buttons except black. Green/blue/red appear only as text or badges, never button backgrounds
- Disabled buttons: same shape, 40% opacity
- One primary action per screen maximum
- Buttons feel like stamps — solid, square, definitive

### Cards / List Items

```
background: var(--bg-secondary) or var(--bg-elevated)
border: none (cards sit on the bg naturally, not floating)
border-radius: 10px
padding: 14px 16px
border-left: 2px solid [status color] (optional, for status indication)
```

### Card Rules
- Cards do NOT have box shadows
- Cards do NOT have visible borders (they contrast against bg-primary naturally)
- Left border accent for status: blue = scheduled, green = completed/paid, red = urgent, orange = owing
- Cards are tappable — entire card is the hit target, not a small button inside it
- Tight vertical stacking: 4-6px between cards

### Status Badges

```
background: light version of status color (10% opacity)
color: status color
font-size: 11px
font-weight: 500
padding: 3px 8px
border-radius: 4px (square-ish, not pills)
text: lowercase ("scheduled", "paid", "urgent")
```

### Avatar / Initials

```
width/height: contextual (36-52px)
border-radius: 50%
background: var(--bg-secondary)
color: var(--text-secondary)
font-weight: 600
font-size: 36% of container width
```

- Unknown customers: orange-tinted background
- No photos/images for avatars — always initials
- Customer rating indicator: small 🟢 or 🔴 dot on the avatar, or thumbs icon nearby

### Input Fields

```
background: var(--bg-secondary)
border: none (gets 1px solid var(--border) on focus)
border-radius: 8px
padding: 10px 12px
font-size: 14px
color: var(--text-primary)
placeholder-color: var(--text-muted)
```

### The Mic Button (Voice Capture)

The most important UI element. Lives in the tab bar, elevated above the other icons.

```
width: 48px
height: 48px
border-radius: 48px
background: var(--accent-action) (black)
color: white
margin-top: -16px (floats above tab bar)
box-shadow: 0 2px 12px rgba(0,0,0,0.12)
icon: microphone SVG, 20px
```
**Note:** The mic button is the ONE exception to the "no shadows deeper than 1px" anti-pattern rule. It needs the shadow to visually float above the tab bar. Do not "correct" this to match the anti-pattern rule.

When recording:
```
width: 100px
height: 100px (stays circular)
animation: subtle pulse (scale 1.0 → 1.04)
box-shadow: 0 0 0 16px rgba(0,0,0,0.04)
audio waveform bars below: 2.5px wide, black, varying heights
```

### Tab Bar

```
background: rgba(245, 244, 240, 0.92) (bg-primary with blur)
backdrop-filter: blur(20px)
border-top: 1px solid var(--border-light)
padding: 6px 0 22px (safe area bottom)
```

- 4 tabs: Inbox, Schedule, Capture (mic), Customers
- Icons: SVG line icons, 22px, stroke-width 1.8
- Active tab: full opacity black
- Inactive tab: 40% opacity
- Labels: 10px, 500 weight

### Photo Thumbnails

```
width/height: contextual (36-64px)
border-radius: 8px
background: pastel placeholder tones while loading
```

- Add Photo button: dashed border, "+" icon, same size as thumbnails
- Photo count shown as text ("3 attached"), not as a separate badge
- Photos are tappable to view full screen

## Layout Principles

### Mobile-Only Design
- Max width: 390px (centered on larger screens with side borders)
- Everything is a vertical scroll
- No horizontal scrolling except the week day picker on the calendar
- Fixed tab bar at bottom, content scrolls behind it

### Information Hierarchy
- **Level 1:** What do I need to do now? (Inbox badge count, next upcoming job)
- **Level 2:** What's the full picture? (Today's schedule, unread messages)
- **Level 3:** What's the history? (Customer profile, past jobs — accessed by tapping in, never shown by default)

### Progressive Disclosure
- The main screens show minimal info: name, time, title, amount
- Tap to see more: full description, photos, notes, AI summary
- History is always one tap away, never cluttering the current view
- Notes and customer ratings are visible on the profile but not on job cards

### Navigation
- Tab bar for top-level navigation (Inbox, Schedule, Capture, Customers)
- Back button (blue, top-left) for drill-in screens
- Navigation stack: remembers where you came from, back always works
- No hamburger menus. No drawers. No modals except confirmations.

## Animation & Motion

- Keep it minimal. This is a work tool.
- Page transitions: none (instant swap)
- Button press: subtle opacity change (0.7 on press)
- Mic recording: pulse animation + audio bars (the one place we allow motion)
- Pull to refresh: native iOS behavior
- No loading spinners — show skeleton placeholders if needed
- Success states: green checkmark fades in, holds 2 seconds

## Iconography

- All icons are SVG, stroke-based, 1.8px stroke width
- Source: Lucide icon set (consistent with the minimal aesthetic)
- No filled icons except the mic button
- No emoji anywhere in the UI (including status indicators)
- Use color dots (small circles) instead of emoji for status

## Dark Mode

Not for v1. The app is light mode only. Plumbers use their phones in daylight and under kitchen sinks with flashlights. Dark mode adds complexity with zero value here.

## Design Anti-Patterns (Never Do These)

- No gradients
- No box shadows deeper than `0 1px 3px rgba(0,0,0,0.06)`
- No pill-shaped buttons or badges (max border-radius: 8px for buttons, 4px for badges)
- No emoji in the UI
- No placeholder illustrations or mascots
- No onboarding carousels or tooltips
- No "empty state" illustrations — just plain text ("No jobs scheduled")
- No purple, pink, or teal anywhere
- No card-on-card stacking (cards sit on the page, not on other cards)
- No toggle switches unless absolutely necessary
- No star ratings (thumbs up/down only)
