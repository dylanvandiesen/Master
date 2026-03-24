# WP Engine Cloud — Phase H Testing, CI/CD, Go-Live

## Test matrix
- Unit-ish: `pattern-diff-test.php`, `migration-runner-test.php`
- Static/contract smoke: PHP lint + JSON parse + template a11y + performance budgets.

## CI failure gates
- Schema/JSON parse errors
- Contract/test failures
- a11y/perf budget failures
- migration runner test failure

## Go-live checklist
- Validate deploy to dev/stage/prod order.
- Run migration dry-run and rollback smoke in stage.
- Confirm governance roles and approval workflow.
- Confirm monitoring and DR runbook linked in ops handbook.

## Release/rollback
- Use semantic release tagging.
- Rollback plan: restore DB snapshot + re-deploy previous release artifact + run smoke checks.
