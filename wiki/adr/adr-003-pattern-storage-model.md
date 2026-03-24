# ADR-003: Pattern storage model (hybrid)

## Status
Accepted

## Decision
Use a hybrid model:
1. Canonical pattern registry in versioned JSON files (code + CI validation)
2. Runtime instances and editor-authored revisions in a dedicated CPT
3. Cached compiled snapshots for fast render resolution

## Consequences
- Supports governance and approvals while retaining editorial workflow.
- Enables rollback by versioned file + CPT snapshot recovery.
