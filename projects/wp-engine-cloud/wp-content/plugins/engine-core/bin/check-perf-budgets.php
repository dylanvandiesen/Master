<?php

declare(strict_types=1);

$budgetFile = __DIR__ . '/../config/budgets/performance-budgets.json';
$payload = json_decode((string) file_get_contents($budgetFile), true);
if (! is_array($payload) || ! isset($payload['templateBudgets'])) {
    fwrite(STDERR, "Invalid budget file\n");
    exit(1);
}

$distRoot = dirname(__DIR__, 4) . '/themes/engine-theme/assets';
$cssSize = 0;
$jsSize = 0;

foreach ((glob($distRoot . '/css/*.css') ?: []) as $css) {
    $cssSize += filesize($css) ?: 0;
}
foreach ((glob($distRoot . '/js/*.js') ?: []) as $js) {
    $jsSize += filesize($js) ?: 0;
}

$cssKb = (int) ceil($cssSize / 1024);
$jsKb = (int) ceil($jsSize / 1024);

$strict = $payload['templateBudgets']['singular'] ?? ['cssKb' => 150, 'jsKb' => 120];
$fail = false;
if ($cssKb > (int) $strict['cssKb']) {
    fwrite(STDERR, "CSS budget exceeded: {$cssKb}KB > {$strict['cssKb']}KB\n");
    $fail = true;
}
if ($jsKb > (int) $strict['jsKb']) {
    fwrite(STDERR, "JS budget exceeded: {$jsKb}KB > {$strict['jsKb']}KB\n");
    $fail = true;
}

echo "Perf budgets checked (css={$cssKb}KB js={$jsKb}KB)\n";
exit($fail ? 1 : 0);
