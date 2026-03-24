<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\ACF;

use WPEngineCloud\EngineCore\Validation\ValidationException;

final class NestedDepthGuard
{
    public function enforce(int $postId): void
    {
        $rows = get_post_meta($postId, 'page_sections', true);
        if (! is_array($rows)) {
            return;
        }

        foreach ($rows as $row) {
            $this->assertDepth($row, 1, 2);
        }
    }

    /** @param array<string,mixed> $row */
    private function assertDepth(array $row, int $depth, int $maxDepth): void
    {
        if ($depth > $maxDepth) {
            throw new ValidationException(sprintf('Flexible content nesting depth exceeded (max %d).', $maxDepth));
        }

        foreach ($row as $value) {
            if (is_array($value) && isset($value[0]) && is_array($value[0])) {
                foreach ($value as $child) {
                    if (is_array($child)) {
                        $this->assertDepth($child, $depth + 1, $maxDepth);
                    }
                }
            }
        }
    }
}
