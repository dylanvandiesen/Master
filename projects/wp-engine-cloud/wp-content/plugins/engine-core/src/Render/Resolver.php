<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Render;

final class Resolver
{
    /** @return array{source: string, payload: array<string,mixed>} */
    public function resolve(RenderContext $context): array
    {
        $override = apply_filters('engine_core/render_override', null, $context);
        if (is_array($override)) {
            return ['source' => 'override', 'payload' => $override];
        }

        $instance = get_post_meta($context->objectId, '_engine_pattern_instance', true);
        if (is_array($instance) && isset($instance['pattern_id'])) {
            return [
                'source' => 'pattern',
                'payload' => [
                    'pattern_id' => (int) $instance['pattern_id'],
                    'pattern_version' => (int) ($instance['pattern_version'] ?? 1),
                    'inherit_mode' => (string) ($instance['inherit_mode'] ?? 'detached'),
                    'last_synced_at' => (string) ($instance['last_synced_at'] ?? ''),
                    'source_hash' => (string) ($instance['source_hash'] ?? ''),
                    'rows' => is_array($instance['rows'] ?? null) ? $instance['rows'] : [],
                ],
            ];
        }

        $rows = get_post_meta($context->objectId, 'page_sections', true);
        if (is_array($rows) && $rows !== []) {
            return ['source' => 'flex', 'payload' => ['rows' => $rows]];
        }

        return ['source' => 'fallback', 'payload' => ['message' => 'global fallback']];
    }
}
