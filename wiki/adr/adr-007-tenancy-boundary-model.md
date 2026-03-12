# ADR-007: Tenancy boundary model

## Status
Accepted

## Decision
Adopt tenant-aware IDs and isolated registries for multisite/multi-tenant operation. Tenant context resolves by blog/site ID and namespaces modules/variants/patterns accordingly.

## Consequences
- Prevents cross-tenant bleed of templates and governance state.
- Enables per-tenant migrations and rollback controls.
