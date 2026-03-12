<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Pattern;

final class PatternSnapshotStore
{
    /** @param array<int,array<string,mixed>> $entries */
    public function create(array $entries): string
    {
        $snapshotId = 'snap_' . wp_generate_password(12, false, false);
        update_option('engine_core_pattern_snapshot_' . $snapshotId, [
            'created_at' => gmdate('c'),
            'entries' => $entries,
        ], false);

        return $snapshotId;
    }

    /** @return array<string,mixed>|null */
    public function get(string $snapshotId): ?array
    {
        $snapshot = get_option('engine_core_pattern_snapshot_' . $snapshotId);
        return is_array($snapshot) ? $snapshot : null;
    }

    public function delete(string $snapshotId): void
    {
        delete_option('engine_core_pattern_snapshot_' . $snapshotId);
    }
}
