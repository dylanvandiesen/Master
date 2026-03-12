<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Migration\Steps;

use WPEngineCloud\EngineCore\Migration\MigrationStepInterface;

final class Schema110Migration implements MigrationStepInterface
{
    public function id(): string
    {
        return 'schema-1.0.0-to-1.1.0';
    }

    public function fromVersion(): string
    {
        return '1.0.0';
    }

    public function toVersion(): string
    {
        return '1.1.0';
    }

    /** @param array<int,array<string,mixed>> $rows @return array<int,array<string,mixed>> */
    public function transform(array $rows): array
    {
        foreach ($rows as &$row) {
            if (! is_array($row)) {
                continue;
            }

            if (isset($row['heading']) && ! isset($row['headline'])) {
                $row['headline'] = $row['heading'];
                unset($row['heading']);
            }
        }

        return $rows;
    }
}
