# Review Operations

## Review Model

V1 uses a solo review queue. No candidate becomes public until it is reviewed manually.

## Review Statuses

Candidate states:

- `pending_review`
- `published`
- `rejected`
- `suppressed`

## Review Actions

- `approve`
- `edit_publish`
- `reject`
- `suppress`

## Definitions

### Approve

Use when:

- source is official
- normalization is accurate
- event is useful to the public feed
- no edits are needed beyond cosmetic cleanup

### Edit and publish

Use when:

- source is valid
- normalized fields need tightening, clarification, or corrected tags

### Reject

Use when:

- parse is wrong
- source item is not a real update
- duplicate slipped through
- event does not meet source quality requirements

### Suppress

Use when:

- source item is real but too low-signal to publish
- docs-only tweak adds little public value
- vendor feed would become noisy without helping users

## Review Checklist

For each candidate, verify:

- title matches the source
- source URL is official
- raw publish date is plausible
- category tags make sense
- summary is accurate and not overstated
- `why it matters` is proportional to the source
- `who should care` is role-specific
- affected stack tags are correct

## Publication Rules

- publishing creates or updates one canonical `changeEvent`
- a raw candidate can map to only one public event
- source links must be present before publication
- GitHub links should be attached if they exist

## Suppression Rules

Suppress items that are:

- pure copy edits
- tiny dashboard-only UI tweaks with no stack impact
- duplicate summaries of the same announced change
- malformed parser output

## Editing Rules

- tighten for clarity, not voice
- preserve vendor terminology if it matters
- remove speculation
- do not add product opinions

## Ops Expectations

Daily operating rhythm:

- check `critical` and `high` first
- clear backlog older than 48 hours
- investigate any source with repeated failures

## Audit Trail

Every review action should create a review log entry containing:

- action type
- timestamp
- optional note
- diff snapshot when content was edited
