# ADR-001: Single global renderer architecture

## Status
Accepted

## Decision
Adopt a single renderer service in plugin scope (`RenderService`) and delegate all theme templates (`index`, `singular`, `archive`, `search`, `404`) to this service through a shared context object.

## Consequences
- Guarantees one render path for frontend and future preview endpoints.
- Keeps theme files minimal and code-editable.
- Provides deterministic extension hooks for conditions, variant selection, and fallback logic.
