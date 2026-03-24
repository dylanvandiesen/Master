<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Pattern;

final class PatternRepository
{
    /** @param array<int,array<string,mixed>> $rows */
    public function create(string $title, array $rows): int
    {
        $patternId = wp_insert_post([
            'post_type' => PatternPostType::POST_TYPE,
            'post_title' => $title,
            'post_status' => 'publish',
        ]);

        if (! is_int($patternId) || $patternId <= 0) {
            return 0;
        }

        $version = 1;
        $hash = md5(wp_json_encode($rows) ?: '[]');

        update_post_meta($patternId, '_engine_pattern_rows', $rows);
        update_post_meta($patternId, '_engine_pattern_version', $version);
        update_post_meta($patternId, '_engine_pattern_hash', $hash);

        return $patternId;
    }

    /** @return array<string,mixed> */
    public function get(int $patternId): array
    {
        return [
            'pattern_id' => $patternId,
            'rows' => get_post_meta($patternId, '_engine_pattern_rows', true),
            'version' => (int) get_post_meta($patternId, '_engine_pattern_version', true),
            'source_hash' => (string) get_post_meta($patternId, '_engine_pattern_hash', true),
            'last_synced_at' => (string) get_post_meta($patternId, '_engine_pattern_last_synced_at', true),
        ];
    }

    /** @param array<int,array<string,mixed>> $rows */
    public function updateRows(int $patternId, array $rows): void
    {
        $version = (int) get_post_meta($patternId, '_engine_pattern_version', true);
        $version = $version > 0 ? $version + 1 : 1;

        update_post_meta($patternId, '_engine_pattern_rows', $rows);
        update_post_meta($patternId, '_engine_pattern_version', $version);
        update_post_meta($patternId, '_engine_pattern_hash', md5(wp_json_encode($rows) ?: '[]'));
        update_post_meta($patternId, '_engine_pattern_last_synced_at', gmdate('c'));
    }
}
