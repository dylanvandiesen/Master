# WP Engine Cloud — Phase A Discovery Audit

## Repository integration points
- Root build orchestration is project-based via `projects/<name>/project.config.json`.
- Root scripts and docs indicate source-first project layout with root-managed build and dev server lifecycle.
- Existing projects are static front-end builds; no WordPress runtime currently exists in this repository.

## New project footprint
- Created `projects/wp-engine-cloud/` as the canonical project root.
- Added WordPress plugin/theme scaffold under `wp-content/`.
- Added build-system placeholders under `src/` to keep repository tooling compatible.

## WordPress architecture intent
- Plugin (`engine-core`) holds service-layer orchestration and renderer contracts.
- Theme (`engine-theme`) acts as a thin wrapper and routes all template requests through a single renderer entrypoint.
- Future phases will extend this service pipeline with ACF schema contracts, registry validation, preview parity, and governance controls.
