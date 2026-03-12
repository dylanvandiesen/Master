<?php

declare(strict_types=1);
?>
<footer class="site-footer">
    <div class="site-shell site-footer__inner">
        <p><?php echo esc_html(sprintf('%s © %s', get_bloginfo('name'), gmdate('Y'))); ?></p>
    </div>
</footer>
<?php wp_footer(); ?>
</body>
</html>
