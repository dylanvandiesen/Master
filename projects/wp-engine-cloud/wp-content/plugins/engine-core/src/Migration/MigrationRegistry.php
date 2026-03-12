<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Migration;

final class MigrationRegistry
{
    /** @var array<string, MigrationStepInterface> */
    private array $stepsByFromVersion = [];

    /** @param array<int, MigrationStepInterface> $steps */
    public function __construct(array $steps)
    {
        foreach ($steps as $step) {
            $this->stepsByFromVersion[$step->fromVersion()] = $step;
        }
    }

    public function plan(int $postId, string $fromVersion, string $targetVersion): MigrationPlan
    {
        $steps = [];
        $cursor = $fromVersion;

        while (version_compare($cursor, $targetVersion, '<')) {
            $step = $this->stepsByFromVersion[$cursor] ?? null;
            if (! $step instanceof MigrationStepInterface) {
                break;
            }

            $steps[] = $step;
            $cursor = $step->toVersion();
        }

        return new MigrationPlan($postId, $fromVersion, $targetVersion, $steps);
    }
}
