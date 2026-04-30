# Motion And Interaction

## Motion Role

Motion in Version Watch should create hierarchy and clarity. It should not make the utility surfaces feel theatrical or slow.

## Implementation Inputs

Motion work should start from the design principles in this document and include a clear verification step for desktop and mobile behavior.

GSAP is allowed where it materially improves the homepage experience. It is not the default for dense utility pages.

## Allowed Motion In V1

### Homepage hero

Allowed:

- restrained entrance choreography
- subtle depth or image reveal
- strong CTA affordance

Not allowed:

- chaotic particle effects
- long delayed animations that block scanning

### Homepage explainer section

Allowed:

- pinned section title with scrolling content
- scrubbing reveal for the normalization workflow
- image scale/fade treatment if used to compare raw and normalized source material

### Cards and links

Allowed:

- hover scale
- contrast shift
- smooth transform on interactive panels

### Vendor strip or marquee

Allowed:

- subtle marquee or motion on homepage only
- must remain legible and not become decorative noise

## Motion Restrictions

### Vendor pages

Use only:

- small hover transitions
- filter interactions
- subtle reveal transitions

Do not use:

- pinned storytelling sections
- heavy parallax
- long scrubbing sequences

### Event pages

Use only:

- fast content reveals
- hover states on links and related events

Do not use:

- scroll hijacking
- stacked cards
- ornamental motion near source links or core event text

### Review and ops pages

Use only:

- practical state transitions
- hover affordances
- inline feedback states

Do not use GSAP storytelling in admin surfaces.

## Performance Rules

- motion must not introduce horizontal scroll
- all off-screen motion must be clipped safely
- mobile motion must degrade cleanly
- respect reduced-motion preferences

## Interaction Rules

- filters must feel instant
- interactive cards should provide clear physical feedback
- source links must always feel primary and trustworthy
- buttons must have strong contrast in all states

## Motion Success Test

The homepage should feel more polished than a static dashboard, but a user must still be able to scan the important feed immediately without waiting for animation to finish.
