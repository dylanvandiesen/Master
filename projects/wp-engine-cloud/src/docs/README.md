# WP Engine Cloud

Production-oriented WordPress visual creation engine scaffold.

## Local startup (Docker)

1. Prepare env file:
   ```bash
   cp projects/wp-engine-cloud/dev/.env.example projects/wp-engine-cloud/dev/.env
   ```
2. Boot stack + install WP + activate plugin/theme:
   ```bash
   bash projects/wp-engine-cloud/scripts/setup-local-wp.sh
   ```
3. Open site:
   - Frontend: `http://localhost:8088`
   - Admin: `http://localhost:8088/wp-admin`

## Useful commands

```bash
# start/stop stack
cd projects/wp-engine-cloud/dev

docker compose --env-file .env -f docker-compose.yml up -d
docker compose --env-file .env -f docker-compose.yml down

# run migration commands
docker compose --env-file .env -f docker-compose.yml run --rm wpcli engine-core migration:dry-run 1 2 3
docker compose --env-file .env -f docker-compose.yml run --rm wpcli engine-core migration:apply 1 2 3
docker compose --env-file .env -f docker-compose.yml run --rm wpcli engine-core migration:rollback <snapshot_id>
```

## Production-proof checklist

- Keep `DISALLOW_FILE_EDIT` enabled and secrets out of repo.
- Run CI quality gates before release.
- Run migration dry-run in stage before apply.
- Take pre-release DB snapshot and verify rollback command.
- Verify preview/frontend parity on representative templates.
