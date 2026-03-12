# ADR-006: Localization model

## Status
Accepted

## Decision
Localize labels/help text/default content through WordPress i18n functions and locale-aware pattern metadata. Rendering falls back to site default locale when locale-specific values are absent.

## Consequences
- Consistent multilingual behavior in editor and frontend.
- Locale fallback is explicit and testable.
