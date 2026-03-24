# WP Engine Cloud — Phase H Testing, CI/CD, Go-Live

## Test matrix
- Unit-ish: `pattern-diff-test.php`, `migration-runner-test.php`, `migration-config-loader-test.php`, `migration-chain-test.php`
- Static/contract smoke: PHP lint + JSON parse + template a11y + performance budgets + registry/contract compatibility checks.

## CI failure gates
- Schema/JSON parse errors
- Contract/test failures
- a11y/perf budget failures
- migration validation failures

## Base theme readiness
- Theme now includes:
  - `theme.json` settings/tokens
  - navigation-ready header/footer
  - module templates (`hero`, `cta`, `feature-grid`)
  - block patterns (`hero-with-cta`, `feature-grid`)
  - runtime progressive enhancement JS
  - base CSS system with accessibility skip link styling

## Go-live checklist
- Validate deploy to dev/stage/prod order.
- Run migration dry-run and rollback smoke in stage.
- Confirm governance roles and approval workflow.
- Confirm monitoring and DR runbook linked in ops handbook.
- Verify block patterns and module templates render in both editor preview and frontend.

## Release/rollback
- Use semantic release tagging.
- Rollback plan: restore DB snapshot + re-deploy previous release artifact + run smoke checks.


## Local startup runbook
- Use `projects/wp-engine-cloud/dev/docker-compose.yml` with `.env` from `.env.example`.
- Run `bash projects/wp-engine-cloud/scripts/setup-local-wp.sh` to bootstrap DB, WordPress install, plugin activation, and theme activation.
- Access local frontend/admin at the configured `WP_URL`.
