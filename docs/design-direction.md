# Design Direction

## Visual Thesis

Version Watch should look like a premium intelligence terminal for developers, not a generic SaaS dashboard and not an editorial magazine. The site should feel:

- precise
- confident
- spacious
- modern
- slightly cinematic at the homepage level
- restrained and practical on dense utility surfaces

## Mandatory Inputs

Implementation must use:

- `[$gpt-taste](/Users/matthewparris/.agents/skills/gpt-taste/SKILL.md)`
- `[@build-web-apps](plugin://build-web-apps@openai-curated)` frontend guidance

The public design phase must begin with the `gpt-taste` required `<design_plan>` block before writing UI code.

## Product-Level Art Direction

### What the site is

- a source-first developer utility
- a premium but disciplined public dashboard
- a high-trust information interface

### What the site is not

- a card-grid SaaS landing page
- a generic analytics dashboard
- a press site
- a blog homepage

## Global Design Rules

- use wide typography and generous spacing
- avoid cramped text columns
- keep homepage hero text to 2-3 lines on desktop
- prefer strong layout planes over many UI containers
- use very few cards unless they are structurally necessary
- keep color disciplined and high-contrast
- design every section to do one job

## Typography Rules

Allowed primary families:

- Satoshi
- Cabinet Grotesk
- Outfit
- Geist

Do not use Inter.

The homepage H1 must:

- sit in a `max-w-6xl` or equivalent wide container
- remain within 2-3 lines on desktop
- avoid pills, badges, or data clutter below it

## Homepage Direction

The homepage should follow an AIDA structure while still behaving like a utility surface:

### Attention

- premium nav
- wide hero with clear product name and subtitle
- search/filter access visible immediately

### Interest

- gapless bento or structured utility grid showing the product’s four intelligence fields
- featured important changes with deliberate hierarchy

### Desire

- one controlled motion-rich explainer section showing how a raw source becomes a normalized event
- strong visual distinction between raw change noise and curated output

### Action

- clear invitation to browse vendors, search updates, or inspect recent events

## Vendor And Event Page Direction

Vendor pages and event pages should be quieter than the homepage.

Rules:

- less spectacle
- denser information hierarchy
- stronger emphasis on filters, dates, tags, and links
- motion should recede in favor of readability

## Bento And Layout Rules

If bento-style grids are used, they must:

- use `grid-flow-dense`
- be mathematically complete
- avoid dead cells and empty corners
- use only a few intentional panels

## Explicit Design Bans

- no “SECTION 01” or similar labels
- no six-line hero headlines
- no generic top-of-page stat cards
- no invisible button text
- no random floating dashboards in the hero
- no weak, repetitive card mosaics
- no purple-on-white default SaaS aesthetic

## Design Success Test

A successful Version Watch homepage should feel like:

- a highly polished tool
- visually distinctive enough to be memorable
- still faster to scan than most product homepages

The first screen should make it immediately clear that the product helps developers monitor important platform changes.
