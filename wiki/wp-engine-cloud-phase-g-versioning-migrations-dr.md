# WP Engine Cloud — Phase G Versioning, Migrations, Observability, DR

## Versioning model
- Schema and pattern state use semantic versions (`engine_schema_version`, `pattern_version`).
- Migration target version is centrally declared in `config/migrations/schema-map.json`.
- Tenant-aware namespacing is available via `Tenancy\\TenantContext`.

## Full migration layer
- `Migration\\MigrationStepInterface`: explicit per-step contracts (`fromVersion`, `toVersion`, `transform`).
- `Migration\\MigrationRegistry`: deterministic migration planning from current to target version.
- `Migration\\MigrationValidator`: post-transform validation guard.
- `Migration\\MigrationRunner`: dry-run planner, apply with pre-snapshot, post-validate gate, and rollback restore.
- `Migration\\MigrationConfigLoader`: loads migration map and step classes from `config/migrations/schema-map.json`.
- Included migration step: `Steps\\Schema110Migration` (`1.0.0 -> 1.1.0`) with remap support (`heading` -> `headline`).

## Migration commands
- `wp engine-core migration:dry-run <postId...>`
- `wp engine-core migration:apply <postId...>`
- `wp engine-core migration:rollback <snapshotId>`

## Audit lineage
- `Audit\\AuditLogger` records actor/action/entity/result/duration/correlation payload for migration operations.

## Localization
- Added `Localization\\LocaleResolver` for locale-aware fallback behavior.

## Disaster recovery
- Added `DR\\Runbook` policy service for backup cadence, retention, restore drills, RPO/RTO targets.
