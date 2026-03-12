<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Preview;

use WPEngineCloud\EngineCore\Governance\CapabilityMap;
use WPEngineCloud\EngineCore\Render\RenderContext;
use WPEngineCloud\EngineCore\Render\RenderService;
use WPEngineCloud\EngineCore\Security\RequestGuard;

final class PreviewController
{
    public function __construct(
        private readonly RenderService $renderService,
        private readonly CapabilityMap $capabilities,
        private readonly RequestGuard $guard
    ) {
    }

    public function register(): void
    {
        add_action('wp_ajax_engine_core_preview', [$this, 'handle']);
    }

    public function handle(): void
    {
        check_ajax_referer('engine_core_preview', 'nonce');
        $action = sanitize_key((string) ($_POST['action'] ?? ''));
        $this->guard->assertAllowedAction($action, ['engine_core_preview']);
        $this->guard->assertPreviewPermission($this->capabilities);

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
