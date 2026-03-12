<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Migration;

use WPEngineCloud\EngineCore\Audit\AuditLogger;
use WPEngineCloud\EngineCore\Pattern\PatternSnapshotStore;

final class MigrationRunner
{
    public function __construct(
        private readonly PatternSnapshotStore $snapshots,
        private readonly AuditLogger $audit,
        private readonly MigrationRegistry $registry,
        private readonly MigrationValidator $validator,
        private readonly string $targetVersion = '1.1.0'
    ) {
    }

    /** @param array<int,int> $postIds */
    public function dryRun(array $postIds): array
    {
        $plans = [];
        $issues = [];

        foreach ($postIds as $postId) {
            $currentVersion = (string) get_post_meta((int) $postId, 'engine_schema_version', true);
            $currentVersion = $currentVersion !== '' ? $currentVersion : '1.0.0';

            $plan = $this->registry->plan((int) $postId, $currentVersion, $this->targetVersion);
            $plans[] = [
                'post_id' => (int) $postId,
                'from' => $plan->startVersion,
                'to' => $plan->targetVersion,
                'steps' => array_map(static fn (MigrationStepInterface $s): string => $s->id(), $plan->steps),
                'noop' => $plan->isNoop(),
            ];

            if ($plan->isNoop() && version_compare($currentVersion, $this->targetVersion, '<')) {
                $issues[] = sprintf('No migration path for post %d from %s to %s', (int) $postId, $currentVersion, $this->targetVersion);
            }
        }

        $result = [
            'target_version' => $this->targetVersion,
            'checked_posts' => count($postIds),
            'plans' => $plans,
            'issues' => $issues,
        ];

        $this->audit->log('migration.dry_run', 'page_sections', $result);
        return $result;
    }

    /** @param array<int,int> $postIds */
    public function apply(array $postIds): array
    {
        $entries = [];
        $updated = [];
        $issues = [];

        foreach ($postIds as $postId) {
            $rows = get_post_meta((int) $postId, 'page_sections', true);
            $rows = is_array($rows) ? $rows : [];
            $currentVersion = (string) get_post_meta((int) $postId, 'engine_schema_version', true);
            $currentVersion = $currentVersion !== '' ? $currentVersion : '1.0.0';

            $entries[] = [
                'post_id' => (int) $postId,
                'instance' => [
                    'rows' => $rows,
                    'engine_schema_version' => $currentVersion,
                ],
            ];

            $plan = $this->registry->plan((int) $postId, $currentVersion, $this->targetVersion);
            if ($plan->isNoop()) {
                if (version_compare($currentVersion, $this->targetVersion, '<')) {
                    $issues[] = sprintf('Skipping post %d - no migration path from %s', (int) $postId, $currentVersion);
                }
                continue;
            }

            $transformed = $rows;
            foreach ($plan->steps as $step) {
                $transformed = $step->transform($transformed);
            }

            $validationIssues = $this->validator->validateRows($transformed);
            if ($validationIssues !== []) {
                $issues[] = sprintf('Post %d failed post-validate: %s', (int) $postId, implode('; ', $validationIssues));
                continue;
            }

            update_post_meta((int) $postId, 'page_sections', $transformed);
            update_post_meta((int) $postId, 'engine_schema_version', $this->targetVersion);
            $updated[] = (int) $postId;
        }

        $snapshotId = $this->snapshots->create($entries);
        $result = [
            'snapshot_id' => $snapshotId,
            'target_version' => $this->targetVersion,
            'updated_posts' => $updated,
            'issues' => $issues,
        ];

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
            $schemaVersion = (string) ($entry['instance']['engine_schema_version'] ?? '1.0.0');

            update_post_meta($postId, 'page_sections', is_array($rows) ? $rows : []);
            update_post_meta($postId, 'engine_schema_version', $schemaVersion);
            $restored[] = $postId;
        }

        $this->snapshots->delete($snapshotId);
        $result = ['snapshot_id' => $snapshotId, 'status' => 'restored', 'restored_posts' => $restored];
        $this->audit->log('migration.rollback', 'page_sections', $result);
        return $result;
    }
}
