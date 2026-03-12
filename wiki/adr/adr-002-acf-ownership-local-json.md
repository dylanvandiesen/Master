# ADR-002: ACF ownership and Local JSON strategy

## Status
Accepted

## Decision
Treat ACF schema as application code owned by `engine-core`. Enable Local JSON under `wp-content/plugins/engine-core/acf-json/` and include schema version metadata in field group definitions.

## Consequences
- Field changes become reviewable and deployable.
- Drift between environments is reduced.
- Migration runner can use schema versions for deterministic transforms.
