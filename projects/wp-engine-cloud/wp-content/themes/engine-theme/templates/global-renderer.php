<?php

declare(strict_types=1);

/** @var \WPEngineCloud\EngineCore\Render\RenderContext $engineContext */
/** @var array{source: string, payload: array<string,mixed>} $engineResolution */
?>
<main class="engine-global-renderer" data-template-type="<?php echo esc_attr($engineContext->templateType); ?>">
    <article data-resolution-source="<?php echo esc_attr($engineResolution['source'] ?? "unknown"); ?>">
        <header>
            <h1><?php echo esc_html(get_the_title($engineContext->objectId) ?: wp_get_document_title()); ?></h1>
        </header>

        <section>
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
    </article>
</main>
