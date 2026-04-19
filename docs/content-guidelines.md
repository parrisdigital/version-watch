# Content Guidelines

## Purpose

Version Watch converts official source material into concise, utility-first public records. The writing must help a developer decide whether to care, not entertain them.

## Tone

- direct
- technical
- source-linked
- compressed
- non-hyped
- non-editorial

Do not write like:

- a blog post
- a newsletter essay
- a marketing site
- an industry pundit

## Public Fields

Each published event contains four normalized text fields.

### `summary`

One sentence. State the update plainly.

Good:

- `Vercel added build cache controls for preview deployments.`
- `Stripe updated subscription schedule behavior for phased changes.`

Bad:

- `A major new chapter just landed for teams building on Vercel.`

### `whatChanged`

Two to four sentences. Explain the concrete change in product terms.

Rules:

- start with the shipped change
- mention old vs new behavior if relevant
- include scope if limited to a product tier or SDK
- avoid speculation

### `whyItMatters`

One to three sentences. Explain practical developer impact.

Rules:

- mention migration risk, tooling implications, workflow changes, or policy impact
- do not invent urgency
- if impact is minimal, say so plainly

### `whoShouldCare`

Short list or sentence.

Rules:

- map to actual engineering roles
- do not write generic phrases like `everyone building software`

### `affectedStack`

Short list of stack domains using the approved taxonomy.

## Style Rules

- prefer short sentences
- use product nouns correctly
- mention dates only when they matter
- preserve vendor terminology when it affects precision
- keep paragraphs tight

## Source Rules

- every published event must link to at least one official source
- every available GitHub release or repo link should be attached separately
- public copy must never imply private knowledge beyond the source

## Editing Rules

- if the official source is ambiguous, summarize conservatively
- if the source is noisy and low-impact, suppress it instead of stretching for meaning
- if a docs update has no practical effect, mark it clearly as docs-level

## Explicit Bans

- no clickbait phrasing
- no “game changer”
- no “huge update” unless the source itself makes that scope obvious
- no fake certainty about migrations or breakage
- no generic LLM filler
- no emoji

## Example Shape

**What changed:**  
`Cursor 3.1 added tiled agent layouts and upgraded voice input inside the Agents Window.`

**Why it matters:**  
`Teams using Cursor for multi-agent workflows can manage several active agent sessions without tab switching. This is a workflow improvement, not a migration event.`

**Who should care:**  
`AI tooling teams, application engineers using Cursor daily, and developer productivity leads.`

**Affected stack:**  
`agents`, `developer-workflow`, `llms`
