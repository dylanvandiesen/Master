<?php

declare(strict_types=1);

/** @var \WPEngineCloud\EngineCore\Render\RenderContext $engineContext */
/** @var array{source: string, payload: array<string,mixed>} $engineResolution */
$rows = is_array($engineResolution['payload']['rows'] ?? null) ? $engineResolution['payload']['rows'] : [];
?>
<main id="engine-content" class="engine-global-renderer" data-template-type="<?php echo esc_attr($engineContext->templateType); ?>">
    <article class="site-shell" data-resolution-source="<?php echo esc_attr($engineResolution['source'] ?? 'unknown'); ?>">
        <header class="engine-page-header">
            <h1><?php echo esc_html(get_the_title($engineContext->objectId) ?: wp_get_document_title()); ?></h1>
        </header>

        <?php if ($rows !== []) : ?>
            <section class="engine-sections" aria-label="<?php esc_attr_e('Page sections', 'engine-theme'); ?>">
                <?php foreach ($rows as $row) : ?>
                    <?php if (is_array($row)) { engine_theme_render_module($row); } ?>
                <?php endforeach; ?>
            </section>
        <?php else : ?>
            <section class="engine-content-fallback">
                <?php
                if (have_posts()) {
                    while (have_posts()) {
                        the_post();
                        the_content();
                    }
                } else {
                    echo '<p>' . esc_html__('No content found.', 'engine-theme') . '</p>';
                }
                ?>
            </section>
        <?php endif; ?>
    </article>
</main>
