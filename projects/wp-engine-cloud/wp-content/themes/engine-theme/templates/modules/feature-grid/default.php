<?php

declare(strict_types=1);

$title = is_string($data['title'] ?? null) ? $data['title'] : '';
$items = is_array($data['items'] ?? null) ? $data['items'] : [];
?>
<section class="module-feature-grid module-feature-grid--default">
    <?php if ($title !== '') : ?><h2><?php echo esc_html($title); ?></h2><?php endif; ?>
    <?php if ($items !== []) : ?>
        <ul class="module-feature-grid__list">
            <?php foreach ($items as $item) : ?>
                <?php if (! is_array($item)) { continue; } ?>
                <li>
                    <h3><?php echo esc_html((string) ($item['title'] ?? '')); ?></h3>
                    <p><?php echo esc_html((string) ($item['text'] ?? '')); ?></p>
                </li>
            <?php endforeach; ?>
        </ul>
    <?php endif; ?>
</section>
