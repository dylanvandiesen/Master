# WP Engine Cloud — Phase D Pattern JSON Engine

## Implemented lifecycle
- Reusable pattern persistence is backed by `engine_pattern` CPT and pattern meta (`rows`, `version`, `source_hash`).
- Pattern instances are stored per content item in `_engine_pattern_instance` with:
  - `pattern_id`
  - `pattern_version`
  - `inherit_mode` (`detached` or `inherited`)
  - `last_synced_at`
  - `source_hash`
  - `rows`

## Tooling
- Diff detector (`PatternDiff`) compares source and instance payloads.
- Outdated inherited detector is provided via `PatternSyncService::diffInstance`.
- Batch sync preview (`engine_core_pattern_batch_sync_preview`) returns per-post drift before changes.
- Batch sync apply (`engine_core_pattern_batch_sync_apply`) snapshots original instances and syncs inherited posts.
- Rollback (`engine_core_pattern_batch_sync_rollback`) restores from snapshot.

## Safety model
- Mutating routes require nonces and capabilities (`edit_posts` or `manage_options` depending on operation).
- Bulk sync always creates a rollback snapshot ID before applying updates.
