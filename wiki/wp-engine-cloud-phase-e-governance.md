# WP Engine Cloud — Phase E Governance + Lifecycle

## Dedicated admin UX
- Added a dedicated `Engine Governance` admin area with submenus:
  - Modules
  - Variants
  - Patterns
  - Conditions
  - Migrations
  - Deprecations
  - Audit

## Capability model
- Content compose: `edit_posts`
- Design manage: `edit_theme_options`
- Governance admin: `manage_options`

## Workflow states
- `draft`
- `approved`
- `deprecated`
- `frozen`
- `archived`
- `removed`

Transition graph is explicit and enforced server-side.

## Lifecycle rules
- Deprecated patterns remain renderable but should be blocked from insertion by callers.
- Removal is blocked while references are present.
- Reference scan checks post meta (`_engine_pattern_instance`) and options payloads.

## Content-screen cleanliness
- For non-governance users, advanced meta boxes (`Custom Fields`, slug metabox) are removed to reduce clutter.
