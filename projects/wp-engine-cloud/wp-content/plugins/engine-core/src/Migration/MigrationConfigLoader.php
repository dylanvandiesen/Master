<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Migration;

use WPEngineCloud\EngineCore\Validation\ValidationException;

final class MigrationConfigLoader
{
    /** @return array{latest: string, steps: array<int,MigrationStepInterface>} */
    public function load(string $configFile): array
    {
        if (! is_file($configFile)) {
            throw new ValidationException(sprintf('Migration config missing: %s', $configFile));
        }

        $decoded = json_decode((string) file_get_contents($configFile), true);
        if (! is_array($decoded)) {
            throw new ValidationException(sprintf('Migration config invalid JSON: %s', $configFile));
        }

        $latest = is_string($decoded['latest'] ?? null) ? $decoded['latest'] : '';
        if ($latest === '') {
            throw new ValidationException('Migration config requires non-empty "latest" version.');
        }

        $steps = [];
        $seenFrom = [];

        foreach (($decoded['steps'] ?? []) as $stepDef) {
            if (! is_array($stepDef)) {
                throw new ValidationException('Migration config step entry must be an object.');
            }

            $class = $stepDef['class'] ?? null;
            if (! is_string($class) || ! class_exists($class)) {
                throw new ValidationException(sprintf('Migration step class not found: %s', (string) $class));
            }

            $candidate = new $class();
            if (! $candidate instanceof MigrationStepInterface) {
                throw new ValidationException(sprintf('Migration step class does not implement interface: %s', $class));
            }

            $from = $candidate->fromVersion();
            if (isset($seenFrom[$from])) {
                throw new ValidationException(sprintf('Duplicate migration step fromVersion "%s".', $from));
            }
            $seenFrom[$from] = true;

            if (version_compare($candidate->toVersion(), $candidate->fromVersion(), '<=')) {
                throw new ValidationException(sprintf('Migration step "%s" must increase version (%s -> %s).', $candidate->id(), $candidate->fromVersion(), $candidate->toVersion()));
            }

            $steps[] = $candidate;
        }

        return ['latest' => $latest, 'steps' => $steps];
    }
}
