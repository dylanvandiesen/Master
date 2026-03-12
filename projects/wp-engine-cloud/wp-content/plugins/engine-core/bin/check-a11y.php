<?php

declare(strict_types=1);

require_once __DIR__ . '/../src/Accessibility/TemplateAccessibilityAudit.php';

use WPEngineCloud\EngineCore\Accessibility\TemplateAccessibilityAudit;

$themeRoot = dirname(__DIR__, 2) . '/themes/engine-theme';
$audit = new TemplateAccessibilityAudit();
$issues = $audit->run($themeRoot);

if ($issues !== []) {
    fwrite(STDERR, implode(PHP_EOL, $issues) . PHP_EOL);
    exit(1);
}

echo "a11y template audit: ok\n";
