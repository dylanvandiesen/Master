<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Preview;

use WPEngineCloud\EngineCore\Render\RenderContext;
use WPEngineCloud\EngineCore\Render\RenderService;

final class PreviewController
{
    public function __construct(private readonly RenderService $renderService)
    {
    }

    public function register(): void
    {
        add_action('wp_ajax_engine_core_preview', [$this, 'handle']);
    }

    public function handle(): void
    {
        check_ajax_referer('engine_core_preview', 'nonce');

        if (! current_user_can('edit_posts')) {
            wp_send_json_error(['message' => 'Forbidden'], 403);
        }

        $context = new RenderContext(
            templateType: sanitize_text_field((string) ($_POST['templateType'] ?? 'preview')),
            objectId: (int) ($_POST['objectId'] ?? 0),
            objectType: sanitize_text_field((string) ($_POST['objectType'] ?? 'post')),
            isPreview: true,
            locale: determine_locale(),
            capabilities: ['edit_posts' => true]
        );

        ob_start();
        $this->renderService->render($context);
        $html = (string) ob_get_clean();

        wp_send_json_success(['html' => $html]);
    }
}
