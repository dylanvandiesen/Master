# WP Engine Cloud — Phase G Versioning, Migrations, Observability, DR

## Versioning model
- Schema and pattern state continue using semantic versions (`engine_schema_version`, `pattern_version`).
- Tenant-aware namespacing is available via `Tenancy\\TenantContext`.

## Migrations
- Added `Migration\\MigrationRunner` with:
  - dry-run
  - apply with pre-snapshot
  - rollback from snapshot
- Added WP-CLI commands:
  - `wp engine-core migration:dry-run <postId...>`
  - `wp engine-core migration:apply <postId...>`
  - `wp engine-core migration:rollback <snapshotId>`

## Audit lineage
- Added immutable-style append logging via `Audit\\AuditLogger` (actor/action/entity/result/duration/correlation id payload shape).

## Localization
- Added `Localization\\LocaleResolver` for locale-aware fallback behavior.

## Disaster recovery
- Added `DR\\Runbook` policy service for backup cadence, retention, restore drills, RPO/RTO targets.
