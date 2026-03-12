# ADR-004: Asset strategy and selective loading

## Status
Accepted

## Decision
Module manifests declare asset handles. Render resolution computes used modules and enqueues only required CSS/JS. Critical CSS is template-scoped; non-critical scripts are deferred.

## Consequences
- Predictable performance budget enforcement.
- No JS framework requirement; vanilla browser APIs remain sufficient.
