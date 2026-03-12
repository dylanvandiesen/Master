# ADR-005: Governance and capability model

## Status
Accepted

## Decision
Separate content composition from architecture governance:
- Editors compose only approved modules/patterns
- Designers manage variants/patterns within policy boundaries
- Architects/Admins manage lifecycle states, migrations, and deprecations

## Consequences
- Cleaner editor UI and reduced accidental misuse.
- Server-side capability checks become central to mutating operations.
