<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Localization;

final class LocaleResolver
{
    public function resolve(string $requestedLocale): string
    {
        $available = apply_filters('engine_core/locales', [get_locale(), 'en_US']);
        if (in_array($requestedLocale, $available, true)) {
            return $requestedLocale;
        }

        return (string) ($available[0] ?? 'en_US');
    }
}
