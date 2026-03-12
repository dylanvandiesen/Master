<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Pattern;

final class PatternDiff
{
    /**
     * @param array<string,mixed> $source
     * @param array<string,mixed> $instance
     * @return array{changed: bool, added: array<int,string>, removed: array<int,string>, modified: array<int,string>}
     */
    public function compare(array $source, array $instance): array
    {
        $added = [];
        $removed = [];
        $modified = [];

        foreach ($source as $key => $value) {
            if (! array_key_exists($key, $instance)) {
                $removed[] = (string) $key;
                continue;
            }

            if ($instance[$key] !== $value) {
                $modified[] = (string) $key;
            }
        }

        foreach ($instance as $key => $_value) {
            if (! array_key_exists($key, $source)) {
                $added[] = (string) $key;
            }
        }

        return [
            'changed' => $added !== [] || $removed !== [] || $modified !== [],
            'added' => $added,
            'removed' => $removed,
            'modified' => $modified,
        ];
    }
}
