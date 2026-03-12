<?php

declare(strict_types=1);
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip-link screen-reader-text" href="#engine-content"><?php esc_html_e('Skip to content', 'engine-theme'); ?></a>
<header class="site-header">
    <div class="site-shell site-header__inner">
        <a class="site-brand" href="<?php echo esc_url(home_url('/')); ?>"><?php bloginfo('name'); ?></a>
        <?php engine_theme_primary_nav(); ?>
    </div>
</header>
