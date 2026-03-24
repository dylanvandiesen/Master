<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

function engine_theme_render(string $templateType): void
{
    if (! class_exists(\WPEngineCloud\EngineCore\Bootstrap::class)) {
        status_header(500);
        echo '<main>Engine Core plugin is required.</main>';
        return;
    }

    $context = new \WPEngineCloud\EngineCore\Render\RenderContext(
        templateType: $templateType,
        objectId: (int) get_queried_object_id(),
        objectType: (string) get_post_type(get_queried_object_id()),
        isPreview: is_preview(),
        locale: determine_locale(),
        capabilities: [
            'edit_posts' => current_user_can('edit_posts'),
            'manage_options' => current_user_can('manage_options'),
        ],
        flags: [
            'is_archive' => is_archive(),
            'is_search' => is_search(),
            'is_404' => is_404(),
        ]
    );

    \WPEngineCloud\EngineCore\Bootstrap::renderService()->render($context);
}
