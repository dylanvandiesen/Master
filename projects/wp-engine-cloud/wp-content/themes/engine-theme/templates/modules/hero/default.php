<?php

declare(strict_types=1);

$headline = is_string($data['headline'] ?? null) ? $data['headline'] : '';
$body = is_string($data['body'] ?? null) ? $data['body'] : '';
?>
<section class="module-hero module-hero--default">
    <?php if ($headline !== '') : ?>
        <h2><?php echo esc_html($headline); ?></h2>
    <?php endif; ?>
    <?php if ($body !== '') : ?>
        <p><?php echo esc_html($body); ?></p>
    <?php endif; ?>
</section>
