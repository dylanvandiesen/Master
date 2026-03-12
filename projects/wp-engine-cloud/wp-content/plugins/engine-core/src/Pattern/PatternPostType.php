<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Pattern;

final class PatternPostType
{
    public const POST_TYPE = 'engine_pattern';

    public function register(): void
    {
        register_post_type(self::POST_TYPE, [
            'label' => __('Patterns', 'engine-theme'),
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'supports' => ['title', 'revisions'],
            'capability_type' => ['engine_pattern', 'engine_patterns'],
            'map_meta_cap' => true,
        ]);
    }
}
