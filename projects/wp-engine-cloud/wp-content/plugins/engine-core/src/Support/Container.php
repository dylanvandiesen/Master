<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Support;

use RuntimeException;

final class Container
{
    /** @var array<string, callable(self): mixed> */
    private array $bindings = [];

    /** @var array<string, mixed> */
    private array $instances = [];

    public function singleton(string $id, callable $resolver): void
    {
        $this->bindings[$id] = $resolver;
    }

    public function get(string $id): mixed
    {
        if (array_key_exists($id, $this->instances)) {
            return $this->instances[$id];
        }

        if (! array_key_exists($id, $this->bindings)) {
            throw new RuntimeException(sprintf('Service not registered: %s', $id));
        }

        $this->instances[$id] = ($this->bindings[$id])($this);
        return $this->instances[$id];
    }
}
