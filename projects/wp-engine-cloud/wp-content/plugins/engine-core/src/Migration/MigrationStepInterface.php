<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Migration;

interface MigrationStepInterface
{
    public function id(): string;

    public function fromVersion(): string;

    public function toVersion(): string;

    /** @param array<int,array<string,mixed>> $rows @return array<int,array<string,mixed>> */
    public function transform(array $rows): array;
}
