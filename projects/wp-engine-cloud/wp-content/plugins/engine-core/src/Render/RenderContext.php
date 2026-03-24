<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Render;

final class RenderContext
{
    public function __construct(
        public readonly string $templateType,
        public readonly int $objectId = 0,
        public readonly string $objectType = '',
        public readonly bool $isPreview = false,
        public readonly string $locale = '',
        public readonly array $capabilities = [],
        public readonly array $flags = []
    ) {
    }
}
