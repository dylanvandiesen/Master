<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Performance;

use WPEngineCloud\EngineCore\Render\RenderContext;
use WPEngineCloud\EngineCore\Render\Resolver;

final class AssetManager
{
    public function __construct(private readonly Resolver $resolver)
    {
    }

    public function register(): void
    {
        add_action('wp_enqueue_scripts', [$this, 'enqueue']);
    }

    public function enqueue(): void
    {
        $context = new RenderContext(
            templateType: is_singular() ? 'singular' : (is_archive() ? 'archive' : (is_search() ? 'search' : (is_404() ? '404' : 'index'))),
            objectId: (int) get_queried_object_id(),
            objectType: (string) get_post_type(get_queried_object_id()),
            isPreview: is_preview(),
            locale: determine_locale(),
            capabilities: [],
            flags: []
        );

        $resolution = $this->resolver->resolve($context);
        $moduleHandles = $this->extractAssetHandles($resolution);

        foreach ($moduleHandles as $handle) {
            wp_enqueue_style($handle);
        }

        if ($moduleHandles !== []) {
            wp_enqueue_script('engine-core-runtime', plugins_url('../../../themes/engine-theme/assets/js/runtime.js', __FILE__), [], '0.1.0', true);
            wp_script_add_data('engine-core-runtime', 'defer', true);
        }
    }

    /** @param array<string,mixed> $resolution @return array<int,string> */
    private function extractAssetHandles(array $resolution): array
    {
        $payload = $resolution['payload'] ?? [];
        $rows = is_array($payload['rows'] ?? null) ? $payload['rows'] : [];

        $handles = [];
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $layout = sanitize_key((string) ($row['acf_fc_layout'] ?? ''));
            if ($layout === '') {
                continue;
            }
            $handles[] = 'engine-module-' . $layout;
        }

        return array_values(array_unique($handles));
    }
}
