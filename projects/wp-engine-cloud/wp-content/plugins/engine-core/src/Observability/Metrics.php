<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Observability;

final class Metrics
{
    public function register(): void
    {
        add_action('engine_core/after_render', [$this, 'recordRender'], 10, 2);
    }

    /** @param array<string,mixed> $resolution */
    public function recordRender(mixed $context, array $resolution): void
    {
        $bucket = get_option('engine_core_metrics', []);
        if (! is_array($bucket)) {
            $bucket = [];
        }

        $bucket['render_total'] = (int) ($bucket['render_total'] ?? 0) + 1;
        $bucket['render_by_source'] = is_array($bucket['render_by_source'] ?? null) ? $bucket['render_by_source'] : [];
        $source = (string) ($resolution['source'] ?? 'unknown');
        $bucket['render_by_source'][$source] = (int) ($bucket['render_by_source'][$source] ?? 0) + 1;

        update_option('engine_core_metrics', $bucket, false);
    }
}
