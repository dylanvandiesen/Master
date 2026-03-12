<?php

declare(strict_types=1);

$title = is_string($data['title'] ?? null) ? $data['title'] : '';
$text = is_string($data['text'] ?? null) ? $data['text'] : '';
$buttonLabel = is_string($data['button_label'] ?? null) ? $data['button_label'] : '';
$buttonUrl = is_string($data['button_url'] ?? null) ? $data['button_url'] : '';
?>
<section class="module-cta module-cta--default">
    <?php if ($title !== '') : ?><h2><?php echo esc_html($title); ?></h2><?php endif; ?>
    <?php if ($text !== '') : ?><p><?php echo esc_html($text); ?></p><?php endif; ?>
    <?php if ($buttonLabel !== '' && $buttonUrl !== '') : ?>
        <a class="button" href="<?php echo esc_url($buttonUrl); ?>"><?php echo esc_html($buttonLabel); ?></a>
    <?php endif; ?>
</section>
