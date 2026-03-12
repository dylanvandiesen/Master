<?php

declare(strict_types=1);

$headline = is_string($data['headline'] ?? null) ? $data['headline'] : '';
$body = is_string($data['body'] ?? null) ? $data['body'] : '';
$ctaLabel = is_string($data['cta_label'] ?? null) ? $data['cta_label'] : '';
$ctaUrl = is_string($data['cta_url'] ?? null) ? $data['cta_url'] : '';
?>
<section class="module-hero module-hero--default">
    <?php if ($headline !== '') : ?><h2><?php echo esc_html($headline); ?></h2><?php endif; ?>
    <?php if ($body !== '') : ?><p><?php echo esc_html($body); ?></p><?php endif; ?>
    <?php if ($ctaLabel !== '' && $ctaUrl !== '') : ?>
        <p><a class="button" href="<?php echo esc_url($ctaUrl); ?>"><?php echo esc_html($ctaLabel); ?></a></p>
    <?php endif; ?>
</section>
