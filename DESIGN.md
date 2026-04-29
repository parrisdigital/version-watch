---
name: Version Watch
description: Premium developer intelligence terminal for tracking platform changes
colors:
  splash: "oklch(66% 0.14 230)"
  splash-soft: "oklch(34% 0.1 230)"
  background: "oklch(13% 0.008 260)"
  foreground: "oklch(97% 0.003 260)"
  card: "oklch(16% 0.009 260)"
  surface-raised: "oklch(20% 0.011 260)"
  surface-sunken: "oklch(10% 0.006 260)"
  muted: "oklch(19% 0.01 260)"
  muted-foreground: "oklch(66% 0.012 260)"
  border: "oklch(24% 0.012 260)"
  border-strong: "oklch(32% 0.014 260)"
  border-quiet: "oklch(20% 0.01 260)"
  input: "oklch(28% 0.013 260)"
  ring: "oklch(66% 0.14 230)"
  critical: "oklch(70% 0.2 22)"
  high: "oklch(80% 0.15 68)"
  medium: "oklch(72% 0.13 230)"
  low: "oklch(66% 0.008 260)"
  green: "oklch(74% 0.14 158)"
  destructive: "oklch(62% 0.22 22)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 7vw, 5rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.65
    fontFeature: "'cv11', 'ss01'"
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.14em"
  tag:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0"
rounded:
  sm: "0.25rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
  "2xl": "1.25rem"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  "2xl": "3rem"
  shell: "min(100% - 2rem, 80rem)"
  narrow: "min(100% - 2rem, 58rem)"
components:
  button-primary:
    backgroundColor: "#080b12"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.125rem"
  button-primary-hover:
    backgroundColor: "#121724"
  button-secondary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.875rem"
  button-secondary-hover:
    backgroundColor: "{colors.muted}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.875rem"
  button-ghost-hover:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
  severity-critical:
    textColor: "{colors.critical}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.5rem"
  severity-high:
    textColor: "{colors.high}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.5rem"
  severity-medium:
    textColor: "{colors.medium}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.5rem"
  severity-low:
    backgroundColor: "{colors.background}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.5rem"
  tag:
    backgroundColor: "{colors.background}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.sm}"
    padding: "0.25rem 0.5rem"
  panel:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  panel-flat:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.md}"
    padding: "1.25rem"
  vendor-mark:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0.625rem 0.875rem"
  nav-link:
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.sm}"
    padding: "0.375rem 0.625rem"
  nav-link-active:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    padding: "0.375rem 0.625rem"
---

# Design System: Version Watch

## 1. Overview

**Creative North Star: "The Intelligence Terminal"**

Version Watch is a developer-grade reading surface that fuses two sensibilities. The first is a working terminal: dense, monospace-flavored, scan-first, comfortable at high information density. The second is editorial print — generous type, restrained color, deliberate hierarchy, the discipline of a wire service. The tool earns its trust by reading like both at once. Cinematic on the homepage where atmosphere clarifies value; restrained and efficient on every utility surface where atmosphere would get in the way.

The system rejects the visual vocabulary of consumer SaaS. There are no decorative illustrations, no rainbow charts, no glassmorphic stat cards floating over hero gradients. There is no "AI tool" purple. The palette is mostly cool neutrals with a single accent — a cool cobalt splash at hue 230 — that appears almost nowhere except where it must (focus rings, link hover, the primary CTA glow). Severity is encoded in three additional hues, used only when reporting state. Color is never decoration.

The dark mode is the canonical experience: cool charcoal canvas, premium ink, splash glow on the primary CTA. Light mode is the disciplined mirror — pure white canvas, near-black ink, the same splash held back almost entirely. Both modes share token shape and component DNA so a screen designed in one renders coherently in the other.

**Key Characteristics:**
- Cool charcoal canvas (`oklch(13% 0.008 260)`), premium ink (`oklch(97% 0.003 260)`), single cobalt splash accent (`oklch(66% 0.14 230)`).
- Geist sans for everything readable; Geist Mono for labels, kickers, severity pills, tags.
- Tight letter-spacing (`-0.02em`) on display and headline; generous tracking (`0.14em` upper) on labels.
- Flat surfaces by default. The only signature elevation is the splash glow under the primary CTA in dark mode, and the live-pulse halo on the freshness dot.
- Cards exist only when they're structurally necessary — `vw-panel` for event records, vendor profiles, source rails. Never decorative filler.
- Density is the feature. List rows beat grid cards on most utility surfaces.

## 2. Colors: The Terminal Operator Palette

The palette is a single neutral hue family at hue 260 (cool gray-blue), one chromatic accent at hue 230 (cobalt splash), and four semantic severity colors used only for state reporting. There is no decorative color. Saturation is restrained everywhere except the severity axis.

### Primary

- **Cool Splash Blue** (`oklch(66% 0.14 230)`): The single chromatic accent. Used for focus rings, active link state, the glow under the primary CTA in dark mode, the live-feed pulse halo. Appears on under 5% of any given surface — its rarity is what makes it work.
- **Splash Soft** (`oklch(34% 0.1 230)`): Lower-luminance variant for tinted backgrounds, hover states on cobalt elements, subtle focus halos.

### Tertiary (semantic — severity only)

- **Critical Ember** (`oklch(70% 0.2 22)`): Reserved for `importanceBand: "critical"`. Renders as a tinted pill at 14% background, 35% border, full color text. Never used for decoration, never used to draw the eye to non-critical information.
- **Watch Amber** (`oklch(80% 0.15 68)`): `importanceBand: "high"`. Same tinted-pill treatment. Read together with Critical Ember as the "act before the next deploy" axis.
- **Steady Cobalt** (`oklch(72% 0.13 230)`): `importanceBand: "medium"`. Shares hue with the primary splash deliberately — they are the same axis at different luminance. The splash says "act"; Steady Cobalt says "note."
- **Quiet Ink** (`oklch(66% 0.008 260)`): `importanceBand: "low"`. A near-neutral that reads as "stand-down." No tint, no border accent — just the muted-foreground color over the canvas background.
- **Live Pulse Green** (`oklch(74% 0.14 158)`): The only place green appears. Reserved for the `vw-live-dot` indicator that shows the feed is actively refreshing. Never used elsewhere.

### Neutral

- **Cool Charcoal** (`oklch(13% 0.008 260)`): Canvas background in dark mode. Tinted toward blue at hue 260 with chroma 0.008 — never `#000`, never neutral gray. The slight cool cast keeps long sessions easier on the eye.
- **Premium Ink** (`oklch(97% 0.003 260)`): Foreground text in dark mode, canvas in light mode. The same cool hue family as Charcoal, mirrored across the lightness axis.
- **Surface Card** (`oklch(16% 0.009 260)`): Panel and card backgrounds in dark mode — one step up from the canvas so cards feel layered without shadows.
- **Surface Raised** (`oklch(20% 0.011 260)`): Hover state on `vw-panel`. The card lifts visually by lightening, not by casting a shadow.
- **Border** (`oklch(24% 0.012 260)`): Default panel and input border.
- **Border Strong** (`oklch(32% 0.014 260)`): Hover-state border on panels, used as a quiet affordance for interactivity.
- **Muted Foreground** (`oklch(66% 0.012 260)`): Body copy on panels, secondary information, kickers when not emphasized.

### Named Rules

**The One Splash Rule.** The cobalt splash appears on under 10% of any given surface. Focus rings, link hover, the primary CTA glow, the freshness pulse — and almost nowhere else. Its rarity is the point. If you find yourself reaching for splash to "make a section pop," reach for type weight or hierarchy instead.

**The Severity Sobriety Rule.** Severity colors appear only when reporting `importanceBand`. Never decorative. Never as a section accent. Never as a chart palette. A red dot in this system means *something is critical*. If everyone uses red, no one acts on red.

**The No Pure Black Rule.** `#000` and `#fff` are forbidden. Every neutral is tinted toward hue 260 (chroma 0.005–0.014). Pure black on a dark surface looks dead; pure white on a light surface burns. The cool tint is the trust signal.

## 3. Typography

**Display Font:** Geist (with `ui-sans-serif`, `system-ui`, `sans-serif` fallback)
**Body Font:** Geist (same family — single sans for both)
**Label/Mono Font:** Geist Mono (with `ui-monospace`, `monospace` fallback)

**Character:** A single sans pairing with its mono sibling. Geist is geometric but warm enough to carry editorial body copy; Geist Mono carries the terminal voice in kickers, severity pills, tags, signal scores. The contrast between sans and mono is how this system communicates "editorial wire service over a working terminal" without ever saying it out loud. Body copy uses OpenType features `cv11` and `ss01` for tighter sans alternates.

### Hierarchy

- **Display** (weight 600, `clamp(2.5rem, 7vw, 5rem)`, line-height 1.05, letter-spacing `-0.02em`): Hero headline only. Appears on the homepage hero, `/about` hero, and the canonical event title on `/events/[slug]`. Tight tracking gives it editorial gravity at scale.
- **Headline** (weight 600, `clamp(1.75rem, 3.5vw, 2.75rem)`, line-height 1.1, letter-spacing `-0.02em`): Section-leading H2. Used for `Latest updates`, `How it works`, `Vendor coverage`, `/about` section heads, and the search results header.
- **Title** (weight 600, `1.5rem` rising to `1.75rem`, line-height 1.15, letter-spacing `-0.01em`): Card-level title — event records, vendor headers, panel titles.
- **Body** (weight 400, `0.9375rem` rising to `1rem`, line-height 1.65, max width 65–75ch): Default reading copy. Uses muted-foreground color so titles and metadata maintain dominance. The 65–75ch line cap is enforced via `vw-narrow` (58rem) and `vw-shell` (80rem) shell containers.
- **Label** (weight 500, `0.75rem`, mono, letter-spacing `0.14em`, uppercase): Kickers (`vw-kicker`), section overlines, dl-term elements, severity pill text. The wide tracking and mono family make these read as terminal labels rather than display type.
- **Tag** (weight 400, `0.75rem`, mono, lowercase, no tracking): Categories, audience labels, affected stack. The mono lowercase is deliberate — these are "code-shaped" tokens, not titles.

### Named Rules

**The Mono-as-Voice Rule.** Geist Mono is reserved for things that *are* labels, codes, or monospace data: kickers, severity pills, tags, signal scores, source-type chips. It is never used as a display face for hero copy, never as a stylistic flourish on body text. Mono is voice, not decoration.

**The Tight-Display Rule.** Display and headline always carry letter-spacing `-0.02em`. The tight tracking is what gives the editorial typography its confident, slightly cinematic register. Loose tracking on display type reads as marketing.

## 4. Elevation

The system is **flat by default**. Cards do not cast shadows. Panels do not float. Depth is conveyed almost entirely through tonal layering — the canvas is `oklch(13%)`, cards are `oklch(16%)`, raised hover state is `oklch(20%)`. Each step is a 3-percentage-point luminance increment in the same hue family. The eye reads the layering as elevation without any of the visual cost of a shadow.

There is exactly one signature shadow treatment, and it earns its place: the **splash glow** on the primary CTA in dark mode. It is the only place in the system where a colored shadow appears, and the color is the sole chromatic accent. The glow is what makes the primary CTA feel inevitable to click.

The light-mode primary CTA carries a much quieter shadow — a 1px ambient lift plus an inset highlight — because the light canvas does not sustain a colored glow.

### Shadow Vocabulary

- **Splash Glow** (`box-shadow: 0 18px 44px -26px color-mix(in oklch, var(--splash) 70%, transparent), 0 2px 10px -4px color-mix(in oklch, black 70%, transparent), inset 0 0 0 1px color-mix(in oklch, black 18%, transparent)`): Dark-mode primary CTA. Layered: a long-throw colored halo, a short ambient depth shadow, and an inset 1px highlight. Never used elsewhere.
- **Ambient Lift** (`box-shadow: 0 1px 2px color-mix(in oklch, black 12%, transparent), inset 0 0 0 1px color-mix(in oklch, white 12%, transparent)`): Light-mode primary CTA, light-mode secondary buttons. Quiet, structural, not decorative.
- **Live Pulse** (animation rather than shadow): The freshness chip's live dot uses a 1px outlined halo that scales from 0.6× to 1.3× over 2.2s with `cubic-bezier(0.16, 1, 0.3, 1)` easing. This is the one place in the system where motion communicates state.

### Named Rules

**The Flat-Until-Earned Rule.** Surfaces are flat. Shadows appear only when they communicate something — the primary CTA's "click me" energy, the live dot's "the feed is breathing" pulse. Decorative shadow on a card, a stat strip, or a hero image is forbidden.

**The Tonal-Layering-First Rule.** When a panel needs to read as "raised," lighten it by 3% luminance. Do not add a shadow. The eye learns the system in one card and reads it everywhere.

## 5. Components

### Buttons

- **Shape:** `0.5rem` (`{rounded.md}`) corners. Slightly soft; never pill-shaped except for severity tokens.
- **Primary (`vw-button-primary` / `vw-hero-primary-cta`):** Near-black canvas (`#080b12` in dark, `#0a0d14` in light), white text, layered splash-glow shadow in dark mode. Padding `0.75rem 1.125rem` at large size. The signature button — used for the homepage hero CTA, the "Open the feed" affordance, and any single-primary-action surface.
- **Secondary (`vw-button-secondary`):** 1px `border`, canvas background, foreground text. Padding `0.5rem 0.875rem`. Used for "Browse vendors," "How we rank it," vendor-page "Open in search," any second-tier action.
- **Ghost (`vw-button-ghost`):** Transparent background, muted-foreground text, transparent border. Hovers to `muted` background and full foreground text. Used for tertiary actions, source links inside event cards, and "How it works"–type tertiary CTAs.
- **Hover / Focus:** All buttons transition `background-color`, `border-color`, and `color` over 150ms with `cubic-bezier(0.16, 1, 0.3, 1)` ease-out. Focus-visible draws a 2px outline at `var(--ring)` with 2px offset.

### Severity Pills

The single most distinctive component in the system.

- **Shape:** Fully rounded (`999px` pill).
- **Style:** Tinted background (14% color-mix), 1px tinted border (35% color-mix), full-color text in mono (`0.6875rem`, weight 500, letter-spacing `0.04em`, uppercase). A 6px circular dot precedes the label, rendered in `currentColor`.
- **Variants:** `critical` (Critical Ember), `high` (Watch Amber), `medium` (Steady Cobalt), `low` (no tint, muted-foreground over canvas).
- **Rule:** Severity pills are the only place in the system that uses semantic color encoding. Treating them as a decorative pattern elsewhere breaks the contract.

### Tags

- **Shape:** `0.25rem` (`{rounded.sm}`) corners — sharper than buttons, signaling "data" rather than "action."
- **Style:** 1px `border`, canvas background, `muted-foreground` text. Mono lowercase at `0.75rem`. Padding `0.25rem 0.5rem`. The `vw-tag-mono` modifier strips uppercase and tightens letter-spacing to 0.
- **Use:** Categories, audience labels, affected stack. Never decorative.

### Cards / Panels

The system has three panel variants for three uses.

- **`vw-panel`** (the default): 1px `border`, `card` background, `0.625rem` (`{rounded.lg}`) radius. Internal padding scales with context — `1.5rem` to `1.75rem` on event cards, `1.25rem` to `1.5rem` on side rails. Hover lifts the border to `border-strong` and the background to `surface-raised` over 300ms.
- **`vw-panel-raised`:** Same border and radius, but `surface-raised` background by default. For panels that need to read as already-elevated against a `vw-panel`-shaped sibling.
- **`vw-panel-flat`:** `0.5rem` (`{rounded.md}`) radius — slightly tighter — for sub-panels inside a `vw-panel`. Avoids nested-card visual noise.
- **No nested `vw-panel` inside `vw-panel`.** Use `vw-panel-flat` for the inner element.

### Inputs

- **Style:** 1px `input` border, `background` canvas, `0.5rem` radius. Padding `0.625rem 0.875rem` at default, `0.875rem 1rem` at `vw-input-lg`.
- **Focus:** Border shifts to `ring`; a 3px halo at 22% `ring` color appears as `box-shadow`. 120ms transition. No layout shift.
- **Placeholder:** `muted-foreground` color.

### Navigation

- **Style:** `vw-nav-link` is a small inline-flex element with `0.375rem 0.625rem` padding, `{rounded.sm}` radius, `muted-foreground` color at rest. Hovers to `foreground`. Active state (`vw-nav-link-active`) sets `secondary` background and `foreground` text.
- **Placement:** Header carries primary nav (Latest, Vendors, API, Search) plus a single "Search feed" CTA button. Mobile collapses to a sheet.

### Vendor Mark (signature component)

- **Shape:** Square `1:1` aspect, `0.5rem` radius, 1px `border`, `card` background.
- **Mark rendering:** Logos are rendered through CSS mask-image with `mask-mode: alpha`. The mark inherits `currentColor`, so by default every vendor renders monochrome in the foreground hue. Sizes: `sm` (1.75rem), `md` (2.5rem), `lg` (3.5rem), `xl` (5rem).
- **Fallback:** Vendors without a registered logo render a 2-letter monogram in mono, muted-foreground.

### Freshness Chip (signature component)

- **Shape:** Pill (`999px`), 1px `border`, `card` background mixed with 28% transparency, 8px backdrop-blur. Padding `0.375rem 0.75rem`.
- **Live dot:** Fixed 0.5rem circle in Live Pulse Green. A 1px outlined halo at 45% green animates from `scale(0.6)` to `scale(1.3)` over 2.2s — the one ambient motion in the system.
- **Use:** Single instance on the homepage hero. Never repeat. The freshness chip is the proof that the headline is alive; its scarcity preserves trust.

## 6. Do's and Don'ts

### Do

- **Do** use the cobalt splash (`oklch(66% 0.14 230)`) only for focus rings, primary CTA glow, link hover, and the freshness pulse. If you can replace splash with type weight or hierarchy, replace it.
- **Do** tint every neutral toward hue 260 with chroma 0.005–0.014. The cool cast is the trust signal.
- **Do** use Geist Mono for kickers, severity pills, tags, signal scores. Never as display type.
- **Do** apply letter-spacing `-0.02em` to display and headline. Tight tracking carries the editorial register.
- **Do** convey elevation through tonal layering — `oklch(13%)` canvas → `oklch(16%)` card → `oklch(20%)` raised. 3% luminance steps in the same hue.
- **Do** keep body copy at 65–75ch via `vw-narrow` (58rem) or `vw-shell` (80rem) containers.
- **Do** vary spacing for rhythm. `1.25rem`, `1.5rem`, `1.75rem`, `2rem` — not `1.5rem` everywhere.
- **Do** keep severity color encoding semantic. A red pill means `critical`. Period.

### Don't

- **Don't** use `#000` or `#fff`. Both are forbidden. Use the OKLCH neutrals.
- **Don't** add gradient text. `background-clip: text` over a gradient is banned. Use a single color and weight contrast.
- **Don't** use `border-left` greater than 1px as a colored stripe on cards, list items, callouts, or alerts. Severity is encoded in pills, not in side stripes.
- **Don't** add glassmorphism or backdrop-blur as decoration. The freshness chip's blur is the only authorized instance and it serves a specific purpose.
- **Don't** ship the SaaS hero-metric template — big number, small label, supporting stats, gradient accent. The stats strip uses tabular-nums and tiny mono labels for a reason.
- **Don't** ship identical card grids — same-sized cards with icon + heading + text repeated endlessly. Use list rows for utility surfaces.
- **Don't** nest `vw-panel` inside `vw-panel`. Use `vw-panel-flat` for the inner element.
- **Don't** make this look like a generic SaaS dashboard, press site, blog, or analytics template — the four anti-references named in PRODUCT.md.
- **Don't** use decorative cards or repeated stat blocks (PRODUCT.md anti-reference). Cards are structural; stats are restrained.
- **Don't** introduce a second chromatic accent. The splash is the only one. If a section feels like it needs another color, it needs more hierarchy instead.
- **Don't** animate CSS layout properties. The system uses `cubic-bezier(0.16, 1, 0.3, 1)` ease-out on color, border, and shadow only. No bounce, no elastic.
- **Don't** use modals as a first thought. Exhaust inline and progressive alternatives first.
- **Don't** use em dashes in copy. Commas, colons, semicolons, periods, parentheses. Also not `--`.
