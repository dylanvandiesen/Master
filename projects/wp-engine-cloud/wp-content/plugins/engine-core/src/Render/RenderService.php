<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Render;

use WPEngineCloud\EngineCore\Contracts\RendererInterface;

final class RenderService implements RendererInterface
{
    public function __construct(private readonly Resolver $resolver)
    {
    }

    public function render(RenderContext $context): void
    {
        $resolution = $this->resolver->resolve($context);

        do_action('engine_core/before_render', $context, $resolution);

        $template = locate_template('templates/global-renderer.php', false, false);

        if (is_string($template) && $template !== '') {
            $engineContext = $context;
            $engineResolution = $resolution;
            include $template;
            do_action('engine_core/after_render', $context, $resolution);
            return;
        }

        echo '<main class="engine-render-fallback">';
        echo esc_html(sprintf('Engine renderer active (%s via %s).', $context->templateType, $resolution['source']));
        echo '</main>';

        do_action('engine_core/after_render', $context, $resolution);
    }
}
