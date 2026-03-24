<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Governance;

final class CapabilityMap
{
    public const CONTENT_COMPOSE = 'edit_posts';
    public const DESIGN_MANAGE = 'edit_theme_options';
    public const GOVERNANCE_ADMIN = 'manage_options';

    public function canCompose(): bool
    {
        return current_user_can(self::CONTENT_COMPOSE);
    }

    public function canDesign(): bool
    {
        return current_user_can(self::DESIGN_MANAGE) || $this->canGovern();
    }

    public function canGovern(): bool
    {
        return current_user_can(self::GOVERNANCE_ADMIN);
    }
}
