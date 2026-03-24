<?php

declare(strict_types=1);

if (! function_exists('engine_theme_primary_nav')) {
    function engine_theme_primary_nav(): void
    {
        wp_nav_menu([
            'theme_location' => 'primary',
            'container' => 'nav',
            'container_class' => 'site-nav',
            'menu_class' => 'site-nav__list',
            'fallback_cb' => '__return_empty_string',
        ]);
    }
}

if (! function_exists('engine_theme_render_module')) {
    /** @param array<string,mixed> $row */
    function engine_theme_render_module(array $row): void
    {
        $layout = sanitize_key((string) ($row['acf_fc_layout'] ?? ''));
        if ($layout === '') {
            return;
        }

        $variant = sanitize_key((string) ($row['variant'] ?? 'default'));
        $template = sprintf('templates/modules/%s/%s.php', $layout, $variant);

        $located = locate_template($template, false, false);
        if (! is_string($located) || $located === '') {
            $located = locate_template(sprintf('templates/modules/%s/default.php', $layout), false, false);
        }

        if (is_string($located) && $located !== '') {
            $data = $row;
            include $located;
            return;
        }

        do_action('engine_theme/missing_module_template', $layout, $variant, $row);
    }
}
