<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Migration;

final class MigrationValidator
{
    /** @param array<int,array<string,mixed>> $rows */
    public function validateRows(array $rows): array
    {
        $issues = [];
        foreach ($rows as $i => $row) {
            if (! is_array($row)) {
                $issues[] = sprintf('Row %d is not an array', $i);
                continue;
            }

            $layout = (string) ($row['acf_fc_layout'] ?? '');
            if ($layout === '') {
                $issues[] = sprintf('Row %d missing acf_fc_layout', $i);
            }
        }

        return $issues;
    }
}
