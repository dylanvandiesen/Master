# WP Engine Cloud — Phase F Performance/Security/A11y Hardening

## Performance
- Added selective module asset enqueue via `Performance\AssetManager` based on resolved row layouts.
- Added performance budget configuration (`config/budgets/performance-budgets.json`) and CI budget checker (`bin/check-perf-budgets.php`).

## Security
- Added centralized `Security\RequestGuard` with allowlisted action checks.
- Preview and pattern mutation endpoints now validate allowlisted action IDs in addition to nonce and capability checks.

## Accessibility
- Added `Accessibility\TemplateAccessibilityAudit` and CI audit script (`bin/check-a11y.php`) to fail on basic template anti-patterns.

## Observability
- Added `Observability\Metrics` to record render totals and source distribution into options storage.

## CI gates
- Added `.github/workflows/wp-engine-cloud-ci.yml` with quality gates for:
  - PHP lint
  - JSON parse checks
  - a11y audit
  - performance budget check
  - pattern diff test
