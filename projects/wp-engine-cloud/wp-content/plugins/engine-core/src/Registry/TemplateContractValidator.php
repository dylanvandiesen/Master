<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Registry;

use WPEngineCloud\EngineCore\Validation\ValidationException;

final class TemplateContractValidator
{
    /** @param array<int, array<string, mixed>> $variants */
    public function assertCompatibility(array $variants, string $contractPath): void
    {
        $decoded = json_decode((string) file_get_contents($contractPath), true);
        if (! is_array($decoded) || ! isset($decoded['contracts']) || ! is_array($decoded['contracts'])) {
            throw new ValidationException('Template contracts JSON is invalid.');
        }

        $variantIds = array_column($variants, 'id');

        foreach ($decoded['contracts'] as $contract) {
            $variantId = $contract['variant'] ?? '';
            if (! is_string($variantId) || ! in_array($variantId, $variantIds, true)) {
                throw new ValidationException(sprintf('Contract references missing variant "%s".', (string) $variantId));
            }

            if (! isset($contract['requiredFields']) || ! is_array($contract['requiredFields'])) {
                throw new ValidationException(sprintf('Contract for "%s" must include requiredFields array.', $variantId));
            }
        }
    }
}
