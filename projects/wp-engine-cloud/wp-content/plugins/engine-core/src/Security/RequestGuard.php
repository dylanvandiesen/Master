<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Security;

use WPEngineCloud\EngineCore\Governance\CapabilityMap;

final class RequestGuard
{
    /** @param array<int,string> $allowed */
    public function assertAllowedAction(string $action, array $allowed): void
    {
        if (! in_array($action, $allowed, true)) {
            wp_send_json_error(['message' => 'Action not allowed'], 400);
        }
    }

    public function assertPreviewPermission(CapabilityMap $capabilities): void
    {
        if (! $capabilities->canCompose()) {
            wp_send_json_error(['message' => 'Forbidden'], 403);
        }
    }

    public function assertGovernancePermission(CapabilityMap $capabilities): void
    {
        if (! $capabilities->canGovern()) {
            wp_send_json_error(['message' => 'Forbidden'], 403);
        }
    }
}
