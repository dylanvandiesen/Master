<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Migration;

final class MigrationPlan
{
    /** @param array<int,MigrationStepInterface> $steps */
    public function __construct(
        public readonly int $postId,
        public readonly string $startVersion,
        public readonly string $targetVersion,
        public readonly array $steps
    ) {
    }

    public function isNoop(): bool
    {
        return $this->steps === [];
    }
}
