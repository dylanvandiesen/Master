<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Registry;

use WPEngineCloud\EngineCore\Validation\ValidationException;

final class ManifestValidator
{
    public function assertVariant(array $variant): void
    {
        $required = ['id', 'label', 'module', 'contexts', 'fieldRefs', 'defaults', 'capabilities', 'templatePath', 'assetHandles', 'version', 'deprecated'];

        foreach ($required as $key) {
            if (! array_key_exists($key, $variant)) {
                throw new ValidationException(sprintf('Variant manifest missing required key "%s" in record "%s"', $key, $variant['id'] ?? 'unknown'));
            }
        }

        if (! is_array($variant['contexts']) || $variant['contexts'] === []) {
            throw new ValidationException(sprintf('Variant "%s" requires at least one context.', $variant['id'] ?? 'unknown'));
        }

        if (! is_string($variant['templatePath']) || $variant['templatePath'] === '') {
            throw new ValidationException(sprintf('Variant "%s" templatePath must be non-empty string.', $variant['id'] ?? 'unknown'));
        }
    }
}
