<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Tenancy;

final class TenantContext
{
    public function tenantId(): string
    {
        $siteId = function_exists('get_current_blog_id') ? (int) get_current_blog_id() : 1;
        return 'tenant_' . $siteId;
    }

    public function namespacedId(string $id): string
    {
        return $this->tenantId() . '::' . $id;
    }
}
