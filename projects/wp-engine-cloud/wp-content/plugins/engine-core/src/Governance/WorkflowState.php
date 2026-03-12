<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Governance;

final class WorkflowState
{
    public const DRAFT = 'draft';
    public const APPROVED = 'approved';
    public const DEPRECATED = 'deprecated';
    public const FROZEN = 'frozen';
    public const ARCHIVED = 'archived';
    public const REMOVED = 'removed';

    /** @return array<string,array<int,string>> */
    public function transitions(): array
    {
        return [
            self::DRAFT => [self::APPROVED, self::ARCHIVED],
            self::APPROVED => [self::DEPRECATED, self::FROZEN, self::ARCHIVED],
            self::DEPRECATED => [self::FROZEN, self::ARCHIVED],
            self::FROZEN => [self::ARCHIVED],
            self::ARCHIVED => [self::REMOVED],
            self::REMOVED => [],
        ];
    }

    public function canTransition(string $from, string $to): bool
    {
        $map = $this->transitions();
        return in_array($to, $map[$from] ?? [], true);
    }
}
