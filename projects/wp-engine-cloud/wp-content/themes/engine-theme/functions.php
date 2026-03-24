<?php

declare(strict_types=1);

if (! defined('ABSPATH')) {
    exit;
}

require_once __DIR__ . '/inc/template-tags.php';

add_action('after_setup_theme', static function (): void {
    load_theme_textdomain('engine-theme', __DIR__ . '/languages');
    register_nav_menus([
        'primary' => __('Primary Navigation', 'engine-theme'),
        'footer' => __('Footer Navigation', 'engine-theme'),
    ]);
});

add_action('wp_enqueue_scripts', static function (): void {
    wp_enqueue_style('engine-theme-style', get_stylesheet_uri(), [], '0.2.0');
    $baseCss = get_template_directory() . '/assets/css/base.css';
    if (is_file($baseCss)) {
        wp_enqueue_style('engine-theme-base', get_template_directory_uri() . '/assets/css/base.css', ['engine-theme-style'], (string) filemtime($baseCss));
    }

    $runtimeJs = get_template_directory() . '/assets/js/runtime.js';
    if (is_file($runtimeJs)) {
        wp_enqueue_script('engine-theme-runtime', get_template_directory_uri() . '/assets/js/runtime.js', [], (string) filemtime($runtimeJs), true);
        wp_script_add_data('engine-theme-runtime', 'defer', true);
    }
});

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
