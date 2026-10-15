---
name: Dialectic Editorial
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf1'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee9ff'
  surface-container-highest: '#d8e3f9'
  on-surface: '#111c2c'
  on-surface-variant: '#44474b'
  inverse-surface: '#263142'
  inverse-on-surface: '#ebf1ff'
  outline: '#75777c'
  outline-variant: '#c5c6cc'
  surface-tint: '#575f6b'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#141c26'
  on-primary-container: '#7c8491'
  inverse-primary: '#bfc7d5'
  secondary: '#006a63'
  on-secondary: '#ffffff'
  secondary-container: '#99efe5'
  on-secondary-container: '#006f67'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#002115'
  on-tertiary-container: '#339471'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe3f1'
  primary-fixed-dim: '#bfc7d5'
  on-primary-fixed: '#141c26'
  on-primary-fixed-variant: '#3f4753'
  secondary-fixed: '#9cf2e8'
  secondary-fixed-dim: '#80d5cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#00504a'
  tertiary-fixed: '#97f5cc'
  tertiary-fixed-dim: '#7bd8b1'
  on-tertiary-fixed: '#002115'
  on-tertiary-fixed-variant: '#00513a'
  background: '#f9f9ff'
  on-background: '#111c2c'
  surface-variant: '#d8e3f9'
typography:
  display-hero:
    fontFamily: Newsreader
    fontSize: 44px
    fontWeight: '600'
    lineHeight: 52px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 30px
    fontWeight: '500'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Newsreader
    fontSize: 22px
    fontWeight: '500'
    lineHeight: 28px
  card-assertion:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '400'
    lineHeight: 30px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-tag:
    fontFamily: Hanken Grotesk
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
  label-action:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  stat-mono:
    fontFamily: Hanken Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-mobile: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system is engineered for intellectually demanding workflows: debate preparation, civic discourse, policy analysis, and rigorous fact retention. It rejects playful gamification in favor of a concentrated, Swiss-inspired editorial posture—combining the typographic authority of broadsheet journalism with modern mobile touch ergonomics.

### Character & Emotional Tenor
- **Rigorous & Authoritative:** Evokes the credibility of academic compendia and investigative briefings. Interfaces recede; arguments, evidence, and statistics take absolute precedence.
- **Cognitive Clarity:** Dense information is structured through clear typographic hierarchy, disciplined spatial grids, and semantically unambiguous color codes rather than ornamental decoration.
- **Tactile Precision:** Interactions feel decisive. Spaced-repetition inputs and card state flips respond with immediate, micro-metered feedback that honors the user’s flow state.

### Visual Style Direction
The aesthetic merges **Swiss High-Modernism** with **Contemporary Minimalist Utility**:
- Asymmetric editorial margins balanced by structural hairline dividers (`1px` crisp borders).
- Dual typography: a sharp, high-contrast transitional serif for critical assertions, quotations, and thesis statements, counterbalanced by an ultra-functional, low-contrast grotesque for high-speed retention, metadata, and spaced repetition metrics.
- Information categorization achieved through a systematic palette of high-legibility taxonomy tokens (Fact, Number, Argument, Example, Quote, Term).

## Colors

The palette establishes an ink-on-rag-paper editorial baseline, supplemented by categorical taxonomy markers and strict Spaced Repetition System (SRS) evaluation anchors.

### Core Roles
- **Primary (`#121A24`):** Deep carbon ink. Anchors primary actions, dominant header typography, and active navigational items in light mode; reverses to `#F3F4F6` off-white parchment in dark mode.
- **Secondary (`#0F766E`):** Editorial Deep Teal. Used for interactive focal points, progress trackers, and balanced intellectual highlights.
- **Tertiary (`#047857`):** Emerald Oxide. Represents verified masteries, valid argumentation lines, and confirmation states.
- **Neutral (`#5A6578`):** Slate graphite. Governs secondary annotations, hairline borders, metadata lines, and deactivated states.

### Semantic Taxonomy Tokens (Thematic Badge Palette)
These tokens remain constant across modes, calibrated with background tints (`10%` alpha in light, `18%` in dark) and crisp text values:
- **Fakt (Fact):** Marine Blue — `#1D4ED8` (Light Fill: `#EFF6FF`, Dark Fill: `#1E293B`, Dark Text: `#60A5FA`)
- **Zahl (Statistic/Number):** Deep Indigo/Violet — `#6366F1` (Light Fill: `#EEF2FF`, Dark Fill: `#232742`, Dark Text: `#A5B4FC`)
- **Argument (Argument):** Emerald — `#059669` (Light Fill: `#ECFDF5`, Dark Fill: `#064E3B`, Dark Text: `#34D399`)
- **Beispiel (Example):** Warm Amber — `#D97706` (Light Fill: `#FFFBEB`, Dark Fill: `#451A03`, Dark Text: `#FBBF24`)
- **Zitat (Quote):** Crimson Rose — `#BE123C` (Light Fill: `#FFF1F2`, Dark Fill: `#4C0519`, Dark Text: `#FB7185`)
- **Begriff (Concept/Term):** Cyan Teal — `#0D9488` (Light Fill: `#F0FDFA`, Dark Fill: `#134E4A`, Dark Text: `#2DD4BF`)

### Spaced Repetition Action Tokens (SRS Grade Scale)
- **Nochmal (Again - Level 1):** Solid Crimson `#DC2626` | Subtle tint: `#FEF2F2`
- **Schwer (Hard - Level 2):** Burnt Amber `#EA580C` | Subtle tint: `#FFF7ED`
- **Gut (Good - Level 3):** Cerulean Azure `#0284C7` | Subtle tint: `#F0F9FF`
- **Leicht (Easy - Level 4):** Mint Emerald `#059669` | Subtle tint: `#ECFDF5`

### Surface System
- **Light Theme:** Canvas `#F9FAFB`, Card Base `#FFFFFF`, Inset Tray `#F3F4F6`, Hairline Border `#E5E7EB`.
- **Dark Theme:** Canvas `#0B0F15`, Card Base `#141C26`, Inset Tray `#1A2432`, Hairline Border `#243042`.

## Typography

Typography delivers intellectual gravity and swift scanability through a two-tiered editorial pairing:

1. **Editorial Anchor (`Newsreader`):** Applied exclusively to thematic assertions, debate premises, flashcard core prompts, and literary quotations. Its proportional italic styling serves as the definitive presentation layer for dialectic antitheses and citation attributions.
2. **Analytical Workhorse (`Hanken Grotesk`):** Applied to factual explanations, quantitative card backs, navigational states, data visualizations, and SRS button prompts. Offers clean, modern horizontal tracking with tabular numerals.

### Rules of Usage
- **Card Questions & Theses:** Rendered in `card-assertion` (`Newsreader`). If presenting a direct quote, use `Newsreader` italic.
- **Card Explanations & Evidentiary Proofs:** Set in `body-md` (`Hanken Grotesk`) with `22px` line-height to maximize readability during rapid thumb-scrolling.
- **Taxonomy Badges:** Always set in `label-tag` (`Hanken Grotesk`), fully uppercased with `+0.06em` tracking to secure legibility at micro dimensions.
- **Tabular Numerals:** For debate clocks, interval projections, and mastery metrics, configure OpenType feature `'tnum'` on all `Hanken Grotesk` instances.

## Layout & Spacing

The layout is built upon an 8-point base module, configured with a deliberate editorial vertical cadence.

### Canvas & Grids
- **Mobile Handheld (320px – 430px):** Single-column fluid view with `1rem` safe-edge margin. Study cards occupy full inner width (`100%`) with fixed bottom clearance (`88px`) to prevent bottom navigation and gesture conflicts.
- **Tablet & Split-Screen (431px – 834px):** Dual-pane structure. Left column (35% width) holds deck hierarchy and spaced repetition health rings; right column (65% width) hosts the active card drill interface.
- **Desktop Pro View (835px+):** Constrained 960px reading column centered on canvas, ensuring optimal 65-character line lengths for dense arguments.

### Component Spacing Principles
- Card interior padding: strictly `space-lg` (`1.5rem`) on top/sides and `space-md` (`1rem`) on bottom to balance badge anchors and tap triggers.
- Badge groups: horizontal flow with `space-xs` (`0.25rem`) gap and auto-wrapping.
- SRS Rating Bar: anchored persistently to the viewport bottom with `space-sm` (`0.5rem`) intra-button spacing.

## Elevation & Depth

This system avoids blurred drop shadows and glossy skeuomorphism. Depth is achieved via **low-contrast architectural outlines and crisp tonal surfaces**.

### Elevation Scale
- **Base (Level 0 - Canvas):** Ground level. Neutral matte surface with zero shadows (`#F9FAFB` in Light / `#0B0F15` in Dark).
- **Surface (Level 1 - Flashcards, Review Trays):** Elevated through a pure 1px hairline border (`#E5E7EB` in Light / `#243042` in Dark) paired with an ultra-subtle directional contact shadow: `0px 1px 3px rgba(18, 26, 36, 0.04)`.
- **Active / Raised (Level 2 - Dragged Cards, Modals):** Scaled upward by 1% with crisp dual contour: `0px 8px 24px -4px rgba(18, 26, 36, 0.08)`, bordered by `#D1D5DB` (Light) or `#334155` (Dark).
- **Overlay (Level 3 - Deck Drawer, SRS Explanation Sheets):** Solid surface backed by a 40% opacity frosted glass curtain (`backdrop-filter: blur(8px); background-color: rgba(18, 26, 36, 0.4)`).

### The Inset Card Reveal (Flip State)
When a flashcard flips from assertion to evidentiary breakdown, depth does not invert. Instead, an inset card tone shifts to an ultra-soft paper tint with an internal border (`box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05)`), signifying archival retrieval.

## Shapes

The shape system adopts a **Level 1 (Soft)** philosophy. Geometry remains clean, structured, and discipline-oriented, honoring Swiss graphic tradition while remaining tactile on glass displays.

### Geometric Rules
- **Base Elements (Buttons, Inputs, Badges):** `rounded` = `0.25rem` (4px). Provides precise, architectural corners without sharp prickling.
- **Cards & Data Panels:** `rounded-lg` = `0.5rem` (8px). Delivers a firm boundary that feels like an index card or analytical brief.
- **Bottom Navigation Dock & Floating Modals:** `rounded-xl` = `0.75rem` (12px). Softened slightly for comfortable handling in bottom thumb zones.
- **Progress Rings:** Strictly circular geometry with square end caps on data tracks to reflect quantitative precision.

## Components

### 1. Flashcard Container (The Dialectic Unit)
- **Structure:** 
  - Top Bar: Taxonomy Badge (Left) + Due Interval Meta (Right, e.g., "Fällig: 3d").
  - Core Area: Thematic Question/Thesis in `Newsreader` (`20px`).
  - Answer Area (Post-Reveal): Separated by a 1px dashed divider (`#E5E7EB`); reveals fact points, statistical evidence, or quotation origins in `Hanken Grotesk`.
  - Footer: Deck breadcrumb and card index (e.g., "Außenpolitik • 14 / 85").
- **States:** Front (Unrevealed), Back (Expanded), Swiping (Dynamic ±4deg rotation).

### 2. Thematic Tag Badges
- **Dimensions:** Height `22px`, horizontal padding `8px`, corner radius `4px`.
- **Typography:** `label-tag` (`11px` bold uppercase).
- **Visual Styles:**
  - *Fakt:* Light Blue `#EFF6FF` bg, `#1D4ED8` border/text.
  - *Zahl:* Light Violet `#EEF2FF` bg, `#6366F1` border/text.
  - *Argument:* Light Emerald `#ECFDF5` bg, `#059669` border/text.
  - *Beispiel:* Light Amber `#FFFBEB` bg, `#D97706` border/text.
  - *Zitat:* Light Crimson `#FFF1F2` bg, `#BE123C` border/text.
  - *Begriff:* Light Teal `#F0FDFA` bg, `#0D9488` border/text.

### 3. SRS Spaced Repetition Bottom Bar
A rigid four-button dock spanning screen width above the bottom navigation:
- **Buttons (Left to Right):**
  1. **Nochmal:** `#DC2626` outline/text, tint hover (`<1m`).
  2. **Schwer:** `#EA580C` outline/text, tint hover (`<10m`).
  3. **Gut:** `#0284C7` outline/text, tint hover (`1d`).
  4. **Leicht:** `#059669` outline/text, tint hover (`4d`).
- **Ergonomics:** Minimum height `52px` for thumb accuracy, active press depth `-1px` transform. Interval times appear in `11px` muted text beneath button labels.

### 4. Spaced Repetition Progress Ring
- **Structure:** Concentric circular ring with a track stroke width of `6px`.
- **Visuals:** Base track in neutral border color; active fill stroke rendered with `#0F766E` (Secondary) transitioning to `#047857` (Tertiary).
- **Center Meta:** Percentage retention or count of mature cards rendered in `stat-mono` (`Newsreader` or `Hanken Grotesk` 700).

### 5. Input Fields & Search Bars
- **Surface:** `#FFFFFF` (Light) / `#141C26` (Dark) with crisp `1px` border in `#D1D5DB`.
- **States:** Focus replaces border with `#121A24` (2px width) without glow or outer drop-shadow. Includes an inline clear trigger and keyboard accessory action.

### 6. Sleek Bottom Navigation
- **Placement:** Anchored to bottom edge, height `64px`, backdrop blur `12px` over translucent background.
- **Top Edge:** 1px hairline divider (`#E5E7EB` / `#243042`).
- **Icons & Labels:** 20px geometric outline icons with `10px` medium labels below. Active state indicated by primary solid tint and a top `2px` micro-indicator bar.