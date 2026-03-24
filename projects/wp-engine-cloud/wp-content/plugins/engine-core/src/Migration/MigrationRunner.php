<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Migration;

use WPEngineCloud\EngineCore\Audit\AuditLogger;
use WPEngineCloud\EngineCore\Pattern\PatternSnapshotStore;

final class MigrationRunner
{
    public function __construct(
        private readonly PatternSnapshotStore $snapshots,
        private readonly AuditLogger $audit
    ) {
    }

    /** @param array<int,int> $postIds */
    public function dryRun(array $postIds): array
    {
        $result = ['checked_posts' => count($postIds), 'would_update' => 0, 'issues' => []];
        foreach ($postIds as $postId) {
            $rows = get_post_meta((int) $postId, 'page_sections', true);
            if (is_array($rows) && $rows !== []) {
                $result['would_update']++;
            }
        }

        $this->audit->log('migration.dry_run', 'page_sections', $result);
        return $result;
    }

    /** @param array<int,int> $postIds */
    public function apply(array $postIds): array
    {
        $entries = [];
        foreach ($postIds as $postId) {
            $entries[] = [
                'post_id' => (int) $postId,
                'instance' => [
                    'rows' => get_post_meta((int) $postId, 'page_sections', true),
                ],
            ];
        }

        $snapshotId = $this->snapshots->create($entries);

        $updated = [];
        foreach ($postIds as $postId) {
            $rows = get_post_meta((int) $postId, 'page_sections', true);
            if (! is_array($rows)) {
                continue;
            }
            update_post_meta((int) $postId, 'engine_schema_version', '1.1.0');
            $updated[] = (int) $postId;
        }

        $result = ['snapshot_id' => $snapshotId, 'updated_posts' => $updated];
        $this->audit->log('migration.apply', 'page_sections', $result);
        return $result;
    }

    public function rollback(string $snapshotId): array
    {
        $snapshot = $this->snapshots->get($snapshotId);
        if (! is_array($snapshot)) {
            $result = ['snapshot_id' => $snapshotId, 'status' => 'missing'];
            $this->audit->log('migration.rollback', 'page_sections', $result);
            return $result;
        }

        $restored = [];
        foreach (($snapshot['entries'] ?? []) as $entry) {
            if (! is_array($entry) || ! isset($entry['post_id'])) {
                continue;
            }

            $postId = (int) $entry['post_id'];
            $rows = $entry['instance']['rows'] ?? [];
            update_post_meta($postId, 'page_sections', is_array($rows) ? $rows : []);
            $restored[] = $postId;
        }

        $this->snapshots->delete($snapshotId);
        $result = ['snapshot_id' => $snapshotId, 'status' => 'restored', 'restored_posts' => $restored];
        $this->audit->log('migration.rollback', 'page_sections', $result);
        return $result;
    }
}
