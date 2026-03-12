<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Contracts;

use WPEngineCloud\EngineCore\Render\RenderContext;

interface RendererInterface
{
    public function render(RenderContext $context): void;
}
