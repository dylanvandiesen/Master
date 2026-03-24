<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Migration\Steps;

use WPEngineCloud\EngineCore\Migration\MigrationStepInterface;

final class Schema120Migration implements MigrationStepInterface
{
    public function id(): string
    {
        return 'schema-1.1.0-to-1.2.0';
    }

    public function fromVersion(): string
    {
        return '1.1.0';
    }

    public function toVersion(): string
    {
        return '1.2.0';
    }

    /** @param array<int,array<string,mixed>> $rows @return array<int,array<string,mixed>> */
    public function transform(array $rows): array
    {
        foreach ($rows as &$row) {
            if (! is_array($row)) {
                continue;
            }

            if (($row['acf_fc_layout'] ?? '') === 'cta' && isset($row['button_text']) && ! isset($row['button_label'])) {
                $row['button_label'] = $row['button_text'];
                unset($row['button_text']);
            }

            if (($row['acf_fc_layout'] ?? '') === 'hero' && isset($row['headline']) && ! isset($row['title'])) {
                $row['title'] = $row['headline'];
                unset($row['headline']);
            }
        }

        return $rows;
    }
}
