<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Registry;

use WPEngineCloud\EngineCore\Validation\ValidationException;

final class ManifestScanner
{
    public function __construct(
        private readonly ManifestValidator $validator,
        private readonly string $configDir
    ) {
    }

    /** @return array{modules: array, variants: array, conditions: array} */
    public function scan(): array
    {
        $modules = $this->readJson('modules.json', 'modules');
        $variants = $this->readJson('variants.json', 'variants');
        $conditions = $this->readJson('conditions.json', 'conditions');

        foreach ($variants as $variant) {
            $this->validator->assertVariant($variant);
        }

        return compact('modules', 'variants', 'conditions');
    }

    private function readJson(string $file, string $key): array
    {
        $path = rtrim($this->configDir, '/') . '/' . $file;
        if (! file_exists($path)) {
            throw new ValidationException(sprintf('Registry file missing: %s', $path));
        }

        $decoded = json_decode((string) file_get_contents($path), true);
        if (! is_array($decoded) || ! isset($decoded[$key]) || ! is_array($decoded[$key])) {
            throw new ValidationException(sprintf('Registry file invalid: %s (expected "%s" array)', $path, $key));
        }

        return $decoded[$key];
    }
}
