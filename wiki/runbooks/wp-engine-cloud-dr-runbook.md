# WP Engine Cloud DR Runbook

## Backup policy
- Database: daily full backups + 15-minute incrementals/binlogs.
- Files: daily snapshots of uploads + plugin/theme content.
- Retention: 30 days online; monthly archive snapshots kept for 12 months.

## Restore drill
- Frequency: monthly.
- Validation:
  1. restore latest backup to isolated staging;
  2. run migration dry-run and rollback smoke;
  3. verify render endpoint + preview endpoint;
  4. verify audit log continuity.

## Targets
- RPO: 15 minutes.
- RTO: 60 minutes.

## Incident workflow
1. Declare incident and assign commander.
2. Freeze mutating governance actions.
3. Restore DB/files from nearest valid recovery point.
4. Execute smoke checks and reopen writes.
