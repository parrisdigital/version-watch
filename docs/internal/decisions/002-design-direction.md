# Decision 002: Design Direction

## Decision

Version Watch is a **utility dashboard with premium art direction**.

It is not:

- a card-grid SaaS template
- a newsroom or magazine site
- a feature-marketing homepage with generic stats and badges

## Implementation Inputs

Public design work should begin with a short design plan before UI code changes. The plan should cover hierarchy, responsive behavior, interaction model, and verification steps.

## Why

The product needs trust and clarity first, but it also needs a distinct visual identity. A generic dashboard aesthetic would weaken the product immediately.

## Locked Rules

- homepage can be cinematic and premium
- vendor/event/admin pages must stay practical
- hero headline must remain 2-3 lines on desktop
- no label spam
- no weak dashboard mosaics
- no cheap hero cards
- no default Inter-based SaaS look

## Motion Decision

- motion is allowed on the homepage and supporting brand-level sections
- dense utility pages use restrained transitions rather than heavy GSAP storytelling

## Consequences

- implementation must explicitly document and verify visual hierarchy before coding
- the homepage should feel memorable, but it must still scan quickly
