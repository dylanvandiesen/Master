<?php

declare(strict_types=1);

namespace WPEngineCloud\EngineCore\Accessibility;

final class TemplateAccessibilityAudit
{
    /** @return array<int,string> */
    public function run(string $themeRoot): array
    {
        $issues = [];
        $templates = glob(rtrim($themeRoot, '/') . '/templates/**/*.php', GLOB_BRACE) ?: [];
        if ($templates === []) {
            $templates = glob(rtrim($themeRoot, '/') . '/templates/*.php') ?: [];
        }

        foreach ($templates as $template) {
            $content = (string) file_get_contents($template);
            if (str_contains($content, '<img') && ! str_contains($content, 'alt=')) {
                $issues[] = sprintf('%s contains image tag without alt attribute.', $template);
            }

            if (str_contains($content, 'onclick=')) {
                $issues[] = sprintf('%s contains inline onclick handler.', $template);
            }
        }

        return $issues;
    }
}
