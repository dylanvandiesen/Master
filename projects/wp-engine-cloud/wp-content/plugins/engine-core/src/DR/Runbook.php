<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\DR;

final class Runbook
{
    /** @return array<string,mixed> */
    public function policy(): array
    {
        return [
            'backup_cadence' => 'daily full + 15m binlog/incremental',
            'retention_days' => 30,
            'restore_drill' => 'monthly',
            'rpo_minutes' => 15,
            'rto_minutes' => 60,
        ];
    }
}
