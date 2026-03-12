<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Pattern;

final class PatternSyncService
{
    public function __construct(
        private readonly PatternRepository $patterns,
        private readonly PatternDiff $diff,
        private readonly PatternSnapshotStore $snapshots
    ) {
    }

    /** @return array<string,mixed> */
    public function diffInstance(int $postId): array
    {
        $instance = get_post_meta($postId, '_engine_pattern_instance', true);
        if (! is_array($instance) || ! isset($instance['pattern_id'])) {
            return ['changed' => false, 'reason' => 'no_pattern'];
        }

        $pattern = $this->patterns->get((int) $instance['pattern_id']);
        $instanceRows = is_array($instance['rows'] ?? null) ? $instance['rows'] : [];
        $sourceRows = is_array($pattern['rows'] ?? null) ? $pattern['rows'] : [];

        $diff = $this->diff->compare([
            'rows' => $sourceRows,
            'source_hash' => $pattern['source_hash'] ?? '',
            'version' => $pattern['version'] ?? 0,
        ], [
            'rows' => $instanceRows,
            'source_hash' => $instance['source_hash'] ?? '',
            'version' => $instance['pattern_version'] ?? 0,
        ]);

        return [
            'post_id' => $postId,
            'pattern_id' => (int) $instance['pattern_id'],
            'diff' => $diff,
            'outdated' => (bool) ($diff['changed'] ?? false) && (($instance['inherit_mode'] ?? 'detached') === 'inherited'),
        ];
    }

    /** @param array<int,int> $postIds */
    public function batchSyncPreview(array $postIds): array
    {
        $preview = [];
        foreach ($postIds as $postId) {
            $preview[] = $this->diffInstance((int) $postId);
        }

        return $preview;
    }

    /** @param array<int,int> $postIds */
    public function applyInheritedSync(array $postIds): array
    {
        $entries = [];
        $updated = [];

        foreach ($postIds as $postId) {
            $instance = get_post_meta((int) $postId, '_engine_pattern_instance', true);
            if (! is_array($instance) || ($instance['inherit_mode'] ?? '') !== 'inherited') {
                continue;
            }

            $entries[] = ['post_id' => (int) $postId, 'instance' => $instance];
            $pattern = $this->patterns->get((int) $instance['pattern_id']);
            $rows = is_array($pattern['rows'] ?? null) ? $pattern['rows'] : [];

            $instance['rows'] = $rows;
            $instance['pattern_version'] = (int) ($pattern['version'] ?? 1);
            $instance['source_hash'] = (string) ($pattern['source_hash'] ?? '');
            $instance['last_synced_at'] = gmdate('c');

            update_post_meta((int) $postId, '_engine_pattern_instance', $instance);
            update_post_meta((int) $postId, 'page_sections', $rows);
            $updated[] = (int) $postId;
        }

        $snapshotId = $this->snapshots->create($entries);

        return [
            'snapshot_id' => $snapshotId,
            'updated_posts' => $updated,
        ];
    }

    public function rollback(string $snapshotId): array
    {
        $snapshot = $this->snapshots->get($snapshotId);
        if (! is_array($snapshot)) {
            return ['restored_posts' => [], 'snapshot_id' => $snapshotId, 'status' => 'missing'];
        }

        $restored = [];
        foreach (($snapshot['entries'] ?? []) as $entry) {
            if (! is_array($entry) || ! isset($entry['post_id'], $entry['instance'])) {
                continue;
            }

            $postId = (int) $entry['post_id'];
            $instance = is_array($entry['instance']) ? $entry['instance'] : [];
            update_post_meta($postId, '_engine_pattern_instance', $instance);
            update_post_meta($postId, 'page_sections', $instance['rows'] ?? []);
            $restored[] = $postId;
        }

        $this->snapshots->delete($snapshotId);

        return ['restored_posts' => $restored, 'snapshot_id' => $snapshotId, 'status' => 'restored'];
    }
}
